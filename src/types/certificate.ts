export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'invalid_path' | 'expired' | 'revoked' | 'error';

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
  verificationStatus: VerificationStatus;
  verificationDetails: string;
  publicKeyAlgorithm?: string;
  signatureAlgorithm?: string;
  fingerprintSha256?: string; // Would need client-side calculation or detail endpoint
  issuerCaId?: string; // ID of the CA that issued this certificate
  rawApiData?: any; // To store the original API response for this certificate
}
