

// Define the CA data structure
import * as asn1js from "asn1js";
import { Certificate, CRLDistributionPoints, AuthorityInformationAccess, BasicConstraints } from "pkijs";
import type { ApiCryptoEngine } from '@/types/crypto-engine';

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
  caType?: string;
  defaultIssuanceLifetime?: string;
  pathLenConstraint?: number | 'None';
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

function parseSignatureAlgorithmFromPem(pem: string): string {
    if (typeof window === 'undefined' || !pem) return 'N/A';
    try {
        const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "");
        const binaryString = window.atob(pemString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const asn1 = asn1js.fromBER(bytes.buffer);
        if (asn1.offset === -1) return 'Parsing Error (ASN.1)';

        const certificate = new Certificate({ schema: asn1.result });
        const signatureAlgorithmOid = certificate.signatureAlgorithm.algorithmId;
        
        return SIG_OID_MAP[signatureAlgorithmOid] || signatureAlgorithmOid;

    } catch (e) {
        console.error("Failed to parse signature algorithm from certificate PEM:", e);
        return 'Parsing Error';
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
      if (point.distributionPoint && point.distributionPoint[0]) {
        const generalName = point.distributionPoint[0];
        urls.push(generalName.value);
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

function parsePathLenConstraintFromPem(pem: string): number | 'None' {
    if (typeof window === 'undefined' || !pem) return 'None';
    try {
        const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s/g, "");
        const binaryString = window.atob(pemString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const asn1 = asn1js.fromBER(bytes.buffer);
        if (asn1.offset === -1) return 'None';

        const certificate = new Certificate({ schema: asn1.result });
        const bcExtension = certificate.extensions?.find(ext => ext.extnID === "2.5.29.19"); // id-ce-basicConstraints

        if (bcExtension && bcExtension.parsedValue) {
            const basicConstraints = bcExtension.parsedValue as BasicConstraints;
            if (basicConstraints.pathLenConstraint !== undefined) {
                return basicConstraints.pathLenConstraint;
            }
        }
        return 'None';

    } catch (e) {
        console.error("Failed to parse Path Length Constraint from certificate PEM:", e);
        return 'None';
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
  const signatureAlgorithm = parseSignatureAlgorithmFromPem(pemData);
  const pathLenConstraint = parsePathLenConstraintFromPem(pemData);

  let defaultIssuanceLifetime = 'Not Specified';
  if (apiCa.validity) {
      if (apiCa.validity.type === 'Duration' && apiCa.validity.duration) {
          defaultIssuanceLifetime = apiCa.validity.duration;
      } else if (apiCa.validity.type === 'Date' && apiCa.validity.time) {
          if (apiCa.validity.time.startsWith('9999-12-31')) {
              defaultIssuanceLifetime = 'Indefinite';
          } else {
              defaultIssuanceLifetime = apiCa.validity.time; // Pass ISO string to be formatted by component
          }
      } else if (apiCa.validity.type === "Indefinite") {
          defaultIssuanceLifetime = "Indefinite";
      }
  }


  return {
    id: apiCa.id,
    name: apiCa.certificate.subject.common_name || apiCa.id,
    issuer: apiCa.certificate.issuer_metadata.id === apiCa.id || apiCa.level === 0 ? 'Self-signed' : apiCa.certificate.issuer_metadata.id,
    expires: apiCa.certificate.valid_to,
    serialNumber: apiCa.certificate.serial_number,
    status,
    keyAlgorithm: keyAlgorithm,
    signatureAlgorithm: signatureAlgorithm,
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
    caType: apiCa.certificate.type,
    defaultIssuanceLifetime: defaultIssuanceLifetime,
    pathLenConstraint: pathLenConstraint,
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
    } else if (ca.issuer === 'Self-signed' || !caMap[ca.issuer]) { // Root or orphan (orphans become roots)
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
export async function fetchAndProcessCAs(accessToken: string, apiQueryString?: string): Promise<CA[]> {
  const baseUrl = 'https://lab.lamassu.io/api/ca/v1/cas';
  const url = apiQueryString ? `${baseUrl}?${apiQueryString}` : baseUrl;

  const response = await fetch(url, {
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
      const found = findCaByCommonName(commonName, cas.children);
      if (found) return found;
    }
  }
  return null;
}

export async function fetchCryptoEngines(accessToken: string): Promise<ApiCryptoEngine[]> {
    const response = await fetch('https://lab.lamassu.io/api/ca/v1/engines', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to fetch crypto engines. HTTP error ${response.status}`;
        try {
            errorJson = await response.json();
            if (errorJson && errorJson.err) {
                errorMessage = `Failed to fetch crypto engines: ${errorJson.err}`;
            } else if (errorJson && errorJson.message) {
                errorMessage = `Failed to fetch crypto engines: ${errorJson.message}`;
            }
        } catch (e) {
            console.error("Failed to parse error response as JSON for crypto engines:", e);
        }
        throw new Error(errorMessage);
    }
    const enginesData: ApiCryptoEngine[] = await response.json();
    return enginesData;
}

// NEW: Function to create a CA
export interface CreateCaPayload {
  parent_id: string | null;
  id: string;
  engine_id: string;
  subject: {
    country?: string;
    state_province?: string;
    locality?: string;
    organization?: string;
    organization_unit?: string;
    common_name: string;
  };
  key_metadata: {
    type: string;
    bits: number;
  };
  ca_expiration: { type: string; duration?: string; time?: string };
  issuance_expiration: { type: string; duration?: string; time?: string };
  ca_type: "MANAGED";
}

export async function createCa(payload: CreateCaPayload, accessToken: string): Promise<void> {
  const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorJson;
    let errorMessage = `Failed to create CA. Status: ${response.status}`;
    try {
      errorJson = await response.json();
      errorMessage = `Failed to create CA: ${errorJson.err || errorJson.message || 'Unknown error'}`;
    } catch (e) {
      console.error("Failed to parse error response as JSON for CA creation:", e);
    }
    throw new Error(errorMessage);
  }
}
