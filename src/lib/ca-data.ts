
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
  children?: CA[];
}

// Mock CA data with static serial numbers
export const certificateAuthoritiesData: CA[] = [
  {
    id: 'root-ca-1',
    name: 'LamassuIoT Global Root CA G1',
    issuer: 'Self-signed',
    expires: '2045-12-31',
    serialNumber: '0A1B2C3D4E5F67890123',
    status: 'active',
    keyAlgorithm: 'RSA 4096 bit',
    signatureAlgorithm: 'SHA512withRSA',
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
          }
        ]
      },
    ],
  },
  {
    id: 'root-ca-2',
    name: 'LamassuIoT Test & Development Root CA',
    issuer: 'Self-signed',
    expires: '2030-01-01',
    serialNumber: '6A7B8C9D0E1F23456789',
    status: 'active',
    keyAlgorithm: 'ECDSA P-384',
    signatureAlgorithm: 'SHA384withECDSA',
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
        }
    ]
  },
  {
    id: 'root-ca-3',
    name: 'Old Partner Root CA (Revoked)',
    issuer: 'Self-signed',
    expires: '2025-05-05',
    serialNumber: '9A0B1C2D3E4F56789012',
    status: 'revoked',
    keyAlgorithm: 'RSA 2048 bit',
    signatureAlgorithm: 'SHA256withRSA',
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
