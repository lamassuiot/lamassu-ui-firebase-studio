export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'invalid_path' | 'expired' | 'revoked' | 'error';

export interface CertificateData {
  id: string;
  fileName: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string; // ISO date string
  validTo: string; // ISO date string
  sans: string[]; // Subject Alternative Names
  pemData: string;
  verificationStatus: VerificationStatus;
  verificationDetails: string;
  publicKeyAlgorithm?: string;
  signatureAlgorithm?: string;
  fingerprintSha256?: string;
}
