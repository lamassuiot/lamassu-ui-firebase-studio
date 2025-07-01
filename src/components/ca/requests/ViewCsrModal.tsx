
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CertificationRequest,
  Extensions,
  Extension as PkijsExtension,
  GeneralName,
  GeneralNames as PkijsGeneralNames,
  BasicConstraints as PkijsBasicConstraints,
  getCrypto,
  setEngine,
  PublicKeyInfo as PkijsPublicKeyInfo,
  RelativeDistinguishedNames as PkijsRelativeDistinguishedNames,
  Attribute
} from "pkijs";
import * as asn1js from "asn1js";
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

// --- PKI.js Helper Functions ---
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

interface DecodedCsrInfo {
  subject?: string;
  publicKeyInfo?: string;
  sans?: string[];
  basicConstraints?: string | null;
  error?: string;
}

interface ViewCsrModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  csrPem: string | null;
}

export const ViewCsrModal: React.FC<ViewCsrModalProps> = ({ isOpen, onOpenChange, csrPem }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [decodedInfo, setDecodedInfo] = useState<DecodedCsrInfo | null>(null);

  const parseCsr = useCallback(async (pem: string) => {
    try {
      if(typeof window !== 'undefined') setEngine("webcrypto", getCrypto());

      const pemContent = pem.replace(/-----(BEGIN|END) (NEW )?CERTIFICATE REQUEST-----/g, "").replace(/\s+/g, "");
      const derBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0)).buffer;
      const asn1 = asn1js.fromBER(derBuffer);
      if (asn1.offset === -1) {
        throw new Error("Cannot parse CSR. Invalid ASN.1 structure.");
      }
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
      setDecodedInfo({ subject, publicKeyInfo, sans, basicConstraints });
    } catch (e: any) {
      setDecodedInfo({ error: `Failed to parse CSR: ${e.message}` });
    }
  }, []);

  useEffect(() => {
    if(isOpen && csrPem) {
      parseCsr(csrPem);
    } else {
      setDecodedInfo(null);
    }
  }, [isOpen, csrPem, parseCsr]);

  const handleCopy = async () => {
    if (!csrPem) return;
    try {
      await navigator.clipboard.writeText(csrPem);
      setCopied(true);
      toast({ title: "Copied!", description: "CSR content copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Certificate Signing Request (CSR)</DialogTitle>
          <DialogDescription>
            This is the generated CSR for the CA request.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-4 my-4">
              {decodedInfo ? (
                <Card>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    {decodedInfo.error ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Parsing Error</AlertTitle>
                        <AlertDescription>{decodedInfo.error}</AlertDescription>
                      </Alert>
                    ) : (
                      <>
                        <DetailItem label="Subject" value={decodedInfo.subject} isMono />
                        <DetailItem label="Public Key" value={decodedInfo.publicKeyInfo} isMono />
                        {decodedInfo.sans && decodedInfo.sans.length > 0 && <DetailItem label="SANs" value={<div className="flex flex-wrap gap-1">{decodedInfo.sans.map((san, i)=><Badge key={i} variant="secondary">{san}</Badge>)}</div>}/>}
                        {decodedInfo.basicConstraints && <DetailItem label="Basic Constraints" value={decodedInfo.basicConstraints} isMono />}
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              <div className="relative">
                <Label>Raw PEM Content</Label>
                <div className="relative mt-1">
                  <pre className="text-xs bg-muted p-3 rounded-md font-mono overflow-x-auto whitespace-pre-wrap break-all h-64 border">
                    <code>{csrPem || 'No CSR data available.'}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1.5 right-1.5 h-7 w-7"
                    onClick={handleCopy}
                    disabled={!csrPem}
                  >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy CSR</span>
                  </Button>
                </div>
              </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
