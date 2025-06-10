
'use client';

import React, { useState, useEffect, FC } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, FileText, Info, KeyRound, Lock, Link as LinkIcon, ListChecks, Server, ScrollText, Clipboard, Check, Users, Network, Copy, Layers } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData as allCertificateAuthoritiesData, findCaById, getCaDisplayName } from '@/lib/ca-data';
import { CaHierarchyPathNode } from './CaHierarchyPathNode';

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


export default function CertificateAuthorityDetailsClient({ allCertificateAuthoritiesData: allCAs }: { allCertificateAuthoritiesData: CA[] }) {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const caId = params.caId as string;
  
  const [caDetails, setCaDetails] = useState<CA | null>(null);
  const [caPathToRoot, setCaPathToRoot] = useState<CA[]>([]);
  const [placeholderSerial, setPlaceholderSerial] = useState<string>('');
  const [pemCopied, setPemCopied] = useState(false);
  const [fullChainCopied, setFullChainCopied] = useState(false);

  useEffect(() => {
    const foundCa = findCaById(caId, allCAs);
    setCaDetails(foundCa);
    if (foundCa) {
      setCaPathToRoot(buildCaPathToRoot(foundCa.id, allCAs));
    } else {
      setCaPathToRoot([]);
    }
    setPlaceholderSerial(Math.random().toString(16).slice(2, 10).toUpperCase() + ':' + Math.random().toString(16).slice(2, 10).toUpperCase());
  }, [caId, allCAs]);

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

  const handleCopyPem = async () => {
    if (caDetails?.pemData) {
      try {
        await navigator.clipboard.writeText(caDetails.pemData);
        setPemCopied(true);
        toast({ title: "Copied!", description: "Certificate PEM data copied to clipboard." });
        setTimeout(() => setPemCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy PEM: ', err);
        toast({ title: "Copy Failed", description: "Could not copy certificate PEM data.", variant: "destructive" });
      }
    }
  };

  const handleCopyFullChainPem = async () => {
    if (caPathToRoot.length > 0) {
      // The caPathToRoot is [root, ..., intermediate, ..., currentCa]
      // For a valid chain PEM, we need: currentCa PEM, then parent PEM, ..., up to root PEM
      const chainInOrderForPem = [...caPathToRoot].reverse(); // Now [currentCa, ..., intermediate, ..., root]
      const fullChainPem = chainInOrderForPem
        .map(ca => ca.pemData || '') // Get PEM or empty string if undefined
        .filter(pem => pem.trim() !== '') // Filter out empty PEMs
        .join('\n\n'); // Join with double newline for separation between certs

      if (fullChainPem.trim() === '') {
        toast({ title: "Copy Failed", description: "No PEM data found to build the chain.", variant: "destructive" });
        return;
      }

      try {
        await navigator.clipboard.writeText(fullChainPem);
        setFullChainCopied(true);
        toast({ title: "Copied!", description: "Full certificate chain PEM copied to clipboard." });
        setTimeout(() => setFullChainCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy full chain PEM: ', err);
        toast({ title: "Copy Failed", description: "Could not copy full chain PEM data.", variant: "destructive" });
      }
    } else {
      toast({ title: "Copy Failed", description: "Certificate path is empty, cannot build chain.", variant: "destructive" });
    }
  };

  if (!caDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground">Loading CA details for ID: {caId}...</p>
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

  const accordionTriggerStyle = "text-lg bg-muted/50 hover:bg-muted/60 data-[state=open]:bg-muted/75 px-4 py-4 rounded-md";

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <div className="w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">{caDetails.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Detailed information for Certificate Authority: <span className="font-semibold">{caDetails.name}</span> (ID: {caDetails.id}).
          </p>
        </div>
        <div className="p-6 pt-0">
          <Accordion type="multiple" defaultValue={['general', 'keyInfo', 'pemData', 'hierarchy']} className="w-full">
            <AccordionItem value="general">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <Info className="mr-2 h-5 w-5" /> General Information
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
                <DetailItem label="Full Name" value={caDetails.name} />
                <DetailItem label="CA ID" value={<Badge variant="outline">{caDetails.id}</Badge>} />
                <DetailItem label="Issuer" value={getCaDisplayName(caDetails.issuer, allCAs)} />
                <DetailItem label="Status" value={<Badge variant={statusVariant} className={statusVariant !== 'outline' ? statusColorClass : ''}>{caDetails.status.toUpperCase()}</Badge>} />
                <DetailItem label="Expires On" value={new Date(caDetails.expires).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <DetailItem label="Serial Number" value={<span className="font-mono text-sm">{caDetails.serialNumber}</span>} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="keyInfo">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <KeyRound className="mr-2 h-5 w-5" /> Key & Signature Information
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
                <DetailItem label="Public Key Algorithm" value={caDetails.keyAlgorithm || 'N/A'} />
                <DetailItem label="Signature Algorithm" value={caDetails.signatureAlgorithm || 'N/A'} />
                {placeholderSerial && (
                  <>
                    <DetailItem label="Subject Key Identifier (SKI)" value={<span className="font-mono text-xs">{placeholderSerial.split(':')[0]}:... (placeholder)</span>} />
                    <DetailItem label="Authority Key Identifier (AKI)" value={<span className="font-mono text-xs">{placeholderSerial.split(':')[1]}:... (placeholder)</span>} />
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="pemData">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <ScrollText className="mr-2 h-5 w-5" /> PEM Certificate Data
              </AccordionTrigger>
              <AccordionContent className="space-y-2 px-4">
                {caDetails.pemData ? (
                  <>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Button onClick={handleCopyPem} variant="outline" size="sm">
                        {pemCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                        {pemCopied ? 'Certificate Copied!' : 'Copy Certificate PEM'}
                      </Button>
                      <Button onClick={handleCopyFullChainPem} variant="outline" size="sm">
                        {fullChainCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Layers className="mr-2 h-4 w-4" />}
                        {fullChainCopied ? 'Chain Copied!' : 'Copy Full Chain PEM'}
                      </Button>
                    </div>
                    <ScrollArea className="h-64 w-full rounded-md border p-3 bg-muted/30">
                      <pre className="text-xs whitespace-pre-wrap break-all font-code">{caDetails.pemData}</pre>
                    </ScrollArea>
                    {caPathToRoot.length > 1 && (
                        <div className="mt-2">
                            <p className="text-xs text-muted-foreground">
                                Full chain includes {caPathToRoot.length} certificate(s): This CA and its issuer(s) up to the root.
                            </p>
                        </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No PEM data available for this CA.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="extensions">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <Lock className="mr-2 h-5 w-5" /> Certificate Extensions
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
                <DetailItem label="Basic Constraints" value={
                    <div className="space-y-0.5">
                        <p>CA: <Badge variant={caDetails.issuer === 'Self-signed' || (caDetails.children && caDetails.children.length > 0) ? "default" : "secondary"} className={(caDetails.issuer === 'Self-signed' || (caDetails.children && caDetails.children.length > 0) ? 'bg-green-100 text-green-700' : '')}>TRUE</Badge></p>
                        <p>Path Length Constraint: {caDetails.issuer === 'Self-signed' ? 'None' : (caDetails.children && caDetails.children.length > 0 ? '1 (placeholder)' : '0 (placeholder)')}</p>
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

            <AccordionItem value="distribution">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <LinkIcon className="mr-2 h-5 w-5" /> Distribution Points
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
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

             <AccordionItem value="hierarchy">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <Network className="mr-2 h-5 w-5" /> Issuance Hierarchy & Chain of Trust
              </AccordionTrigger>
              <AccordionContent className="space-y-4 p-4">
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
          
          <div className="mt-6 p-4 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <h3 className="text-lg font-semibold text-muted-foreground flex items-center">
                <ListChecks className="mr-2 h-5 w-5" />
                Actions & Related Information
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Further actions related to this CA, such as viewing issued certificates, CRLs, or initiating renewal.
              </p>
              <div className="space-x-2">
                <Button variant="secondary" onClick={() => alert(`Viewing issued certificates for ${caDetails.name} (placeholder)`)}>View Issued Certificates</Button>
                <Button variant="secondary" onClick={() => alert(`Viewing CRLs for ${caDetails.name} (placeholder)`)}>View CRLs</Button>
                 <Button variant="default" onClick={() => router.push(`/dashboard/certificate-authorities/${caDetails.id}/issue-certificate`)}>
                    Issue New Certificate
                </Button>
              </div>
            </div>

        </div>
      </div>
    </div>
  );
}
