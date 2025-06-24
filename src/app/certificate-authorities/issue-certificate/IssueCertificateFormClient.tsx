
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle, FileSignature, UploadCloud, ChevronRight, Copy, Check, Download as DownloadIcon, ListChecks, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  CertificationRequest, AttributeTypeAndValue, Attribute, Extensions,
  Extension as PkijsExtension, GeneralName, GeneralNames as PkijsGeneralNames,
  BasicConstraints as PkijsBasicConstraints, getCrypto, setEngine,
  PublicKeyInfo as PkijsPublicKeyInfo, RelativeDistinguishedNames as PkijsRelativeDistinguishedNames
} from "pkijs";
import * as asn1js from "asn1js";
import { useAuth } from '@/contexts/AuthContext';
import { TagInput } from '@/components/shared/TagInput';

// --- Helper Functions ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function formatAsPem(base64String: string, type: 'PRIVATE KEY' | 'PUBLIC KEY' | 'CERTIFICATE REQUEST' | 'CERTIFICATE'): string {
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;
  const body = base64String.match(/.{1,64}/g)?.join('\n') || '';
  return `${header}\n${body}\n${footer}`;
}

function ipToBuffer(ip: string): ArrayBuffer | null {
  // Simplified IPv4 and IPv6 to buffer conversion
  const parts = ip.split('.');
  if (parts.length === 4 && parts.every(part => !isNaN(parseInt(part, 10)) && parseInt(part, 10) >= 0 && parseInt(part, 10) <= 255)) {
    return new Uint8Array(parts.map(p => parseInt(p, 10))).buffer;
  }
  if (ip.includes(':')) {
    // Basic IPv6 support
    const hexGroups = ip.split(':').map(group => group.padStart(4, '0'));
    if (hexGroups.length === 8) {
      const buffer = new Uint8Array(16);
      let offset = 0;
      for (const group of hexGroups) {
        const value = parseInt(group, 16);
        buffer[offset++] = (value >> 8) & 0xFF;
        buffer[offset++] = value & 0xFF;
      }
      return buffer.buffer;
    }
  }
  return null;
}

const OID_MAP: Record<string, string> = {
  "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU",
  "1.2.840.113549.1.1.1": "RSA", "1.2.840.10045.2.1": "EC",
  "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521",
};

function formatPkijsSubject(subject: PkijsRelativeDistinguishedNames): string {
  return subject.typesAndValues.map(tv => `${OID_MAP[tv.type] || tv.type}=${(tv.value as any).valueBlock.value}`).join(', ');
}
function formatPkijsPublicKeyInfo(publicKeyInfo: PkijsPublicKeyInfo): string {
  const algoOid = publicKeyInfo.algorithm.algorithmId;
  const algoName = OID_MAP[algoOid] || algoOid;
  let details = "";
  if (algoName === "EC" && publicKeyInfo.algorithm.parameters) {
      const curveOid = (publicKeyInfo.algorithm.parameters as any).valueBlock.value as string;
      details = `(Curve: ${OID_MAP[curveOid] || curveOid})`;
  } else if (algoName === "RSA" && publicKeyInfo.parsedKey) {
      const modulusBytes = (publicKeyInfo.parsedKey as any).modulus.valueBlock.valueHex.byteLength;
      details = `(${(modulusBytes - (new Uint8Array((publicKeyInfo.parsedKey as any).modulus.valueBlock.valueHex)[0] === 0 ? 1:0)) * 8} bits)`;
  }
  return `${algoName} ${details}`;
}
function formatPkijsSans(extensions: PkijsExtension[]): string[] {
  const sans: string[] = [];
  const sanExtension = extensions.find(ext => ext.extnID === "2.5.29.17");
  if (sanExtension && sanExtension.parsedValue) {
      (sanExtension.parsedValue as PkijsGeneralNames).names.forEach(name => {
          if (name.type === 1) sans.push(`Email: ${name.value}`);
          else if (name.type === 2) sans.push(`DNS: ${name.value}`);
          else if (name.type === 6) sans.push(`URI: ${name.value}`);
          else if (name.type === 7) {
              const ipBytes = Array.from(new Uint8Array(name.value.valueBlock.valueHex));
              sans.push(`IP: ${ipBytes.join('.')}`);
          }
      });
  }
  return sans;
}
function formatPkijsBasicConstraints(extensions: PkijsExtension[]): string | null {
  const bcExtension = extensions.find(ext => ext.extnID === "2.5.29.19");
  if (bcExtension && bcExtension.parsedValue) {
      const bc = bcExtension.parsedValue as PkijsBasicConstraints;
      return `CA: ${bc.cA ? 'TRUE' : 'FALSE'}${bc.pathLenConstraint !== undefined ? `, Path Length: ${bc.pathLenConstraint}` : ''}`;
  }
  return null;
}

