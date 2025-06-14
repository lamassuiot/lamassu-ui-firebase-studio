
import type { CertificateData } from '@/types/certificate';

// API Response Structures for Issued Certificates
interface ApiKeyMetadata {
  type: string;
  bits?: number;
  curve_name?: string;
  strength?: string;
}

interface ApiDistinguishedName {
  common_name: string;
  organization?: string;
  organization_unit?: string;
  country?: string;
  state?: string;
  locality?: string;
}

interface ApiIssuerMetadata {
  serial_number: string;
  id: string; // Issuer CA's ID
  level: number;
}

export interface ApiIssuedCertificateItem {
  serial_number: string;
  subject_key_id: string;
  authority_key_id: string;
  metadata: Record<string, any>;
  status: string;                
  certificate: string;           
  key_metadata: ApiKeyMetadata;  
  subject: ApiDistinguishedName; 
  issuer: ApiDistinguishedName;  
  valid_from: string;            
  issuer_metadata: ApiIssuerMetadata; 
  valid_to: string;              
  revocation_timestamp?: string; 
  revocation_reason?: string;   
  type?: string;                  
  engine_id?: string;             
  is_ca: boolean;                
}

export interface ApiIssuedCertificateListResponse {
  next: string | null;
  list: ApiIssuedCertificateItem[];
}

function transformApiIssuedCertificateToLocal(apiCert: ApiIssuedCertificateItem): CertificateData {
  let publicKeyAlgorithm = apiCert.key_metadata.type;
  if (apiCert.key_metadata.bits) {
    publicKeyAlgorithm += ` (${apiCert.key_metadata.bits} bit)`;
  } else if (apiCert.key_metadata.curve_name) {
    publicKeyAlgorithm += ` (${apiCert.key_metadata.curve_name})`;
  }

  const subjectDisplay = apiCert.subject.common_name || `SN:${apiCert.serial_number}`;
  const issuerDisplay = apiCert.issuer.common_name || `CA_ID:${apiCert.issuer_metadata.id}`;

  let pemData = '';
  if (typeof window !== 'undefined' && apiCert.certificate) {
    try {
      pemData = window.atob(apiCert.certificate);
    } catch (e) {
      console.error("Failed to decode base64 PEM data for SN:", apiCert.serial_number, e);
      pemData = "Error: Could not decode PEM data.";
    }
  }
  
  const subjectDNParts: string[] = [];
  if (apiCert.subject.common_name) subjectDNParts.push(`CN=${apiCert.subject.common_name}`);
  if (apiCert.subject.organization) subjectDNParts.push(`O=${apiCert.subject.organization}`);
  if (apiCert.subject.organization_unit) subjectDNParts.push(`OU=${apiCert.subject.organization_unit}`);
  if (apiCert.subject.locality) subjectDNParts.push(`L=${apiCert.subject.locality}`);
  if (apiCert.subject.state) subjectDNParts.push(`ST=${apiCert.subject.state}`);
  if (apiCert.subject.country) subjectDNParts.push(`C=${apiCert.subject.country}`);
  const fullSubject = subjectDNParts.join(', ');

  const issuerDNParts: string[] = [];
  if (apiCert.issuer.common_name) issuerDNParts.push(`CN=${apiCert.issuer.common_name}`);
  if (apiCert.issuer.organization) issuerDNParts.push(`O=${apiCert.issuer.organization}`);
  if (apiCert.issuer.organization_unit) issuerDNParts.push(`OU=${apiCert.issuer.organization_unit}`);
  // Add other issuer parts if needed, similar to subject

  return {
    id: apiCert.serial_number, // Using serial as ID
    fileName: `${subjectDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'certificate'}.pem`,
    subject: fullSubject || subjectDisplay, // Use full subject DN if available
    issuer: issuerDNParts.join(', ') || issuerDisplay,
    serialNumber: apiCert.serial_number,
    validFrom: apiCert.valid_from,
    validTo: apiCert.valid_to,
    sans: [], // TODO: Parse SANs if available in API metadata or from PEM
    pemData: pemData,
    apiStatus: apiCert.status,
    publicKeyAlgorithm,
    signatureAlgorithm: 'N/A (from API)', // Placeholder for actual signature algorithm
    fingerprintSha256: '', // Placeholder, needs to be calculated if required
    issuerCaId: apiCert.issuer_metadata.id,
    rawApiData: apiCert,
  };
}

interface FetchIssuedCertificatesParams {
  accessToken: string;
  bookmark?: string | null;
  pageSize?: string;
}

export async function fetchIssuedCertificates(
  params: FetchIssuedCertificatesParams
): Promise<{ certificates: CertificateData[]; nextToken: string | null }> {
  const { accessToken, bookmark, pageSize = '10' } = params;
  const queryParams = new URLSearchParams({
    sort_by: 'valid_from',
    sort_mode: 'desc',
    page_size: pageSize,
  });

  if (bookmark) {
    queryParams.append('bookmark', bookmark);
  }

  const response = await fetch(`https://lab.lamassu.io/api/ca/v1/certificates?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: "Failed to fetch issued certificates" }));
    throw new Error(errorData.message || `HTTP error ${response.status}`);
  }

  const apiResponse: ApiIssuedCertificateListResponse = await response.json();
  if (!apiResponse.list) {
    console.warn("API response for issued certificates is missing 'list' property:", apiResponse);
    return { certificates: [], nextToken: null };
  }

  const certificates = apiResponse.list.map(transformApiIssuedCertificateToLocal);
  return { certificates, nextToken: apiResponse.next };
}

// Helper to find a certificate by serial number from a list
export function findCertificateBySerialNumber(serialNumber: string, certificates: CertificateData[]): CertificateData | null {
  return certificates.find(cert => cert.serialNumber === serialNumber) || null;
}
