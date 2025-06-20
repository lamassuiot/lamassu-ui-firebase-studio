
'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle, FileSignature } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to format Base64 as PEM
function formatAsPem(base64String: string, type: 'PRIVATE KEY' | 'PUBLIC KEY' | 'CERTIFICATE REQUEST'): string {
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;
  const body = base64String.match(/.{1,64}/g)?.join('\n') || '';
  return `${header}\n${body}\n${footer}`;
}

const availableAlgorithms = [
  { value: 'RSA', label: 'RSA' },
  { value: 'ECDSA', label: 'ECDSA' },
];

const rsaKeySizes = [
  { value: '2048', label: '2048-bit' },
  { value: '3072', label: '3072-bit' },
  { value: '4096', label: '4096-bit' },
];

const ecdsaCurves = [
  { value: 'P-256', label: 'P-256 (secp256r1)' },
  { value: 'P-384', label: 'P-384 (secp384r1)' },
  { value: 'P-521', label: 'P-521 (secp521r1)' },
];

// Function to create a simplified, simulated CSR PEM string
async function createSimulatedCsrPem(
  keyPair: CryptoKeyPair,
  subject: { cn: string; o?: string; ou?: string; l?: string; st?: string; c?: string }
): Promise<string> {
  // Export public key in SPKI format
  const publicKeySpkiBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeySpkiBase64 = arrayBufferToBase64(publicKeySpkiBuffer);

  // Construct a simplified subject string for the CSR
  let subjectString = `CN=${subject.cn}`;
  if (subject.o) subjectString += `/O=${subject.o}`;
  if (subject.ou) subjectString += `/OU=${subject.ou}`;
  if (subject.l) subjectString += `/L=${subject.l}`;
  if (subject.st) subjectString += `/ST=${subject.st}`;
  if (subject.c) subjectString += `/C=${subject.c}`;

  // Simulate the ASN.1 content (this is NOT a real ASN.1 structure)
  const simulatedAsn1Content = `
    Version: 0 (0x0)
    Subject: ${subjectString}
    Subject Public Key Info:
        Public Key Algorithm: ${keyPair.publicKey.algorithm.name}
        ${keyPair.publicKey.algorithm.name === 'RSA' ? `RSA Public-Key: (${(keyPair.publicKey.algorithm as RsaHashedKeyAlgorithm).modulusLength} bit)` : ''}
        ${keyPair.publicKey.algorithm.name === 'ECDSA' ? `EC Public Key: (${(keyPair.publicKey.algorithm as EcKeyAlgorithm).namedCurve})` : ''}
        pub:
            ${publicKeySpkiBase64.match(/.{1,60}/g)?.join('\n            ') || ''}
    Attributes:
        a0:00
  `;
  // (Actual CSRs are binary ASN.1 DER encoded, then base64. This is a text placeholder.)

  const simulatedCsrBodyBase64 = arrayBufferToBase64(new TextEncoder().encode(simulatedAsn1Content + `\n\n---SimulatedPublicKeyBelow---\n${publicKeySpkiBase64}`));
  return formatAsPem(simulatedCsrBodyBase64, 'CERTIFICATE REQUEST');
}


