
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, PlusCircle, ShieldCheck, Loader2, AlertTriangle, FileSignature } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Certificate as PkijsCertificate, BasicConstraints as PkijsBasicConstraints } from "pkijs";
import * as asn1js from "asn1js";
import { format as formatDate, parseISO } from 'date-fns';
import { DetailItem } from '@/components/shared/DetailItem';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- Type Definitions ---
interface Subject { common_name: string; }
interface KeyMetadata { type: string; bits: number; }
interface CACertificateRequest {
    id: string;
    key_id: string;
    metadata: Record<string, any>;
    subject: Subject;
    creation_ts: string;
    engine_id: string;
    key_metadata: KeyMetadata;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    fingerprint: string;
    csr: string; // Base64 encoded PEM
}
interface DecodedImportedCertInfo {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  isCa?: boolean;
  error?: string;
}

// --- PEM Parsing Helpers ---
const OID_MAP: Record<string, string> = { "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU" };
function formatPkijsSubject(subject: any): string {
  return subject.typesAndValues.map((tv: any) => `${OID_MAP[tv.type] || tv.type}=${(tv.value as any).valueBlock.value}`).join(', ');
}
function ab2hex(ab: ArrayBuffer) {
  return Array.from(new Uint8Array(ab)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ApproveCaRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const requestIdFromUrl = searchParams.get('requestId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pendingRequests, setPendingRequests] = useState<CACertificateRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [errorRequests, setErrorRequests] = useState<string | null>(null);

  const [selectedRequestId, setSelectedRequestId] = useState<string | undefined>(undefined);
  const [certificatePem, setCertificatePem] = useState('');
  const [chainPem, setChainPem] = useState('');
  const [decodedCertInfo, setDecodedCertInfo] = useState<DecodedImportedCertInfo | null>(null);

  const selectedRequest = pendingRequests.find(req => req.id === selectedRequestId);

  const fetchPendingRequests = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setErrorRequests("User not authenticated.");
        setIsLoadingRequests(false);
        return;
    }
    setIsLoadingRequests(true);
    setErrorRequests(null);
    try {
        const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas/requests?filter=status[equal]PENDING', {
            headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch pending CA requests.");
        const data = await response.json();
        setPendingRequests(data.list || []);
    } catch (e: any) {
        setErrorRequests(e.message || "An unknown error occurred.");
    } finally {
        setIsLoadingRequests(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);
  
  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);
  
  useEffect(() => {
    if (requestIdFromUrl) {
      setSelectedRequestId(requestIdFromUrl);
    }
  }, [requestIdFromUrl]);

  const parseCertificatePem = async (pem: string) => {
    if (!pem.trim()) { setDecodedCertInfo(null); return; }
    try {
      const pemContent = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
      const derBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0)).buffer;
      const asn1 = asn1js.fromBER(derBuffer);
      if (asn1.offset === -1) throw new Error("Invalid ASN.1 structure.");
      const certificate = new PkijsCertificate({ schema: asn1.result });
      
      const basicConstraintsExtension = certificate.extensions?.find(ext => ext.extnID === "2.5.29.19");
      const isCa = basicConstraintsExtension ? (basicConstraintsExtension.parsedValue as PkijsBasicConstraints).cA : false;

      setDecodedCertInfo({
        subject: formatPkijsSubject(certificate.subject),
        issuer: formatPkijsSubject(certificate.issuer),
        serialNumber: ab2hex(certificate.serialNumber.valueBlock.valueHex),
        validFrom: formatDate(certificate.notBefore.value, "PPpp"),
        validTo: formatDate(certificate.notAfter.value, "PPpp"),
        isCa: isCa,
      });
    } catch (e: any) {
      setDecodedCertInfo({ error: `Failed to parse certificate: ${e.message}` });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!selectedRequestId) {
        toast({ title: "Validation Error", description: "A pending request must be selected.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!certificatePem.trim()) {
      toast({ title: "Validation Error", description: "Certificate PEM is required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (decodedCertInfo?.error) {
      toast({ title: "Certificate Error", description: "Cannot proceed due to invalid certificate data.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
     if (!user?.access_token) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const payload = {
      request_id: selectedRequestId,
      ca: window.btoa(certificatePem.replace(/\\n/g, '\n')),
      ca_chain: chainPem ? [window.btoa(chainPem.replace(/\\n/g, '\n'))] : [],
      ca_type: "MANAGED",
    };
    
    try {
        const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.access_token}` },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            let errorJson;
            let errorMessage = `Failed to approve request. Status: ${response.status}`;
            try {
                errorJson = await response.json();
                errorMessage = `Approval failed: ${errorJson.err || errorJson.message || 'Unknown error'}`;
            } catch (e) { /* ignore */ }
            throw new Error(errorMessage);
        }

        toast({ title: "Success!", description: `CA Request "${selectedRequestId}" approved successfully.` });
        router.push('/certificate-authorities');
    } catch (error: any) {
        toast({ title: "Approval Failed", description: error.message, variant: "destructive" });
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
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">
              Approve CA Request
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Select a pending request and import the signed certificate to activate the new CA.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><FileSignature className="mr-2 h-5 w-5 text-muted-foreground" />Select Pending Request</h3>
              <div className="space-y-4">
                 <div>
                  <Label htmlFor="request-select">Pending CA Request</Label>
                  {isLoadingRequests || authLoading ? (
                    <div className="flex items-center space-x-2 p-2 h-10 border rounded-md bg-muted/50 text-sm text-muted-foreground mt-1">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading requests...</span>
                    </div>
                  ) : errorRequests ? (
                    <Alert variant="destructive" className="mt-1">{errorRequests}</Alert>
                  ) : (
                    <Select value={selectedRequestId} onValueChange={setSelectedRequestId} disabled={pendingRequests.length === 0}>
                        <SelectTrigger id="request-select" className="mt-1">
                            <SelectValue placeholder={pendingRequests.length > 0 ? "Select a pending request..." : "No pending requests found"} />
                        </SelectTrigger>
                        <SelectContent>
                            {pendingRequests.map(req => (
                                <SelectItem key={req.id} value={req.id}>{req.subject.common_name} ({req.id.substring(0,8)}...)</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  )}
                 </div>
                 {selectedRequest && (
                    <Card className="bg-muted/30"><CardHeader><CardTitle className="text-md">Request Details</CardTitle></CardHeader><CardContent className="space-y-2 text-sm pt-4">
                        <DetailItem label="Subject" value={selectedRequest.subject.common_name} isMono/>
                        <DetailItem label="Request ID" value={selectedRequest.id} isMono/>
                        <DetailItem label="Key Type" value={`${selectedRequest.key_metadata.type} ${selectedRequest.key_metadata.bits}-bit`} isMono/>
                        <DetailItem label="Created" value={formatDate(parseISO(selectedRequest.creation_ts), "PPpp")} />
                    </CardContent></Card>
                 )}
              </div>
            </section>
            
            <section>
                <h3 className="text-lg font-semibold mb-3">Import Signed Certificate</h3>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="certificatePem">CA Certificate (PEM)</Label>
                        <Textarea id="certificatePem" value={certificatePem} onChange={(e) => {setCertificatePem(e.target.value); parseCertificatePem(e.target.value);}} placeholder="Paste the signed certificate from the external CA..." rows={6} required className="mt-1 font-mono"/>
                        {!certificatePem.trim() && <p className="text-xs text-destructive mt-1">Certificate PEM is required.</p>}
                    </div>
                    {decodedCertInfo && (
                        <Card className="bg-muted/30"><CardHeader><CardTitle className="text-md">Decoded Certificate Information</CardTitle></CardHeader><CardContent className="space-y-2 text-sm pt-4">
                            {decodedCertInfo.error ? (<Alert variant="destructive">{decodedCertInfo.error}</Alert>) : (<>
                                <DetailItem label="Subject" value={decodedCertInfo.subject} isMono />
                                <DetailItem label="Issuer" value={decodedCertInfo.issuer} isMono />
                                <DetailItem label="Is CA" value={<Badge variant={decodedCertInfo.isCa ? "default" : "secondary"}>{decodedCertInfo.isCa ? 'Yes' : 'No'}</Badge>} />
                                {!decodedCertInfo.isCa && <Alert variant="warning" className="mt-2">This certificate does not appear to be a CA certificate.</Alert>}
                            </>)}
                        </CardContent></Card>
                    )}
                    <div>
                        <Label htmlFor="chainPem">CA Certificate Chain (Optional, PEM format)</Label>
                        <Textarea id="chainPem" value={chainPem} onChange={(e) => setChainPem(e.target.value)} placeholder="Paste intermediate CA certificates if needed..." rows={4} className="mt-1 font-mono"/>
                    </div>
                </div>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting || !selectedRequestId || !certificatePem}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                Approve Request & Import CA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
