
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FilePlus2, KeyRound, Loader2, AlertTriangle, FileSignature, UploadCloud, ChevronRight, Copy, Check, Download as DownloadIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';

import {
  CertificationRequest,
  AttributeTypeAndValue,
  Attribute,
  Extensions,
  Extension as PkijsExtension, // Alias to avoid conflict
  GeneralName,
  GeneralNames as PkijsGeneralNames, // Alias
  BasicConstraints as PkijsBasicConstraints, // Alias
  getCrypto,
  setEngine,
  common,
  PublicKeyInfo as PkijsPublicKeyInfo, // Alias
  RelativeDistinguishedNames as PkijsRelativeDistinguishedNames // Alias
} from "pkijs";
import * as asn1js from "asn1js";


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

// Helper function for IP to Buffer (IPv4 and basic IPv6)
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
      const hexGroups = ip.split(':');
      if (hexGroups.every(group => /^[0-9a-fA-F]{0,4}$/.test(group))) { // Allow empty groups for '::'
        // Very basic IPv6, does not handle '::' compression correctly.
        // It expects 8 groups or a simplified representation.
        const fullIpV6 = new Array(8).fill('0');
        let currentGroup = 0;
        let doubleColonIndex = -1;

        for(let i=0; i < hexGroups.length; i++) {
            if(hexGroups[i] === "") {
                if (doubleColonIndex === -1) {
                    doubleColonIndex = currentGroup;
                } // else error, multiple '::'
                // Skip, will be filled later
            } else {
                fullIpV6[currentGroup++] = hexGroups[i];
            }
        }
        if (doubleColonIndex !== -1) { // handle '::'
            const numMissingGroups = 8 - currentGroup;
            fullIpV6.splice(doubleColonIndex, 0, ...Array(numMissingGroups).fill('0'));
            fullIpV6.length = 8; // Ensure it's exactly 8 groups
        }


        if(fullIpV6.length === 8 && fullIpV6.every(group => /^[0-9a-fA-F]{1,4}$/.test(group))) {
            const buffer = new Uint8Array(16);
            let offset = 0;
            for (const group of fullIpV6) {
                const value = parseInt(group, 16);
                buffer[offset++] = (value >> 8) & 0xFF;
                buffer[offset++] = value & 0xFF;
            }
            return buffer.buffer;
        }
      }
      console.warn(`IPv6 SAN processing for "${ip}" is basic. Ensure it's a standard format (full or one '::'). Full IPv6 parsing is complex.`);
      return null;
  }
  return null;
}

const OID_MAP: Record<string, string> = {
  "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU",
  "1.2.840.113549.1.1.1": "RSA", "1.2.840.10045.2.1": "EC",
  "1.2.840.10045.3.1.7": "P-256", "1.3.132.0.34": "P-384", "1.3.132.0.35": "P-521",
};

function formatPkijsSubject(subject: PkijsRelativeDistinguishedNames): string {
  return subject.typesAndValues.map(tv => {
    const typeOid = tv.type;
    // Accessing underlying value, which can be of different ASN.1 types
    const valueBlock = (tv.value as any).valueBlock;
    const value = valueBlock.value || (valueBlock.valueHex ? new TextDecoder().decode(valueBlock.valueHex) : 'N/A');
    return `${OID_MAP[typeOid] || typeOid}=${value}`;
  }).join(', ');
}

