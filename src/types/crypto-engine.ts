
export interface ApiKeyTypeDetail {
  type: string; // e.g., "RSA", "ECDSA"
  sizes: (number | string)[]; // e.g., [2048, 3072] or ["P-256", "P-384"]
}

export interface ApiCryptoEngine {
  id: string;
  name: string;
  type: string; // e.g., "AWS_KMS", "GOLANG_CRYPTO" (API might use underscores)
  provider: string;
  security_level: number;
  metadata: Record<string, any>;
  supported_key_types: ApiKeyTypeDetail[];
  default: boolean;
}
