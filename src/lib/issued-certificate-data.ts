
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

// Updated interface to directly reflect the structure of an item in the API list
export interface ApiIssuedCertificateItem {
  serial_number: string;
  subject_key_id: string;
  authority_key_id: string;
  metadata: Record<string, any>;
  status: string;                 // Top-level status
  certificate: string;            // Base64 encoded PEM string (top-level)
  key_metadata: ApiKeyMetadata;   // Top-level
  subject: ApiDistinguishedName;  // Top-level
  issuer: ApiDistinguishedName;   // Top-level
  valid_from: string;             // Top-level ISO Date string
  issuer_metadata: ApiIssuerMetadata; // Top-level
  valid_to: string;               // Top-level ISO Date string
  revocation_timestamp?: string; // Top-level
  revocation_reason?: string;    // Top-level
  type?: string;                   // Top-level (e.g., "EXTERNAL")
  engine_id?: string;              // Top-level
  is_ca: boolean;                 // Top-level
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

  return {
    id: apiCert.serial_number,
    fileName: `${subjectDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'certificate'}.pem`,
    subject: subjectDisplay,
    issuer: issuerDisplay,
    serialNumber: apiCert.serial_number,
    validFrom: apiCert.valid_from,
    validTo: apiCert.valid_to,
    sans: [], // SANs are not directly in this API response part
    pemData: pemData,
    apiStatus: apiCert.status, // Store raw API status
    publicKeyAlgorithm,
    signatureAlgorithm: 'N/A (from API)',
    fingerprintSha256: '',
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