interface DecodedCsrInfo { subject?: string; publicKeyInfo?: string; sans?: string[]; basicConstraints?: string | null; error?: string; }
const availableAlgorithms = [{ value: 'RSA', label: 'RSA' }, { value: 'ECDSA', label: 'ECDSA' }];
const rsaKeySizes = [{ value: '2048', label: '2048-bit' }, { value: '3072', label: '3072-bit' }, { value: '4096', label: '4096-bit' }];
const ecdsaCurves = [{ value: 'P-256', label: 'P-256 (secp256r1)' }, { value: 'P-384', label: 'P-384 (secp384r1)' }, { value: 'P-521', label: 'P-521 (secp521r1)' }];

const KEY_USAGE_OPTIONS = [{ id: "digitalSignature", label: "Digital Signature" }, { id: "nonRepudiation", label: "Non-Repudiation" }, { id: "keyEncipherment", label: "Key Encipherment" }, { id: "dataEncipherment", label: "Data Encipherment" }, { id: "keyAgreement", label: "Key Agreement" }, { id: "keyCertSign", label: "Certificate Signing" }, { id: "cRLSign", label: "CRL Signing" }, { id: "encipherOnly", label: "Encipher Only" }, { id: "decipherOnly", label: "Decipher Only" }] as const;
const EKU_OPTIONS = [{ id: "ServerAuth", label: "Server Authentication" }, { id: "ClientAuth", label: "Client Authentication" }, { id: "CodeSigning", label: "Code Signing" }, { id: "EmailProtection", label: "Email Protection" }, { id: "TimeStamping", label: "Time Stamping" }, { id: "OCSPSigning", label: "OCSP Signing" }, { id: "AnyExtendedKeyUsage", label: "Any Extended Key Usage" }] as const;


// --- Stepper Component ---
const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = ["Details", "Review", "Configure", "Issue"];
  return (
    <div className="flex items-center space-x-4 mb-8">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex flex-col items-center space-y-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-bold transition-colors",
                isCompleted ? "bg-primary text-primary-foreground" :
                isActive ? "bg-primary/20 border-2 border-primary text-primary" :
                "bg-muted border-2 border-border text-muted-foreground"
              )}>
                {isCompleted ? <Check className="h-5 w-5" /> : stepNumber}
              </div>
              <p className={cn(
                "text-xs font-medium",
                isActive || isCompleted ? "text-primary" : "text-muted-foreground"
              )}>{label}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 transition-colors",
                isCompleted ? "bg-primary" : "bg-border"
              )}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};


