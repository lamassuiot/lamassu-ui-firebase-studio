
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, KeyRound, Info, FileText, ShieldCheck, FileSignature, Loader2, AlertTriangle, PenTool } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { KmsPublicKeyPemTabContent } from '@/components/kms/details/KmsPublicKeyPemTabContent';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { DetailItem } from '@/components/shared/DetailItem';

interface ApiKmsKey {
  id: string;
  algorithm: string;
  size: string;
  publicKey: string;
}

interface KmsKeyDetailed {
  id: string;
  alias: string;
  keyTypeDisplay: string; 
  algorithm: 'RSA' | 'ECDSA' | 'ML-DSA' | 'Unknown'; 
  keySize?: string | number; 
  status: 'Enabled' | 'Disabled' | 'PendingDeletion';
  hasPrivateKey: boolean;
  publicKeyPem?: string;
}

const signatureAlgorithms = [
  'RSASSA_PSS_SHA_256', 'RSASSA_PSS_SHA_384', 'RSASSA_PSS_SHA_512',
  'RSASSA_PKCS1_V1_5_SHA_256', 'RSASSA_PKCS1_V1_5_SHA_384', 'RSASSA_PKCS1_V1_5_SHA_512',
  'ECDSA_SHA_256', 'ECDSA_SHA_384', 'ECDSA_SHA_512',
  'ML-DSA-44', 'ML-DSA-65', 'ML-DSA-87'
];

const StatusBadge: React.FC<{ status: KmsKeyDetailed['status'] }> = ({ status }) => {
  let badgeClass = "bg-muted text-muted-foreground border-border";
  if (status === 'Enabled') badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
  else if (status === 'Disabled') badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
  else if (status === 'PendingDeletion') badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
  return <Badge variant="outline" className={cn("text-xs", badgeClass)}>{status}</Badge>;
};

