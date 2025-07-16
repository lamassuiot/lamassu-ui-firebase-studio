

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Script from 'next/script';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Binary, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';
import { getCrypto, setEngine, Certificate } from 'pkijs';
import { parseCertificatePemDetails, type ParsedPemDetails } from '@/lib/ca-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MultiSelectDropdown } from '@/components/shared/MultiSelectDropdown';
import { Asn1Viewer } from '@/components/shared/Asn1Viewer';
import * as asn1js from 'asn1js';


// --- Zlint Types and Interfaces ---
interface ZlintResult {
  lint_name: string;
  status: 'pass' | 'error' | 'warn' | 'info' | 'fatal' | 'NA' | 'NE';
  details?: string;
}

interface ZlintProfile {
    name: string;
    source: string;
    citation: string;
    description: string;
    effectiveDate: string;
}

declare global {
  interface Window {
    Go: any;
    zlintCertificate: (pem: string, options: ZlintOptions) => { results: Record<string, { result: string, details?: string }>, success: boolean };
    zlintGetLints: () => { lints: Record<string, ZlintProfile>, success: boolean, error?: string, count?: number };
  }
}

const statusSortOrder: Record<ZlintResult['status'], number> = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    pass: 4,
    NE: 5,
    NA: 6,
};


// --- Helper Functions ---
const RFC_TITLE_MAP: Record<string, string> = {
  "RFC3279": "Algorithms and Identifiers for the Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile",
  "RFC3647": "Internet X.509 Public Key Infrastructure Certificate Policy and Certification Practices Framework",
  "RFC4043": "Internet X.509 Public Key Infrastructure Permanent Identifier",
  "RFC5246": "The Transport Layer Security (TLS) Protocol Version 1.2",
  "RFC5280": "Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile",
  "RFC5480": "Elliptic Curve Cryptography Subject Public Key Information",
  "RFC5912": "New ASN.1 Modules for the Public Key Infrastructure Using X.509 (PKIX)",
  "RFC6960": "X.509 Internet Public Key Infrastructure Online Certificate Status Protocol - OCSP",
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
};

const renderUrlList = (urls: string[] | undefined, listTitle: string) => {
    if (!urls || urls.length === 0) return null;
    return (
      <DetailItem
        label={listTitle}
        value={
          <ul className="list-disc list-inside space-y-1">
            {urls.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{url}</a>
              </li>
            ))}
          </ul>
        }
      />
    );
};

const ResultStatusBadge: React.FC<{ status: ZlintResult['status'] }> = ({ status }) => {
  let Icon: React.ElementType = AlertTriangle;
  let text = 'Info';
  let className = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-400/50';

  switch (status) {
    case 'pass':
      Icon = CheckCircle;
      text = 'Pass';
      className = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-400/50';
      break;
    case 'error':
      Icon = XCircle;
      text = 'Error';
      className = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-400/50';
      break;
    case 'fatal':
      Icon = XCircle;
      text = 'Fatal';
      className = 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200 border-red-500/50';
      break;
    case 'warn':
      Icon = AlertTriangle;
      text = 'Warn';
      className = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-400/50';
      break;
  }

  return (
    <Badge variant="outline" className={cn('capitalize', className)}>
      <Icon className="h-4 w-4 mr-1.5" />
      <span>{text}</span>
    </Badge>
  );
};

const SourceLink: React.FC<{ text: string, type: 'source' | 'citation' }> = ({ text, type }) => {
  if (!text) return <>N/A</>;

  const rfcMatch = text.match(/(RFC\s?\d+)/i);
  if (rfcMatch) {
    const rfcNumber = rfcMatch[1].replace(/\s/g, '').toUpperCase();
    let url = `https://datatracker.ietf.org/doc/html/${rfcNumber.toLowerCase()}`;
    const sectionMatch = text.match(/[:/]\s*([\w\.]+)/);
    // Don't add section for CABF BRS citations
    if (sectionMatch && sectionMatch[1] && !text.toUpperCase().includes('BRS:')) {
      url += `#section-${sectionMatch[1]}`;
    }
    const displayText = type === 'source' && RFC_TITLE_MAP[rfcNumber] ? `${rfcNumber}: ${RFC_TITLE_MAP[rfcNumber]}` : text;
    return <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{displayText}</a>;
  }

  if (text.toUpperCase().includes('CABF_BR')) {
    return <a href="https://cabforum.org/working-groups/server/baseline-requirements/documents/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{text}</a>;
  }
  
  if (text.includes('Mozilla Root Store Policy')) {
    return <a href="https://www.mozilla.org/en-US/about/governance/policies/security-group/certs/policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{text}</a>;
  }

  try {
    new URL(text);
    return <a href={text} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{text}</a>;
  } catch (_) {
    // Not a valid URL
  }

  return <>{text}</>;
};

