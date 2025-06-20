
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import type { CertificateData } from '@/types/certificate';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Info, KeyRound, Lock, Link as LinkIcon, Network, ListChecks, Users, FileText, ChevronDown } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DetailItem } from '@/components/shared/DetailItem';
import { CaHierarchyPathNode } from '@/components/dashboard/ca/details/CaHierarchyPathNode';
import { getCaDisplayName } from '@/lib/ca-data';
import { format, parseISO } from 'date-fns';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'; // For routerHook type

interface InformationTabContentProps {
  item: CA | CertificateData;
  itemType: 'ca' | 'certificate';
  caSpecific?: {
    pathToRoot: CA[];
    allCAsForLinking: CA[];
    currentCaId: string;
    placeholderSerial?: string;
  };
  certificateSpecific?: {
    certificateChainForVisualizer: CA[];
    statusBadgeVariant: "default" | "secondary" | "destructive" | "outline";
    statusBadgeClass?: string;
    apiStatusText: string;
  };
  routerHook: AppRouterInstance; // Using specific type
}

export const InformationTabContent: React.FC<InformationTabContentProps> = ({
  item,
  itemType,
  caSpecific,
  certificateSpecific,
  routerHook,
}) => {
  const accordionTriggerStyle = "text-md font-medium bg-muted/30 hover:bg-muted/40 data-[state=open]:bg-muted/50 px-4 py-3 rounded-md";

  if (itemType === 'ca' && caSpecific) {
    const caDetails = item as CA;
    return (
      <Accordion type="multiple" defaultValue={['general', 'hierarchy']} className="w-full space-y-3">
        <AccordionItem value="general" className="border-b-0">
          <AccordionTrigger className={cn(accordionTriggerStyle)}>
            <Info className="mr-2 h-5 w-5" /> General Information
          </AccordionTrigger>
          <AccordionContent className="space-y-1 px-4 pt-3">
            <DetailItem label="Full Name" value={caDetails.name} />
            <DetailItem label="CA ID" value={<Badge variant="outline">{caDetails.id}</Badge>} />
            <DetailItem label="Issuer" value={getCaDisplayName(caDetails.issuer, caSpecific.allCAsForLinking)} />
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
            {caSpecific.placeholderSerial && (
              <>
                <DetailItem label="Subject Key Identifier (SKI)" value={<span className="font-mono text-xs">{caDetails.subjectKeyId || `${caSpecific.placeholderSerial.split(':')[0]}:... (placeholder)`}</span>} />
                <DetailItem label="Authority Key Identifier (AKI)" value={<span className="font-mono text-xs">{caDetails.authorityKeyId || `${caSpecific.placeholderSerial.split(':')[1]}:... (placeholder)`}</span>} />
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
            <Separator className="my-2" />
            <DetailItem label="Key Usage" value={
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Certificate Signing</Badge>
                <Badge variant="outline">CRL Signing</Badge>
                <Badge variant="outline">Digital Signature</Badge>
              </div>
            } />
            <Separator className="my-2" />
            <DetailItem label="Extended Key Usage" value={
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">Server Authentication (placeholder)</Badge>
                <Badge variant="outline">Client Authentication (placeholder)</Badge>
              </div>
            } />
            <Separator className="my-2" />
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
                <li>URI: http://crl.example.com/{caDetails.id.replace(/-/g, '')}.crl (placeholder)</li>
              </ul>
            } fullWidthValue />
            <Separator className="my-2" />
            <DetailItem label="Authority Information Access (AIA)" value={
              <ul className="list-disc list-inside space-y-1">
                <li>OCSP - URI: http://ocsp.example.com/{caDetails.id.replace(/-/g, '')} (placeholder)</li>
                <li>CA Issuers - URI: http://crt.example.com/{caDetails.issuer === 'Self-signed' ? caDetails.id.replace(/-/g, '') : caDetails.issuer.replace(/-/g, '')}.crt (placeholder)</li>
              </ul>
            } fullWidthValue />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hierarchy" className="border-b-0">
          <AccordionTrigger className={cn(accordionTriggerStyle)}>
            <Network className="mr-2 h-5 w-5" /> Issuance Hierarchy & Chain of Trust
          </AccordionTrigger>
          <AccordionContent className="space-y-4 p-4 pt-3">
            {caSpecific.pathToRoot.length > 0 ? (
              <div className="flex flex-col items-center w-full">
                {caSpecific.pathToRoot.map((caNode, index) => (
                  <CaHierarchyPathNode
                    key={caNode.id}
                    ca={caNode}
                    isCurrentCa={caNode.id === caDetails.id}
                    hasNext={index < caSpecific.pathToRoot.length - 1}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Hierarchy path not available.</p>
            )}
            {caDetails.children && caDetails.children.length > 0 && (
              <>
                <Separator className="my-4" />
                <h4 className="text-md font-semibold flex items-center"><Users className="mr-2 h-4 w-4 text-muted-foreground" />Directly Issues To:</h4>
                <ul className="list-disc list-inside space-y-1 pl-4">
                  {caDetails.children.map(child => (
                    <li key={child.id}>
                      <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => routerHook.push(`/certificate-authorities/details?caId=${child.id}`)}>
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
    );
  } else if (itemType === 'certificate' && certificateSpecific) {
    const certDetails = item as CertificateData;
    return (
      <Accordion type="multiple" defaultValue={['general', 'keyInfo', 'chain-visualizer']} className="w-full space-y-3">
        <AccordionItem value="general" className="border-b-0">
          <AccordionTrigger className={cn(accordionTriggerStyle)}>
            <Info className="mr-2 h-5 w-5" /> General Information
          </AccordionTrigger>
          <AccordionContent className="space-y-1 px-4 pt-3">
            <DetailItem label="Subject" value={certDetails.subject} />
            <DetailItem label="Issuer" value={certDetails.issuer} />
            <DetailItem label="Serial Number" value={certDetails.serialNumber} isMono />
            <DetailItem label="Valid From" value={format(parseISO(certDetails.validFrom), 'PPpp')} />
            <DetailItem label="Valid To" value={format(parseISO(certDetails.validTo), 'PPpp')} />
            <DetailItem label="API Status" value={<Badge variant={certificateSpecific.statusBadgeVariant} className={cn(certificateSpecific.statusBadgeVariant !== 'outline' ? certificateSpecific.statusBadgeClass : '')}>{certificateSpecific.apiStatusText}</Badge>} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="keyInfo" className="border-b-0">
          <AccordionTrigger className={cn(accordionTriggerStyle)}>
            <KeyRound className="mr-2 h-5 w-5" /> Key & Signature
          </AccordionTrigger>
          <AccordionContent className="space-y-1 px-4 pt-3">
            <DetailItem label="Public Key Algorithm" value={certDetails.publicKeyAlgorithm || 'N/A'} />
            <DetailItem label="Signature Algorithm" value={certDetails.signatureAlgorithm || 'N/A'} />
            <DetailItem label="SHA-256 Fingerprint" value={certDetails.fingerprintSha256 || 'N/A (Generate if needed)'} isMono />
            {certDetails.rawApiData?.subject_key_id && <DetailItem label="Subject Key ID (SKI)" value={certDetails.rawApiData.subject_key_id} isMono />}
            {certDetails.rawApiData?.authority_key_id && <DetailItem label="Authority Key ID (AKI)" value={certDetails.rawApiData.authority_key_id} isMono />}
          </AccordionContent>
        </AccordionItem>

        {certDetails.sans && certDetails.sans.length > 0 && (
          <AccordionItem value="sans" className="border-b-0">
            <AccordionTrigger className={cn(accordionTriggerStyle)}>
              <ListChecks className="mr-2 h-5 w-5" /> Subject Alternative Names
            </AccordionTrigger>
            <AccordionContent className="px-4 pt-3">
              <div className="flex flex-wrap gap-1">
                {certDetails.sans.map((san, index) => <Badge key={index} variant="secondary">{san}</Badge>)}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {certificateSpecific.certificateChainForVisualizer && (
          <AccordionItem value="chain-visualizer" className="border-b-0">
            <AccordionTrigger className={cn(accordionTriggerStyle)}>
              <Network className="mr-2 h-5 w-5" /> Issuance Chain
            </AccordionTrigger>
            <AccordionContent className="space-y-4 p-4 pt-3">
              <div className="flex flex-col items-center w-full">
                {/* Render the CA chain first */}
                {certificateSpecific.certificateChainForVisualizer.map((caNode, index) => (
                  <CaHierarchyPathNode
                    key={caNode.id}
                    ca={caNode}
                    isCurrentCa={false} // These are parent CAs
                    hasNext={true}      // Each CA in the chain is followed by another element (either another CA or this cert)
                    isFirst={index === 0}
                  />
                ))}

                {/* Render the end-entity certificate (current item) last */}
                <div
                  className={cn(
                    "w-full max-w-sm border-2 rounded-lg p-3 shadow-lg mt-0", // mt-0 ensures it follows directly after the last CA
                    "bg-primary/10 border-primary" // Highlighting for "this" certificate
                  )}
                >
                  <div className={cn("flex items-center space-x-3")}>
                    <div className={cn("p-2 rounded-full bg-primary/20")}>
                      <FileText className={cn("h-5 w-5 text-primary")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate text-primary")}>
                        {certDetails.subject}
                      </p>
                      <p className={cn("text-xs text-muted-foreground truncate")}>This Certificate</p>
                    </div>
                    <Badge variant={certificateSpecific.statusBadgeVariant} className={cn(certificateSpecific.statusBadgeVariant !== 'outline' ? certificateSpecific.statusBadgeClass : '')}>
                      {certificateSpecific.apiStatusText}
                    </Badge>
                  </div>
                </div>
                {/* Add a small spacer if it's the last item */}
                <div className="h-2"></div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    );
  }

  return <p>Invalid itemType or missing data.</p>;
};
