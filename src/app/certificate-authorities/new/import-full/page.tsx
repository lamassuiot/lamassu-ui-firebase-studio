
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, UploadCloud, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Certificate as PkijsCertificate, BasicConstraints as PkijsBasicConstraints } from "pkijs";
import * as asn1js from "asn1js";
import { format as formatDate } from 'date-fns';
import { DetailItem } from '@/components/shared/DetailItem';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface DecodedImportedCertInfo {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  isCa?: boolean;
  error?: string;
}

const OID_MAP: Record<string, string> = {
  "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU",
};
function formatPkijsSubject(subject: any): string {
  return subject.typesAndValues.map((tv: any) => `${OID_MAP[tv.type] || tv.type}=${(tv.value as any).valueBlock.value}`).join(', ');
}
function ab2hex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function CreateCaImportFullPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caId, setCaId] = useState('');
  
  const [importedCaCertPem, setImportedCaCertPem] = useState('');
  const [importedPrivateKeyPem, setImportedPrivateKeyPem] = useState('');
  const [decodedImportedCertInfo, setDecodedImportedCertInfo] = useState<DecodedImportedCertInfo | null>(null);

  useEffect(() => {
    setCaId(crypto.randomUUID());
  }, []);

  const parseCertificatePem = async (pem: string) => {
    try {
      const pemContent = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
      const derBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0)).buffer;
      const asn1 = asn1js.fromBER(derBuffer);
      if (asn1.offset === -1) throw new Error("Invalid ASN.1 structure.");
      const certificate = new PkijsCertificate({ schema: asn1.result });
      
      const basicConstraintsExtension = certificate.extensions?.find(ext => ext.extnID === "2.5.29.19");
      const isCa = basicConstraintsExtension ? (basicConstraintsExtension.parsedValue as PkijsBasicConstraints).cA : false;

      setDecodedImportedCertInfo({
        subject: formatPkijsSubject(certificate.subject),
        issuer: formatPkijsSubject(certificate.issuer),
        serialNumber: ab2hex(certificate.serialNumber.valueBlock.valueHex),
        validFrom: formatDate(certificate.notBefore.value, "PPpp"),
        validTo: formatDate(certificate.notAfter.value, "PPpp"),
        isCa: isCa,
      });
    } catch (e: any) {
      setDecodedImportedCertInfo({ error: `Failed to parse certificate: ${e.message}` });
    }
  };

  const handleImportedCertPemChange = (pem: string) => {
    setImportedCaCertPem(pem);
    if (!pem.trim()) {
        setDecodedImportedCertInfo(null);
        return;
    }
    parseCertificatePem(pem);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!importedCaCertPem.trim() || !importedPrivateKeyPem.trim()) {
      toast({ title: "Validation Error", description: "Certificate and Private Key PEMs are required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (decodedImportedCertInfo?.error) {
      toast({ title: "Certificate Error", description: "Cannot import due to invalid certificate data.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!decodedImportedCertInfo?.isCa) {
      toast({ title: "Certificate Error", description: "The provided certificate is not a CA certificate (Basic Constraints `cA` is not `TRUE`).", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const formData = {
      caId,
      importedCaCertPem,
      importedPrivateKeyPem,
    };
    
    console.log(`Mock Importing Full CA with data:`, formData);
    toast({ title: "Mock CA Import", description: `Full CA import submitted for "${decodedImportedCertInfo?.subject}". Details in console.`, variant: "default" });
    router.push('/certificate-authorities');

    setIsSubmitting(false);
  };

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/certificate-authorities/new')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Creation Methods
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <UploadCloud className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">
              Import External CA (with Private Key)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Import an existing CA certificate and its private key to be managed by LamassuIoT.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-3">CA Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caId">New CA ID (generated)</Label>
                  <Input id="caId" value={caId} readOnly className="mt-1 bg-muted/50" />
                </div>
                 <div>
                   <Label htmlFor="importedCaCertPem">CA Certificate (PEM)</Label>
                    <Textarea 
                        id="importedCaCertPem" 
                        placeholder="Paste the CA certificate PEM here..." 
                        rows={6} 
                        required 
                        className="mt-1 font-mono"
                        value={importedCaCertPem}
                        onChange={(e) => handleImportedCertPemChange(e.target.value)}
                    />
                   <p className="text-xs text-muted-foreground mt-1">The public certificate of the CA you are importing.</p>
                </div>
                 {decodedImportedCertInfo && (
                    <Card className="bg-muted/30">
                        <CardHeader>
                        <CardTitle className="text-md">Decoded Certificate Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                        {decodedImportedCertInfo.error ? (
                            <Alert variant="destructive">{decodedImportedCertInfo.error}</Alert>
                        ) : (
                            <>
                            <DetailItem label="Subject" value={decodedImportedCertInfo.subject} isMono />
                            <DetailItem label="Issuer" value={decodedImportedCertInfo.issuer} isMono />
                            <DetailItem label="Serial Number" value={decodedImportedCertInfo.serialNumber} isMono />
                            <DetailItem label="Valid From" value={decodedImportedCertInfo.validFrom} />
                            <DetailItem label="Valid To" value={decodedImportedCertInfo.validTo} />
                            <DetailItem label="Is CA" value={<Badge variant={decodedImportedCertInfo.isCa ? "default" : "secondary"}>{decodedImportedCertInfo.isCa ? 'Yes' : 'No'}</Badge>} />
                            </>
                        )}
                        </CardContent>
                    </Card>
                )}
                <div>
                   <Label htmlFor="importedCaKeyPem">CA Private Key (PEM)</Label>
                   <Textarea id="importedCaKeyPem" value={importedPrivateKeyPem} onChange={(e) => setImportedPrivateKeyPem(e.target.value)} placeholder="Paste the corresponding private key PEM here..." rows={6} required className="mt-1 font-mono"/>
                   <p className="text-xs text-muted-foreground mt-1">The key can be encrypted; passphrase input would be added in a real scenario.</p>
                </div>
              </div>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                Import CA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
