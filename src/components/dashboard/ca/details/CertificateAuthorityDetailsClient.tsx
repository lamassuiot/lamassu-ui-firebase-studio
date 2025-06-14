
'use client';

import React, { useState, useEffect, FC } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, FileText, Info, KeyRound, Lock, Link as LinkIcon, ListChecks, Server, ScrollText, Copy, Check, Users, Network, Layers, Download, ShieldAlert, RefreshCw, Edit, Code2, Database, Loader2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { findCaById, getCaDisplayName, fetchAndProcessCAs } from '@/lib/ca-data';
import { CaHierarchyPathNode } from './CaHierarchyPathNode';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal'; // Added import

const buildCaPathToRoot = (targetCaId: string | undefined, allCAs: CA[]): CA[] => {
  if (!targetCaId) return [];
  const path: CA[] = [];
  let current: CA | null = findCaById(targetCaId, allCAs);
  let safetyNet = 0; 
  while (current && safetyNet < 10) { 
    path.unshift(current); 
    if (current.issuer === 'Self-signed' || !current.issuer) {
      break;
    }
    const parentCa = findCaById(current.issuer, allCAs);
    if (!parentCa || path.some(p => p.id === parentCa.id)) { 
        break;
    }
    current = parentCa;
    safetyNet++;
  }
  return path;
};