export default function KmsKeyDetailsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const keyId = searchParams.get('keyId');

  const [keyDetails, setKeyDetails] = useState<KmsKeyDetailed | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const tabFromQuery = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabFromQuery || 'overview');

  // State for Sign Tab
  const [signAlgorithm, setSignAlgorithm] = useState(signatureAlgorithms[3]);
  const [signMessageType, setSignMessageType] = useState('RAW');
  const [signPayloadEncoding, setSignPayloadEncoding] = useState('PLAIN_TEXT');
  const [payloadToSign, setPayloadToSign] = useState('');
  const [generatedSignature, setGeneratedSignature] = useState('');

  // State for Verify Tab
  const [verifyAlgorithm, setVerifyAlgorithm] = useState(signatureAlgorithms[3]);
  const [verifyMessageType, setVerifyMessageType] = useState('RAW');
  const [verifyPayloadEncoding, setVerifyPayloadEncoding] = useState('PLAIN_TEXT');
  const [unsignedPayload, setUnsignedPayload] = useState('');
  const [signatureToVerify, setSignatureToVerify] = useState('');

  // State for CSR Tab
  const [csrCommonName, setCsrCommonName] = useState('');
  const [csrOrganization, setCsrOrganization] = useState('');
  const [generatedCsr, setGeneratedCsr] = useState('');

  const fetchKeyData = useCallback(async () => {
    if (!keyId) {
      setError("Key ID is missing from URL.");
      setIsLoading(false);
      return;
    }

    if (authLoading || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()) {
            setError("User not authenticated. Please log in.");
        }
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://lab.lamassu.io/api/ca/v1/kms/keys', {
        headers: { 'Authorization': `Bearer ${user.access_token}` },
      });
      if (!response.ok) throw new Error(`Failed to fetch keys. HTTP Status: ${response.status}`);
      const allKeys: ApiKmsKey[] = await response.json();
      const apiKey = allKeys.find(k => k.id === keyId);

      if (apiKey) {
        let pem = '';
        try {
          // In-browser Base64 decoding
          const decodedKey = atob(apiKey.publicKey);
          pem = `-----BEGIN PUBLIC KEY-----\n${decodedKey.match(/.{1,64}/g)?.join('\n') || ''}\n-----END PUBLIC KEY-----`;
        } catch (e) {
          console.error("Failed to decode public key", e);
          pem = "Error: Could not decode or format public key.";
        }

        const algorithm = apiKey.algorithm.toUpperCase() as KmsKeyDetailed['algorithm'];
        const detailedKey: KmsKeyDetailed = {
          id: apiKey.id,
          alias: apiKey.id,
          keyTypeDisplay: `${apiKey.algorithm} ${apiKey.size}`,
          algorithm: ['RSA', 'ECDSA', 'ML-DSA'].includes(algorithm) ? algorithm : 'Unknown',
          keySize: apiKey.size,
          status: 'Enabled', // Default as API doesn't provide it
          hasPrivateKey: apiKey.id.includes('type=private'),
          publicKeyPem: pem,
        };
        setKeyDetails(detailedKey);
        setCsrCommonName(detailedKey.alias || '');

        if (detailedKey.algorithm === 'RSA') {
          setSignAlgorithm('RSASSA_PKCS1_V1_5_SHA_256');
          setVerifyAlgorithm('RSASSA_PKCS1_V1_5_SHA_256');
        } else if (detailedKey.algorithm === 'ECDSA') {
          setSignAlgorithm('ECDSA_SHA_256');
          setVerifyAlgorithm('ECDSA_SHA_256');
        } else if (detailedKey.algorithm === 'ML-DSA') {
          const defaultMlDsaAlgo = detailedKey.keySize === 'ML-DSA-44' ? 'ML-DSA-44' :
                                   detailedKey.keySize === 'ML-DSA-87' ? 'ML-DSA-87' : 'ML-DSA-65';
          setSignAlgorithm(defaultMlDsaAlgo);
          setVerifyAlgorithm(defaultMlDsaAlgo);
        }

      } else {
        setError(`KMS Key with ID "${keyId}" not found.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load key details.');
    } finally {
      setIsLoading(false);
    }
  }, [keyId, authLoading, isAuthenticated, user?.access_token]);

  useEffect(() => {
    fetchKeyData();
  }, [fetchKeyData]);

  useEffect(() => {
     const currentTab = searchParams.get('tab');
     setActiveTab(currentTab || 'overview');
  }, [searchParams]);

  const handleSign = () => {
    if (!payloadToSign) {
      toast({ title: "Sign Error", description: "Payload to sign cannot be empty.", variant: "destructive" });
      return;
    }
    console.log("Mock Sign:", { signAlgorithm, signMessageType, signPayloadEncoding, payloadToSign });
    setGeneratedSignature(`mock-sig-${Date.now()}-${payloadToSign.substring(0,10)}`);
    toast({ title: "Mock Sign Success", description: "Signature generated (mock)." });
  };

  const handleVerify = () => {
    if (!unsignedPayload || !signatureToVerify) {
      toast({ title: "Verify Error", description: "Unsigned payload and signature cannot be empty.", variant: "destructive" });
      return;
    }
    console.log("Mock Verify:", { verifyAlgorithm, verifyMessageType, verifyPayloadEncoding, unsignedPayload, signatureToVerify });
    const isValid = Math.random() > 0.3; 
    toast({ title: "Mock Verify Result", description: `Signature is ${isValid ? 'VALID' : 'INVALID'} (mock).`, variant: isValid ? "default" : "destructive" });
  };
  
  const handleGenerateCsr = () => {
    if (!csrCommonName) {
        toast({ title: "CSR Generation Error", description: "Common Name (CN) is required for CSR.", variant: "destructive" });
        return;
    }
    console.log("Mock CSR Generation:", { commonName: csrCommonName, organization: csrOrganization, keyId: keyDetails?.id });
    const mockCsrContent = `-----BEGIN CERTIFICATE REQUEST-----\n`+
                           `MIICvDCCAaQCAQAwdzELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWEx\\n`+
                           `... (mock CSR content for ${csrCommonName}) ...\\n`+
                           `MGFqLg==\\n`+
                           `-----END CERTIFICATE REQUEST-----`;
    setGeneratedCsr(mockCsrContent);
    toast({ title: "Mock CSR Generated", description: "CSR content populated (mock)." });
  };

  if (isLoading || authLoading) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading KMS Key details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full space-y-4 p-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Key</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!keyDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <KeyRound className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">KMS Key with ID "{keyId || 'Unknown'}" not found.</p>
        <Button variant="outline" onClick={() => router.push('/kms/keys')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to KMS Keys
        </Button>
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div>
              <div className="flex items-center space-x-3">
                <KeyRound className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold truncate" title={keyDetails.alias}>
                  {keyDetails.alias}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Key ID: {keyDetails.id}
              </p>
            </div>
            <StatusBadge status={keyDetails.status} />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-6">
          <TabsList className="mb-6">
            <TabsTrigger value="overview"><Info className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Overview</TabsTrigger>
            <TabsTrigger value="public-key"><FileText className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Public Key</TabsTrigger>
            <TabsTrigger value="sign" disabled={!keyDetails.hasPrivateKey}><PenTool className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Sign</TabsTrigger>
            <TabsTrigger value="verify"><ShieldCheck className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Verify</TabsTrigger>
            <TabsTrigger value="generate-csr" disabled={!keyDetails.hasPrivateKey}><FileSignature className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Generate CSR</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Key Overview</CardTitle>
                <CardDescription>General information about this KMS key.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailItem label="Key ID" value={keyDetails.id} isMono fullWidthValue/>
                <DetailItem label="Alias" value={keyDetails.alias} isMono fullWidthValue/>
                <DetailItem label="Status" value={<StatusBadge status={keyDetails.status} />} />
                <DetailItem label="Key Type" value={keyDetails.algorithm} />
                <DetailItem label="Specification" value={keyDetails.keyTypeDisplay} />
                <DetailItem label="Private Key Accessible" value={keyDetails.hasPrivateKey ? "Yes" : "No (Public Key Only)"} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public-key">
            <KmsPublicKeyPemTabContent
              publicKeyPem={keyDetails.publicKeyPem}
              itemName={keyDetails.alias}
              toast={toast}
            />
          </TabsContent>

          <TabsContent value="sign">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><PenTool className="mr-2 h-5 w-5 text-primary"/>Sign Data</CardTitle>
                    <CardDescription>Perform cryptographic sign operations using this key. (Mock functionality)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="signAlgorithm">Algorithm</Label>
                        <Select value={signAlgorithm} onValueChange={setSignAlgorithm}>
                            <SelectTrigger id="signAlgorithm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {signatureAlgorithms.map(algo => (
                                    <SelectItem key={algo} value={algo} disabled={
                                        (keyDetails.algorithm === 'RSA' && !algo.startsWith('RSASSA')) ||
                                        (keyDetails.algorithm === 'ECDSA' && !algo.startsWith('ECDSA')) ||
                                        (keyDetails.algorithm === 'ML-DSA' && !algo.startsWith('ML-DSA'))
                                    }>{algo}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="signMessageType">Message Type</Label>
                         <Select value={signMessageType} onValueChange={setSignMessageType}>
                            <SelectTrigger id="signMessageType"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RAW">Raw</SelectItem>
                                <SelectItem value="DIGEST">Digest (pre-hashed)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="signPayloadEncoding">Payload Encoding Format</Label>
                        <Select value={signPayloadEncoding} onValueChange={setSignPayloadEncoding}>
                            <SelectTrigger id="signPayloadEncoding"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PLAIN_TEXT">Plain Text</SelectItem>
                                <SelectItem value="BASE64">Base64</SelectItem>
                                <SelectItem value="HEX">Hexadecimal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="payloadToSign">Payload to Sign</Label>
                        <Textarea id="payloadToSign" value={payloadToSign} onChange={e => setPayloadToSign(e.target.value)} placeholder="Enter data to be signed..." rows={4} />
                    </div>
                    <Button onClick={handleSign} className="w-full sm:w-auto">Sign</Button>
                    {generatedSignature && (
                        <div>
                            <Label htmlFor="generatedSignature">Generated Signature (Base64)</Label>
                            <Textarea id="generatedSignature" value={generatedSignature} readOnly rows={3} className="font-mono bg-muted/50"/>
                        </div>
                    )}
                </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verify">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/>Verify Signature</CardTitle>
                    <CardDescription>Perform cryptographic verify operations using this key's public component. (Mock functionality)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="verifyAlgorithm">Algorithm</Label>
                        <Select value={verifyAlgorithm} onValueChange={setVerifyAlgorithm}>
                            <SelectTrigger id="verifyAlgorithm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {signatureAlgorithms.map(algo => (
                                     <SelectItem key={algo} value={algo} disabled={
                                        (keyDetails.algorithm === 'RSA' && !algo.startsWith('RSASSA')) ||
                                        (keyDetails.algorithm === 'ECDSA' && !algo.startsWith('ECDSA')) ||
                                        (keyDetails.algorithm === 'ML-DSA' && !algo.startsWith('ML-DSA'))
                                    }>{algo}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="verifyMessageType">Message Type</Label>
                        <Select value={verifyMessageType} onValueChange={setVerifyMessageType}>
                            <SelectTrigger id="verifyMessageType"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="RAW">Raw</SelectItem>
                                <SelectItem value="DIGEST">Digest (pre-hashed)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                       <Label htmlFor="verifyPayloadEncoding">Unsigned Payload Encoding Format</Label>
                       <Select value={verifyPayloadEncoding} onValueChange={setVerifyPayloadEncoding}>
                            <SelectTrigger id="verifyPayloadEncoding"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PLAIN_TEXT">Plain Text</SelectItem>
                                <SelectItem value="BASE64">Base64</SelectItem>
                                <SelectItem value="HEX">Hexadecimal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="unsignedPayload">Unsigned Payload</Label>
                        <Textarea id="unsignedPayload" value={unsignedPayload} onChange={e => setUnsignedPayload(e.target.value)} placeholder="Enter the original unsigned data..." rows={3}/>
                    </div>
                    <div>
                        <Label htmlFor="signatureToVerify">Signature (Base64)</Label>
                        <Textarea id="signatureToVerify" value={signatureToVerify} onChange={e => setSignatureToVerify(e.target.value)} placeholder="Enter the signature to verify..." rows={3} className="font-mono"/>
                    </div>
                    <Button onClick={handleVerify} className="w-full sm:w-auto">Verify</Button>
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate-csr">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><FileSignature className="mr-2 h-5 w-5 text-primary"/>Generate Certificate Signing Request (CSR)</CardTitle>
                    <CardDescription>Create a CSR using this key pair to request a certificate from a CA. (Mock functionality)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label htmlFor="csrCommonName">Common Name (CN)</Label>
                        <Input id="csrCommonName" value={csrCommonName} onChange={e => setCsrCommonName(e.target.value)} placeholder="e.g., mydevice.example.com" required />
                     </div>
                     <div>
                        <Label htmlFor="csrOrganization">Organization (O)</Label>
                        <Input id="csrOrganization" value={csrOrganization} onChange={e => setCsrOrganization(e.target.value)} placeholder="e.g., LamassuIoT Corp" />
                     </div>
                     <Button onClick={handleGenerateCsr} className="w-full sm:w-auto">Generate CSR</Button>
                     {generatedCsr && (
                        <div className="mt-4">
                            <Label htmlFor="generatedCsrPem">Generated CSR (PEM)</Label>
                            <Textarea id="generatedCsrPem" value={generatedCsr} readOnly rows={10} className="font-mono bg-muted/50"/>
                        </div>
                     )}
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
