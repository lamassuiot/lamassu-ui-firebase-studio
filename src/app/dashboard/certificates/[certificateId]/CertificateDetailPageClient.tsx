
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, FileText, Info, KeyRound, Lock, Link as LinkIcon, ListChecks, Copy, Check, Network, Layers, Download, ShieldAlert, Edit, Code2, Loader2, AlertTriangle } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CertificateData } from '@/types/certificate';
import type { CA } from '@/lib/ca-data';
import { fetchIssuedCertificates, findCertificateBySerialNumber } from '@/lib/issued-certificate-data';
import { fetchAndProcessCAs, findCaById } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal';
import { format, parseISO } from 'date-fns';
import { CaHierarchyPathNode } from '@/components/dashboard/ca/details/CaHierarchyPathNode';


const buildCertificateChainPem = (
  targetCert: CertificateData | null,
  allCAs: CA[]
): string => {
  if (!targetCert?.pemData) return '';

  const chain: string[] = [targetCert.pemData];
  let currentIssuerId = targetCert.issuerCaId;
  let safetyNet = 0;
  const maxDepth = 10; // Prevent infinite loops

  while (currentIssuerId && safetyNet < maxDepth) {
    const issuerCa = findCaById(currentIssuerId, allCAs);
    if (!issuerCa || !issuerCa.pemData) break;

    chain.push(issuerCa.pemData);

    if (issuerCa.issuer === 'Self-signed' || !issuerCa.issuer || issuerCa.id === issuerCa.issuer) {
      break; 
    }
    currentIssuerId = issuerCa.issuer;
    safetyNet++;
  }
  return chain.join('\\n\\n'); // Using escaped newline for pre block display
};


