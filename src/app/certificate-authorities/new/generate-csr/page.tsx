
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileSignature, KeyRound, Info, Loader2, Copy, Check, Download as DownloadIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CertificationRequest, Attribute, AttributeTypeAndValue, BasicConstraints, Extension as PkijsExtension, Extensions, getCrypto, setEngine } from "pkijs";
import * as asn1js from "asn1js";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';

// --- Helper Functions ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function formatAsPem(base64String: string, type: 'PRIVATE KEY' | 'CERTIFICATE REQUEST'): string {
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;
  const body = base64String.match(/.{1,64}/g)?.join('\n') || '';
  return `${header}\n${body}\n${footer}`;
}

const keyTypes = [
  { value: 'RSA', label: 'RSA' },
  { value: 'ECDSA', label: 'ECDSA' },
];
const rsaKeySizes = [
  { value: '2048', label: '2048 bit' },
  { value: '3072', label: '3072 bit' },
  { value: '4096', label: '4096 bit' },
];
const ecdsaCurves = [
  { value: 'P-256', label: 'P-256 (secp256r1)' },
  { value: 'P-384', label: 'P-384 (secp384r1)' },
  { value: 'P-521', label: 'P-521 (secp521r1)' },
];


export default function GenerateCsrForExternalCaPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  // Form state
  const [caName, setCaName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locality, setLocality] = useState('');
  const [keyType, setKeyType] = useState('RSA');
  const [keySpec, setKeySpec] = useState('2048');
  const [definePathLen, setDefinePathLen] = useState(false);
  const [pathLenConstraint, setPathLenConstraint] = useState<number>(0);

  // Result state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedPrivateKey, setGeneratedPrivateKey] = useState('');
  const [generatedCsr, setGeneratedCsr] = useState('');
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [csrCopied, setCsrCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.crypto) setEngine("webcrypto", getCrypto());
  }, []);

  const handleKeyTypeChange = (value: string) => {
    setKeyType(value);
    if (value === 'RSA') {
      setKeySpec('2048');
    } else if (value === 'ECDSA') {
      setKeySpec('P-256');
    }
  };

  const currentKeySpecOptions = keyType === 'RSA' ? rsaKeySizes : ecdsaCurves;
  
  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!caName.trim()) {
      toast({ title: "Validation Error", description: "CA Name (Common Name) is required.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const algorithm = keyType === 'RSA' 
        ? { name: "RSASSA-PKCS1-v1_5", modulusLength: parseInt(keySpec, 10), publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }
        : { name: "ECDSA", namedCurve: keySpec };

      const keyPair = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
      const privateKeyPem = formatAsPem(arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)), 'PRIVATE KEY');
      setGeneratedPrivateKey(privateKeyPem);

      const pkcs10 = new CertificationRequest({ version: 0 });
      pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: caName.trim() }) }));
      if (organization.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.10", value: new asn1js.Utf8String({ value: organization.trim() })}));
      if (organizationalUnit.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.11", value: new asn1js.Utf8String({ value: organizationalUnit.trim() })}));
      if (locality.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.7", value: new asn1js.Utf8String({ value: locality.trim() })}));
      if (stateProvince.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.8", value: new asn1js.Utf8String({ value: stateProvince.trim() })}));
      if (country.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.6", value: new asn1js.Utf8String({ value: country.trim() })}));
      
      await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);

      const bcParams: { cA: boolean; pathLenConstraint?: number } = { cA: true };
      if (definePathLen) {
        bcParams.pathLenConstraint = pathLenConstraint;
      }
      const basicConstraints = new BasicConstraints(bcParams);

      const extensions = new Extensions({
          extensions: [
              new PkijsExtension({
                  extnID: "2.5.29.19", // id-ce-basicConstraints
                  critical: true,
                  extnValue: basicConstraints.toSchema().toBER(false)
              })
          ]
      });

      pkcs10.attributes = [new Attribute({
          type: "1.2.840.113549.1.9.14", // id-pkcs9-at-extensionRequest
          values: [extensions.toSchema()]
      })];
      
      await pkcs10.sign(keyPair.privateKey, "SHA-256");
      const signedCsrPem = formatAsPem(arrayBufferToBase64(pkcs10.toSchema().toBER(false)), 'CERTIFICATE REQUEST');
      setGeneratedCsr(signedCsrPem);
      setStep(2);

    } catch (e: any) {
        setGenerationError(`Failed to generate CSR: ${e.message}`);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, type: string, setCopied: (v: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied!", description: `${type} PEM copied to clipboard.` });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: `Could not copy ${type}.`, variant: "destructive" });
    }
  };

  const handleDownload = (content: string, filename: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'application/pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  

  return (
    <div className="w-full space-y-6 mb-8">
        <Button variant="outline" onClick={() => step === 1 ? router.push('/certificate-authorities/new') : setStep(1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
            <CardHeader>
                <div className="flex items-center space-x-3">
                    <FileSignature className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-headline font-semibold">Generate CSR for External CA</h1>
                </div>
                <CardDescription>
                   {step === 1 
                    ? "Generate a key pair and a CSR for a new CA. This CSR can then be signed by an external authority (e.g., an offline root CA)."
                    : "CSR and Private Key have been generated. Save them securely."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {step === 1 && (
                    <div className="space-y-8">
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center"><KeyRound className="mr-2 h-5 w-5 text-muted-foreground" />Key Generation Parameters</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><Label htmlFor="keyType">Key Type</Label><Select value={keyType} onValueChange={handleKeyTypeChange}><SelectTrigger id="keyType"><SelectValue /></SelectTrigger><SelectContent>{keyTypes.map(kt=><SelectItem key={kt.value} value={kt.value}>{kt.label}</SelectItem>)}</SelectContent></Select></div>
                                    <div><Label htmlFor="keySpec">{keyType === 'ECDSA' ? 'Curve' : 'Size'}</Label><Select value={keySpec} onValueChange={setKeySpec}><SelectTrigger id="keySpec"><SelectValue /></SelectTrigger><SelectContent>{currentKeySpecOptions.map(ks=><SelectItem key={ks.value} value={ks.value}>{ks.label}</SelectItem>)}</SelectContent></Select></div>
                                </div>
                            </div>
                        </section>
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground" />CA Subject Distinguished Name (DN)</h3>
                            <div className="space-y-4">
                                <div><Label htmlFor="caName">CA Name (Common Name)</Label><Input id="caName" value={caName} onChange={(e) => setCaName(e.target.value)} placeholder="e.g., LamassuIoT Secure Services CA" required /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><Label htmlFor="country">Country (C)</Label><Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g., US (2-letter code)" maxLength={2} /></div>
                                    <div><Label htmlFor="stateProvince">State / Province (ST)</Label><Input id="stateProvince" value={stateProvince} onChange={e => setStateProvince(e.target.value)} placeholder="e.g., California" /></div>
                                    <div><Label htmlFor="locality">Locality (L)</Label><Input id="locality" value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g., San Francisco" /></div>
                                    <div><Label htmlFor="organization">Organization (O)</Label><Input id="organization" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="e.g., LamassuIoT Corp" /></div>
                                </div>
                                <div><Label htmlFor="organizationalUnit">Organizational Unit (OU)</Label><Input id="organizationalUnit" value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)} placeholder="e.g., Secure Devices Division" /></div>
                            </div>
                        </section>
                        <section>
                            <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground" />CA Extensions</h3>
                            <div className="flex items-center space-x-2"><Switch id="definePathLen" checked={definePathLen} onCheckedChange={setDefinePathLen} /><Label htmlFor="definePathLen">Define Path Length Constraint</Label></div>
                            {definePathLen && <div className="pl-8 pt-2"><Label htmlFor="pathLen">Path Length</Label><Input id="pathLen" type="number" min="0" value={pathLenConstraint} onChange={e => setPathLenConstraint(parseInt(e.target.value, 10) || 0)} /></div>}
                        </section>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-6">
                        <Alert variant="destructive">
                            <Info className="h-4 w-4" />
                            <AlertTitle>Important: Save Your Private Key</AlertTitle>
                            <AlertDescription>
                            This is your only opportunity to save the private key. It is not stored by LamassuIoT and cannot be recovered if lost. Store it in a secure location.
                            </AlertDescription>
                        </Alert>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Generated Private Key (PEM)</h4>
                                <div className="flex space-x-2"><Button variant="outline" size="sm" onClick={()=>handleCopy(generatedPrivateKey, "Private Key", setPrivateKeyCopied)}>{privateKeyCopied?<Check className="mr-1 h-4 w-4 text-green-500"/>:<Copy className="mr-1 h-4 w-4"/>}{privateKeyCopied?'Copied':'Copy'}</Button><Button variant="outline" size="sm" onClick={()=>handleDownload(generatedPrivateKey, `${caName.replace(/\s+/g, '_')}_private_key.pem`)}><DownloadIcon className="mr-1 h-4 w-4"/>Download</Button></div>
                            </div>
                            <Textarea readOnly value={generatedPrivateKey} rows={8} className="font-mono bg-muted/50"/>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">Generated Certificate Signing Request (PEM)</h4>
                                <div className="flex space-x-2"><Button variant="outline" size="sm" onClick={()=>handleCopy(generatedCsr, "CSR", setCsrCopied)}>{csrCopied?<Check className="mr-1 h-4 w-4 text-green-500"/>:<Copy className="mr-1 h-4 w-4"/>}{csrCopied?'Copied':'Copy'}</Button><Button variant="outline" size="sm" onClick={()=>handleDownload(generatedCsr, `${caName.replace(/\s+/g, '_')}.csr`)}><DownloadIcon className="mr-1 h-4 w-4"/>Download</Button></div>
                            </div>
                            <Textarea readOnly value={generatedCsr} rows={8} className="font-mono bg-muted/50"/>
                        </div>
                    </div>
                )}
                 {generationError && <Alert variant="destructive" className="mt-4"><AlertTitle>Generation Failed</AlertTitle><AlertDescription>{generationError}</AlertDescription></Alert>}
            </CardContent>
            <CardFooter className="flex justify-end pt-4">
                {step === 1 && <Button onClick={handleGenerate} disabled={isGenerating || !caName.trim()}> {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating...</> : 'Generate CSR & Key'} </Button>}
                {step === 2 && <Button onClick={() => router.push('/certificate-authorities')}>Finish</Button>}
            </CardFooter>
        </Card>
    </div>
  );
}
