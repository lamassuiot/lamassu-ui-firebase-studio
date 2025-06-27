
import type { CertificateData } from '@/types/certificate';
import * as asn1js from "asn1js";
import { Certificate, CRLDistributionPoints, AuthorityInformationAccess } from "pkijs";


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

// OID Map for signature algorithms
const SIG_OID_MAP: Record<string, string> = {
    "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
    "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
    "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
    "1.2.840.113549.1.1.14": "sha224WithRSAEncryption",
    "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
    "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
    "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
};

function parseAiaUrls(pem: string): { ocsp: string[], caIssuers: string[] } {
    const result = { ocsp: [], caIssuers: [] };
    if (typeof window === 'undefined' || !pem) return result;
    try {
        const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "");
        const binaryString = window.atob(pemString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const asn1 = asn1js.fromBER(bytes.buffer);
        if (asn1.offset === -1) return result;

        const certificate = new Certificate({ schema: asn1.result });
        const aiaExtension = certificate.extensions?.find(ext => ext.extnID === "1.3.6.1.5.5.7.1.1"); // id-pe-authorityInfoAccess
        
        if (!aiaExtension || !aiaExtension.parsedValue) {
          return result;
        }

        const aia = aiaExtension.parsedValue as AuthorityInformationAccess;
        
        aia.accessDescriptions.forEach((desc: any) => {
            if (desc.accessMethod === "1.3.6.1.5.5.7.48.1") { // id-ad-ocsp
                if (desc.accessLocation.type === 6) { // uniformResourceIdentifier
                    result.ocsp.push(desc.accessLocation.value);
                }
            } else if (desc.accessMethod === "1.3.6.1.5.5.7.48.2") { // id-ad-caIssuers
                if (desc.accessLocation.type === 6) { // uniformResourceIdentifier
                    result.caIssuers.push(desc.accessLocation.value);
                }
            }
        });
        return result;

    } catch (e) {
        console.error("Failed to parse AIA URLs from certificate PEM:", e);
        return result;
    }
}

function parseCrlUrlsFromPem(pem: string): string[] {
    if (typeof window === 'undefined' || !pem) return [];
    try {
        const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "");
        const binaryString = window.atob(pemString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const asn1 = asn1js.fromBER(bytes.buffer);
        if (asn1.offset === -1) return [];

        const certificate = new Certificate({ schema: asn1.result });
        const cdpExtension = certificate.extensions?.find(ext => ext.extnID === "2.5.29.31"); // id-ce-cRLDistributionPoints
        
        if (!cdpExtension || !cdpExtension.parsedValue) {
          return [];
        }

        const crlDistributionPoints = cdpExtension.parsedValue as CRLDistributionPoints;
        const urls: string[] = [];
        
        crlDistributionPoints.distributionPoints?.forEach((point: any) => {
            if (point.distributionPoint) {
                if (point.distributionPoint.type === 0) { 
                  const generalNames = point.distributionPoint.value;
                  generalNames.names?.forEach((generalName: any) => {
                      if (generalName.type === 6) { // uniformResourceIdentifier
                          urls.push(generalName.value);
                      }
                  });
                }
            }
        });
        return urls;

    } catch (e) {
        console.error("Failed to parse CRL URLs from certificate PEM:", e);
        return [];
    }
}


async function transformApiIssuedCertificateToLocal(apiCert: ApiIssuedCertificateItem): Promise<CertificateData> {
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

  const aiaUrls = parseAiaUrls(pemData);
  const crlUrls = parseCrlUrlsFromPem(pemData);
  
  let signatureAlgorithm = 'N/A';
  let fingerprintSha256 = '';

  if (pemData && !pemData.startsWith("Error") && typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
        const pemString = pemData.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
        const derBuffer = Uint8Array.from(atob(pemString), c => c.charCodeAt(0)).buffer;

        const hashBuffer = await crypto.subtle.digest('SHA-256', derBuffer);
        fingerprintSha256 = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join(':');

        const asn1 = asn1js.fromBER(derBuffer);
        if (asn1.offset !== -1) {
            const certificate = new Certificate({ schema: asn1.result });
            signatureAlgorithm = SIG_OID_MAP[certificate.signatureAlgorithm.algorithmId] || certificate.signatureAlgorithm.algorithmId;
        }
    } catch (e) {
        console.error("Error parsing certificate PEM for details:", e);
        signatureAlgorithm = "Parsing Error";
        fingerprintSha256 = "Parsing Error";
    }
  }


  return {
    id: apiCert.serial_number, 
    fileName: `${subjectDisplay.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'certificate'}.pem`,
    subject: fullSubject || subjectDisplay, 
    issuer: fullIssuer || issuerDisplay,
    serialNumber: apiCert.serial_number,
    validFrom: apiCert.valid_from,
    validTo: apiCert.valid_to,
    sans: apiCert.metadata?.sans || [],
    pemData: pemData,
    apiStatus: apiCert.status,
    revocationReason: apiCert.revocation_reason,
    revocationTimestamp: apiCert.revocation_timestamp,
    publicKeyAlgorithm,
    signatureAlgorithm,
    fingerprintSha256,
    issuerCaId: apiCert.issuer_metadata.id,
    ocspUrls: aiaUrls.ocsp,
    crlDistributionPoints: crlUrls,
    caIssuersUrls: aiaUrls.caIssuers,
    rawApiData: apiCert,
  };
}

interface FetchIssuedCertificatesParams {
  accessToken: string;
  apiQueryString?: string;
  forCaId?: string; 
}

export async function fetchIssuedCertificates(
  params: FetchIssuedCertificatesParams
): Promise<{ certificates: CertificateData[]; nextToken: string | null }> {
  const { accessToken, apiQueryString, forCaId } = params;
  
  let baseUrl = 'https://lab.lamassu.io/api/ca/v1/';
  if (forCaId) {
    baseUrl += `cas/${forCaId}/certificates`;
  } else {
    baseUrl += 'certificates';
  }
  
  const finalQueryString = apiQueryString || 'sort_by=valid_from&sort_mode=desc&page_size=10';

  const response = await fetch(`${baseUrl}?${finalQueryString}`, {
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

  const certificates = await Promise.all(
    apiResponse.list.map(transformApiIssuedCertificateToLocal)
  );
  return { certificates, nextToken: apiResponse.next };
}

// Helper to find a certificate by serial number from a list
export function findCertificateBySerialNumber(serialNumber: string, certificates: CertificateData[]): CertificateData | null {
  return certificates.find(cert => cert.serialNumber === serialNumber) || null;
}

// Shared function to update certificate status (revoke or re-activate)
interface UpdateStatusParams {
  serialNumber: string;
  status: 'ACTIVE' | 'REVOKED';
  reason?: string;
  accessToken: string;
}

export async function updateCertificateStatus({
  serialNumber,
  status,
  reason,
  accessToken,
}: UpdateStatusParams): Promise<void> {
  const body: { status: 'ACTIVE' | 'REVOKED', revocation_reason?: string } = { status };
  if (status === 'REVOKED' && reason) {
    body.revocation_reason = reason;
  }
  
  const response = await fetch(`https://lab.lamassu.io/api/ca/v1/certificates/${serialNumber}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errorBody = 'Request failed.';
    try {
      const errJson = await response.json();
      errorBody = errJson.err || errJson.message || errorBody;
    } catch (e) { /* Ignore parsing error */ }
    
    const actionText = status === 'REVOKED' ? 'revoke' : 're-activate';
    throw new Error(`Failed to ${actionText} certificate: ${errorBody} (Status: ${response.status})`);
  }
}