function formatPkijsPublicKeyInfo(publicKeyInfo: PkijsPublicKeyInfo): string {
    const algoOid = publicKeyInfo.algorithm.algorithmId;
    const algoName = OID_MAP[algoOid] || algoOid;
    let details = "";

    if (algoName === "RSA" && publicKeyInfo.parsedKey) {
        const rsaPublicKey = publicKeyInfo.parsedKey as any; // Type assertion for simplicity
        if (rsaPublicKey.modulus && rsaPublicKey.modulus.valueBlock && rsaPublicKey.modulus.valueBlock.valueHex) {
            // Calculate bit length from modulus
            const modulusBytes = rsaPublicKey.modulus.valueBlock.valueHex.byteLength;
             // The first byte of modulus for non-negative integers is 0x00 if MSB is 1.
             // We subtract this if present.
            const firstByte = new Uint8Array(rsaPublicKey.modulus.valueBlock.valueHex)[0];
            const effectiveBytes = firstByte === 0x00 ? modulusBytes -1 : modulusBytes;
            details = `(${effectiveBytes * 8} bits)`;
        } else {
            details = "(RSA details unavailable)";
        }
    } else if (algoName === "EC" && publicKeyInfo.algorithm.parameters) {
        const params = publicKeyInfo.algorithm.parameters;
        if (params && (params as any).valueBlock && (params as any).valueBlock.value) { // Assuming parameters is an OID for named curve
             const curveOid = (params as any).valueBlock.value as string;
             details = `(Curve: ${OID_MAP[curveOid] || curveOid})`;
        } else {
            details = "(EC curve details unavailable)";
        }
    }
    return `${algoName} ${details}`;
}

function formatPkijsSans(extensions: PkijsExtension[]): string[] {
    const sans: string[] = [];
    const sanExtension = extensions.find(ext => ext.extnID === "2.5.29.17"); // subjectAlternativeName
    if (sanExtension && sanExtension.parsedValue) {
        const generalNames = sanExtension.parsedValue as PkijsGeneralNames;
        generalNames.names.forEach(name => {
            switch (name.type) {
                case 1: sans.push(`Email: ${name.value}`); break;
                case 2: sans.push(`DNS: ${name.value}`); break;
                case 6: sans.push(`URI: ${name.value}`); break;
                case 7: // iPAddress
                    const ipBuffer = (name.value as asn1js.OctetString).valueBlock.valueHexView.buffer;
                    const ipArray = Array.from(new Uint8Array(ipBuffer));
                    if (ipArray.length === 4) { // IPv4
                        sans.push(`IP: ${ipArray.join('.')}`);
                    } else if (ipArray.length === 16) { // IPv6
                        const hexParts = [];
                        for (let j = 0; j < ipArray.length; j += 2) {
                           hexParts.push(((ipArray[j] << 8) | ipArray[j + 1]).toString(16).padStart(1, '0'));
                        }
                        // Basic formatting, does not handle compression like '::'
                        sans.push(`IP: ${hexParts.join(':').replace(/(^|:)0(:0)*:0($|:)/, '::')}`);
                    } else {
                        sans.push(`IP: (unrecognized format, length ${ipArray.length})`);
                    }
                    break;
                default:
                    sans.push(`Other SAN (type ${name.type}): ${typeof name.value === 'string' ? name.value : JSON.stringify(name.value)}`);
            }
        });
    }
    return sans;
}

function formatPkijsBasicConstraints(extensions: PkijsExtension[]): string | null {
    const bcExtension = extensions.find(ext => ext.extnID === "2.5.29.19"); // basicConstraints
    if (bcExtension && bcExtension.parsedValue) {
        const basicConstraints = bcExtension.parsedValue as PkijsBasicConstraints;
        let result = `CA: ${basicConstraints.cA ? 'TRUE' : 'FALSE'}`;
        if (basicConstraints.cA && typeof basicConstraints.pathLenConstraint !== 'undefined') {
            result += `, Path Length: ${basicConstraints.pathLenConstraint}`;
        }
        return result;
    }
    return null;
}

interface DecodedCsrInfo {
  subject?: string;
  publicKeyInfo?: string;
  sans?: string[];
  basicConstraints?: string | null;
  error?: string;
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
  const { toast } = useToast();
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
  const [isCsrGenerated, setIsCsrGenerated] = useState<boolean>(false); 

  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('RSA');
  const [selectedRsaKeySize, setSelectedRsaKeySize] = useState<string>('2048');
  const [selectedEcdsaCurve, setSelectedEcdsaCurve] = useState<string>('P-256');

  const [privateKeyCopied, setPrivateKeyCopied] = useState(false);
  const [csrCopied, setCsrCopied] = useState(false);
  const [decodedCsrInfo, setDecodedCsrInfo] = useState<DecodedCsrInfo | null>(null);

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

