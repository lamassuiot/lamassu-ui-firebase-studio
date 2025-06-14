
import type { CertificateData, VerificationStatus } from '@/types/certificate';

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

interface ApiCertificateDetails {
  serial_number: string;
  subject_key_id: string;
  authority_key_id: string;
  metadata: Record<string, any>;
  status: string;
  certificate: string; // Base64 encoded PEM
  key_metadata: ApiKeyMetadata;
  subject: ApiDistinguishedName;
  issuer: ApiDistinguishedName;
  valid_from: string; // ISO Date string
  issuer_metadata: ApiIssuerMetadata;
  valid_to: string; // ISO Date string
  revocation_timestamp?: string;
  revocation_reason?: string;
  type?: string;
  engine_id?: string;
  is_ca: boolean;
}

export interface ApiIssuedCertificateItem {
  serial_number: string;
  subject_key_id: string;
  authority_key_id: string;
  metadata: Record<string, any>;
  status: string;
  certificate: ApiCertificateDetails;
}

export interface ApiIssuedCertificateListResponse {
  next: string | null;
  list: ApiIssuedCertificateItem[];
}

function transformApiIssuedCertificateToLocal(apiCert: ApiIssuedCertificateItem): CertificateData {
  const certDetails = apiCert.certificate;

  let verificationStatus: VerificationStatus = 'unverified';
  const apiStatus = certDetails.status?.toUpperCase();

  if (apiStatus === 'ACTIVE') {
    verificationStatus = new Date(certDetails.valid_to) < new Date() ? 'expired' : 'unverified';
  } else if (apiStatus === 'REVOKED') {
    verificationStatus = 'revoked';
  } else if (apiStatus === 'EXPIRED') { // Assuming API might send EXPIRED as top-level status too
    verificationStatus = 'expired';
  } else if (apiCert.status?.toUpperCase() === 'EXPIRED') { // Check top-level status for EXPIRED
     verificationStatus = 'expired';
  }


  let publicKeyAlgorithm = certDetails.key_metadata.type;
  if (certDetails.key_metadata.bits) {
    publicKeyAlgorithm += ` (${certDetails.key_metadata.bits} bit)`;
  } else if (certDetails.key_metadata.curve_name) {
    publicKeyAlgorithm += ` (${certDetails.key_metadata.curve_name})`;
  }

  const subjectDisplay = certDetails.subject.common_name || `SN:${certDetails.serial_number}`;
  const issuerDisplay = certDetails.issuer.common_name || `CA_ID:${certDetails.issuer_metadata.id}`;

  let pemData = '';
  if (typeof window !== 'undefined' && certDetails.certificate) {
    try {
      pemData = window.atob(certDetails.certificate);
    } catch (e) {
      console.error("Failed to decode base64 PEM data for SN:", certDetails.serial_number, e);
      pemData = "Error: Could not decode PEM data.";
    }
  }


  return {
    id: certDetails.serial_number,
    fileName: `${subjectDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'certificate'}.pem`,
    subject: subjectDisplay,
    issuer: issuerDisplay,
    serialNumber: certDetails.serial_number,
    validFrom: certDetails.valid_from,
    validTo: certDetails.valid_to,
    sans: [],
    pemData: pemData,
    verificationStatus,
    verificationDetails: `Status from CA: ${apiStatus || apiCert.status}. On-device verification pending.`,
    publicKeyAlgorithm,
    signatureAlgorithm: 'N/A (from API)',
    fingerprintSha256: '',
    rawApiData: apiCert,
    issuerCaId: certDetails.issuer_metadata.id,
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
