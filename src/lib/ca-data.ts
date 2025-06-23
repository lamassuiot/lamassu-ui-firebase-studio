

// Define the CA data structure
import * as asn1js from "asn1js";
import { Certificate, CRLDistributionPoints, AuthorityInformationAccess } from "pkijs";

// API Response Structures
interface ApiKeyMetadata {
  type: string; // e.g., "ECDSA", "RSA"
  bits?: number; // e.g., 256, 2048
  curve_name?: string; // e.g., "P-256" for ECDSA
  strength?: string; // e.g., "HIGH"
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

interface ApiCertificateData {
  serial_number: string;
  subject_key_id: string;
  authority_key_id: string;
  metadata: Record<string, any>;
  status: string; // "ACTIVE", "REVOKED", "EXPIRED" (assuming API might provide EXPIRED)
  certificate: string; // Base64 encoded PEM
  key_metadata: ApiKeyMetadata;
  subject: ApiDistinguishedName;
  issuer: ApiDistinguishedName; // Issuer DN from cert, issuer_metadata.id is the CA ID
  valid_from: string; // ISO Date string
  issuer_metadata: ApiIssuerMetadata;
  valid_to: string; // ISO Date string
  revocation_timestamp?: string;
  revocation_reason?: string;
  type?: string; // "MANAGED"
  engine_id?: string; // To be used as kmsKeyId
  is_ca: boolean;
}

export interface ApiCaItem {
  id: string; // This is the CA's own ID
  certificate: ApiCertificateData;
  serial_number: string; // Duplicated from certificate.serial_number
  metadata: Record<string, any>;
  validity?: {
    type: string;
    duration: string;
    time: string;
  };
  creation_ts: string;
  level: number; // Hierarchy level, 0 for root
}

export interface ApiResponseList {
  next: string | null;
  list: ApiCaItem[];
}

// Local CA interface
export interface CA {
  id: string;
  name: string;
  issuer: string; // ID of the parent CA or "Self-signed"
  expires: string; // ISO Date string from valid_to
  serialNumber: string;
  status: 'active' | 'expired' | 'revoked' | 'unknown'; // Added 'unknown' for safety
  keyAlgorithm: string;
  signatureAlgorithm: string; // Placeholder for now
  kmsKeyId?: string;
  pemData?: string;
  children?: CA[];
  subjectKeyId?: string;
  authorityKeyId?: string;
  subjectDN?: ApiDistinguishedName;
  issuerDN?: ApiDistinguishedName;
  isCa?: boolean;
  level?: number; // Store the original level from API
  crlDistributionPoints?: string[];
  ocspUrls?: string[];
  caIssuersUrls?: string[];
  rawApiData?: ApiCaItem; // Optional: store raw for debugging or more details
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


// Helper to transform API CA item to local CA structure (without children)
function transformApiCaToLocalCa(apiCa: ApiCaItem): Omit<CA, 'children'> {
  let status: CA['status'] = 'unknown';
  const apiStatus = apiCa.certificate.status?.toUpperCase();
  if (apiStatus === 'ACTIVE') {
    status = new Date(apiCa.certificate.valid_to) < new Date() ? 'expired' : 'active';
  } else if (apiStatus === 'REVOKED') {
    status = 'revoked';
  } else if (apiStatus === 'EXPIRED') { // Assuming API might send EXPIRED
    status = 'expired';
  }

  let keyAlgorithm = apiCa.certificate.key_metadata.type;
  if (apiCa.certificate.key_metadata.bits) {
    keyAlgorithm += ` (${apiCa.certificate.key_metadata.bits} bit)`;
  } else if (apiCa.certificate.key_metadata.curve_name) {
    keyAlgorithm += ` (${apiCa.certificate.key_metadata.curve_name})`;
  }

  const pemData = typeof window !== 'undefined' ? window.atob(apiCa.certificate.certificate) : ''; // Decode base64 PEM
  const crlUrls = parseCrlUrlsFromPem(pemData);
  const aiaUrls = parseAiaUrls(pemData);

  return {
    id: apiCa.id,
    name: apiCa.certificate.subject.common_name || apiCa.id,
    issuer: apiCa.certificate.issuer_metadata.id === apiCa.id || apiCa.level === 0 ? 'Self-signed' : apiCa.certificate.issuer_metadata.id,
    expires: apiCa.certificate.valid_to,
    serialNumber: apiCa.certificate.serial_number,
    status,
    keyAlgorithm: keyAlgorithm,
    signatureAlgorithm: 'N/A (from API)', // Placeholder, not directly in this part of API response
    kmsKeyId: apiCa.certificate.engine_id,
    pemData: pemData,
    subjectKeyId: apiCa.certificate.subject_key_id,
    authorityKeyId: apiCa.certificate.authority_key_id,
    subjectDN: apiCa.certificate.subject,
    issuerDN: apiCa.certificate.issuer,
    isCa: apiCa.certificate.is_ca,
    level: apiCa.level,
    crlDistributionPoints: crlUrls,
    ocspUrls: aiaUrls.ocsp,
    caIssuersUrls: aiaUrls.caIssuers,
    rawApiData: apiCa,
  };
}

// Helper to build hierarchy from a flat list of CAs
function buildCaHierarchy(flatCaList: Omit<CA, 'children'>[]): CA[] {
  const caMap: Record<string, CA> = {};
  const roots: CA[] = [];

  // First pass: create a map and transform items to include children array
  flatCaList.forEach(apiCa => {
    caMap[apiCa.id] = { ...apiCa, children: [] };
  });

  // Second pass: build the hierarchy
  Object.values(caMap).forEach(ca => {
    if (ca.issuer && ca.issuer !== 'Self-signed' && caMap[ca.issuer]) {
      caMap[ca.issuer].children?.push(ca);
    } else if (ca.issuer === 'Self-signed' || !caMap[ca.issuer] ) { // Root or orphan (orphans become roots)
      roots.push(ca);
    }
  });
  
  // Sort children by name for consistent display
  const sortChildrenRecursive = (nodes: CA[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(node => {
      if (node.children) {
        sortChildrenRecursive(node.children);
      }
    });
  };
  sortChildrenRecursive(roots);

  return roots;
}


// Function to fetch, transform, and build hierarchy
export async function fetchAndProcessCAs(accessToken: string): Promise<CA[]> {
  const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errorJson;
    let errorMessage = `Failed to fetch CAs. HTTP error ${response.status}`;
    try {
      errorJson = await response.json();
      if (errorJson && errorJson.err) {
        errorMessage = `Failed to fetch CAs: ${errorJson.err}`;
      } else if (errorJson && errorJson.message) {
        errorMessage = `Failed to fetch CAs: ${errorJson.message}`;
      }
    } catch (e) {
      // Response was not JSON or JSON parsing failed
      console.error("Failed to parse error response as JSON for fetchAndProcessCAs:", e);
    }
    throw new Error(errorMessage);
  }

  const apiResponse: ApiResponseList = await response.json();
  if (!apiResponse.list) {
    console.warn("API response for CAs is missing 'list' property:", apiResponse);
    return [];
  }
  
  const transformedFlatList = apiResponse.list.map(apiCa => transformApiCaToLocalCa(apiCa));
  return buildCaHierarchy(transformedFlatList);
}


// Helper function to get CA display name for issuer
export function getCaDisplayName(caId: string, allCAs: CA[]): string {
  if (caId === 'Self-signed') return 'Self-signed';
  
  const ca = findCaById(caId, allCAs);
  return ca ? ca.name : caId; // Fallback to ID if not found
}

// Helper function to find a CA by its ID in the tree
export function findCaById(id: string | undefined | null, cas: CA[]): CA | null {
  if (!id) return null;
  for (const ca of cas) {
    if (ca.id === id) return ca;
    if (ca.children) {
      const found = findCaById(id, ca.children);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to find a CA by its common name in the tree (recursively)
export function findCaByCommonName(commonName: string | undefined | null, cas: CA[]): CA | null {
  if (!commonName) return null;
  for (const ca of cas) {
    // Ensure ca.name is used as it's the transformed common_name
    if (ca.name && ca.name.toLowerCase() === commonName.toLowerCase()) return ca; 
    if (ca.children) {
      const found = findCaByCommonName(commonName, ca.children);
      if (found) return found;
    }
  }
  return null;
}
