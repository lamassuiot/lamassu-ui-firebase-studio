
"use client";

import React from 'react';
import type { CertificateData } from '@/types/certificate';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificateDetailsModalProps {
  certificate: CertificateData | null;
  isOpen: boolean;
  onClose: () => void;
}

const ApiStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const upperStatus = status.toUpperCase();
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = AlertTriangle; 

  if (upperStatus.includes('ACTIVE')) {
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
    Icon = CheckCircle;
  } else if (upperStatus.includes('REVOKED')) {
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
    Icon = XCircle;
  } else if (upperStatus.includes('EXPIRED')) {
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    Icon = AlertTriangle;
  } else if (upperStatus.includes('PENDING')) {
    badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    Icon = Clock;
  }

  return <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap", badgeClass)}><Icon className="mr-1 h-3 w-3" />{upperStatus.replace('_', ' ')}</Badge>;
};


export function CertificateDetailsModal({ certificate, isOpen, onClose }: CertificateDetailsModalProps) {
  if (!certificate) return null;

  const DetailItem: React.FC<{ label: string; value?: string | string[] | null | React.ReactNode }> = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
        <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground sm:col-span-2">
          {React.isValidElement(value) ? value : 
            Array.isArray(value) ? (
              <ul className="list-disc list-inside">
                {value.map((item, index) => <li key={index}>{item}</li>)}
              </ul>
            ) : (
              value
            )
          }
        </dd>
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Certificate Details</DialogTitle>
          <DialogDescription>
            Detailed information for the selected X.509 certificate.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="space-y-3 py-4">
            <DetailItem label="Subject" value={certificate.subject} />
            <DetailItem label="Issuer" value={certificate.issuer} />
            <DetailItem label="Serial Number" value={certificate.serialNumber} />
            <DetailItem label="Valid From" value={format(new Date(certificate.validFrom), 'PPpp')} />
            <DetailItem label="Valid To" value={format(new Date(certificate.validTo), 'PPpp')} />
            <DetailItem label="Status" value={<ApiStatusBadge status={certificate.apiStatus} />} />
            
            {certificate.publicKeyAlgorithm && <DetailItem label="Public Key Algorithm" value={certificate.publicKeyAlgorithm} />}
            {certificate.fingerprintSha256 && <DetailItem label="SHA-256 Fingerprint" value={certificate.fingerprintSha256} />}
            
            {certificate.sans && certificate.sans.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 py-2">
                <dt className="text-sm font-medium text-muted-foreground">Subject Alt. Names</dt>
                <dd className="text-sm text-foreground sm:col-span-2">
                  <div className="flex flex-wrap gap-1">
                    {certificate.sans.map((san, index) => <Badge key={index} variant="secondary">{san}</Badge>)}
                  </div>
                </dd>
              </div>
            )}

            <Separator className="my-3"/>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">PEM Data</h3>
              <pre className="text-xs whitespace-pre-wrap break-all font-mono h-48 w-full rounded-md border p-3 bg-muted/30 overflow-y-auto">
                {certificate.pemData}
              </pre>
            </div>

            <Separator className="my-3"/>
            
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="raw-api-data" className="border-b-0">
                    <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:no-underline py-1 justify-start">Raw API Data</AccordionTrigger>
                    <AccordionContent>
                        <pre className="text-xs whitespace-pre-wrap break-all font-mono h-48 w-full rounded-md border p-3 bg-muted/30 mt-2 overflow-y-auto">
                        {certificate.rawApiData ? JSON.stringify(certificate.rawApiData, null, 2) : 'No raw API data available.'}
                        </pre>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
        
        <div className="pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
