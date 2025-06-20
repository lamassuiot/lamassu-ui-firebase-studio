
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle, FileSignature, UploadCloud, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert";
// Removed ToggleGroup import as it's no longer used directly in the main form area for mode selection.

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

// Helper function for IP to Buffer (IPv4 focus)
function ipToBuffer(ip: string): ArrayBuffer | null {
  const parts = ip.split('.');
  if (parts.length === 4 && parts.every(part => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  })) {
    const buffer = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      buffer[i] = parseInt(parts[i], 10);
    }
    return buffer.buffer;
  }
  if (ip.includes(':') && ip.split(':').length > 2 && ip.split(':').length <= 8) {
      console.warn(`IPv6 SAN processing for "${ip}" is basic. Ensure it's a standard, uncompressed format if issues arise. Full IPv6 parsing is complex.`);
      const hexGroups = ip.split(':');
      if (hexGroups.length === 8 && hexGroups.every(group => /^[0-9a-fA-F]{1,4}$/.test(group))) {
          const buffer = new Uint8Array(16);
          let offset = 0;
          for (const group of hexGroups) {
              const value = parseInt(group, 16);
              buffer[offset++] = (value >> 8) & 0xFF; 
              buffer[offset++] = value & 0xFF;        
          }
          return buffer.buffer;
      }
      return null; 
  }
  return null; 
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

  const [modeChosen, setModeChosen] = useState<boolean>(false);
  const [issuanceMode, setIssuanceMode] = useState<'generate' | 'upload'>('generate');

  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locality, setLocality] = useState('');
  
  const [validityDays, setValidityDays] = useState('365');
  
  const [dnsSans, setDnsSans] = useState('');
  const [ipSans, setIpSans] = useState('');
  const [emailSans, setEmailSans] = useState('');
  const [uriSans, setUriSans] = useState('');
  
  const [csrPem, setCsrPem] = useState(''); 

  const [generatedKeyPair, setGeneratedKeyPair] = useState<CryptoKeyPair | null>(null);
  const [generatedPrivateKeyPem, setGeneratedPrivateKeyPem] = useState<string>('');
  const [generatedCsrPemForDisplay, setGeneratedCsrPemForDisplay] = useState<string>(''); 
  
  const [uploadedCsrFileName, setUploadedCsrFileName] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('RSA');
  const [selectedRsaKeySize, setSelectedRsaKeySize] = useState<string>('2048');
  const [selectedEcdsaCurve, setSelectedEcdsaCurve] = useState<string>('P-256');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.crypto) {
      try {
        setEngine("webcrypto", getCrypto());
        console.log("PKI.js engine set to WebCrypto.");
      } catch (e) {
        console.error("Error setting PKI.js engine:", e);
        setGenerationError("Failed to initialize cryptographic engine. Make sure your browser supports Web Crypto API.");
      }
    } else {
        console.warn("Web Crypto API not available. CSR generation might fail.");
        setGenerationError("Web Crypto API not available in this environment.");
    }
  }, []);

  const resetCsrState = () => {
    setCsrPem('');
    setUploadedCsrFileName(null);
    setGeneratedCsrPemForDisplay('');
    setGeneratedPrivateKeyPem('');
    setGeneratedKeyPair(null);
    setGenerationError(null);
  };

  const handleModeSelection = (selectedMode: 'generate' | 'upload') => {
    setIssuanceMode(selectedMode);
    setModeChosen(true);
    resetCsrState();
  };

  const handleChangeCsrMethod = () => {
    setModeChosen(false);
    resetCsrState();
    // Optionally reset other form fields too, or preserve them
    // setCommonName(''); 
    // ... etc.
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
      alert("Error: CA ID is missing from the URL.");
      return;
    }
    if (!csrPem.trim()) {
      alert("Error: CSR is required. Please generate or upload a CSR.");
      return;
    }
    if (!commonName.trim()) { 
        alert("Error: Common Name (CN) is required for context, even if uploading CSR.");
        return;
    }

    console.log(`Issuing certificate from CA: ${caId} with CSR and form data...`);
    console.log({
        caIdToIssueFrom: caId,
        mode: issuanceMode,
        subjectCommonName: commonName, 
        subjectOrganization: organization, 
        subjectOrganizationalUnit: organizationalUnit,
        subjectCountry: country,
        subjectStateProvince: stateProvince,
        subjectLocality: locality,
        certificateValidityDays: validityDays, 
        dnsSans: dnsSans.split(',').map(s=>s.trim()).filter(s=>s),
        ipSans: ipSans.split(',').map(s=>s.trim()).filter(s=>s),
        emailSans: emailSans.split(',').map(s=>s.trim()).filter(s=>s),
        uriSans: uriSans.split(',').map(s=>s.trim()).filter(s=>s),
        certificateSigningRequest: csrPem 
    });
    alert(`Mock issue certificate from CA ${caId}. CSR submitted (check console).`);
  };

  const handleGenerateKeyPairAndCsr = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedPrivateKeyPem('');
    setGeneratedCsrPemForDisplay('');
    setCsrPem(''); 
    setGeneratedKeyPair(null);
    setUploadedCsrFileName(null);

    if (!commonName.trim()) {
        setGenerationError("Common Name (CN) is required to generate a CSR.");
        setIsGenerating(false);
        return;
    }
    if (!window.crypto || !window.crypto.subtle) {
        setGenerationError("Web Crypto API is not available in this browser. Cannot generate keys.");
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
        else webCryptoHashName = "SHA-512"; 

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

      if (country.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.6", value: new asn1js.PrintableString({ value: country.trim() }) }));
      if (stateProvince.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.8", value: new asn1js.Utf8String({ value: stateProvince.trim() }) }));
      if (locality.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.7", value: new asn1js.Utf8String({ value: locality.trim() }) }));
      if (organization.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.10", value: new asn1js.Utf8String({ value: organization.trim() }) }));
      if (organizationalUnit.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.11", value: new asn1js.Utf8String({ value: organizationalUnit.trim() }) }));
      pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: commonName.trim() }) }));

      await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);
      
      const preparedExtensions: Extension[] = [];
      const basicConstraints = new BasicConstraints({ cA: false });
      preparedExtensions.push(new Extension({
        extnID: "2.5.29.19", 
        critical: true,      
        extnValue: basicConstraints.toSchema().toBER(false)
      }));

      const generalNamesArray: GeneralName[] = [];
      dnsSans.split(',').map(s => s.trim()).filter(s => s).forEach(dnsName => {
        generalNamesArray.push(new GeneralName({ type: 2, value: dnsName })); 
      });
      ipSans.split(',').map(s => s.trim()).filter(s => s).forEach(ipAddress => {
        const ipBuffer = ipToBuffer(ipAddress);
        if (ipBuffer) {
          generalNamesArray.push(new GeneralName({ type: 7, value: new asn1js.OctetString({ valueHex: ipBuffer }) }));
        } else {
          console.warn(`Could not parse IP SAN: ${ipAddress}. It will be skipped.`);
        }
      });
      emailSans.split(',').map(s => s.trim()).filter(s => s).forEach(email => {
        generalNamesArray.push(new GeneralName({ type: 1, value: email })); 
      });
      uriSans.split(',').map(s => s.trim()).filter(s => s).forEach(uri => {
        generalNamesArray.push(new GeneralName({ type: 6, value: uri })); 
      });

      if (generalNamesArray.length > 0) {
        const altNames = new GeneralNames({ names: generalNamesArray });
        preparedExtensions.push(new Extension({
          extnID: "2.5.29.17", 
          critical: false,    
          extnValue: altNames.toSchema().toBER(false)
        }));
      }
      
      if (preparedExtensions.length > 0) {
        pkcs10.attributes = pkcs10.attributes || []; // Ensure attributes array exists
        pkcs10.attributes.push(new Attribute({
          type: "1.2.840.113549.1.9.14", 
          values: [
            new Extensions({ extensions: preparedExtensions }).toSchema() 
          ]
        }));
      }
            
      await pkcs10.sign(keyPair.privateKey, webCryptoHashName); 

      const csrDerBuffer = pkcs10.toSchema().toBER(false);
      const signedCsrPem = formatAsPem(arrayBufferToBase64(csrDerBuffer), 'CERTIFICATE REQUEST');
      setGeneratedCsrPemForDisplay(signedCsrPem); 
      setCsrPem(signedCsrPem); 

    } catch (error: any) {
      console.error("Key pair or CSR generation error:", error);
      setGenerationError(`Failed to generate: ${error.message || String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCsrFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedCsrFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsrPem(content); 
        setGeneratedCsrPemForDisplay('');
        setGeneratedPrivateKeyPem('');
        setGeneratedKeyPair(null);
        setGenerationError(null);
      };
      reader.readAsText(file);
    } else {
      setUploadedCsrFileName(null);
    }
  };

  if (!caId && typeof window !== 'undefined') { 
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
    return <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading CA information...</p>
           </div>;
  }

  if (!modeChosen) {
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
              Choose how you want to provide the Certificate Signing Request (CSR).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group"
              onClick={() => handleModeSelection('generate')}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <KeyRound className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">Generate Key & CSR In Browser</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      A new private key and CSR will be generated directly in your browser. The private key will be displayed for you to save.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                <Button variant="default" className="w-full">
                  Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group"
              onClick={() => handleModeSelection('upload')}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-center space-x-4">
                  <UploadCloud className="h-8 w-8 text-primary mt-1" />
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">Upload Existing CSR</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Provide a pre-existing Certificate Signing Request (CSR) in PEM format.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                <Button variant="default" className="w-full">
                  Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CA Details
        </Button>
        <Button variant="ghost" onClick={handleChangeCsrMethod} className="text-primary hover:text-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Change CSR Method
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {issuanceMode === 'generate' ? <KeyRound className="h-7 w-7 text-primary" /> : <UploadCloud className="h-7 w-7 text-primary" />}
            <CardTitle className="text-xl font-headline">
              Issue Certificate - {issuanceMode === 'generate' ? 'Generate Key & CSR' : 'Upload CSR'}
            </CardTitle>
          </div>
          <CardDescription className="mt-1.5">
            CA: {caId ? caId.substring(0, 12) : 'N/A'}... Fill details and {issuanceMode === 'generate' ? 'generate a new key/CSR' : 'upload your CSR'}.
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
              </div>
            </section>

            <Separator />
             <section>
                <h3 className="text-lg font-medium mb-3">Subject Alternative Names (SANs)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="dnsSans">DNS Names (comma-separated)</Label>
                        <Input id="dnsSans" value={dnsSans} onChange={e => setDnsSans(e.target.value)} placeholder="dns1.example.com, dns2.net" className="mt-1"/>
                    </div>
                    <div>
                        <Label htmlFor="ipSans">IP Addresses (comma-separated)</Label>
                        <Input id="ipSans" value={ipSans} onChange={e => setIpSans(e.target.value)} placeholder="192.168.1.1, 10.0.0.1" className="mt-1"/>
                        <p className="text-xs text-muted-foreground mt-1">IPv4 supported. Basic IPv6 (no '::') may work.</p>
                    </div>
                    <div>
                        <Label htmlFor="emailSans">Email Addresses (comma-separated)</Label>
                        <Input id="emailSans" value={emailSans} onChange={e => setEmailSans(e.target.value)} placeholder="user@example.com, contact@domain.org" className="mt-1"/>
                    </div>
                    <div>
                        <Label htmlFor="uriSans">URIs (comma-separated)</Label>
                        <Input id="uriSans" value={uriSans} onChange={e => setUriSans(e.target.value)} placeholder="https://service.example.com, urn:foo:bar" className="mt-1"/>
                    </div>
                </div>
             </section>
            <Separator />

            <section>
              <h3 className="text-lg font-medium mb-1">Certificate Signing Request (CSR)</h3>
              <p className="text-xs text-muted-foreground mb-3">Subject and SAN fields above are for CA policy and context, and will be used for CSR generation.</p>
              
              {issuanceMode === 'generate' && (
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <Label className="text-base">Generate New Key Pair & CSR</Label>
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
                  {generatedCsrPemForDisplay && (
                       <div className="mt-3 space-y-2">
                          <Label htmlFor="generatedCsrPemDisplay">Generated CSR (PEM)</Label>
                          <Textarea
                          id="generatedCsrPemDisplay"
                          value={generatedCsrPemForDisplay}
                          readOnly
                          rows={8}
                          className="mt-1 font-mono bg-background/50"
                          />
                          <p className="text-xs text-muted-foreground">This CSR has been auto-filled into the main CSR field below.</p>
                      </div>
                  )}
                </div>
              )}

              {issuanceMode === 'upload' && (
                <section className="space-y-4 p-4 border rounded-md bg-muted/20">
                  <Label className="text-base">Upload Certificate Signing Request</Label>
                  <div className="space-y-2">
                    <Label htmlFor="csrFile">CSR File (.csr, .pem)</Label>
                    <Input
                      id="csrFile"
                      type="file"
                      accept=".csr,.pem,.txt" 
                      onChange={handleCsrFileUpload}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {uploadedCsrFileName && <p className="text-xs text-muted-foreground">Selected file: {uploadedCsrFileName}. Content loaded into CSR field below.</p>}
                  </div>
                </section>
              )}

              <div className="mt-6">
                <Label htmlFor="csrPemInput" className="text-base font-semibold">CSR for Submission (PEM format)</Label>
                <Textarea 
                    id="csrPemInput" 
                    name="csrPemInput" 
                    placeholder={issuanceMode === 'generate' ? "CSR will appear here after generation..." : "Paste CSR here or upload above..."}
                    rows={8} 
                    className="mt-1 font-mono bg-background" 
                    value={csrPem}
                    onChange={(e) => { 
                        setCsrPem(e.target.value); 
                        if (issuanceMode === 'generate') {
                            setGeneratedCsrPemForDisplay(''); 
                        }
                        setGeneratedPrivateKeyPem('');
                        setGeneratedKeyPair(null);
                        setUploadedCsrFileName(null);
                    }}
                    required
                />
                {!csrPem.trim() && <p className="text-xs text-destructive mt-1">CSR content is required for submission.</p>}
              </div>
            </section>

            <Separator />
            
            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isGenerating || !csrPem.trim() || !commonName.trim()}>
                <FileSignature className="mr-2 h-5 w-5" /> Issue Certificate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
    
