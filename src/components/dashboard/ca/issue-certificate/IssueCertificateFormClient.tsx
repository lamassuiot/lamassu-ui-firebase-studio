
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle, FileSignature } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert";

import { CertificationRequest, AttributeTypeAndValue, Attribute, Extensions, Extension, GeneralName, GeneralNames, BasicConstraints } from "pkijs";
import * as asn1js from "asn1js";
import { getCrypto,setEngine } from "pkijs";


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


export default function IssueCertificateFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const caId = searchParams.get('caId');

  // Form fields state for Subject DN
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locality, setLocality] = useState('');
  
  const [validityDays, setValidityDays] = useState('365');
  const [sans, setSans] = useState(''); // Comma-separated: dns:example.com,ip:1.2.3.4
  const [csrPem, setCsrPem] = useState('');

  // Key generation state
  const [generatedKeyPair, setGeneratedKeyPair] = useState<CryptoKeyPair | null>(null);
  const [generatedPrivateKeyPem, setGeneratedPrivateKeyPem] = useState<string>('');
  const [generatedCsrPem, setGeneratedCsrPem] = useState<string>(''); // For the signed CSR from pkijs
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('RSA');
  const [selectedRsaKeySize, setSelectedRsaKeySize] = useState<string>('2048');
  const [selectedEcdsaCurve, setSelectedEcdsaCurve] = useState<string>('P-256');

  useEffect(() => {
    // Ensure pkijs uses WebCrypto
    if (typeof window !== 'undefined') {
      setEngine("webcrypto", getCrypto());
    }
  }, []);


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
      alert("Error: CA ID is missing from the URL.");
      return;
    }
    const finalCsrPem = generatedCsrPem || csrPem;
    if (!finalCsrPem) {
      alert("Error: Please provide a CSR or generate a new key pair and CSR.");
      return;
    }
    if (!commonName.trim() && !csrPem) { // Only require CN if CSR isn't manually pasted
        alert("Error: Common Name (CN) is required if generating CSR.");
        return;
    }

    console.log(`Issuing certificate from CA: ${caId} with CSR and form data...`);
    console.log({
        caIdToIssueFrom: caId,
        subjectCommonName: commonName, 
        subjectOrganization: organization, 
        subjectOrganizationalUnit: organizationalUnit,
        subjectCountry: country,
        subjectStateProvince: stateProvince,
        subjectLocality: locality,
        certificateValidityDays: validityDays, 
        subjectAlternativeNames: sans,
        certificateSigningRequest: finalCsrPem
    });
    alert(`Mock issue certificate from CA ${caId}. CSR submitted (check console).`);
  };

  const handleGenerateKeyPairAndCsr = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedPrivateKeyPem('');
    setGeneratedCsrPem('');
    setGeneratedKeyPair(null);
    setCsrPem(''); 

    if (!commonName.trim()) {
        setGenerationError("Common Name (CN) is required to generate a CSR.");
        setIsGenerating(false);
        return;
    }

    try {
      let algorithmDetails: RsaHashedKeyGenParams | EcKeyGenParams;
      let keyUsages: KeyUsage[];
      let webCryptoHashName: string; 

      if (selectedAlgorithm === 'RSA') {
        algorithmDetails = {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: parseInt(selectedRsaKeySize, 10),
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: "SHA-256", 
        };
        keyUsages = ["sign", "verify"];
        webCryptoHashName = "SHA-256";
      } else if (selectedAlgorithm === 'ECDSA') {
        let curveNameForWebCrypto: string = selectedEcdsaCurve; 
        if (selectedEcdsaCurve === 'P-256') webCryptoHashName = "SHA-256";
        else if (selectedEcdsaCurve === 'P-384') webCryptoHashName = "SHA-384";
        else webCryptoHashName = "SHA-512"; // P-521 uses SHA-512 for signatures typically

        algorithmDetails = {
          name: "ECDSA",
          namedCurve: curveNameForWebCrypto,
        };
        keyUsages = ["sign", "verify"];
      } else {
        throw new Error("Unsupported algorithm selected");
      }

      const keyPair = await window.crypto.subtle.generateKey(
        algorithmDetails, true, keyUsages
      );
      setGeneratedKeyPair(keyPair);

      const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      setGeneratedPrivateKeyPem(formatAsPem(arrayBufferToBase64(privateKeyBuffer), 'PRIVATE KEY'));
      
      const pkcs10 = new CertificationRequest();
      pkcs10.version = 0;

      // Populate Subject DN
      if (country.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.6", value: new asn1js.PrintableString({ value: country.trim() }) }));
      if (stateProvince.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.8", value: new asn1js.Utf8String({ value: stateProvince.trim() }) }));
      if (locality.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.7", value: new asn1js.Utf8String({ value: locality.trim() }) }));
      if (organization.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.10", value: new asn1js.Utf8String({ value: organization.trim() }) }));
      if (organizationalUnit.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.11", value: new asn1js.Utf8String({ value: organizationalUnit.trim() }) }));
      pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: commonName.trim() }) }));

      await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);

      // Prepare extensions
      const preparedExtensions: Extension[] = [];

      // Subject Alternative Names (SANs)
      const sanArray = sans.split(',').map(s => s.trim()).filter(s => s);
      const generalNamesArray: GeneralName[] = [];
      if (sanArray.length > 0) {
        sanArray.forEach(san => {
          if (san.toLowerCase().startsWith('dns:')) {
            generalNamesArray.push(new GeneralName({ type: 2, value: san.substring(4) }));
          } else if (san.toLowerCase().startsWith('ip:')) {
            console.warn(`IP SAN '${san}' detected. Proper ASN.1 encoding for IP SANs is complex and not fully implemented here. It might not be correctly processed by CAs.`);
          } else if (san.includes('@') && !san.toLowerCase().startsWith('email:')) { 
            generalNamesArray.push(new GeneralName({ type: 1, value: san })); 
          } else if (san.toLowerCase().startsWith('email:')) {
            generalNamesArray.push(new GeneralName({ type: 1, value: san.substring(6) }));
          } else if (san.includes('://') && !san.toLowerCase().startsWith('uri:')) { 
            generalNamesArray.push(new GeneralName({ type: 6, value: san })); 
          } else if (san.toLowerCase().startsWith('uri:')) {
            generalNamesArray.push(new GeneralName({ type: 6, value: san.substring(4) }));
          } else if (san) { 
            generalNamesArray.push(new GeneralName({ type: 2, value: san }));
          }
        });

        if (generalNamesArray.length > 0) {
          const altNames = new GeneralNames({ names: generalNamesArray });
          preparedExtensions.push(new Extension({
            extnID: "2.5.29.17", // subjectAlternativeName
            critical: false,
            extnValue: altNames.toSchema().toBER(false)
          }));
        }
      }
      
      // Basic Constraints
      const basicConstraints = new BasicConstraints({ cA: false }); 
      preparedExtensions.push(new Extension({
          extnID: "2.5.29.19", // basicConstraints
          critical: true, 
          extnValue: basicConstraints.toSchema().toBER(false)
      }));

      // Add extensions to CSR if any were prepared
      if (preparedExtensions.length > 0) {
        pkcs10.attributes = pkcs10.attributes || [];
        pkcs10.attributes.push(new Attribute({ 
          type: "1.2.840.1.13549.1.9.14", // pkcs-9-at-extensionRequest (Note: Corrected OID, was 1.2.840... before)
          values: [ 
            new Extensions({ extensions: preparedExtensions })
          ]
        }));
      }
      
      await pkcs10.sign(keyPair.privateKey, webCryptoHashName); 

      const csrDerBuffer = pkcs10.toSchema().toBER(false);
      const signedCsrPem = formatAsPem(arrayBufferToBase64(csrDerBuffer), 'CERTIFICATE REQUEST');
      setGeneratedCsrPem(signedCsrPem);
      setCsrPem(signedCsrPem); 

    } catch (error: any) {
      console.error("Key pair or CSR generation error:", error);
      setGenerationError(`Failed to generate: ${error.message || String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };


  if (!caId && typeof window !== 'undefined') { // Check typeof window to ensure this runs client-side
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
  if (!caId && typeof window === 'undefined') {
    // Render nothing or a placeholder on the server if caId is missing
    return <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading CA information...</p>
           </div>;
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
            <CardTitle className="text-xl font-headline">Issue Certificate from CA: {caId ? caId.substring(0, 12) : 'N/A'}...</CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            Fill out the details below to issue a new certificate. Provide a CSR or generate a new key pair and CSR.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <section>
              <h3 className="text-lg font-medium mb-3">Certificate Subject & Validity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commonName">Common Name (CN)</Label>
                  <Input id="commonName" name="commonName" type="text" placeholder="e.g., mydevice.example.com" required className="mt-1" value={commonName} onChange={e => setCommonName(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="organization">Organization (O)</Label>
                  <Input id="organization" name="organization" type="text" placeholder="e.g., LamassuIoT Corp" className="mt-1" value={organization} onChange={e => setOrganization(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="organizationalUnit">Organizational Unit (OU)</Label>
                  <Input id="organizationalUnit" name="organizationalUnit" type="text" placeholder="e.g., Engineering" className="mt-1" value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="country">Country (C) (2-letter code)</Label>
                  <Input id="country" name="country" type="text" placeholder="e.g., US" maxLength={2} className="mt-1" value={country} onChange={e => setCountry(e.target.value.toUpperCase())}/>
                </div>
                <div>
                  <Label htmlFor="stateProvince">State/Province (ST)</Label>
                  <Input id="stateProvince" name="stateProvince" type="text" placeholder="e.g., California" className="mt-1" value={stateProvince} onChange={e => setStateProvince(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="locality">Locality (L)</Label>
                  <Input id="locality" name="locality" type="text" placeholder="e.g., San Francisco" className="mt-1" value={locality} onChange={e => setLocality(e.target.value)}/>
                </div>
                 <div>
                  <Label htmlFor="validityDays">Validity (Days)</Label>
                  <Input id="validityDays" name="validityDays" type="number" defaultValue={validityDays} required className="mt-1" onChange={e => setValidityDays(e.target.value)}/>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="sans">Subject Alternative Names (SANs)</Label>
                  <Input id="sans" name="sans" type="text" placeholder="dns:alt.example.com,ip:192.168.1.10,email:user@example.com" className="mt-1" value={sans} onChange={e => setSans(e.target.value)}/>
                   <p className="text-xs text-muted-foreground mt-1">Comma-separated. Use prefixes like 'dns:', 'ip:', 'email:'. Default is DNS if no prefix.</p>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h3 className="text-lg font-medium mb-1">Key Material & CSR</h3>
              <p className="text-xs text-muted-foreground mb-3">Provide a CSR or generate a new key pair and CSR using browser crypto.</p>
              
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <Label htmlFor="csr">Certificate Signing Request (CSR)</Label>
                <Textarea 
                    id="csr" 
                    name="csr" 
                    placeholder="-----BEGIN CERTIFICATE REQUEST-----\n..." 
                    rows={6} 
                    className="mt-1 font-mono bg-background" 
                    value={csrPem}
                    onChange={(e) => { setCsrPem(e.target.value); if (generatedCsrPem) { setGeneratedCsrPem(''); setGeneratedPrivateKeyPem(''); setGeneratedKeyPair(null); } }}
                />
                {generatedCsrPem && <p className="text-xs text-amber-600 dark:text-amber-400">CSR field auto-populated from generated key. Manual edits will clear generated key/CSR.</p>}
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
                <Button type="button" variant="secondary" onClick={handleGenerateKeyPairAndCsr} disabled={isGenerating || !commonName.trim()} className="w-full sm:w-auto">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  {isGenerating ? 'Generating...' : 'Generate Key Pair & CSR'}
                </Button>
                 {!commonName.trim() && <p className="text-xs text-destructive mt-1">Common Name (CN) is required for CSR generation.</p>}
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
                {generatedCsrPem && (
                     <div className="mt-3 space-y-2">
                        <Label htmlFor="generatedCsrPemDisplay">Generated CSR (PEM)</Label>
                        <Textarea
                        id="generatedCsrPemDisplay"
                        value={generatedCsrPem}
                        readOnly
                        rows={8}
                        className="mt-1 font-mono bg-background/50"
                        />
                        <p className="text-xs text-muted-foreground">This CSR has been auto-filled into the main CSR field above.</p>
                    </div>
                )}
              </div>
            </section>

            <Separator />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isGenerating || (!csrPem.trim() && !generatedCsrPem.trim())}>
                <FileSignature className="mr-2 h-5 w-5" /> Issue Certificate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

    