  useEffect(() => {
    if (issuanceMode === 'generate') {
      setIsCsrGenerated(false); // Reset generation status if subject details change
      setDecodedCsrInfo(null); // Clear decoded info if switching back to generate mode
    }
  }, [commonName, organization, organizationalUnit, country, stateProvince, locality, 
      dnsSans, ipSans, emailSans, uriSans, 
      selectedAlgorithm, selectedRsaKeySize, selectedEcdsaCurve, issuanceMode]);

  useEffect(() => {
    if (issuanceMode === 'upload' && csrPem.trim()) {
      const parseCsr = async () => {
        try {
          const pemContent = csrPem
            .replace(/-----(BEGIN|END) CERTIFICATE REQUEST-----/g, "")
            .replace(/-----(BEGIN|END) NEW CERTIFICATE REQUEST-----/g, "") // Handle "NEW CERTIFICATE REQUEST" too
            .replace(/\s+/g, "");

          if (!pemContent) {
            setDecodedCsrInfo({ error: "CSR content is empty after stripping headers/footers." });
            return;
          }

          const binaryString = window.atob(pemContent);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const derBuffer = bytes.buffer;

          const asn1 = asn1js.fromBER(derBuffer);
          if (asn1.offset === -1) {
            throw new Error("Failed to parse ASN.1 structure from CSR DER.");
          }
          const pkcs10 = new CertificationRequest({ schema: asn1.result });

          const subject = formatPkijsSubject(pkcs10.subject);
          const publicKeyInfo = formatPkijsPublicKeyInfo(pkcs10.subjectPublicKeyInfo);

          let sans: string[] = [];
          let basicConstraints: string | null = null;
          const extensionRequestAttribute = pkcs10.attributes?.find(attr => attr.type === "1.2.840.113549.1.9.14");
          if (extensionRequestAttribute && extensionRequestAttribute.values[0]) {
              const extensionsSchema = extensionRequestAttribute.values[0];
              const extensions = extensionsSchema instanceof Extensions ? extensionsSchema : new Extensions({ schema: extensionsSchema });
              if (extensions.extensions) {
                  sans = formatPkijsSans(extensions.extensions);
                  basicConstraints = formatPkijsBasicConstraints(extensions.extensions);
              }
          }
          setDecodedCsrInfo({ subject, publicKeyInfo, sans, basicConstraints });
        } catch (e: any) {
          console.error("CSR Parsing Error:", e);
          setDecodedCsrInfo({ error: `Failed to parse CSR: ${e.message || String(e)}` });
        }
      };
      parseCsr();
    } else if (issuanceMode !== 'upload' || !csrPem.trim()) {
      setDecodedCsrInfo(null); // Clear if not in upload mode or CSR is empty
    }
  }, [csrPem, issuanceMode]);


  const resetModeSpecificState = () => {
    setCsrPem('');
    setUploadedCsrFileName(null);
    setGeneratedCsrPemForDisplay('');
    setGeneratedPrivateKeyPem('');
    setGeneratedKeyPair(null);
    setGenerationError(null);
    setIsCsrGenerated(false);
    setPrivateKeyCopied(false);
    setCsrCopied(false);
    setDecodedCsrInfo(null);
  };

  const handleModeSelection = (selectedMode: 'generate' | 'upload') => {
    setIssuanceMode(selectedMode);
    setModeChosen(true);
    resetModeSpecificState();
  };

  const handleChangeCsrMethod = () => {
    setModeChosen(false);
    resetModeSpecificState();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
      toast({title: "Error", description: "CA ID is missing from the URL.", variant: "destructive"});
      return;
    }
    if (!csrPem.trim()) {
      toast({title: "Error", description: "CSR is required. Please generate or upload a CSR.", variant: "destructive"});
      return;
    }
    
    let subjectDetailsForLog: any = {};
    if (issuanceMode === 'generate') {
        subjectDetailsForLog = {
            commonName, organization, organizationalUnit, country, stateProvince, locality,
            dnsSans: dnsSans.split(',').map(s=>s.trim()).filter(s=>s),
            ipSans: ipSans.split(',').map(s=>s.trim()).filter(s=>s),
            emailSans: emailSans.split(',').map(s=>s.trim()).filter(s=>s),
            uriSans: uriSans.split(',').map(s=>s.trim()).filter(s=>s),
        };
    }