interface ZlintOptions {
    format: 'pem';
    includeSources: string;
}


type StatusFilter = ZlintResult['status'] | 'all';
const statusFilterOrder: StatusFilter[] = ['all', 'fatal', 'error', 'warn', 'info', 'pass'];

export default function CertificateViewerPage() {
  const { toast } = useToast();
  // --- Common State ---
  const [pem, setPem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  // --- Viewer State ---
  const [parsedDetails, setParsedDetails] = useState<ParsedPemDetails | null>(null);
  const [asn1Data, setAsn1Data] = useState<asn1js.Asn1Json | null>(null);

  // --- Linter State ---
  const [lintResults, setLintResults] = useState<ZlintResult[]>([]);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWasmReady, setIsWasmReady] = useState(false);
  const [isLinting, setIsLinting] = useState(false);
  const goInstance = useRef<any>(null);
  
  // Linter Pagination & Filtering
  const [linterCurrentPage, setLinterCurrentPage] = useState(1);
  const [linterItemsPerPage, setLinterItemsPerPage] = useState(10);
  const [linterStatusFilter, setLinterStatusFilter] = useState<StatusFilter>('all');
  
  // State to hold all lint definitions
  const [lintProfileMap, setLintProfileMap] = useState<Map<string, ZlintProfile>>(new Map());
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);


  // --- Effects ---
  useEffect(() => {
    setEngine("webcrypto", getCrypto());
  }, []);

  const handleScriptLoad = () => setIsScriptReady(true);

  useEffect(() => {
    if (!isScriptReady || goInstance.current) return;
    if (!window.Go) {
      console.error("wasm_exec.js did not load the Go object on the window.");
      setError("Failed to load WASM execution environment.");
      return;
    }

    goInstance.current = new window.Go();
    WebAssembly.instantiateStreaming(fetch('/zlint.wasm'), goInstance.current.importObject)
      .then(result => {
        goInstance.current.run(result.instance);
        setIsWasmReady(true);
      })
      .catch(err => {
        console.error("WASM instantiation failed:", err);
        setError(`Failed to load and instantiate zlint.wasm: ${err.message}`);
      });
  }, [isScriptReady]);
  
   useEffect(() => {
    if (isWasmReady && lintProfileMap.size === 0) {
      try {
        const result = window.zlintGetLints();
        if (result && result.success && result.lints) {
          const profileMap = new Map<string, ZlintProfile>();
          const sources = new Set<string>();
          for (const lintName in result.lints) {
            const lintProfile = result.lints[lintName];
            profileMap.set(lintName, lintProfile);
            if (lintProfile.source) {
              sources.add(lintProfile.source);
            }
          }
          setLintProfileMap(profileMap);
          const sortedSources = Array.from(sources).sort();
          setAvailableSources(sortedSources);
          // Default to selecting all RFC sources
          const rfcSources = sortedSources.filter(s => s.startsWith('RFC'));
          setSelectedSources(rfcSources); 
        } else {
          console.error("Failed to fetch lint profiles:", result?.error);
        }
      } catch (e) {
        console.error("Error calling zlintGetLints:", e);
      }
    }
  }, [isWasmReady, lintProfileMap.size]);
  
  const handleParse = async () => {
    if (!pem.trim()) {
        setParsedDetails(null);
        setAsn1Data(null);
        setError(null);
        setActiveTab("input");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setParsedDetails(null);
    setAsn1Data(null);
    setLintResults([]);
    
    try {
        const pemString = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/\s+/g, "");
        const derBuffer = Uint8Array.from(atob(pemString), c => c.charCodeAt(0)).buffer;
        const asn1 = asn1js.fromBER(derBuffer);
        if (asn1.offset === -1) {
            throw new Error("Invalid ASN.1 structure.");
        }
        
        const certificate = new Certificate({ schema: asn1.result });
        setAsn1Data(certificate.toJSON());
        
        const details = await parseCertificatePemDetails(pem);
        if (details.signatureAlgorithm === 'N/A') {
            throw new Error("Could not parse the provided text as a valid PEM certificate.");
        }
        setParsedDetails(details);
        setActiveTab("details");
    } catch (e: any) {
        setError(e.message || "An unknown error occurred during parsing.");
        setParsedDetails(null);
        setAsn1Data(null);
        setActiveTab("input");
    } finally {
        setIsLoading(false);
    }
  };

  const handleLint = () => {
    if (!isWasmReady) {
      toast({ title: "WASM Not Ready", description: "The linter is still loading. Please wait a moment.", variant: 'destructive' });
      return;
    }
    
    setIsLinting(true);
    setError(null);
    setLintResults([]);
    setLinterCurrentPage(1);
    setLinterStatusFilter('all');

    setTimeout(() => {
        try {
            const options: ZlintOptions = {
                format: 'pem',
                includeSources: selectedSources.join(','),
            };
            const rawResult = window.zlintCertificate(pem, options);
            if (!rawResult?.results) throw new Error("The linting function did not return a valid result object.");

            const transformedResults: ZlintResult[] = Object.entries(rawResult.results).map(([lintName, lintData]) => ({
                lint_name: lintName,
                status: lintData.result as ZlintResult['status'],
                details: lintData.details,
            }));
            
            const filteredAndSortedResults = transformedResults
                .filter(result => result.status !== 'NA' && result.status !== 'NE')
                .sort((a, b) => statusSortOrder[a.status] - statusSortOrder[b.status]);

            setLintResults(filteredAndSortedResults);
        } catch (e: any) {
            setError(`An error occurred during linting: ${e.message}`);
            setLintResults([]);
        } finally {
            setIsLinting(false);
        }
    }, 100);
  };
  
  const lintSummaryCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: 0,
      fatal: 0,
      error: 0,
      warn: 0,
      info: 0,
      pass: 0,
      NA: 0,
      NE: 0
    };
    lintResults.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    counts.all = lintResults.length;
    return counts;
  }, [lintResults]);

  const filteredLintResults = useMemo(() => {
    if (linterStatusFilter === 'all') {
      return lintResults;
    }
    return lintResults.filter(r => r.status === linterStatusFilter);
  }, [lintResults, linterStatusFilter]);

  const paginatedLintResults = useMemo(() => {
    const startIndex = (linterCurrentPage - 1) * linterItemsPerPage;
    return filteredLintResults.slice(startIndex, startIndex + linterItemsPerPage);
  }, [filteredLintResults, linterCurrentPage, linterItemsPerPage]);

  const totalLinterPages = Math.ceil(filteredLintResults.length / linterItemsPerPage);

  const handleFilterChange = (status: StatusFilter) => {
    setLinterStatusFilter(status);
    setLinterCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalLinterPages) {
        setLinterCurrentPage(newPage);
    }
  }

  const availableSourceOptions = useMemo(() => {
    return availableSources.map(source => ({ value: source, label: source }));
  }, [availableSources]);

  return (
    <>
      <Script src="/wasm_exec.js" strategy="afterInteractive" onLoad={handleScriptLoad} />
      <div className="space-y-6 w-full pb-8">
        <div className="flex items-center space-x-3">
          <Binary className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Certificate Analysis Tool</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste an X.509 certificate in PEM format to parse its details and lint it against Zlint rules.
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
                <TabsTrigger value="input">PEM Input</TabsTrigger>
                <TabsTrigger value="details" disabled={!parsedDetails}>Parsed Details</TabsTrigger>
                <TabsTrigger value="asn1" disabled={!asn1Data}>ASN.1 Structure</TabsTrigger>
                <TabsTrigger value="linter" disabled={!parsedDetails}>Zlint Linter</TabsTrigger>
            </TabsList>
            
            <TabsContent value="input">
                <Card>
                    <CardHeader>
                        <CardDescription>Paste a certificate below. Details and linter will be enabled upon successful parsing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={pem}
                            onChange={(e) => setPem(e.target.value)}
                            placeholder="-----BEGIN CERTIFICATE-----..."
                            className="font-mono h-[30rem]"
                            disabled={isLoading}
                        />
                        <Button onClick={handleParse} disabled={isLoading || !pem.trim()} className="mt-4">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Parse Certificate
                        </Button>
                        {error && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Parsing Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="details">
                 <Card>
                    <CardHeader><CardTitle>Parsed Certificate Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <DetailItem label="Signature Algorithm" value={parsedDetails?.signatureAlgorithm} />
                        <Separator />
                        <h4 className="font-medium text-md text-muted-foreground pt-2">Extensions</h4>
                        <DetailItem label="Subject Alternative Names (SANs)" value={
                            parsedDetails?.sans && parsedDetails.sans.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {parsedDetails.sans.map((san, index) => <Badge key={index} variant="secondary">{san}</Badge>)}
                            </div>
                            ) : ("Not Specified")
                        }/>
                        <DetailItem label="Key Usages" value={
                            (parsedDetails?.keyUsage && parsedDetails.keyUsage.length > 0) || (parsedDetails?.extendedKeyUsage && parsedDetails.extendedKeyUsage.length > 0) ? (
                            <div className="space-y-2">
                                {parsedDetails?.keyUsage && parsedDetails.keyUsage.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {parsedDetails.keyUsage.map(usage => <Badge key={usage} variant="outline">{toTitleCase(usage)}</Badge>)}
                                    </div>
                                )}
                                {parsedDetails?.extendedKeyUsage && parsedDetails.extendedKeyUsage.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {parsedDetails.extendedKeyUsage.map(usage => <Badge key={usage} variant="outline">{toTitleCase(usage)}</Badge>)}
                                    </div>
                                )}
                            </div>
                            ) : ("Not Specified")
                        } />
                        <Separator />
                        <h4 className="font-medium text-md text-muted-foreground pt-2">Distribution Points</h4>
                        {renderUrlList(parsedDetails?.crlDistributionPoints, 'CRL Distribution Points')}
                        {parsedDetails?.crlDistributionPoints && (parsedDetails.ocspUrls || parsedDetails.caIssuersUrls) && <Separator/>}
                        {renderUrlList(parsedDetails?.ocspUrls, 'OCSP Responders')}
                        {parsedDetails?.ocspUrls && parsedDetails.caIssuersUrls && <Separator/>}
                        {renderUrlList(parsedDetails?.caIssuersUrls, 'CA Issuers')}
                    </CardContent>
                </Card>
            </TabsContent>

             <TabsContent value="asn1">
                <Card>
                    <CardHeader><CardTitle>ASN.1 Structure</CardTitle></CardHeader>
                    <CardContent>
                        {asn1Data ? (
                            <Asn1Viewer data={asn1Data} />
                        ) : (
                            <p>No ASN.1 data to display. Please parse a certificate first.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="linter">
                <Card>
                    <CardHeader>
                        <CardTitle>Zlint Linter</CardTitle>
                        <CardDescription>Analyze the certificate against Zlint rules.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow w-full space-y-1.5">
                                <Label htmlFor="source-filter">Lint Sources</Label>
                                 <MultiSelectDropdown
                                    id="source-filter"
                                    options={availableSourceOptions}
                                    allOptionValues={availableSources}
                                    selectedValues={selectedSources}
                                    onChange={setSelectedSources}
                                    buttonText="Select sources..."
                                 />
                            </div>
                            <Button onClick={handleLint} disabled={isLinting || !isWasmReady} className="w-full md:w-auto">
                                {isLinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !isWasmReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                { !isWasmReady ? 'Loading Linter...' : 'Run Linter' }
                            </Button>
                        </div>
                        {isLinting && (
                           <div className="flex items-center mt-2 text-muted-foreground text-sm"><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Linting...</div>
                        )}
                        {lintResults.length > 0 && (
                            <div className="mt-4">
                               <div className="flex flex-wrap items-center gap-2 border bg-muted/50 p-2 rounded-md mb-4">
                                {statusFilterOrder.map(status => {
                                    const count = lintSummaryCounts[status];
                                    if (status !== 'all' && count === 0) return null;
                                    const text = `${status.toUpperCase()} (${count})`;
                                    return (
                                        <Button
                                            key={status}
                                            variant={linterStatusFilter === status ? 'default' : 'secondary'}
                                            size="sm"
                                            onClick={() => handleFilterChange(status)}
                                            className="h-7 px-2.5"
                                        >
                                            {text}
                                        </Button>
                                    )
                                })}
                               </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Status</TableHead>
                                            <TableHead>Lint Name</TableHead>
                                            <TableHead>Description & Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLintResults.map((result, index) => {
                                            const profile = lintProfileMap.get(result.lint_name);
                                            return (
                                                <TableRow key={index}>
                                                    <TableCell><ResultStatusBadge status={result.status} /></TableCell>
                                                    <TableCell className="font-mono text-xs">{result.lint_name}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {profile && <p className="font-medium">{profile.description}</p>}
                                                        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                                            {profile?.source && <div><strong>Source:</strong> <SourceLink text={profile.source} type="source" /></div>}
                                                            {profile?.citation && <div><strong>Citation:</strong> <SourceLink text={profile.citation} type="citation" /></div>}
                                                            {result.details && <p><strong>Details:</strong> {result.details}</p>}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                                {totalLinterPages > 1 && (
                                     <div className="flex justify-between items-center mt-4">
                                        <div className="flex items-center space-x-2">
                                            <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">Items per page:</Label>
                                            <Select value={String(linterItemsPerPage)} onValueChange={(value) => { setLinterItemsPerPage(Number(value)); setLinterCurrentPage(1); }}>
                                                <SelectTrigger id="itemsPerPage" className="w-[70px] h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="25">25</SelectItem>
                                                    <SelectItem value="50">50</SelectItem>
                                                    <SelectItem value="100">100</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm text-muted-foreground">
                                                Page {linterCurrentPage} of {totalLinterPages}
                                            </span>
                                            <Button onClick={() => handlePageChange(linterCurrentPage - 1)} disabled={linterCurrentPage === 1} variant="outline" size="sm">
                                                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                                            </Button>
                                            <Button onClick={() => handlePageChange(linterCurrentPage + 1)} disabled={linterCurrentPage >= totalLinterPages} variant="outline" size="sm">
                                                Next <ChevronRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
}