export default function CertificateAuthorityDetailsClient() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const caId = params.caId as string;
  
  const [allCertificateAuthoritiesData, setAllCertificateAuthoritiesData] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const [caDetails, setCaDetails] = useState<CA | null>(null);
  const [caPathToRoot, setCaPathToRoot] = useState<CA[]>([]);
  const [placeholderSerial, setPlaceholderSerial] = useState<string>('');
  const [pemCopied, setPemCopied] = useState(false);
  const [fullChainCopied, setFullChainCopied] = useState(false);
  const [fullChainPemString, setFullChainPemString] = useState<string>('');
  const [metadataCopied, setMetadataCopied] = useState(false);
  const [activeCertificateSubTab, setActiveCertificateSubTab] = useState('single-certificate');

  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [caToRevoke, setCaToRevoke] = useState<CA | null>(null);


  const mockLamassuMetadata = {
    lamassuInternalId: `lm_ca_${caId.replace(/-/g, '_')}`,
    provisioningProfile: "Default IoT Device Profile",
    associatedDeviceGroups: ["group_thermostats_emea", "group_sensors_floor_1"],
    customPoliciesApplied: [
      { policyId: "pol_strict_key_usage", version: "1.2" },
      { policyId: "pol_geo_fence_eu", version: "1.0" }
    ],
    lastAuditDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    monitoringEndpoints: {
      status: `https://monitoring.lamassu.io/ca/${caId}/status`,
      crl_health: `https://monitoring.lamassu.io/ca/${caId}/crl_health`
    },
    tags: ["production", "iot", "device-auth"],
    operationalNotes: "Standard CA for production device authentication. Monitored by Ops Team X.",
    backupFrequency: "daily",
    kmsIntegration: {
        enabled: true,
        keyId: `arn:aws:kms:eu-west-1:123456789012:key/mock-kms-${caId}`
    }
  };
  const lamassuMetadataString = JSON.stringify(mockLamassuMetadata, null, 2);

  useEffect(() => {
    const loadCAs = async () => {
      if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) {
          setErrorCAs("User not authenticated. Please log in.");
          setIsLoadingCAs(false);
        }
        return;
      }
      setIsLoadingCAs(true);
      setErrorCAs(null);
      try {
        const fetchedCAs = await fetchAndProcessCAs(user.access_token);
        setAllCertificateAuthoritiesData(fetchedCAs);
      } catch (err: any) {
        setErrorCAs(err.message || 'Failed to load Certificate Authorities data.');
      } finally {
        setIsLoadingCAs(false);
      }
    };

    if (!authLoading) {
      loadCAs();
    }
  }, [user?.access_token, isAuthenticated, authLoading]);


  useEffect(() => {
    if (allCertificateAuthoritiesData.length > 0 && !isLoadingCAs) {
      const foundCa = findCaById(caId, allCertificateAuthoritiesData);
      setCaDetails(foundCa);
      if (foundCa) {
        const path = buildCaPathToRoot(foundCa.id, allCertificateAuthoritiesData);
        setCaPathToRoot(path);

        const chainInOrderForPem = [...path].reverse(); 
        const chainPem = chainInOrderForPem
          .map(caNode => caNode.pemData || '')
          .filter(pem => pem.trim() !== '')
          .join('\\n\\n'); 
        setFullChainPemString(chainPem);

      } else {
        setCaPathToRoot([]);
        setFullChainPemString('');
        setErrorCAs(prevError => prevError ? prevError : `CA with ID "${caId}" not found in the loaded data.`);
      }
      setPlaceholderSerial(Math.random().toString(16).slice(2, 10).toUpperCase() + ':' + Math.random().toString(16).slice(2, 10).toUpperCase());
    }
  }, [caId, allCertificateAuthoritiesData, isLoadingCAs]);

  const DetailItem: FC<{ label: string; value?: string | React.ReactNode; fullWidthValue?: boolean }> = ({ label, value, fullWidthValue }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className={`py-2 ${fullWidthValue ? 'grid grid-cols-1' : 'grid grid-cols-1 sm:grid-cols-[max-content_1fr] gap-x-4 items-baseline'}`}>
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className={`text-sm text-foreground ${fullWidthValue ? 'mt-1' : 'mt-1 sm:mt-0'}`}>
          {value}
        </dd>
      </div>
    );
  };

  const handleCopyText = async (textToCopy: string, type: 'Certificate' | 'Full Chain' | 'Metadata') => {
    if (!textToCopy.trim()) {
      toast({ title: "Copy Failed", description: `No ${type.toLowerCase()} data found to copy.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy.replace(/\\n/g, '\\n'));
      if (type === 'Certificate') setPemCopied(true);
      if (type === 'Full Chain') setFullChainCopied(true);
      if (type === 'Metadata') setMetadataCopied(true);
      toast({ title: "Copied!", description: `${type} data copied to clipboard.` });
      setTimeout(() => {
        if (type === 'Certificate') setPemCopied(false);
        if (type === 'Full Chain') setFullChainCopied(false);
        if (type === 'Metadata') setMetadataCopied(false);
      }, 2000);
    } catch (err) {
      console.error(`Failed to copy ${type.toLowerCase()}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy ${type.toLowerCase()} data.`, variant: "destructive" });
    }
  };

  const handleOpenRevokeCAModal = () => {
    if (caDetails) {
      setCaToRevoke(caDetails);
      setIsRevocationModalOpen(true);
    }
  };

  const handleConfirmCARevocation = (reason: string) => {
    if (caToRevoke) {
      console.log(`Revoking CA: ${caToRevoke.name} (ID: ${caToRevoke.id}) for reason: ${reason}`);
      // Mock API call and UI update
      setCaDetails(prev => prev ? {...prev, status: 'revoked'} : null);
      toast({
        title: "CA Revocation (Mock)",
        description: `CA "${caToRevoke.name}" marked as revoked with reason: ${reason}.`,
        variant: "default"
      });
      setAllCertificateAuthoritiesData(prevCAs => 
        prevCAs.map(ca => ca.id === caToRevoke.id ? {...ca, status: 'revoked'} : ca)
      );
    }
    setIsRevocationModalOpen(false);
    setCaToRevoke(null);
  };


  if (authLoading || isLoadingCAs) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {authLoading ? "Authenticating..." : "Loading CA data..."}
        </p>
      </div>
    );
  }

  if (errorCAs && !caDetails) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => router.push('/dashboard/certificate-authorities')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
          </Button>
        <Alert variant="destructive">
          <FileText className="h-4 w-4" />
          <AlertTitle>Error Loading CA Details</AlertTitle>
          <AlertDescription>{errorCAs}</AlertDescription>
        </Alert>
      </div>
    );
  }


  if (!caDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground">Searching for CA details for ID: {caId}...</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
      </div>
    );
  }

  let statusColorClass = '';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  switch (caDetails.status) {
    case 'active':
      statusColorClass = 'bg-green-500 hover:bg-green-600';
      statusVariant = 'default';
      break;
    case 'expired':
      statusColorClass = 'bg-orange-500 hover:bg-orange-600';
      statusVariant = 'destructive';
      break;
    case 'revoked':
      statusColorClass = 'bg-red-500 hover:bg-red-500';
      statusVariant = 'destructive';
      break;
    default:
      statusColorClass = 'bg-muted hover:bg-muted/80';
      statusVariant = 'outline';
  }

  const accordionTriggerStyle = "text-md font-medium bg-muted/30 hover:bg-muted/40 data-[state=open]:bg-muted/50 px-4 py-3 rounded-md";

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
      </div>
      
      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold">{caDetails.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                CA ID: {caDetails.id}
              </p>
            </div>
             <Badge variant={statusVariant} className={cn("text-sm", statusVariant !== 'outline' ? statusColorClass : '')}>{caDetails.status.toUpperCase()}</Badge>
          </div>
        </div>

        <div className="p-6 space-x-2 border-b">
          <Button variant="outline" onClick={() => alert('Download CRL (placeholder)')}><Download className="mr-2 h-4 w-4" /> Download CRL</Button>
          <Button variant="destructive" onClick={handleOpenRevokeCAModal} disabled={caDetails.status === 'revoked'}><ShieldAlert className="mr-2 h-4 w-4" /> Revoke CA</Button>
          <Button variant="outline" onClick={() => alert('Renew CA (placeholder)')}><RefreshCw className="mr-2 h-4 w-4" /> Renew CA</Button>
          <Button variant="outline" onClick={() => alert('Edit Configuration (placeholder)')}><Edit className="mr-2 h-4 w-4" /> Edit Configuration</Button>
        </div>

        <Tabs defaultValue="information" className="w-full p-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="information"><Info className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Information</TabsTrigger>
            <TabsTrigger value="certificate"><ScrollText className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Certificate</TabsTrigger>
            <TabsTrigger value="metadata"><Code2 className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Lamassu Metadata</TabsTrigger>
            <TabsTrigger value="issued"><Database className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Issued Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="information">
            <Accordion type="multiple" defaultValue={['general', 'hierarchy']} className="w-full space-y-3">
              <AccordionItem value="general" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <Info className="mr-2 h-5 w-5" /> General Information
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="Full Name" value={caDetails.name} />
                  <DetailItem label="CA ID" value={<Badge variant="outline">{caDetails.id}</Badge>} />
                  <DetailItem label="Issuer" value={getCaDisplayName(caDetails.issuer, allCertificateAuthoritiesData)} />
                  <DetailItem label="Expires On" value={new Date(caDetails.expires).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  <DetailItem label="Serial Number" value={<span className="font-mono text-sm">{caDetails.serialNumber}</span>} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="keyInfo" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <KeyRound className="mr-2 h-5 w-5" /> Key & Signature Information
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="Public Key Algorithm" value={caDetails.keyAlgorithm || 'N/A'} />
                  <DetailItem label="Signature Algorithm" value={caDetails.signatureAlgorithm || 'N/A'} />
                  {placeholderSerial && (
                    <>
                      <DetailItem label="Subject Key Identifier (SKI)" value={<span className="font-mono text-xs">{caDetails.subjectKeyId || `${placeholderSerial.split(':')[0]}:... (placeholder)`}</span>} />
                      <DetailItem label="Authority Key Identifier (AKI)" value={<span className="font-mono text-xs">{caDetails.authorityKeyId || `${placeholderSerial.split(':')[1]}:... (placeholder)`}</span>} />
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="extensions" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <Lock className="mr-2 h-5 w-5" /> Certificate Extensions
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="Basic Constraints" value={
                      <div className="space-y-0.5">
                          <p>CA: <Badge variant={caDetails.isCa ? "default" : "secondary"} className={(caDetails.isCa ? 'bg-green-100 text-green-700' : '')}>{caDetails.isCa ? "TRUE" : "FALSE"}</Badge></p>
                          {caDetails.isCa && <p>Path Length Constraint: {caDetails.issuer === 'Self-signed' ? 'None' : (caDetails.children && caDetails.children.length > 0 ? '1 (placeholder)' : '0 (placeholder)')}</p>}
                      </div>
                  } />
                  <Separator className="my-2"/>
                  <DetailItem label="Key Usage" value={
                      <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">Certificate Signing</Badge>
                          <Badge variant="outline">CRL Signing</Badge>
                          <Badge variant="outline">Digital Signature</Badge>
                      </div>
                  } />
                   <Separator className="my-2"/>
                  <DetailItem label="Extended Key Usage" value={
                       <div className="flex flex-wrap gap-1">
                          <Badge variant="outline">Server Authentication (placeholder)</Badge>
                          <Badge variant="outline">Client Authentication (placeholder)</Badge>
                      </div>
                  }/>
                   <Separator className="my-2"/>
                  <DetailItem label="Certificate Policies" value={"Policy ID: 2.5.29.32.0 (anyPolicy) (placeholder)"} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="distribution" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <LinkIcon className="mr-2 h-5 w-5" /> Distribution Points
                </AccordionTrigger>
                <AccordionContent className="space-y-1 px-4 pt-3">
                  <DetailItem label="CRL Distribution Points (CDP)" value={
                      <ul className="list-disc list-inside space-y-1">
                          <li>URI: http://crl.example.com/{caDetails.id.replace(/-/g,'')}.crl (placeholder)</li>
                      </ul>
                  } fullWidthValue />
                   <Separator className="my-2"/>
                  <DetailItem label="Authority Information Access (AIA)" value={
                      <ul className="list-disc list-inside space-y-1">
                          <li>OCSP - URI: http://ocsp.example.com/{caDetails.id.replace(/-/g,'')} (placeholder)</li>
                          <li>CA Issuers - URI: http://crt.example.com/{caDetails.issuer.replace(/-/g,'')}.crt (placeholder)</li>
                      </ul>
                  } fullWidthValue />
                </AccordionContent>
              </AccordionItem>

               <AccordionItem value="hierarchy" className="border-b-0">
                <AccordionTrigger className={cn(accordionTriggerStyle)}>
                  <Network className="mr-2 h-5 w-5" /> Issuance Hierarchy & Chain of Trust
                </AccordionTrigger>
                <AccordionContent className="space-y-4 p-4 pt-3">
                  {caPathToRoot.length > 0 ? (
                    <div className="flex flex-col items-center w-full">
                      {caPathToRoot.map((caNode, index) => (
                        <CaHierarchyPathNode
                          key={caNode.id}
                          ca={caNode}
                          isCurrentCa={caNode.id === caDetails.id}
                          hasNext={index < caPathToRoot.length - 1}
                          isFirst={index === 0}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Hierarchy path not available.</p>
                  )}
                  
                  {caDetails.children && caDetails.children.length > 0 && (
                    <>
                      <Separator className="my-4"/>
                      <h4 className="text-md font-semibold flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground"/>Directly Issues To:</h4>
                      <ul className="list-disc list-inside space-y-1 pl-4">
                        {caDetails.children.map(child => (
                          <li key={child.id}>
                             <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => router.push(`/dashboard/certificate-authorities/${child.id}/details`)}>
                                 {child.name} (ID: {child.id})
                             </Button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="certificate">
            <div className="flex flex-col md:flex-row gap-6 py-4">
              <div className="flex-grow md:w-2/3 xl:w-3/4"> 
                <Tabs value={activeCertificateSubTab} onValueChange={setActiveCertificateSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single-certificate">This Certificate</TabsTrigger>
                    <TabsTrigger value="full-chain">Full Chain</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single-certificate" className="mt-4">
                    <div className="flex justify-start mb-2">
                      <Button onClick={() => handleCopyText(caDetails.pemData || '', 'Certificate')} variant="outline" size="sm">
                        {pemCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                        {pemCopied ? 'Copied!' : 'Copy PEM'}
                      </Button>
                    </div>
                    {caDetails.pemData ? (
                      <ScrollArea className="h-96 w-full rounded-md border p-3 bg-muted/30">
                        <pre className="text-xs whitespace-pre-wrap break-all font-code">{caDetails.pemData.replace(/\\n/g, '\\n')}</pre>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground p-4 text-center">No individual certificate PEM data available for this CA.</p>
                    )}
                  </TabsContent>
                  <TabsContent value="full-chain" className="mt-4">
                    <div className="flex justify-start mb-2">
                      <Button onClick={() => handleCopyText(fullChainPemString, 'Full Chain')} variant="outline" size="sm" disabled={!fullChainPemString.trim()}>
                        {fullChainCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Layers className="mr-2 h-4 w-4" />}
                        {fullChainCopied ? 'Copied!' : 'Copy Chain PEM'}
                      </Button>
                    </div>
                    {fullChainPemString.trim() ? (
                      <>
                        <ScrollArea className="h-96 w-full rounded-md border p-3 bg-muted/30">
                          <pre className="text-xs whitespace-pre-wrap break-all font-code">{fullChainPemString.replace(/\\n/g, '\\n')}</pre>
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground mt-2">
                            The full chain includes {caPathToRoot.length} certificate(s): This CA and its issuer(s) up to the root.
                            The order is: Current CA, Intermediate CA(s) (if any), Root CA.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground p-4 text-center">No full chain PEM data available or could be constructed.</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex-shrink-0 md:w-1/3 xl:w-1/4"> 
                <h4 className="text-md font-semibold mb-3 flex items-center">
                  <Network className="mr-2 h-5 w-5 text-muted-foreground" />
                  Issuance Path
                </h4>
                {caPathToRoot.length > 0 ? (
                    <ScrollArea className="h-96 border rounded-md p-2 bg-muted/10">
                        <div className="flex flex-col items-center w-full">
                        {caPathToRoot.map((caNode, index) => (
                            <CaHierarchyPathNode
                            key={caNode.id}
                            ca={caNode}
                            isCurrentCa={caNode.id === caDetails.id}
                            hasNext={index < caPathToRoot.length - 1}
                            isFirst={index === 0}
                            isDimmed={
                                activeCertificateSubTab === 'single-certificate' &&
                                caNode.id !== caDetails.id
                            }
                            />
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">Hierarchy path not available.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metadata">
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">LamassuIoT Specific Metadata</h3>
                <Button onClick={() => handleCopyText(lamassuMetadataString, 'Metadata')} variant="outline" size="sm">
                  {metadataCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                  {metadataCopied ? 'Copied!' : 'Copy JSON'}
                </Button>
              </div>
              <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap break-all font-code">{lamassuMetadataString}</pre>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">This is mock metadata specific to LamassuIoT internal systems.</p>
            </div>
          </TabsContent>

          <TabsContent value="issued">
             <div className="space-y-4 py-4">
                <h3 className="text-lg font-semibold">Certificates Issued by this CA</h3>
                <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-4">
                        A list of certificates directly issued by <strong>{caDetails.name}</strong> would be displayed here.
                    </p>
                    <Button variant="secondary" onClick={() => alert(`Viewing/Managing issued certificates for ${caDetails.name} (placeholder)`)}>
                        View/Manage Issued Certificates
                    </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {caToRevoke && (
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setCaToRevoke(null);
          }}
          onConfirm={handleConfirmCARevocation}
          itemName={caToRevoke.name}
          itemType="CA"
        />
      )}
    </div>
  );
}