export default function CertificateDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const certificateId = params.certificateId as string;

  const [certificateDetails, setCertificateDetails] = useState<CertificateData | null>(null);
  const [allCAs, setAllCAs] = useState<CA[]>([]);
  
  const [isLoadingCert, setIsLoadingCert] = useState(true);
  const [isLoadingAllCAs, setIsLoadingAllCAs] = useState(true);
  const [errorCert, setErrorCert] = useState<string | null>(null);
  const [errorAllCAs, setErrorAllCAs] = useState<string | null>(null);

  const [pemCopied, setPemCopied] = useState(false);
  const [fullChainCopied, setFullChainCopied] = useState(false);
  const [metadataCopied, setMetadataCopied] = useState(false);
  
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState<CertificateData | null>(null);

  const fullChainPemString = useMemo(() => {
    if (certificateDetails && allCAs.length > 0) {
      return buildCertificateChainPem(certificateDetails, allCAs);
    }
    return '';
  }, [certificateDetails, allCAs]);

  const certificateChainForVisualizer: CA[] = useMemo(() => {
    if (!certificateDetails || allCAs.length === 0) return [];
    
    const path: CA[] = [];
    let currentIssuerId = certificateDetails.issuerCaId;
    let safetyNet = 0;
    const maxDepth = 10;

    while (currentIssuerId && safetyNet < maxDepth) {
        const issuerCa = findCaById(currentIssuerId, allCAs);
        if (!issuerCa) break;
        path.unshift(issuerCa); // Add to beginning to get root first order
        if (issuerCa.issuer === 'Self-signed' || !issuerCa.issuer || issuerCa.id === issuerCa.issuer) {
            break;
        }
        currentIssuerId = issuerCa.issuer;
        safetyNet++;
    }
    return path;
  }, [certificateDetails, allCAs]);


  useEffect(() => {
    const loadCertificate = async () => {
      if (!certificateId || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()){
             setErrorCert("User not authenticated.");
        }
        setIsLoadingCert(false);
        return;
      }
      setIsLoadingCert(true);
      setErrorCert(null);
      try {
        // Fetching the list and then finding. In a real app, ideally fetch by ID.
        // For now, fetching a small page size hoping the cert is recent or unique enough.
        const { certificates: certList } = await fetchIssuedCertificates({ 
            accessToken: user.access_token, 
            pageSize: "100" // Fetch a larger batch if no direct lookup
        }); 
        const foundCert = findCertificateBySerialNumber(certificateId, certList);
        if (foundCert) {
          setCertificateDetails(foundCert);
        } else {
          setErrorCert(`Certificate with Serial Number "${certificateId}" not found.`);
        }
      } catch (err: any) {
        setErrorCert(err.message || 'Failed to load certificate details.');
      } finally {
        setIsLoadingCert(false);
      }
    };

    const loadAllCAsForChain = async () => {
        if (!isAuthenticated() || !user?.access_token) {
            if (!authLoading && !isAuthenticated()){
                setErrorAllCAs("User not authenticated for CA list.");
            }
            setIsLoadingAllCAs(false);
            return;
        }
        setIsLoadingAllCAs(true);
        setErrorAllCAs(null);
        try {
            const fetchedCAs = await fetchAndProcessCAs(user.access_token);
            setAllCAs(fetchedCAs);
        } catch (err: any) {
            setErrorAllCAs(err.message || 'Failed to load CA list for chain building.');
        } finally {
            setIsLoadingAllCAs(false);
        }
    };
    
    if (!authLoading) {
        loadCertificate();
        loadAllCAsForChain();
    }

  }, [certificateId, user?.access_token, isAuthenticated, authLoading]);


  const DetailItem: React.FC<{ label: string; value?: string | React.ReactNode; fullWidthValue?: boolean; isMono?: boolean }> = ({ label, value, fullWidthValue, isMono }) => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className={`py-2 ${fullWidthValue ? 'grid grid-cols-1' : 'grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 items-baseline'}`}>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className={cn("text-sm text-foreground break-all", fullWidthValue ? 'mt-1' : 'mt-1 sm:mt-0', isMono && "font-mono")}>
          {value}
        </dd>
      </div>
    );
  };

  const handleCopyText = async (textToCopy: string, type: 'Certificate PEM' | 'Full Chain PEM' | 'Metadata') => {
    if (!textToCopy.trim()) {
      toast({ title: "Copy Failed", description: `No ${type.toLowerCase()} data found to copy.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy.replace(/\\n/g, '\\n')); // Keep escaped newlines for pre, actual newlines for clipboard
      if (type === 'Certificate PEM') setPemCopied(true);
      if (type === 'Full Chain PEM') setFullChainCopied(true);
      if (type === 'Metadata') setMetadataCopied(true);
      toast({ title: "Copied!", description: `${type} copied to clipboard.` });
      setTimeout(() => {
        if (type === 'Certificate PEM') setPemCopied(false);
        if (type === 'Full Chain PEM') setFullChainCopied(false);
        if (type === 'Metadata') setMetadataCopied(false);
      }, 2000);
    } catch (err) {
      console.error(`Failed to copy ${type.toLowerCase()}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy ${type.toLowerCase()} data.`, variant: "destructive" });
    }
  };

  const handleOpenRevokeModal = () => {
    if (certificateDetails) {
      setCertificateToRevoke(certificateDetails);
      setIsRevocationModalOpen(true);
    }
  };

  const handleConfirmRevocation = (reason: string) => {
    if (certificateToRevoke) {
      // Mock API call and UI update
      setCertificateDetails(prev => prev ? {...prev, apiStatus: 'REVOKED'} : null);
      toast({
        title: "Certificate Revocation (Mock)",
        description: `Certificate "${certificateToRevoke.subject}" (SN: ${certificateToRevoke.serialNumber}) marked as revoked with reason: ${reason}.`,
        variant: "default"
      });
    }
    setIsRevocationModalOpen(false);
    setCertificateToRevoke(null);
  };


  if (authLoading || isLoadingCert || isLoadingAllCAs) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {authLoading ? "Authenticating..." : 
           isLoadingCert ? "Loading certificate details..." : 
           "Loading CA data for chain..."}
        </p>
      </div>
    );
  }

  if (errorCert || errorAllCAs) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => router.push('/dashboard/certificates')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Certificates
          </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          {errorCert && <AlertDescription>Certificate Error: {errorCert}</AlertDescription>}
          {errorAllCAs && <AlertDescription>CA List Error: {errorAllCAs}</AlertDescription>}
        </Alert>
      </div>
    );
  }

  if (!certificateDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Certificate with Serial Number "{certificateId}" not found or data is unavailable.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/certificates')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Certificates List
        </Button>
      </div>
    );
  }
  
  const statusText = certificateDetails.apiStatus?.toUpperCase() || 'UNKNOWN';
  let statusColorClass = '';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

  if (statusText.includes('ACTIVE')) {
    statusColorClass = 'bg-green-500 hover:bg-green-600';
    statusVariant = 'default';
  } else if (statusText.includes('REVOKED')) {
    statusColorClass = 'bg-red-500 hover:bg-red-600';
    statusVariant = 'destructive';
  } else if (statusText.includes('EXPIRED')) {
    statusColorClass = 'bg-orange-500 hover:bg-orange-600';
    statusVariant = 'destructive';
  } else {
    statusColorClass = 'bg-yellow-500 hover:bg-yellow-600'; // For PENDING or UNKNOWN
  }


  const accordionTriggerStyle = "text-md font-medium bg-muted/30 hover:bg-muted/40 data-[state=open]:bg-muted/50 px-4 py-3 rounded-md";

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/certificates')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Certificates List
      </Button>
      
      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div>
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold truncate" title={certificateDetails.subject}>
                  {certificateDetails.subject || `Certificate: ${certificateDetails.serialNumber}`}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Serial Number: {certificateDetails.serialNumber}
              </p>
            </div>
            <Badge variant={statusVariant} className={cn("text-sm self-start sm:self-auto mt-2 sm:mt-0", statusVariant !== 'outline' ? statusColorClass : '')}>
                {statusText}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-x-2 border-b">
          <Button 
            variant="destructive" 
            onClick={handleOpenRevokeModal} 
            disabled={statusText === 'REVOKED'}
          >
            <ShieldAlert className="mr-2 h-4 w-4" /> Revoke Certificate
          </Button>
          {/* Placeholder for future actions if needed */}
        </div>

        <Tabs defaultValue="information" className="w-full p-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="information"><Info className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Details</TabsTrigger>
            <TabsTrigger value="pem"><Code2 className="mr-2 h-4 w-4 sm:hidden md:inline-block" />PEM Data</TabsTrigger>
            <TabsTrigger value="raw_api"><Layers className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Raw API Data</TabsTrigger>
            <TabsTrigger value="chain"><Network className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Chain</TabsTrigger>
          </TabsList>

          <TabsContent value="information">
            <Accordion type="multiple" defaultValue={['general', 'keyInfo']} className="w-full space-y-3">
              <AccordionItem value="general" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <Info className="mr-2 h-5 w-5" /> General Information
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="Subject" value={certificateDetails.subject} />
                  <DetailItem label="Issuer" value={certificateDetails.issuer} />
                  <DetailItem label="Serial Number" value={certificateDetails.serialNumber} isMono />
                  <DetailItem label="Valid From" value={format(parseISO(certificateDetails.validFrom), 'PPpp')} />
                  <DetailItem label="Valid To" value={format(parseISO(certificateDetails.validTo), 'PPpp')} />
                  <DetailItem label="API Status" value={<Badge variant={statusVariant} className={cn(statusVariant !== 'outline' ? statusColorClass : '')}>{statusText}</Badge>} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="keyInfo" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <KeyRound className="mr-2 h-5 w-5" /> Key & Signature
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="Public Key Algorithm" value={certificateDetails.publicKeyAlgorithm || 'N/A'} />
                  <DetailItem label="Signature Algorithm" value={certificateDetails.signatureAlgorithm || 'N/A'} />
                  <DetailItem label="SHA-256 Fingerprint" value={certificateDetails.fingerprintSha256 || 'N/A (Generate if needed)'} isMono />
                  {certificateDetails.rawApiData?.subject_key_id && <DetailItem label="Subject Key ID (SKI)" value={certificateDetails.rawApiData.subject_key_id} isMono />}
                  {certificateDetails.rawApiData?.authority_key_id && <DetailItem label="Authority Key ID (AKI)" value={certificateDetails.rawApiData.authority_key_id} isMono />}
                </AccordionContent>
              </AccordionItem>
              
              {certificateDetails.sans && certificateDetails.sans.length > 0 && (
                <AccordionItem value="sans" className="border-b-0">
                    <AccordionTrigger className={cn(accordionTriggerStyle)}>
                    <ListChecks className="mr-2 h-5 w-5" /> Subject Alternative Names
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pt-3">
                        <div className="flex flex-wrap gap-1">
                        {certificateDetails.sans.map((san, index) => <Badge key={index} variant="secondary">{san}</Badge>)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </TabsContent>

          <TabsContent value="pem">
            <div className="space-y-6 py-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold">Certificate PEM</h4>
                  <Button onClick={() => handleCopyText(certificateDetails.pemData, 'Certificate PEM')} variant="outline" size="sm">
                    {pemCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                    {pemCopied ? 'Copied!' : 'Copy PEM'}
                  </Button>
                </div>
                <ScrollArea className="h-80 w-full rounded-md border p-3 bg-muted/30">
                  <pre className="text-xs whitespace-pre-wrap break-all font-mono">{certificateDetails.pemData.replace(/\\n/g, '\\n')}</pre>
                </ScrollArea>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold">Full Chain PEM</h4>
                  <Button onClick={() => handleCopyText(fullChainPemString, 'Full Chain PEM')} variant="outline" size="sm" disabled={!fullChainPemString.trim()}>
                    {fullChainCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Layers className="mr-2 h-4 w-4" />}
                    {fullChainCopied ? 'Copied!' : 'Copy Chain'}
                  </Button>
                </div>
                {fullChainPemString.trim() ? (
                  <ScrollArea className="h-96 w-full rounded-md border p-3 bg-muted/30">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono">{fullChainPemString.replace(/\\n/g, '\\n')}</pre>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">Full chain PEM could not be constructed. Ensure issuer CAs are loaded.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw_api">
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Raw API Data</h3>
                <Button onClick={() => handleCopyText(JSON.stringify(certificateDetails.rawApiData, null, 2), 'Metadata')} variant="outline" size="sm">
                  {metadataCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                  {metadataCopied ? 'Copied!' : 'Copy JSON'}
                </Button>
              </div>
              <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(certificateDetails.rawApiData, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
            <TabsContent value="chain">
                 <div className="space-y-4 py-4">
                    <h3 className="text-lg font-semibold">Certificate Issuance Chain</h3>
                    {certificateChainForVisualizer.length > 0 ? (
                         <ScrollArea className="h-96 border rounded-md p-2 bg-muted/10">
                            <div className="flex flex-col items-center w-full">
                                {/* Display end-entity certificate representation */}
                                <div className="relative flex flex-col items-center group w-full max-w-sm border border-primary/50 rounded-lg p-3 shadow-sm mb-2 bg-primary/5">
                                    <div className="flex items-center space-x-3 w-full">
                                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate text-primary">{certificateDetails.subject}</p>
                                            <p className="text-xs text-muted-foreground truncate">End-Entity Certificate (This Cert)</p>
                                        </div>
                                    </div>
                                </div>
                                <ArrowLeft className="h-5 w-5 text-border my-1 transform rotate-90" /> 

                                {certificateChainForVisualizer.map((caNode, index) => (
                                    <CaHierarchyPathNode
                                    key={caNode.id}
                                    ca={caNode}
                                    isCurrentCa={false} // None of these are the "current details page CA"
                                    hasNext={index < certificateChainForVisualizer.length - 1}
                                    isFirst={index === 0} // First in the chain (root)
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
                        Certificate chain could not be displayed. Ensure CA data is loaded and issuer IDs are correct.
                        </p>
                    )}
                </div>
            </TabsContent>
        </Tabs>
      </div>
      {certificateToRevoke && (
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setCertificateToRevoke(null);
          }}
          onConfirm={handleConfirmRevocation}
          itemName={certificateToRevoke.subject}
          itemType="Certificate"
        />
      )}
    </div>
  );
}

