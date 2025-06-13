
// Define the CA data structure
export interface CA {
  id: string;
  name: string;
  issuer: string; // This will be the ID of the parent CA for intermediates, or "Self-signed" for roots
  expires: string;
  serialNumber: string;
  status: 'active' | 'expired' | 'revoked';
  keyAlgorithm: string;
  signatureAlgorithm: string;
  kmsKeyId?: string; // Added KMS Key ID
  pemData?: string; 
  children?: CA[];
}

// Mock PEM data generator
const generateMockPem = (name: string, id: string): string => {
  const header = `-----BEGIN CERTIFICATE-----`;
  const footer = `-----END CERTIFICATE-----`;
  const body = Buffer.from(`Subject: CN=${name}, ID=${id}\nIssuer: Mock CA\nValidity: Mock Dates\nPublicKey: Mock Key\nSignature: Mock Signature\n${crypto.randomBytes(64).toString('base64')}\n${crypto.randomBytes(64).toString('base64')}\n${crypto.randomBytes(64).toString('base64')}`).toString('base64').replace(/(.{64})/g, "$1\n");
  return `${header}\n${body}\n${footer}`;
};

// Mock CA data with static serial numbers, PEM data, and KMS Key IDs
export const certificateAuthoritiesData: CA[] = [
  {
    id: 'root-ca-1',
    name: 'LamassuIoT Global Root CA G1',
    issuer: 'Self-signed', // Self-signed
    expires: '2045-12-31',
    serialNumber: '0A1B2C3D4E5F67890123',
    status: 'active',
    keyAlgorithm: 'RSA 4096 bit',
    signatureAlgorithm: 'SHA512withRSA',
    kmsKeyId: 'key-pkcs11-global-root-g1', // KMS Key for this Root CA
    pemData: generateMockPem('LamassuIoT Global Root CA G1', 'root-ca-1'),
    children: [
      {
        id: 'intermediate-ca-1a',
        name: 'LamassuIoT Regional Services CA EU',
        issuer: 'root-ca-1',
        expires: '2040-06-30',
        serialNumber: '1A2B3C4D5E6F78901234',
        status: 'active',
        keyAlgorithm: 'RSA 2048 bit',
        signatureAlgorithm: 'SHA256withRSA',
        kmsKeyId: 'key-services-ca-eu', // KMS Key for this Intermediate CA
        pemData: generateMockPem('LamassuIoT Regional Services CA EU', 'intermediate-ca-1a'),
        children: [
          {
            id: 'signing-ca-1a1',
            name: 'Device Authentication CA EU West',
            issuer: 'intermediate-ca-1a',
            expires: '2035-01-15',
            serialNumber: '2A3B4C5D6E7F89012345',
            status: 'active',
            keyAlgorithm: 'ECDSA P-256',
            signatureAlgorithm: 'SHA256withECDSA',
            kmsKeyId: 'key-device-auth-eu-west', // KMS Key for this Signing CA
            pemData: generateMockPem('Device Authentication CA EU West', 'signing-ca-1a1'),
          },
          {
            id: 'signing-ca-1a2',
            name: 'Secure Update Service CA EU Central',
            issuer: 'intermediate-ca-1a',
            expires: '2038-03-22',
            serialNumber: '3A4B5C6D7E8F90123456',
            status: 'active',
            keyAlgorithm: 'RSA 2048 bit',
            signatureAlgorithm: 'SHA256withRSA',
            kmsKeyId: 'key-secure-update-eu-central', // KMS Key
            pemData: generateMockPem('Secure Update Service CA EU Central', 'signing-ca-1a2'),
          },
        ],
      },
      {
        id: 'intermediate-ca-1b',
        name: 'LamassuIoT Manufacturing CA US',
        issuer: 'root-ca-1',
        expires: '2039-10-10',
        serialNumber: '4A5B6C7D8E9F01234567',
        status: 'active',
        keyAlgorithm: 'RSA 3072 bit',
        signatureAlgorithm: 'SHA384withRSA',
        kmsKeyId: 'key-manufacturing-ca-us', // KMS Key
        pemData: generateMockPem('LamassuIoT Manufacturing CA US', 'intermediate-ca-1b'),
        children: [
           {
            id: 'signing-ca-1b1',
            name: 'Factory A Provisioning CA',
            issuer: 'intermediate-ca-1b',
            expires: '2030-07-12',
            serialNumber: '5A6B7C8D9E0F12345678',
            status: 'active',
            keyAlgorithm: 'RSA 2048 bit',
            signatureAlgorithm: 'SHA256withRSA',
            kmsKeyId: 'key-factory-a-provisioning', // KMS Key
            pemData: generateMockPem('Factory A Provisioning CA', 'signing-ca-1b1'),
          }
        ]
      },
      {
        id: 'intermediate-ca-1c-keyreuse',
        name: 'LamassuIoT Special Projects CA (Key Reuse Demo)',
        issuer: 'root-ca-1',
        expires: '2042-01-01',
        serialNumber: '1C2D3E4F5A6B7C8D9E0F',
        status: 'active',
        keyAlgorithm: 'RSA 2048 bit',
        signatureAlgorithm: 'SHA256withRSA',
        kmsKeyId: 'key-services-ca-eu', // Reusing key from intermediate-ca-1a
        pemData: generateMockPem('LamassuIoT Special Projects CA', 'intermediate-ca-1c-keyreuse'),
      },
      {
        id: 'cross-cert-for-test-root-by-g1',
        name: 'LamassuIoT Test &amp; Development CA (Cross-Cert by Global G1)',
        issuer: 'root-ca-1', // Issued by Global Root CA G1
        expires: '2030-01-01', // Matching original test root's expiry for clarity
        serialNumber: 'CROSS001002003004AABB',
        status: 'active',
        keyAlgorithm: 'ECDSA P-384', // Matches the key type of 'key-test-dev-root'
        signatureAlgorithm: 'SHA384withECDSA',
        kmsKeyId: 'key-test-dev-root', // &lt;&lt; Uses the same key as the self-signed Test &amp; Development Root
        pemData: generateMockPem('LamassuIoT Test &amp; Development CA (Cross-Cert by Global G1)', 'cross-cert-for-test-root-by-g1'),
        children: [] // This certificate for the key doesn't issue other CAs itself
      }
    ],
  },
  {
    id: 'root-ca-2',
    name: 'LamassuIoT Test &amp; Development Root CA',
    issuer: 'Self-signed', // Self-signed
    expires: '2030-01-01',
    serialNumber: '6A7B8C9D0E1F23456789',
    status: 'active',
    keyAlgorithm: 'ECDSA P-384',
    signatureAlgorithm: 'SHA384withECDSA',
    kmsKeyId: 'key-test-dev-root', // KMS Key for this self-signed root
    pemData: generateMockPem('LamassuIoT Test &amp; Development Root CA', 'root-ca-2'),
    children: [
        {
          id: 'intermediate-ca-2a',
          name: 'Staging Environment CA',
          issuer: 'root-ca-2',
          expires: '2028-07-07',
          serialNumber: '7A8B9C0D1E2F34567890',
          status: 'active',
          keyAlgorithm: 'ECDSA P-256',
          signatureAlgorithm: 'SHA256withECDSA',
          kmsKeyId: 'key-staging-env-ca', // KMS Key
          pemData: generateMockPem('Staging Environment CA', 'intermediate-ca-2a'),
        },
        {
          id: 'intermediate-ca-2b',
          name: 'QA Services CA (Expired)',
          issuer: 'root-ca-2',
          expires: '2023-01-01', // Expired
          serialNumber: '8A9B0C1D2E3F45678901',
          status: 'expired',
          keyAlgorithm: 'RSA 2048 bit',
          signatureAlgorithm: 'SHA256withRSA',
          kmsKeyId: 'key-qa-services-ca-expired', // KMS Key
          pemData: generateMockPem('QA Services CA (Expired)', 'intermediate-ca-2b'),
        }
    ]
  },
  {
    id: 'root-ca-3',
    name: 'Old Partner Root CA (Revoked)',
    issuer: 'Self-signed', // Self-signed
    expires: '2025-05-05',
    serialNumber: '9A0B1C2D3E4F56789012',
    status: 'revoked',
    keyAlgorithm: 'RSA 2048 bit',
    signatureAlgorithm: 'SHA256withRSA',
    kmsKeyId: 'key-old-partner-root-revoked', // KMS Key
    pemData: generateMockPem('Old Partner Root CA (Revoked)', 'root-ca-3'),
  }
];

// Helper function to get CA display name for issuer
export function getCaDisplayName(caId: string, allCAs: CA[]): string {
  if (caId === 'Self-signed') return 'Self-signed';
  
  function findCa(id: string, cas: CA[]): CA | undefined {
    for (const ca of cas) {
      if (ca.id === id) return ca;
      if (ca.children) {
        const found = findCa(id, ca.children);
        if (found) return found;
      }
    }
    return undefined;
  }
  const ca = findCa(caId, allCAs);
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
    if (ca.name.toLowerCase() === commonName.toLowerCase()) return ca; // Case-insensitive comparison
    if (ca.children) {
      const found = findCaByCommonName(commonName, ca.children);
      if (found) return found;
    }
  }
  return null;
}


// crypto needed for mock PEM generation
import crypto from 'crypto';

