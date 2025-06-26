
export interface CertificateData {
  id: string; // Using serial number as ID from API
  fileName: string; // Synthesized
  subject: string; // Common Name or fallback
  issuer: string; // Issuer Common Name or fallback
  serialNumber: string;
  validFrom: string; // ISO date string
  validTo: string; // ISO date string
  sans: string[]; // May need to be parsed from PEM or fetched from a detail endpoint
  pemData: string;
  publicKeyAlgorithm?: string;
  signatureAlgorithm?: string;
  fingerprintSha256?: string;
  issuerCaId?: string; // ID of the CA that issued this certificate
  apiStatus?: string; // To store the raw status from the API
  revocationReason?: string;
  rawApiData?: any; // To store the original API response for this certificate
  ocspUrls?: string[]; // Added for OCSP check feature
  crlDistributionPoints?: string[];
  caIssuersUrls?: string[];
}
