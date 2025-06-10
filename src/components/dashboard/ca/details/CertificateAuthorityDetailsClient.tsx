
'use client';

import React, { useState, useEffect, FC } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, FileText, Info, KeyRound, Lock, Link as LinkIcon, ListChecks, Server, ScrollText, Clipboard, Check } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data'; // Type import is fine
import { findCaById, getCaDisplayName } from '@/lib/ca-data'; // Function imports are fine

interface CertificateAuthorityDetailsClientProps {
  allCertificateAuthoritiesData: CA[];
}

// Client Component for the actual page content
export default function CertificateAuthorityDetailsClient({ allCertificateAuthoritiesData }: CertificateAuthorityDetailsClientProps) {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const caId = params.caId as string;
  const [caDetails, setCaDetails] = useState<CA | null>(null);
  const [placeholderSerial, setPlaceholderSerial] = useState<string>('');
  const [pemCopied, setPemCopied] = useState(false);

  useEffect(() => {
    const foundCa = findCaById(caId, allCertificateAuthoritiesData);
    setCaDetails(foundCa);
    setPlaceholderSerial(Math.random().toString(16).slice(2, 10).toUpperCase() + ':' + Math.random().toString(16).slice(2, 10).toUpperCase());
  }, [caId, allCertificateAuthoritiesData]);

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
        toast({ title: "Copied!", description: "PEM certificate data copied to clipboard." });
        setTimeout(() => setPemCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy PEM: ', err);
        toast({ title: "Copy Failed", description: "Could not copy PEM data to clipboard.", variant: "destructive" });
      }
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
          <Accordion type="multiple" defaultValue={['general', 'keyInfo', 'pemData']} className="w-full">
            <AccordionItem value="general">
              <AccordionTrigger className={cn(accordionTriggerStyle)}>
                <Info className="mr-2 h-5 w-5" /> General Information
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
                <DetailItem label="Full Name" value={caDetails.name} />
                <DetailItem label="CA ID" value={<Badge variant="outline">{caDetails.id}</Badge>} />
                <DetailItem label="Issuer" value={getCaDisplayName(caDetails.issuer, allCertificateAuthoritiesData)} />
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
                    <Button onClick={handleCopyPem} variant="outline" size="sm" className="mb-2">
                      {pemCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Clipboard className="mr-2 h-4 w-4" />}
                      {pemCopied ? 'Copied!' : 'Copy PEM'}
                    </Button>
                    <ScrollArea className="h-64 w-full rounded-md border p-3 bg-muted/30">
                      <pre className="text-xs whitespace-pre-wrap break-all font-code">{caDetails.pemData}</pre>
                    </ScrollArea>
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
                <Server className="mr-2 h-5 w-5" /> Issuance Hierarchy
              </AccordionTrigger>
              <AccordionContent className="space-y-1 px-4">
                <DetailItem 
                    label="Issued By" 
                    value={
                        caDetails.issuer === 'Self-signed' ? 
                        <Badge variant="secondary">Self-signed Root CA</Badge> : 
                        <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => router.push(`/dashboard/certificate-authorities/${caDetails.issuer}/details`)}>
                            {getCaDisplayName(caDetails.issuer, allCertificateAuthoritiesData)} (ID: {caDetails.issuer})
                        </Button>
                    } 
                />
                {caDetails.children && caDetails.children.length > 0 && (
                  <DetailItem label="Issues Certificates To" value={
                    <ul className="list-disc list-inside space-y-1">
                      {caDetails.children.map(child => (
                        <li key={child.id}>
                           <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => router.push(`/dashboard/certificate-authorities/${child.id}/details`)}>
                               {child.name} (ID: {child.id})
                           </Button>
                        </li>
                      ))}
                    </ul>
                  } />
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