export default function IssueCertificateFormClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const caId = searchParams.get('caId');
  const [step, setStep] = useState(1);

  // --- State for the entire wizard ---
  // Step 1
  const [issuanceMode, setIssuanceMode] = useState<'generate' | 'upload'>('generate');
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locality, setLocality] = useState('');
  const [dnsSans, setDnsSans] = useState<string[]>([]);
  const [ipSans, setIpSans] = useState<string[]>([]);
  const [emailSans, setEmailSans] = useState<string[]>([]);
  const [uriSans, setUriSans] = useState<string[]>([]);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('RSA');
  const [selectedRsaKeySize, setSelectedRsaKeySize] = useState<string>('2048');
  const [selectedEcdsaCurve, setSelectedEcdsaCurve] = useState<string>('P-256');
  const [uploadedCsrFileName, setUploadedCsrFileName] = useState<string | null>(null);

  // Step 2
  const [csrPem, setCsrPem] = useState('');
  const [generatedKeyPair, setGeneratedKeyPair] = useState<CryptoKeyPair | null>(null);
  const [generatedPrivateKeyPem, setGeneratedPrivateKeyPem] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [csrCopied, setCsrCopied] = useState(false);
  const [decodedCsrInfo, setDecodedCsrInfo] = useState<DecodedCsrInfo | null>(null);

  // Step 3
  const [keyUsages, setKeyUsages] = useState<string[]>([]);
  const [extendedKeyUsages, setExtendedKeyUsages] = useState<string[]>(['ClientAuth', 'ServerAuth']);
  const [duration, setDuration] = useState('1y');
  const [honorExtensions, setHonorExtensions] = useState(true);
  const [honorSubject, setHonorSubject] = useState(true);
  
  // Step 4 (Final step)
  const [issuedCertificate, setIssuedCertificate] = useState<{ pem: string; serial: string } | null>(null);
  const [issuedCertCopied, setIssuedCertCopied] = useState(false);


  // --- Effects ---
  useEffect(() => {
    if (typeof window !== 'undefined' && window.crypto) setEngine("webcrypto", getCrypto());
  }, []);

  useEffect(() => {
    if (issuanceMode === 'upload' && csrPem.trim()) {
      parseCsr(csrPem);
    } else {
      setDecodedCsrInfo(null);
    }
  }, [csrPem, issuanceMode]);

  // --- Handlers ---
  const handleBack = () => setStep(prev => prev - 1);
  const handleCopy = async (text: string, type: string, setCopied: (v: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text.replace(/\\n/g, '\n'));
      setCopied(true);
      toast({ title: "Copied!", description: `${type} PEM copied to clipboard.` });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: `Could not copy ${type} PEM.`, variant: "destructive" });
    }
  };
  const handleDownload = (content: string, filename: string, mime: string) => {
    if (!content) return;
    const blob = new Blob([content.replace(/\\n/g, '\n')], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleCsrFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedCsrFileName(file.name);
      const content = await file.text();
      setCsrPem(content);
    }
  };

  const parseCsr = async (pem: string) => {
    try {
      const pemContent = pem.replace(/-----(BEGIN|END) (NEW )?CERTIFICATE REQUEST-----/g, "").replace(/\s+/g, "");
      const derBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0)).buffer;
      const asn1 = asn1js.fromBER(derBuffer);
      const pkcs10 = new CertificationRequest({ schema: asn1.result });
      const subject = formatPkijsSubject(pkcs10.subject);
      const publicKeyInfo = formatPkijsPublicKeyInfo(pkcs10.subjectPublicKeyInfo);
      let sans: string[] = [];
      let basicConstraints: string | null = null;
      const extensionRequestAttribute = pkcs10.attributes?.find(attr => attr.type === "1.2.840.113549.1.9.14");
      if (extensionRequestAttribute) {
          const extensions = new Extensions({ schema: extensionRequestAttribute.values[0] });
          sans = formatPkijsSans(extensions.extensions);
          basicConstraints = formatPkijsBasicConstraints(extensions.extensions);
      }
      setDecodedCsrInfo({ subject, publicKeyInfo, sans, basicConstraints });
    } catch (e: any) {
      setDecodedCsrInfo({ error: `Failed to parse CSR: ${e.message}` });
    }
  };

  const handleGenerateAndReview = async () => {
    if (isGenerating) return;
    if (!commonName.trim()) {
      toast({ title: "Validation Error", description: "Common Name is required to generate a CSR.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const algorithm = selectedAlgorithm === 'RSA' 
        ? { name: "RSASSA-PKCS1-v1_5", modulusLength: parseInt(selectedRsaKeySize, 10), publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }
        : { name: "ECDSA", namedCurve: selectedEcdsaCurve };
      const keyPair = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
      const privateKeyPem = formatAsPem(arrayBufferToBase64(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)), 'PRIVATE KEY');
      setGeneratedPrivateKeyPem(privateKeyPem);
      
      const pkcs10 = new CertificationRequest({ version: 0 });
      pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: commonName.trim() }) }));
      if (organization.trim()) pkcs10.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.10", value: new asn1js.Utf8String({ value: organization.trim() })}));
      // Add other subject parts similarly...
      await pkcs10.subjectPublicKeyInfo.importKey(keyPair.publicKey);
      
      const preparedExtensions: PkijsExtension[] = [];
      const generalNamesArray: GeneralName[] = [];
      
      emailSans.forEach(email => generalNamesArray.push(new GeneralName({ type: 1, value: email.trim() })));
      dnsSans.forEach(dnsName => generalNamesArray.push(new GeneralName({ type: 2, value: dnsName.trim() })));
      uriSans.forEach(uri => generalNamesArray.push(new GeneralName({ type: 6, value: uri.trim() })));
      ipSans.forEach(ip => {
          const ipBuffer = ipToBuffer(ip);
          if (ipBuffer) generalNamesArray.push(new GeneralName({ type: 7, value: new asn1js.OctetString({ valueHex: ipBuffer }) }));
      });
      
      if (generalNamesArray.length > 0) {
        preparedExtensions.push(new PkijsExtension({ extnID: "2.5.29.17", critical: false, extnValue: new PkijsGeneralNames({ names: generalNamesArray }).toSchema().toBER(false) }));
      }
      if (preparedExtensions.length > 0) {
        pkcs10.attributes = [new Attribute({ type: "1.2.840.113549.1.9.14", values: [new Extensions({ extensions: preparedExtensions }).toSchema()] })];
      }

      await pkcs10.sign(keyPair.privateKey, "SHA-256");
      const signedCsrPem = formatAsPem(arrayBufferToBase64(pkcs10.toSchema().toBER(false)), 'CERTIFICATE REQUEST');
      setCsrPem(signedCsrPem);
      await parseCsr(signedCsrPem);
      setStep(2);
    } catch (e: any) {
      setGenerationError(`Failed to generate: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleReviewUploadedCsr = () => {
      if (!csrPem.trim()) {
          toast({ title: "Validation Error", description: "Please upload or paste a CSR first.", variant: "destructive" });
          return;
      }
      if (decodedCsrInfo?.error) {
          toast({ title: "CSR Error", description: `Cannot proceed, CSR is invalid: ${decodedCsrInfo.error}`, variant: "destructive" });
          return;
      }
      setStep(2);
  };
  
  const handleKeyUsageChange = (usage: string, checked: boolean) => {
    setKeyUsages(prev => checked ? [...prev, usage] : prev.filter(u => u !== usage));
  };
  const handleExtendedKeyUsageChange = (usage: string, checked: boolean) => {
    setExtendedKeyUsages(prev => checked ? [...prev, usage] : prev.filter(u => u !== usage));
  };

  const handleIssueCertificate = async () => {
    if (!csrPem.trim() || !caId) {
        toast({ title: "Error", description: "CSR or CA ID is missing.", variant: "destructive" });
        return;
    }
    const payload = {
        csr: window.btoa(csrPem),
        profile: {
            extended_key_usage: extendedKeyUsages,
            key_usage: keyUsages,
            honor_extensions: honorExtensions,
            honor_subject: honorSubject,
            sign_as_ca: false,
            validity: {
                type: "Duration",
                duration: duration
            }
        }
    };
    
    setIsGenerating(true); // Reuse for submission loading state
    setGenerationError(null);
    try {
        const response = await fetch(`https://lab.lamassu.io/api/ca/v1/cas/${caId}/certificates/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.access_token}` },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.err || `Failed to issue certificate. Status: ${response.status}`);
        }

        const issuedPem = result.certificate ? window.atob(result.certificate) : 'Error: Certificate not found in response.';
        setIssuedCertificate({ pem: issuedPem, serial: result.serial_number });
        setStep(4);
        toast({ title: "Success!", description: "Certificate issued successfully." });
    } catch (e: any) {
        setGenerationError(e.message);
        toast({ title: "Issuance Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };


  if (!caId && typeof window !== 'undefined') { return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>Error: CA ID is missing from URL.</AlertDescription></Alert>; }
  if (!caId) { return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>; }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back to CA</Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Issue New Certificate</CardTitle>
          <CardDescription>Follow the steps below to issue a new certificate from CA: <span className="font-mono">{caId.substring(0,12)}...</span></CardDescription>
        </CardHeader>
        <CardContent>
          <Stepper currentStep={step} />
          
          {step === 1 && (
            <div className="space-y-6 mt-6">
                <Select value={issuanceMode} onValueChange={(val: 'generate' | 'upload') => setIssuanceMode(val)}>
                    <SelectTrigger className="w-full sm:w-[300px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="generate">Generate Key & CSR In Browser</SelectItem>
                        <SelectItem value="upload">Upload Existing CSR</SelectItem>
                    </SelectContent>
                </Select>
                {issuanceMode === 'generate' ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Certificate Subject & Key Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="keyAlgorithm">Algorithm</Label>
                            <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableAlgorithms.map(a=><SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent></Select>
                        </div>
                        {selectedAlgorithm === 'RSA' ? (
                           <div className="space-y-1"><Label htmlFor="rsaKeySize">RSA Key Size</Label><Select value={selectedRsaKeySize} onValueChange={setSelectedRsaKeySize}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{rsaKeySizes.map(s=><SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                        ) : (
                           <div className="space-y-1"><Label htmlFor="ecdsaCurve">ECDSA Curve</Label><Select value={selectedEcdsaCurve} onValueChange={setSelectedEcdsaCurve}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ecdsaCurves.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select></div>
                        )}
                        <div className="space-y-1"><Label htmlFor="commonName">Common Name (CN)</Label><Input id="commonName" value={commonName} onChange={e => setCommonName(e.target.value)} required /></div>
                        <div className="space-y-1"><Label htmlFor="organization">Organization (O)</Label><Input id="organization" value={organization} onChange={e => setOrganization(e.target.value)} /></div>
                    </div>
                    <h3 className="font-medium text-lg pt-4">Subject Alternative Names (SANs)</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1"><Label htmlFor="dnsSans">DNS Names</Label><TagInput id="dnsSans" value={dnsSans} onChange={setDnsSans} placeholder="Add DNS names..."/></div>
                        <div className="space-y-1"><Label htmlFor="ipSans">IP Addresses</Label><TagInput id="ipSans" value={ipSans} onChange={setIpSans} placeholder="Add IP addresses..."/></div>
                        <div className="space-y-1"><Label htmlFor="emailSans">Email Addresses</Label><TagInput id="emailSans" value={emailSans} onChange={setEmailSans} placeholder="Add email addresses..."/></div>
                        <div className="space-y-1"><Label htmlFor="uriSans">URIs</Label><TagInput id="uriSans" value={uriSans} onChange={setUriSans} placeholder="Add URIs..."/></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                     <h3 className="font-medium text-lg">Upload or Paste CSR</h3>
                     <div className="space-y-1"><Label htmlFor="csrFile">Upload CSR File</Label><Input id="csrFile" type="file" accept=".csr,.pem" onChange={handleCsrFileUpload}/></div>
                     <div className="space-y-1"><Label htmlFor="csrPemTextarea">Or Paste CSR (PEM)</Label><Textarea id="csrPemTextarea" value={csrPem} onChange={e=>setCsrPem(e.target.value)} rows={8} className="font-mono"/></div>
                  </div>
                )}
            </div>
          )}

          {step === 2 && (
             <div className="space-y-6 mt-6">
                {generatedPrivateKeyPem && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-lg">Generated Private Key</h3>
                            <div className="flex space-x-2">
                                <Button type="button" variant="outline" size="sm" onClick={()=>handleCopy(generatedPrivateKeyPem, "Private Key", setPrivateKeyCopied)}>
                                    {privateKeyCopied?<Check className="mr-1 h-4 w-4 text-green-500"/>:<Copy className="mr-1 h-4 w-4"/>}
                                    {privateKeyCopied?'Copied':'Copy'}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={()=>handleDownload(generatedPrivateKeyPem, "private_key.pem", "application/x-pem-file")}>
                                    <DownloadIcon className="mr-1 h-4 w-4"/>Download
                                </Button>
                            </div>
                        </div>
                        <p className="text-xs text-destructive">This is your only chance to save the private key. Store it securely.</p>
                        <Textarea readOnly value={generatedPrivateKeyPem} rows={8} className="font-mono bg-muted/50"/>
                    </div>
                )}
                <div className="space-y-2">
                    <div className="flex justify-between items-center"><h3 className="font-medium text-lg">Certificate Signing Request (CSR)</h3><div className="flex space-x-2"><Button type="button" variant="outline" size="sm" onClick={()=>handleCopy(csrPem, "CSR", setCsrCopied)}>{csrCopied?<Check className="mr-1 h-4 w-4 text-green-500"/>:<Copy className="mr-1 h-4 w-4"/>}{csrCopied?'Copied':'Copy'}</Button><Button type="button" variant="outline" size="sm" onClick={()=>handleDownload(csrPem, "request.csr", "application/pkcs10")}><DownloadIcon className="mr-1 h-4 w-4"/>Download</Button></div></div>
                    <Textarea readOnly value={csrPem} rows={8} className="font-mono bg-muted/50"/>
                </div>
                {decodedCsrInfo && (
                    <Card className="bg-muted/30"><CardHeader><CardTitle className="text-md">Decoded CSR Information</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{decodedCsrInfo.error ? <Alert variant="destructive">{decodedCsrInfo.error}</Alert> : <>
                        <DetailItem label="Subject" value={decodedCsrInfo.subject} isMono />
                        <DetailItem label="Public Key" value={decodedCsrInfo.publicKeyInfo} isMono />
                        {decodedCsrInfo.sans && decodedCsrInfo.sans.length > 0 && <DetailItem label="SANs" value={<div className="flex flex-wrap gap-1">{decodedCsrInfo.sans.map((san, i)=><Badge key={i} variant="secondary">{san}</Badge>)}</div>}/>}
                        {decodedCsrInfo.basicConstraints && <DetailItem label="Basic Constraints" value={decodedCsrInfo.basicConstraints} isMono />}
                    </> }</CardContent></Card>
                )}
             </div>
          )}

          {step === 3 && (
             <div className="space-y-6 mt-6">
                <div className="space-y-1"><Label htmlFor="duration">Validity Duration</Label><Input id="duration" value={duration} onChange={e=>setDuration(e.target.value)} placeholder="e.g., 365d, 1y, 2w" /><p className="text-xs text-muted-foreground">Units: y, w, d, h, m, s.</p></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><h4 className="font-medium">Key Usage</h4><div className="space-y-1.5 border p-3 rounded-md">{KEY_USAGE_OPTIONS.map(o=><div key={o.id} className="flex items-center space-x-2"><Checkbox id={`ku-${o.id}`} checked={keyUsages.includes(o.id)} onCheckedChange={(c)=>handleKeyUsageChange(o.id, !!c)}/><Label htmlFor={`ku-${o.id}`} className="font-normal">{o.label}</Label></div>)}</div></div>
                    <div className="space-y-2"><h4 className="font-medium">Extended Key Usage</h4><div className="space-y-1.5 border p-3 rounded-md">{EKU_OPTIONS.map(o=><div key={o.id} className="flex items-center space-x-2"><Checkbox id={`eku-${o.id}`} checked={extendedKeyUsages.includes(o.id)} onCheckedChange={(c)=>handleExtendedKeyUsageChange(o.id, !!c)}/><Label htmlFor={`eku-${o.id}`} className="font-normal">{o.label}</Label></div>)}</div></div>
                </div>
                 <div className="space-y-2 pt-4">
                    <h4 className="font-medium text-lg">CSR Honoring Policy</h4>
                    <div className="flex items-center space-x-2"><Switch id="honorSubject" checked={honorSubject} onCheckedChange={setHonorSubject} /><Label htmlFor="honorSubject">Honor Subject from CSR</Label></div>
                    <div className="flex items-center space-x-2"><Switch id="honorExtensions" checked={honorExtensions} onCheckedChange={setHonorExtensions} /><Label htmlFor="honorExtensions">Honor Extensions from CSR</Label></div>
                </div>
             </div>
          )}

          {step === 4 && (
            <div className="space-y-6 mt-6 text-center">
              <Check className="h-16 w-16 text-green-500 mx-auto" />
              <h3 className="text-2xl font-semibold">Certificate Issued Successfully!</h3>
              <p className="text-muted-foreground">The certificate has been provisioned. You can view the details or download the PEM file below.</p>
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Issued Certificate PEM</h3>
                  <div className="flex space-x-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => handleCopy(issuedCertificate?.pem || '', "Certificate", setIssuedCertCopied)}>
                      {issuedCertCopied ? <Check className="mr-1 h-4 w-4 text-green-500"/> : <Copy className="mr-1 h-4 w-4"/>}
                      {issuedCertCopied ? 'Copied' : 'Copy'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleDownload(issuedCertificate?.pem || '', "certificate.pem", "application/x-pem-file")}>
                      <DownloadIcon className="mr-1 h-4 w-4"/>Download
                    </Button>
                  </div>
                </div>
                <Textarea readOnly value={issuedCertificate?.pem || ''} rows={10} className="font-mono bg-muted/50"/>
              </div>
            </div>
          )}


          {generationError && <Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertDescription>{generationError}</AlertDescription></Alert>}

        </CardContent>
        <CardFooter className="flex justify-between">
            {step < 4 ? <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 1}>Back</Button> : <div/> /* Spacer */}
            <div className="flex space-x-2">
                {step === 1 && issuanceMode === 'generate' && <Button type="button" onClick={handleGenerateAndReview} disabled={isGenerating || !commonName.trim()}>{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Next: Review</Button>}
                {step === 1 && issuanceMode === 'upload' && <Button type="button" onClick={handleReviewUploadedCsr} disabled={!csrPem.trim()}>Next: Review</Button>}
                {step === 2 && <Button type="button" onClick={() => setStep(3)}>Next: Configure</Button>}
                {step === 3 && <Button type="button" onClick={handleIssueCertificate} disabled={isGenerating}>{isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Issue Certificate</Button>}
                {step === 4 && (
                    <>
                        <Button type="button" variant="outline" onClick={() => router.push(`/certificate-authorities/details?caId=${caId}&tab=issued`)}>
                            Finish
                        </Button>
                        <Button type="button" onClick={() => router.push(`/certificates/details?certificateId=${issuedCertificate?.serial}`)} disabled={!issuedCertificate?.serial}>
                            View Certificate Details
                        </Button>
                    </>
                )}
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
