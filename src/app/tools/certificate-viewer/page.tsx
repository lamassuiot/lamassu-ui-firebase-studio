

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Binary, AlertTriangle, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';
import { setEngine, getCrypto } from 'pkijs';
import { parseCertificatePemDetails, type ParsedPemDetails } from '@/lib/ca-data';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());
};

const renderUrlList = (urls: string[] | undefined, listTitle: string) => {
    if (!urls || urls.length === 0) {
      return null;
    }
    return (
      <DetailItem
        label={listTitle}
        value={
          <ul className="list-disc list-inside space-y-1">
            {urls.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        }
      />
    );
};


export default function CertificateViewerPage() {
  const [pem, setPem] = useState('');
  const [parsedDetails, setParsedDetails] = useState<ParsedPemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEngine("webcrypto", getCrypto());
    }
  }, []);
  
  // This effect will run a debounced parse when the pem input changes.
  useEffect(() => {
    const handler = setTimeout(() => {
      if (pem.trim() && !isParsing) { // Only parse if there's content and not already parsing
        handleParse();
      } else if (!pem.trim()) {
        // Clear results if input is cleared
        setParsedDetails(null);
        setError(null);
      }
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pem]);


  const handleParse = async () => {
    if(pem.trim() === '') {
        setParsedDetails(null);
        setError("PEM input cannot be empty.");
        return;
    }

    setIsLoading(true);
    setIsParsing(true); // Set parsing flag
    setError(null);
    setParsedDetails(null);

    try {
        const details = await parseCertificatePemDetails(pem);
        if (details.signatureAlgorithm === 'N/A' && details.keyUsage.length === 0 && details.sans.length === 0) {
            throw new Error("Could not parse the provided text as a valid PEM certificate.");
        }
        setParsedDetails(details);
    } catch (e: any) {
        setError(e.message || "An unknown error occurred during parsing.");
    } finally {
        setIsLoading(false);
        setIsParsing(false); // Unset parsing flag
    }
  };


  return (
    <div className="space-y-6 w-full pb-8">
      <div className="flex items-center space-x-3">
        <Binary className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-semibold">Certificate Viewer</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Paste a single X.509 certificate in PEM format below to parse and view its details.
      </p>

        <Card>
            <CardHeader>
            <CardTitle>Certificate Input</CardTitle>
            <CardDescription>
                Parsing will happen automatically after you stop typing.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Textarea
                value={pem}
                onChange={(e) => setPem(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
                className="font-mono h-[20rem]"
                disabled={isLoading}
            />
            </CardContent>
        </Card>

        <div className="space-y-4">
            {isLoading && (
            <div className="flex items-center justify-center p-4 min-h-[20rem] border rounded-lg bg-muted/20">
                <Loader2 className="mr-2 h-5 w-5 animate-spin"/>
                <span className="text-muted-foreground">Parsing certificate...</span>
            </div>
            )}

            {error && !isLoading && (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Parsing Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
            )}

            {parsedDetails && !isLoading && (
            <Card>
                <CardHeader>
                <CardTitle>Parsed Certificate Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <DetailItem label="Signature Algorithm" value={parsedDetails.signatureAlgorithm} />
                <Separator />
                
                <h4 className="font-medium text-md text-muted-foreground pt-2">Extensions</h4>

                <DetailItem label="Subject Alternative Names (SANs)" value={
                    parsedDetails.sans && parsedDetails.sans.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {parsedDetails.sans.map((san, index) => <Badge key={index} variant="secondary">{san}</Badge>)}
                    </div>
                    ) : ("Not Specified")
                }/>
                
                <DetailItem label="Key Usages" value={
                    (parsedDetails.keyUsage && parsedDetails.keyUsage.length > 0) || (parsedDetails.extendedKeyUsage && parsedDetails.extendedKeyUsage.length > 0) ? (
                    <div className="space-y-2">
                        {parsedDetails.keyUsage && parsedDetails.keyUsage.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {parsedDetails.keyUsage.map(usage => <Badge key={usage} variant="outline">{toTitleCase(usage)}</Badge>)}
                            </div>
                        )}
                        {parsedDetails.extendedKeyUsage && parsedDetails.extendedKeyUsage.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {parsedDetails.extendedKeyUsage.map(usage => <Badge key={usage} variant="outline">{toTitleCase(usage)}</Badge>)}
                            </div>
                        )}
                    </div>
                    ) : ("Not Specified")
                } />
                <Separator />

                <h4 className="font-medium text-md text-muted-foreground pt-2">Distribution Points</h4>
                {renderUrlList(parsedDetails.crlDistributionPoints, 'CRL Distribution Points')}
                {renderUrlList(parsedDetails.ocspUrls, 'OCSP Responders')}
                {renderUrlList(parsedDetails.caIssuersUrls, 'CA Issuers')}
                
                </CardContent>
            </Card>
            )}
            
            {!isLoading && !error && !parsedDetails && (
                 <div className="flex items-center justify-center p-4 min-h-[20rem] border-2 border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Paste a certificate above to see the results.</p>
                </div>
            )}
        </div>
    </div>
  );
}
