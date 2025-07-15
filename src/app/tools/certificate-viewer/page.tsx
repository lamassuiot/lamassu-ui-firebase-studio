

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
import * as asn1js from "asn1js";
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

// New component for rendering the ASN.1 tree
const Asn1Tree: React.FC<{ node: asn1js.BaseBlock<any> }> = ({ node }) => {
    const Asn1Node: React.FC<{ node: asn1js.BaseBlock<any>; level: number }> = ({ node, level }) => {
        const isConstructed = node.idBlock.isConstructed;
        const valueBlock = node.valueBlock as any;
        const value = isConstructed ? valueBlock.value : valueBlock.valueHex;

        let nodeType = 'Unknown';
        const tagMap: { [key: number]: string } = {
            1: 'BOOLEAN', 2: 'INTEGER', 3: 'BIT STRING', 4: 'OCTET STRING', 5: 'NULL',
            6: 'OBJECT IDENTIFIER', 12: 'UTF8String', 16: 'SEQUENCE', 17: 'SET',
            19: 'PrintableString', 22: 'IA5String', 23: 'UTCTime', 24: 'GeneralizedTime',
        };
        
        if (node.idBlock.tagClass === 1) { // UNIVERSAL
            nodeType = tagMap[node.idBlock.tagNumber] || `Tag ${node.idBlock.tagNumber}`;
        }

        const renderPrimitiveValue = () => {
            if (value) {
                return Buffer.from(value).toString('hex');
            }
            // Fallback for types that might not have valueHex (like OBJECT IDENTIFIER)
            if (valueBlock.value) {
                return valueBlock.value;
            }
            return 'N/A';
        };

        return (
            <div style={{ marginLeft: `${level * 16}px` }} className="font-mono text-xs border-l border-dashed pl-2 py-0.5">
                <span className="font-semibold text-primary/80">{nodeType}:</span>
                {!isConstructed && (
                     <span className="text-muted-foreground ml-2 break-all">{renderPrimitiveValue()}</span>
                )}
                {isConstructed && value && Array.isArray(value) && value.map((childNode, index) => (
                    <Asn1Node key={index} node={childNode} level={level + 1} />
                ))}
            </div>
        );
    };

    return <Asn1Node node={node} level={0} />;
};


export default function CertificateViewerPage() {
  const [pem, setPem] = useState('');
  const [parsedDetails, setParsedDetails] = useState<ParsedPemDetails | null>(null);
  const [asn1Root, setAsn1Root] = useState<asn1js.BaseBlock<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEngine("webcrypto", getCrypto());
    }
  }, []);
  
  const handleParse = async () => {
    if(pem.trim() === '') {
        setParsedDetails(null);
        setAsn1Root(null);
        setError("PEM input cannot be empty.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setParsedDetails(null);
    setAsn1Root(null);

    try {
        const pemContent = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
        const derBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0)).buffer;
        
        // 1. Parse raw ASN.1 structure
        const asn1 = asn1js.fromBER(derBuffer);
        if (asn1.offset === -1) {
            throw new Error("Could not parse the provided text as a valid ASN.1 structure.");
        }
        setAsn1Root(asn1.result);
        
        // 2. Parse into high-level details
        const details = await parseCertificatePemDetails(pem);
        if (details.signatureAlgorithm === 'N/A' && details.keyUsage.length === 0 && details.sans.length === 0) {
            throw new Error("Could not parse the provided text as a valid PEM certificate.");
        }
        setParsedDetails(details);
    } catch (e: any) {
        setError(e.message || "An unknown error occurred during parsing.");
    } finally {
        setIsLoading(false);
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
                The certificate should start with `-----BEGIN CERTIFICATE-----`.
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
            <Button onClick={handleParse} disabled={isLoading || !pem.trim()}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Parse Certificate
            </Button>
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

             {asn1Root && !isLoading && (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="asn1-tree">
                        <AccordionTrigger className="text-md font-medium bg-muted/30 hover:bg-muted/40 data-[state=open]:bg-muted/50 px-4 py-3 rounded-md">
                           Raw ASN.1 Structure
                        </AccordionTrigger>
                        <AccordionContent className="p-4 border border-t-0 rounded-b-md">
                             <Asn1Tree node={asn1Root} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
            
            {!isLoading && !error && !parsedDetails && (
                 <div className="flex items-center justify-center p-4 min-h-[20rem] border-2 border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground">Results will appear here...</p>
                </div>
            )}
        </div>
    </div>
  );
}
