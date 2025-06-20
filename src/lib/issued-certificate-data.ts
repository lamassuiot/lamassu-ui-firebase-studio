
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
  const fullIssuer = issuerDNParts.join(', ');


  return {
    id: apiCert.serial_number, 
    fileName: `${subjectDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'certificate'}.pem`,
    subject: fullSubject || subjectDisplay, 
    issuer: fullIssuer || issuerDisplay,
    serialNumber: apiCert.serial_number,
    validFrom: apiCert.valid_from,
    validTo: apiCert.valid_to,
    sans: apiCert.metadata?.sans || [], // Assuming SANs might be in metadata.sans
    pemData: pemData,
    apiStatus: apiCert.status,
    publicKeyAlgorithm,
    signatureAlgorithm: apiCert.metadata?.signature_algorithm || 'N/A (from API)', // Assuming sig algo in metadata
    fingerprintSha256: apiCert.metadata?.fingerprint_sha256 || '', 
    issuerCaId: apiCert.issuer_metadata.id,
    rawApiData: apiCert,
  };
}

interface FetchIssuedCertificatesParams {
  accessToken: string;
  apiQueryString?: string;
  forCaId?: string; // Optional: ID of the CA to fetch certificates for
}

export async function fetchIssuedCertificates(
  params: FetchIssuedCertificatesParams
): Promise<{ certificates: CertificateData[]; nextToken: string | null }> {
  const { accessToken, apiQueryString = 'sort_by=valid_from&sort_mode=desc&page_size=10', forCaId } = params;
  
  let baseUrl = 'https://lab.lamassu.io/api/ca/v1/';
  if (forCaId) {
    baseUrl += `cas/${forCaId}/certificates`;
  } else {
    baseUrl += 'certificates';
  }
  
  const response = await fetch(`${baseUrl}?${apiQueryString}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errorJson;
    let errorMessage = `Failed to fetch issued certificates. HTTP error ${response.status}`;
    try {
      errorJson = await response.json();
      if (errorJson && errorJson.err) {
        errorMessage = `Failed to fetch issued certificates: ${errorJson.err}`;
      } else if (errorJson && errorJson.message) {
        errorMessage = `Failed to fetch issued certificates: ${errorJson.message}`;
      }
    } catch (e) {
      console.error("Failed to parse error response as JSON for fetchIssuedCertificates:", e);
    }
    throw new Error(errorMessage);
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
