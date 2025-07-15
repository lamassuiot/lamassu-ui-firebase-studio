
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
  const [debouncedPem, setDebouncedPem] = useState('');
  const [parsedDetails, setParsedDetails] = useState<ParsedPemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEngine("webcrypto", getCrypto());
    }
  }, []);
  
  // Debounce effect to trigger parsing automatically
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedPem(pem);
    }, 500); // 500ms delay

    return () => {
        clearTimeout(handler);
    };
  }, [pem]);
  
  useEffect(() => {
    if(debouncedPem.trim() === '') {
        setParsedDetails(null);
        setError(null);
        return;
    }

    const handleParse = async () => {
        setIsLoading(true);
        setError(null);
        setParsedDetails(null);

        try {
            const details = await parseCertificatePemDetails(debouncedPem);
            if (details.signatureAlgorithm === 'N/A' && details.keyUsage.length === 0 && details.sans.length === 0) {
                // This is a heuristic to check if parsing failed inside the utility
                throw new Error("Could not parse the provided text as a valid PEM certificate.");
            }
            setParsedDetails(details);
        } catch (e: any) {
            setError(e.message || "An unknown error occurred during parsing.");
        } finally {
            setIsLoading(false);
        }
    };
    
    handleParse();

  }, [debouncedPem]);

  return (
    <div className="space-y-6 w-full pb-8">
      <div className="flex items-center space-x-3">
        <Binary className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-semibold">Certificate Viewer</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Paste a single X.509 certificate in PEM format below to parse and view its details. Parsing will begin automatically.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="lg:sticky lg:top-20">
            <CardHeader>
            <CardTitle>Certificate Input</CardTitle>
            <CardDescription>
                The certificate should start with `-----BEGIN CERTIFICATE-----`.
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <Textarea
                value={pem}
                onChange={(e) => setPem(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----..."
                className="font-mono h-[30rem]"
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
                    <p className="text-muted-foreground">Results will appear here...</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