export default function IssueCertificateFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caId = searchParams.get('caId');

  // Form fields state
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [validityDays, setValidityDays] = useState('365');
  const [sans, setSans] = useState('');
  const [csrPem, setCsrPem] = useState(''); // For manual input or generated CSR

  // Key generation state
  const [generatedKeyPair, setGeneratedKeyPair] = useState<CryptoKeyPair | null>(null);
  const [generatedPrivateKeyPem, setGeneratedPrivateKeyPem] = useState<string>('');
  const [generatedCsrPem, setGeneratedCsrPem] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('RSA');
  const [selectedRsaKeySize, setSelectedRsaKeySize] = useState<string>('2048');
  const [selectedEcdsaCurve, setSelectedEcdsaCurve] = useState<string>('P-256');


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
      alert("Error: CA ID is missing from the URL.");
      return;
    }

    // Use generatedCsrPem if available, otherwise use manually entered csrPem
    const finalCsrPem = generatedCsrPem || csrPem;

    if (!finalCsrPem && !generatedPrivateKeyPem) {
      alert("Error: Please provide a CSR or generate a new key pair and CSR.");
      return;
    }
    if (!commonName.trim()) {
        alert("Error: Common Name (CN) is required.");
        return;
    }

    console.log(`Issuing certificate from CA: ${caId} with form data...`);
    console.log({
        commonName,
        organization,
        validityDays,
        sans,
        csrToSubmit: finalCsrPem
    });
    alert(`Mock issue certificate from CA ${caId}. CSR submitted (check console). This would typically send the CSR to the CA API.`);
  };

  const handleGenerateKeyPairAndCsr = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedPrivateKeyPem('');
    setGeneratedCsrPem('');
    setGeneratedKeyPair(null);
    setCsrPem(''); // Clear manual CSR input

    try {
      let algorithmDetails: AlgorithmIdentifier | RsaHashedKeyGenParams | EcKeyGenParams;
      let keyUsages: KeyUsage[];

      if (selectedAlgorithm === 'RSA') {
        algorithmDetails = {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: parseInt(selectedRsaKeySize, 10),
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: "SHA-256",
        };
        keyUsages = ["sign", "verify"];
      } else if (selectedAlgorithm === 'ECDSA') {
        algorithmDetails = {
          name: "ECDSA",
          namedCurve: selectedEcdsaCurve,
        };
        keyUsages = ["sign", "verify"];
      } else {
        throw new Error("Unsupported algorithm selected");
      }

      const keyPair = await window.crypto.subtle.generateKey(
        algorithmDetails,
        true, 
        keyUsages
      );
      setGeneratedKeyPair(keyPair);

      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);
      const privateKeyPemOutput = formatAsPem(privateKeyBase64, 'PRIVATE KEY');
      setGeneratedPrivateKeyPem(privateKeyPemOutput);
      
      // Gather subject info for CSR
      const currentCN = (document.getElementById('commonName') as HTMLInputElement)?.value || 'example.com';
      const currentOrg = (document.getElementById('organization') as HTMLInputElement)?.value || 'Example Org';

      const csrSubject = {
        cn: currentCN,
        o: currentOrg,
        // Add more subject fields if needed (OU, L, ST, C) from form
      };
      const simulatedCsr = await createSimulatedCsrPem(keyPair, csrSubject);
      setGeneratedCsrPem(simulatedCsr);
      setCsrPem(simulatedCsr); // Auto-populate the main CSR field

    } catch (error: any) {
      console.error("Key pair or CSR generation error:", error);
      setGenerationError(`Failed to generate: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!caId) {
    return (
      <div className="w-full space-y-6 p-4">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error: CA ID is missing from URL. Cannot issue certificate.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CA Details
      </Button>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FilePlus2 className="h-7 w-7 text-primary" />
            <CardTitle className="text-xl font-headline">Issue Certificate from CA: {caId.substring(0, 12)}...</CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            Fill out the details below to issue a new certificate signed by this CA.
            You can either provide a CSR or generate a new key pair and CSR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <section>
              <h3 className="text-lg font-medium mb-3">Certificate Subject & Validity</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commonName">Common Name (CN)</Label>
                  <Input id="commonName" name="commonName" type="text" placeholder="e.g., mydevice.example.com" required className="mt-1" value={commonName} onChange={e => setCommonName(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="organization">Organization (O)</Label>
                  <Input id="organization" name="organization" type="text" placeholder="e.g., LamassuIoT Corp" className="mt-1" value={organization} onChange={e => setOrganization(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="validityDays">Validity (Days)</Label>
                  <Input id="validityDays" name="validityDays" type="number" defaultValue={validityDays} required className="mt-1" onChange={e => setValidityDays(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="sans">Subject Alternative Names (SANs, comma-separated)</Label>
                  <Input id="sans" name="sans" type="text" placeholder="e.g., dns:alt.example.com,ip:192.168.1.10" className="mt-1" value={sans} onChange={e => setSans(e.target.value)}/>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-medium mb-1">Key Material & CSR</h3>
              <p className="text-xs text-muted-foreground mb-3">Provide a CSR or generate a new key pair and CSR.</p>
              
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <Label htmlFor="csr">Certificate Signing Request (CSR)</Label>
                <Textarea 
                    id="csr" 
                    name="csr" 
                    placeholder="-----BEGIN CERTIFICATE REQUEST-----\n..." 
                    rows={6} 
                    className="mt-1 font-mono bg-background" 
                    value={csrPem}
                    onChange={(e) => setCsrPem(e.target.value)}
                    disabled={!!generatedCsrPem} // Disable if CSR was auto-generated
                />
                {generatedCsrPem && <p className="text-xs text-amber-600 dark:text-amber-400">CSR field populated from generated key. Clear generated key to manually edit.</p>}
              </div>

              <div className="my-4 text-center text-sm text-muted-foreground">OR</div>

              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <Label>Generate New Key Pair & CSR</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="keyAlgorithm">Algorithm</Label>
                    <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm} disabled={isGenerating}>
                      <SelectTrigger id="keyAlgorithm" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableAlgorithms.map(algo => (
                          <SelectItem key={algo.value} value={algo.value}>{algo.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedAlgorithm === 'RSA' && (
                    <div>
                      <Label htmlFor="rsaKeySize">RSA Key Size</Label>
                      <Select value={selectedRsaKeySize} onValueChange={setSelectedRsaKeySize} disabled={isGenerating}>
                        <SelectTrigger id="rsaKeySize" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {rsaKeySizes.map(size => (
                            <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {selectedAlgorithm === 'ECDSA' && (
                    <div>
                      <Label htmlFor="ecdsaCurve">ECDSA Curve</Label>
                      <Select value={selectedEcdsaCurve} onValueChange={setSelectedEcdsaCurve} disabled={isGenerating}>
                        <SelectTrigger id="ecdsaCurve" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ecdsaCurves.map(curve => (
                            <SelectItem key={curve.value} value={curve.value}>{curve.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <Button type="button" variant="secondary" onClick={handleGenerateKeyPairAndCsr} disabled={isGenerating} className="w-full sm:w-auto">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Generating...' : 'Generate Key Pair & CSR'}
                </Button>
                {generationError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{generationError}</AlertDescription>
                  </Alert>
                )}
                {generatedPrivateKeyPem && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="generatedKeyPem">Generated Private Key (PEM) - Keep this secret!</Label>
                    <Textarea
                      id="generatedKeyPem"
                      value={generatedPrivateKeyPem}
                      readOnly
                      rows={8}
                      className="mt-1 font-mono bg-background/50"
                    />
                  </div>
                )}
                 {generatedCsrPem && !generatedPrivateKeyPem && ( // Show only if key was generated but CSR failed for some reason (unlikely with simulation)
                    <div className="mt-3 space-y-2">
                        <Alert variant="default">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Private key was generated, but CSR generation failed or is pending. You can copy the private key above.</AlertDescription>
                        </Alert>
                    </div>
                )}
                {generatedCsrPem && (
                     <div className="mt-3 space-y-2">
                        <Label htmlFor="generatedCsrPem">Generated CSR (PEM)</Label>
                        <Textarea
                        id="generatedCsrPemDisplay" // Different ID from the main form field
                        value={generatedCsrPem}
                        readOnly
                        rows={8}
                        className="mt-1 font-mono bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">This CSR has been auto-filled into the CSR field above.</p>
                    </div>
                )}
              </div>
            </section>

            <Separator />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isGenerating}>
                <FilePlus2 className="mr-2 h-5 w-5" /> Issue Certificate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

