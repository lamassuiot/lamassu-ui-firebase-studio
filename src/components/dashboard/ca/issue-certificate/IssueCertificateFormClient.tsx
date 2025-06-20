
'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert'; // Removed AlertTitle to avoid conflict if not used

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
  // Split into 64-character chunks
  const body = base64String.match(/.{1,64}/g)?.join('\n') || '';
  return `${header}\n${body}\n${footer}`;
}


export default function IssueCertificateFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caId = searchParams.get('caId');

  const [generatedPrivateKeyPem, setGeneratedPrivateKeyPem] = useState<string>('');
  const [isGeneratingKey, setIsGeneratingKey] = useState<boolean>(false);
  const [keyGenerationError, setKeyGenerationError] = useState<string | null>(null);
  // const [generatedPublicKey, setGeneratedPublicKey] = useState<CryptoKey | null>(null); // For future CSR generation

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
      alert("Error: CA ID is missing from the URL.");
      return;
    }
    const formData = new FormData(event.currentTarget);
    const commonName = formData.get('commonName');
    const csrPem = formData.get('csr');

    console.log(`Issuing certificate from CA: ${caId} with form data...`);
    console.log({
        commonName,
        csrPem: csrPem || (generatedPrivateKeyPem ? "Using generated key (CSR to be created)" : "No CSR provided")
    });
    alert(`Mock issue certificate from CA ${caId}. Check console for details.`);
  };

  const handleGenerateKeyPair = async () => {
    setIsGeneratingKey(true);
    setKeyGenerationError(null);
    setGeneratedPrivateKeyPem('');
    // setGeneratedPublicKey(null);

    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP", // Suitable for key encipherment, can also be used for signing with RSA-PSS or RSASSA-PKCS1-v1_5
          modulusLength: 2048,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
          hash: "SHA-256",
        },
        true, // extractable
        ["encrypt", "decrypt"] // Or "sign", "verify" if using RSA-PSS/RSASSA-PKCS1-v1_5 for the key gen algo
      );

      // Export private key in PKCS#8 format
      const privateKeyBuffer = await window.crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );
      const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);
      const privateKeyPem = formatAsPem(privateKeyBase64, 'PRIVATE KEY');
      setGeneratedPrivateKeyPem(privateKeyPem);
      // setGeneratedPublicKey(keyPair.publicKey); // Store for potential CSR generation

    } catch (error: any) {
      console.error("Key pair generation error:", error);
      setKeyGenerationError(`Failed to generate key pair: ${error.message}`);
    } finally {
      setIsGeneratingKey(false);
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
            <CardTitle className="text-xl font-headline">Issue Certificate from CA: {caId}</CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            Fill out the details below to issue a new certificate signed by this CA.
            You can either provide a CSR or generate a new key pair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <section>
              <h3 className="text-lg font-medium mb-3">Certificate Subject & Validity</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="commonName">Common Name (CN)</Label>
                  <Input id="commonName" name="commonName" type="text" placeholder="e.g., mydevice.example.com" required className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="organization">Organization (O)</Label>
                  <Input id="organization" name="organization" type="text" placeholder="e.g., LamassuIoT Corp" className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="validityDays">Validity (Days)</Label>
                  <Input id="validityDays" name="validityDays" type="number" defaultValue="365" required className="mt-1"/>
                </div>
                <div>
                  <Label htmlFor="sans">Subject Alternative Names (SANs, comma-separated)</Label>
                  <Input id="sans" name="sans" type="text" placeholder="e.g., dns:alt.example.com,ip:192.168.1.10" className="mt-1"/>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-medium mb-1">Key Material</h3>
              <p className="text-xs text-muted-foreground mb-3">Provide a CSR or generate a new key pair.</p>
              
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <Label htmlFor="csr">Option 1: Paste Certificate Signing Request (CSR)</Label>
                <Textarea id="csr" name="csr" placeholder="-----BEGIN CERTIFICATE REQUEST-----\n..." rows={6} className="mt-1 font-mono bg-background" disabled={!!generatedPrivateKeyPem}/>
                {generatedPrivateKeyPem && <p className="text-xs text-amber-600">CSR input disabled as a new key has been generated.</p>}
              </div>

              <div className="my-4 text-center text-sm text-muted-foreground">OR</div>

              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <Label>Option 2: Generate New Key Pair (RSA 2048-bit)</Label>
                <Button type="button" variant="secondary" onClick={handleGenerateKeyPair} disabled={isGeneratingKey} className="w-full sm:w-auto">
                  {isGeneratingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  {isGeneratingKey ? 'Generating...' : 'Generate New Key Pair'}
                </Button>
                {keyGenerationError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{keyGenerationError}</AlertDescription>
                  </Alert>
                )}
                {generatedPrivateKeyPem && (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="generatedKeyPem">Generated Private Key (PEM)</Label>
                    <Textarea
                      id="generatedKeyPem"
                      value={generatedPrivateKeyPem}
                      readOnly
                      rows={8}
                      className="mt-1 font-mono bg-background/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      This private key is generated in your browser and is not sent to the server.
                      Save it securely if you intend to use this key pair.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <Separator />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg">
                <FilePlus2 className="mr-2 h-5 w-5" /> Issue Certificate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

