
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, UploadCloud, Loader2, Settings, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Certificate as PkijsCertificate, BasicConstraints as PkijsBasicConstraints } from "pkijs";
import * as asn1js from "asn1js";
import { format as formatDate } from 'date-fns';
import { DetailItem } from '@/components/shared/DetailItem';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { CryptoEngineSelector } from '@/components/shared/CryptoEngineSelector';
import { ExpirationInput, type ExpirationConfig } from '@/components/shared/ExpirationInput';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { fetchAndProcessCAs, type CA } from '@/lib/ca-data';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { Separator } from '@/components/ui/separator';

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

const stripPemHeaders = (pem: string): string => {
  if (!pem) return '';
  return pem
    .replace(/-----(BEGIN|END) (PRIVATE KEY|CERTIFICATE)-----/g, "")
    .replace(/-----(BEGIN|END) (EC|RSA|ENCRYPTED) PRIVATE KEY-----/g, "") // More key types
    .replace(/\s+/g, "");
};

const INDEFINITE_DATE_API_VALUE = "9999-12-31T23:59:59.999Z";

export default function CreateCaImportFullPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caId, setCaId] = useState('');
  
  const [importedCaCertPem, setImportedCaCertPem] = useState('');
  const [importedPrivateKeyPem, setImportedPrivateKeyPem] = useState('');
  const [decodedImportedCertInfo, setDecodedImportedCertInfo] = useState<DecodedImportedCertInfo | null>(null);

  // New state for API call
  const [cryptoEngineId, setCryptoEngineId] = useState<string | undefined>(undefined);
  const [caChainPem, setCaChainPem] = useState('');
  const [issuanceExpiration, setIssuanceExpiration] = useState<ExpirationConfig>({ type: 'Duration', durationValue: '1y' });
  const [selectedParentCa, setSelectedParentCa] = useState<CA | null>(null);
  const [isParentCaModalOpen, setIsParentCaModalOpen] = useState(false);
  
  const [availableParentCAs, setAvailableParentCAs] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(false);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);

  useEffect(() => {
    setCaId(crypto.randomUUID());
  }, []);

  const loadCaData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) return;
    
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      setAvailableParentCAs(fetchedCAs); 
    } catch (err: any) {
      setErrorCAs(err.message || 'Failed to load available parent CAs.');
    } finally {
      setIsLoadingCAs(false);
    }
  }, [user?.access_token, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
        loadCaData();
        // Engines are loaded via the CryptoEngineSelector component itself
    }
  }, [loadCaData, authLoading, isAuthenticated]);
  
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
  
  const formatExpirationForApi = (config: ExpirationConfig): { type: string; duration?: string; time?: string } => {
    if (config.type === "Duration") return { type: "Duration", duration: config.durationValue };
    if (config.type === "Date" && config.dateValue) return { type: "Date", time: config.dateValue.toISOString() };
    if (config.type === "Indefinite") return { type: "Date", time: INDEFINITE_DATE_API_VALUE };
    return { type: "Duration", duration: "1y" }; 
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!importedCaCertPem.trim() || !importedPrivateKeyPem.trim() || !cryptoEngineId) {
      toast({ title: "Validation Error", description: "Certificate PEM, Private Key PEM, and a Crypto Engine are required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (decodedImportedCertInfo?.error) {
      toast({ title: "Certificate Error", description: "Cannot import due to invalid certificate data.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!user?.access_token) {
      toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    
    // Split chain PEM into an array of base64 encoded certs
    const caChainCerts = caChainPem
      .split('-----BEGIN CERTIFICATE-----')
      .filter(pem => pem.trim() !== '')
      .map(pem => stripPemHeaders('-----BEGIN CERTIFICATE-----' + pem));

    const payload = {
      id: caId,
      engine_id: cryptoEngineId,
      private_key: window.btoa(stripPemHeaders(importedPrivateKeyPem)),
      ca: window.btoa(stripPemHeaders(importedCaCertPem)),
      ca_chain: caChainCerts.map(cert => window.btoa(cert)),
      ca_type: "IMPORTED",
      issuance_expiration: formatExpirationForApi(issuanceExpiration),
      parent_id: selectedParentCa?.id || "",
    };
    
    try {
      const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas/import', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.access_token}`,
          },
          body: JSON.stringify(payload)
      });
       if (!response.ok) {
            let errorJson;
            let errorMessage = `Failed to import CA. Status: ${response.status}`;
            try {
                errorJson = await response.json();
                errorMessage = `Failed to import CA: ${errorJson.err || errorJson.message || 'Unknown error'}`;
            } catch (e) { /* ignore */ }
            throw new Error(errorMessage);
        }
        
        toast({
            title: "CA Import Successful",
            description: `CA "${decodedImportedCertInfo?.subject || 'imported certificate'}" has been imported.`,
        });
        router.push('/certificate-authorities');

    } catch (error: any) {
        toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
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
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Settings className="mr-2 h-5 w-5 text-muted-foreground"/>Import Settings</h3>
               <div className="space-y-4">
                  <div>
                    <Label htmlFor="caId">New CA ID (generated)</Label>
                    <Input id="caId" value={caId} readOnly className="mt-1 bg-muted/50" />
                  </div>
                  <div>
                    <Label htmlFor="cryptoEngine">Crypto Engine for Private Key</Label>
                    <CryptoEngineSelector
                        value={cryptoEngineId}
                        onValueChange={setCryptoEngineId}
                        disabled={authLoading}
                        className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Select the KMS engine where the imported private key will be stored.</p>
                  </div>
                   <ExpirationInput 
                      idPrefix="issuance-exp" 
                      label="Default End-Entity Certificate Issuance Expiration" 
                      value={issuanceExpiration} 
                      onValueChange={setIssuanceExpiration}
                   />
               </div>
            </section>
            
            <Separator/>
            
            <section>
              <h3 className="text-lg font-semibold mb-3">CA Details</h3>
              <div className="space-y-4">
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
                            <DetailItem label="Is CA" value={<Badge variant={decodedImportedCertInfo.isCa ? "default" : "secondary"}>{decodedImportedCertInfo.isCa ? 'Yes' : 'No'}</Badge>} />
                            {!decodedImportedCertInfo.isCa && <Alert variant="warning" className="mt-2"><AlertTriangle className="h-4 w-4"/><AlertTitle>Not a CA Certificate</AlertTitle><AlertDescription>This certificate does not have the `isCA` basic constraint set to `TRUE`. It cannot be used to issue other certificates.</AlertDescription></Alert>}
                            </>
                        )}
                        </CardContent>
                    </Card>
                )}
                <div>
                   <Label htmlFor="importedCaKeyPem">CA Private Key (PEM)</Label>
                   <Textarea id="importedCaKeyPem" value={importedPrivateKeyPem} onChange={(e) => setImportedPrivateKeyPem(e.target.value)} placeholder="Paste the corresponding private key PEM here..." rows={6} required className="mt-1 font-mono"/>
                   <p className="text-xs text-muted-foreground mt-1">The key must be unencrypted. Passphrase support is not yet implemented.</p>
                </div>
                 <div>
                    <Label htmlFor="parentCa">Parent CA (Optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsParentCaModalOpen(true)}
                      className="w-full justify-start text-left font-normal mt-1"
                      id="parentCa"
                      disabled={isLoadingCAs || authLoading}
                    >
                      {isLoadingCAs || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : selectedParentCa ? `Selected: ${selectedParentCa.name}` : "Select Parent CA..."}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">If this is an intermediate CA, select its issuer from the list of existing CAs in LamassuIoT.</p>
                    {selectedParentCa && <div className="mt-2"><CaVisualizerCard ca={selectedParentCa} className="shadow-none border-border" allCryptoEngines={allCryptoEngines} /></div>}
                  </div>
                 <div>
                   <Label htmlFor="caChainPem">CA Certificate Chain (PEM, Optional)</Label>
                    <Textarea 
                        id="caChainPem" 
                        placeholder="Paste the PEM-encoded certificate chain (parent certs) here..." 
                        rows={6} 
                        className="mt-1 font-mono"
                        value={caChainPem}
                        onChange={(e) => setCaChainPem(e.target.value)}
                    />
                   <p className="text-xs text-muted-foreground mt-1">Concatenated PEM files of the issuing CA(s), from immediate issuer to root.</p>
                </div>
              </div>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                Import Full CA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
       <CaSelectorModal
        isOpen={isParentCaModalOpen}
        onOpenChange={setIsParentCaModalOpen}
        title="Select Parent Certificate Authority"
        description="Choose the existing CA that issued the certificate you are importing."
        availableCAs={availableParentCAs}
        isLoadingCAs={isLoadingCAs}
        errorCAs={errorCAs}
        loadCAsAction={loadCaData}
        onCaSelected={(ca) => { setSelectedParentCa(ca); setIsParentCaModalOpen(false); }}
        currentSelectedCaId={selectedParentCa?.id}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      />
    </div>
  );
}