    console.log(`Issuing certificate from CA: ${caId} with CSR and form data...`);
    console.log({
        caIdToIssueFrom: caId,
        mode: issuanceMode,
        ...subjectDetailsForLog, 
        certificateValidityDays: validityDays,
        certificateSigningRequest: csrPem
    });
    toast({title: "Mock Certificate Issued", description: `Certificate issued from CA ${caId.substring(0,8)}... (Check console for details).`})
    // router.push(`/certificate-authorities/details?caId=${caId}`); // Optionally navigate
  };

  const handleGenerateKeyPairAndCsr = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedPrivateKeyPem('');
    setGeneratedCsrPemForDisplay('');
    setCsrPem(''); 
    setGeneratedKeyPair(null);
    setIsCsrGenerated(false);
    setPrivateKeyCopied(false);
    setCsrCopied(false);

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
        else webCryptoHashName = "SHA-512"; // For P-521

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
      
      pkcs10.attributes = []; // Initialize attributes array
      const preparedExtensions: PkijsExtension[] = [];
      const basicConstraints = new PkijsBasicConstraints({ cA: false });
      preparedExtensions.push(new PkijsExtension({
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
          toast({title: "Warning", description: `Could not parse IP SAN: ${ipAddress}. It will be skipped.`, variant: "default"});
        }
      });
      emailSans.split(',').map(s => s.trim()).filter(s => s).forEach(email => {
        generalNamesArray.push(new GeneralName({ type: 1, value: email })); 
      });
      uriSans.split(',').map(s => s.trim()).filter(s => s).forEach(uri => {
        generalNamesArray.push(new GeneralName({ type: 6, value: uri })); 
      });

      if (generalNamesArray.length > 0) {
        const altNames = new PkijsGeneralNames({ names: generalNamesArray });
        preparedExtensions.push(new PkijsExtension({
          extnID: "2.5.29.17", 
          critical: false, 
          extnValue: altNames.toSchema().toBER(false)
        }));
      }
      
      if (preparedExtensions.length > 0) {
        pkcs10.attributes.push(new Attribute({ 
          type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
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
      setIsCsrGenerated(true);

    } catch (error: any) {
      console.error("Key pair or CSR generation error:", error);
      setGenerationError(`Failed to generate: ${error.message || String(error)}`);
      setIsCsrGenerated(false);
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
        setIsCsrGenerated(false); 
        setCsrCopied(false);
        setDecodedCsrInfo(null); // Trigger re-parsing
      };
      reader.readAsText(file);
    } else {
      setUploadedCsrFileName(null);
      setCsrPem(''); 
      setDecodedCsrInfo(null);
    }
  };

  const handleCopyPrivateKey = async () => {
    if (!generatedPrivateKeyPem) return;
    try {
      await navigator.clipboard.writeText(generatedPrivateKeyPem.replace(/\\n/g, '\n'));
      setPrivateKeyCopied(true);
      toast({ title: "Copied!", description: "Private Key PEM copied to clipboard." });
      setTimeout(() => setPrivateKeyCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy Private Key PEM.", variant: "destructive" });
    }
  };

  const handleDownloadPrivateKey = () => {
    if (!generatedPrivateKeyPem) return;
    const blob = new Blob([generatedPrivateKeyPem.replace(/\\n/g, '\n')], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${commonName || 'private'}_key.pem`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCsr = async () => {
    if (!generatedCsrPemForDisplay) return;
    try {
      await navigator.clipboard.writeText(generatedCsrPemForDisplay.replace(/\\n/g, '\n'));
      setCsrCopied(true);
      toast({ title: "Copied!", description: "CSR PEM copied to clipboard." });
      setTimeout(() => setCsrCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy CSR PEM.", variant: "destructive" });
    }
  };

  const handleDownloadCsr = () => {
    if (!generatedCsrPemForDisplay) return;
    const blob = new Blob([generatedCsrPemForDisplay.replace(/\\n/g, '\n')], { type: 'application/pkcs10' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${commonName || 'certificate'}_request.csr`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <div className="w-full space-y-6 p-4 md:p-6">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CA Details
        </Button>
        <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl md:text-3xl font-headline font-semibold">Issue Certificate</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Issue a new certificate from CA: <span className="font-mono text-primary">{caId ? caId.substring(0, 12) : 'N/A'}...</span>
              <br/>Choose how you want to provide the Certificate Signing Request (CSR).
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card
              className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col group border-primary/30 hover:border-primary"
              onClick={() => handleModeSelection('generate')}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">Generate Key &amp; CSR In Browser</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      A new private key and CSR will be generated directly in your browser. The private key will be displayed for you to save.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                <Button variant="default" className="w-full bg-primary/90 hover:bg-primary">
                  Select &amp; Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            <Card
              className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col group border-primary/30 hover:border-primary"
              onClick={() => handleModeSelection('upload')}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <UploadCloud className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">Upload Existing CSR</CardTitle>
                    <CardDescription className="mt-1 text-sm">
                      Provide a pre-existing Certificate Signing Request (CSR) in PEM format.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                <Button variant="default" className="w-full bg-primary/90 hover:bg-primary">
                  Select &amp; Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
            <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to CA Details
            </Button>
            <Button variant="ghost" onClick={handleChangeCsrMethod} className="text-primary hover:text-primary/80">
                <ArrowLeft className="mr-2 h-4 w-4" /> Change CSR Method
            </Button>
        </div>
        <div className="space-y-2">
            <div className="flex items-center space-x-3">
                {issuanceMode === 'generate' ? <KeyRound className="h-7 w-7 text-primary" /> : <UploadCloud className="h-7 w-7 text-primary" />}
                <h1 className="text-2xl font-headline font-semibold">
                    Issue Certificate - {issuanceMode === 'generate' ? 'Generate Key & CSR' : 'Upload CSR'}
                </h1>
            </div>
            <p className="text-sm text-muted-foreground">
                CA: <span className="font-mono text-primary">{caId ? caId.substring(0, 12) : 'N/A'}...</span>
            </p>
        </div>
      
      <Card className="mt-6">
        <form id="issueCertForm" onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-8">
                {issuanceMode === 'generate' && (
                <>
                    <section>
                        <h3 className="text-lg font-medium mb-3">1. Key Generation Parameters</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="keyAlgorithm">Algorithm</Label>
                                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm} disabled={isGenerating || isCsrGenerated}>
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
                                <Select value={selectedRsaKeySize} onValueChange={setSelectedRsaKeySize} disabled={isGenerating || isCsrGenerated}>
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
                                <Select value={selectedEcdsaCurve} onValueChange={setSelectedEcdsaCurve} disabled={isGenerating || isCsrGenerated}>
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
                        </div>
                    </section>
                    <Separator/>
                     {/* Generated Key/CSR Display Area - This part comes before subject if button is in footer */}
                    <section>
                        <h3 className="text-lg font-medium mb-3">2. Generated Key Material &amp; CSR</h3>
                         {generationError && (
                            <Alert variant="destructive" className="mt-2 mb-3">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{generationError}</AlertDescription>
                            </Alert>
                         )}
                        {generatedPrivateKeyPem && (
                        <div className="mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="text-md font-medium">Generated Private Key (PEM)</h4>
                                <div className="flex space-x-2">
                                    <Button type="button" variant="outline" size="sm" onClick={handleCopyPrivateKey} disabled={!generatedPrivateKeyPem}>
                                        {privateKeyCopied ? <Check className="mr-1.5 h-4 w-4 text-green-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                                        {privateKeyCopied ? 'Copied' : 'Copy'}
                                    </Button>
                                    <Button type="button" variant="outline" size="sm" onClick={handleDownloadPrivateKey} disabled={!generatedPrivateKeyPem}>
                                        <DownloadIcon className="mr-1.5 h-4 w-4" /> Download
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-destructive mb-2">Keep this secret! This is your only chance to copy or download it.</p>
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
                            <div className="mt-4">
                                 <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-md font-medium">Generated CSR (PEM)</h4>
                                    <div className="flex space-x-2">
                                        <Button type="button" variant="outline" size="sm" onClick={handleCopyCsr} disabled={!generatedCsrPemForDisplay}>
                                            {csrCopied ? <Check className="mr-1.5 h-4 w-4 text-green-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
                                            {csrCopied ? 'Copied' : 'Copy'}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsr} disabled={!generatedCsrPemForDisplay}>
                                            <DownloadIcon className="mr-1.5 h-4 w-4" /> Download
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                id="generatedCsrPemDisplay"
                                value={generatedCsrPemForDisplay}
                                readOnly
                                rows={8}
                                className="mt-1 font-mono bg-background/50"
                                />
                            </div>
                        )}
                         {!isCsrGenerated && !generationError && !generatedPrivateKeyPem && (
                            <p className="text-sm text-muted-foreground">Fill subject details below, then click "Generate Key Pair & CSR" in the footer.</p>
                         )}
                    </section>
                    <Separator/>
                    <section>
                        <h3 className="text-lg font-medium mb-3">3. Certificate Subject &amp; Validity</h3>
                        <p className="text-xs text-muted-foreground mb-3">These details will be embedded into the generated CSR and the resulting certificate.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <Label htmlFor="commonName">Common Name (CN)</Label>
                            <Input id="commonName" name="commonName" type="text" placeholder="e.g., mydevice.example.com" required className="mt-1" value={commonName} onChange={e => setCommonName(e.target.value)} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="organization">Organization (O)</Label>
                            <Input id="organization" name="organization" type="text" placeholder="e.g., LamassuIoT Corp" className="mt-1" value={organization} onChange={e => setOrganization(e.target.value)} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="organizationalUnit">Organizational Unit (OU)</Label>
                            <Input id="organizationalUnit" name="organizationalUnit" type="text" placeholder="e.g., Engineering" className="mt-1" value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="country">Country (C) (2-letter code)</Label>
                            <Input id="country" name="country" type="text" placeholder="e.g., US" maxLength={2} className="mt-1" value={country} onChange={e => setCountry(e.target.value.toUpperCase())} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="stateProvince">State/Province (ST)</Label>
                            <Input id="stateProvince" name="stateProvince" type="text" placeholder="e.g., California" className="mt-1" value={stateProvince} onChange={e => setStateProvince(e.target.value)} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="locality">Locality (L)</Label>
                            <Input id="locality" name="locality" type="text" placeholder="e.g., San Francisco" className="mt-1" value={locality} onChange={e => setLocality(e.target.value)} disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                            <Label htmlFor="validityDays">Validity (Days)</Label>
                            <Input id="validityDays" name="validityDays" type="number" value={validityDays} required className="mt-1" onChange={e => setValidityDays(e.target.value)} />
                            </div>
                        </div>
                    </section>
                    <Separator />
                    <section>
                        <h3 className="text-lg font-medium mb-3">4. Subject Alternative Names (SANs)</h3>
                        <p className="text-xs text-muted-foreground mb-3">Specify any alternative names for the certificate subject.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="dnsSans">DNS Names (comma-separated)</Label>
                                <Input id="dnsSans" value={dnsSans} onChange={e => setDnsSans(e.target.value)} placeholder="dns1.example.com, dns2.net" className="mt-1" disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                                <Label htmlFor="ipSans">IP Addresses (comma-separated)</Label>
                                <Input id="ipSans" value={ipSans} onChange={e => setIpSans(e.target.value)} placeholder="192.168.1.1, 10.0.0.1" className="mt-1" disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                                <p className="text-xs text-muted-foreground mt-1">IPv4 & basic IPv6 supported.</p>
                            </div>
                            <div>
                                <Label htmlFor="emailSans">Email Addresses (comma-separated)</Label>
                                <Input id="emailSans" value={emailSans} onChange={e => setEmailSans(e.target.value)} placeholder="user@example.com, contact@domain.org" className="mt-1" disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                            <div>
                                <Label htmlFor="uriSans">URIs (comma-separated)</Label>
                                <Input id="uriSans" value={uriSans} onChange={e => setUriSans(e.target.value)} placeholder="https://service.example.com, urn:foo:bar" className="mt-1" disabled={isCsrGenerated && issuanceMode === 'generate'}/>
                            </div>
                        </div>
                    </section>
                </>
                )}

                {issuanceMode === 'upload' && (
                    <section>
                        <h3 className="text-lg font-medium mb-3">1. Certificate Signing Request (CSR)</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="csrFile">Upload CSR File (.csr, .pem)</Label>
                                <Input
                                id="csrFile"
                                type="file"
                                accept=".csr,.pem,.txt"
                                onChange={handleCsrFileUpload}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                />
                                {uploadedCsrFileName && <p className="text-xs text-muted-foreground">Selected file: {uploadedCsrFileName}.</p>}
                            </div>
                             <div>
                                <Label htmlFor="csrPemTextarea">Or Paste CSR (PEM format)</Label>
                                <Textarea
                                  id="csrPemTextarea"
                                  value={csrPem}
                                  onChange={(e) => setCsrPem(e.target.value)}
                                  placeholder="-----BEGIN CERTIFICATE REQUEST-----\n..."
                                  rows={10}
                                  className="mt-1 font-mono"
                                />
                            </div>
                             <div>
                                <Label htmlFor="validityDaysUpload">Certificate Validity (Days)</Label>
                                <Input id="validityDaysUpload" name="validityDaysUpload" type="number" value={validityDays} required className="mt-1" onChange={e => setValidityDays(e.target.value)}/>
                                <p className="text-xs text-muted-foreground mt-1">Define how long the certificate issued from this CSR should be valid.</p>
                            </div>
                        </div>
                        {decodedCsrInfo && (
                          <Card className="mt-6 bg-muted/30">
                            <CardHeader>
                              <CardTitle className="text-md">Decoded CSR Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              {decodedCsrInfo.error ? (
                                <Alert variant="destructive">
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>{decodedCsrInfo.error}</AlertDescription>
                                </Alert>
                              ) : (
                                <>
                                  <DetailItem label="Subject" value={decodedCsrInfo.subject} isMono />
                                  <DetailItem label="Public Key" value={decodedCsrInfo.publicKeyInfo} isMono />
                                  {decodedCsrInfo.sans && decodedCsrInfo.sans.length > 0 && (
                                    <DetailItem label="SANs" value={
                                      <div className="flex flex-wrap gap-1">
                                        {decodedCsrInfo.sans.map((san, i) => <Badge key={i} variant="secondary" className="text-xs">{san}</Badge>)}
                                      </div>
                                    } />
                                  )}
                                  {decodedCsrInfo.basicConstraints && (
                                    <DetailItem label="Basic Constraints" value={decodedCsrInfo.basicConstraints} isMono />
                                  )}
                                </>
                              )}
                            </CardContent>
                          </Card>
                        )}
                    </section>
                )}
            </CardContent>
            <CardFooter className="border-t pt-6">
                <div className="flex justify-end w-full">
                    {issuanceMode === 'generate' && !isCsrGenerated && (
                        <Button 
                            type="button" 
                            size="lg" 
                            onClick={handleGenerateKeyPairAndCsr}
                            disabled={isGenerating || !commonName.trim()}
                        >
                            {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <KeyRound className="mr-2 h-5 w-5" />} 
                            Generate Key Pair & CSR
                        </Button>
                    )}
                     {issuanceMode === 'generate' && isCsrGenerated && (
                         <Button type="submit" size="lg" disabled={isGenerating || !csrPem.trim()}>
                            <FileSignature className="mr-2 h-5 w-5" /> Issue Certificate
                        </Button>
                    )}
                    {issuanceMode === 'upload' && (
                        <Button type="submit" size="lg" disabled={!csrPem.trim()}>
                            <FileSignature className="mr-2 h-5 w-5" /> Issue Certificate
                        </Button>
                    )}
                </div>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
    
    




