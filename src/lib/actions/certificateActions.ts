'use server';

import type { CertificateData, VerificationStatus } from '@/types/certificate';
import { z } from 'zod';
import crypto from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['application/x-x509-ca-cert', 'application/x-pem-file', 'application/pkix-cert', 'text/plain'];


const ImportCertificateSchema = z.object({
  certificateFile: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    // .refine((file) => ALLOWED_FILE_TYPES.includes(file.type) || file.name.endsWith('.pem') || file.name.endsWith('.crt') || file.name.endsWith('.cer') , "Only .pem, .crt, .cer files are allowed.")
    // For some reason, .pem, .crt, .cer files are often uploaded as 'application/octet-stream' or empty string type by browser
    // So we rely on file extension check primarily and allow broader MIME types.
    .refine((file) => file.name.endsWith('.pem') || file.name.endsWith('.crt') || file.name.endsWith('.cer') , "Only .pem, .crt, .cer files are allowed.")
});


export async function importCertificateAction(
  prevState: { message: string; certificate?: CertificateData, errorFields?: Record<string, string[]> },
  formData: FormData
): Promise<{ message: string; certificate?: CertificateData, errorFields?: Record<string, string[]> }> {
  const certificateFile = formData.get('certificateFile');

  const validatedFields = ImportCertificateSchema.safeParse({
    certificateFile: certificateFile,
  });

  if (!validatedFields.success) {
    const errorFields: Record<string, string[]> = {};
    for (const issue of validatedFields.error.issues) {
      errorFields[issue.path[0]] = [...(errorFields[issue.path[0]] || []), issue.message];
    }
    return {
      message: 'Invalid input for certificate file.',
      errorFields,
    };
  }
  
  const file = validatedFields.data.certificateFile;

  try {
    const fileContent = await file.text();

    // Mock parsing the certificate
    // In a real application, use a library like 'node-forge' or 'openssl'
    const commonNameMatch = fileContent.match(/Subject:.*?CN=([^,/]+)/);
    const issuerCNMatch = fileContent.match(/Issuer:.*?CN=([^,/]+)/);
    
    // Simple placeholder logic
    const subject = commonNameMatch ? `CN=${commonNameMatch[1]}` : `CN=example-${Date.now() % 1000}.com, O=My Org`;
    const issuer = issuerCNMatch ? `CN=${issuerCNMatch[1]}` : 'CN=Example CA, O=Example Org';
    
    // Placeholder SANs - a real parser would extract these
    const sans = subject.includes('example.com') ? ['dns:example.com', 'dns:www.example.com'] : [];

    const newCert: CertificateData = {
      id: crypto.randomUUID(),
      fileName: file.name,
      subject,
      issuer,
      serialNumber: crypto.randomBytes(8).toString('hex'), // Placeholder
      validFrom: new Date(Date.now() - Math.random() * 100 * 24 * 60 * 60 * 1000).toISOString(), // Randomly in the past
      validTo: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000) * (Math.random() + 0.5)).toISOString(), // 0.5 to 1.5 years validity
      sans,
      pemData: fileContent,
      verificationStatus: 'unverified',
      verificationDetails: 'Certificate has not been verified yet.',
      publicKeyAlgorithm: 'RSA (2048 bits)', // Placeholder
      signatureAlgorithm: 'SHA256withRSA', // Placeholder
      fingerprintSha256: crypto.createHash('sha256').update(fileContent).digest('hex'), // Placeholder
    };

    return { message: 'Certificate imported successfully.', certificate: newCert };
  } catch (error) {
    console.error('Error importing certificate:', error);
    return { message: 'Failed to import certificate. Could not read file content.' };
  }
}

export async function verifyCertificateAction(
  certificateId: string,
  pemData: string // In a real scenario, you might just use ID to fetch full cert from a DB
): Promise<{ success: boolean; status: VerificationStatus; details: string }> {
  // Simulate verification delay and process
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Mocked verification logic
  // A real implementation would involve:
  // 1. Parsing the certificate (again, or from stored parsed data).
  // 2. Building a chain.
  // 3. Verifying against a trust store of Root CAs.
  // 4. Checking revocation status (CRL/OCSP).
  // 5. Checking validity period.

  const randomOutcome = Math.random();

  if (randomOutcome < 0.05) { // 5% chance of error during verification
      return { success: false, status: 'error', details: 'An unexpected error occurred during verification.' };
  }
  if (randomOutcome < 0.15) { // 10% chance of expired
    return { success: false, status: 'expired', details: 'Certificate is expired.' };
  }
  if (randomOutcome < 0.25) { // 10% chance of invalid path
    return { success: false, status: 'invalid_path', details: 'Certificate validation failed: Unable to find a valid certification path to a trusted root CA.' };
  }
  // 75% chance of successful verification for this mock
  return { success: true, status: 'verified', details: 'Certificate chain verified successfully against trusted roots. Not Expired. Not Revoked (mocked).' };
}
