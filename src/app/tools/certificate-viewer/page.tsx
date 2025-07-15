
'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Script from 'next/script';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Binary, AlertTriangle, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DetailItem } from '@/components/shared/DetailItem';
import { Badge } from '@/components/ui/badge';
import { setEngine, getCrypto } from 'pkijs';
import { parseCertificatePemDetails, type ParsedPemDetails } from '@/lib/ca-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';


// --- Zlint Types and Interfaces ---
interface ZlintResult {
  lint_name: string;
  status: 'pass' | 'error' | 'warn' | 'info' | 'fatal' | 'NA' | 'NE';
  details?: string;
}

declare global {
  interface Window {
    Go: any;
    zlintCertificateSimple: (pem: string) => { results: Record<string, { result: string, details?: string }>, success: boolean };
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

const ResultStatusIcon: React.FC<{ status: ZlintResult['status'] }> = ({ status }) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'fatal': return <XCircle className="h-4 w-4 text-red-700" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
};

type StatusFilter = ZlintResult['status'] | 'all';
const statusFilterOrder: StatusFilter[] = ['all', 'fatal', 'error', 'warn', 'info', 'pass'];

export default function CertificateAnalysisPage() {
  const { toast } = useToast();
  // --- Common State ---
  const [pem, setPem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  // --- Viewer State ---
  const [parsedDetails, setParsedDetails] = useState<ParsedPemDetails | null>(null);

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
  
  const handleParseAndEnable = async (newPem: string) => {
    setPem(newPem);
    if (!newPem.trim()) {
        setParsedDetails(null);
        setError(null);
        setActiveTab("input");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setParsedDetails(null);
    
    try {
        const details = await parseCertificatePemDetails(newPem);
        if (details.signatureAlgorithm === 'N/A') {
            throw new Error("Could not parse the provided text as a valid PEM certificate.");
        }
        setParsedDetails(details);
        setActiveTab("details"); // Switch to details tab on successful parse
    } catch (e: any) {
        setError(e.message || "An unknown error occurred during parsing.");
        setParsedDetails(null);
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
            const rawResult = window.zlintCertificateSimple(pem);
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
  
  // Memoized calculations for linter results
  const lintSummaryCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: lintResults.length,
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
    setLinterCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalLinterPages) {
        setLinterCurrentPage(newPage);
    }
  }

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
                            onChange={(e) => handleParseAndEnable(e.target.value)}
                            placeholder="-----BEGIN CERTIFICATE-----..."
                            className="font-mono h-[30rem]"
                            disabled={isLoading}
                        />
                        {isLoading && (
                            <div className="flex items-center mt-2 text-muted-foreground text-sm">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/> Parsing...
                            </div>
                        )}
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
                        {renderUrlList(parsedDetails?.ocspUrls, 'OCSP Responders')}
                        {renderUrlList(parsedDetails?.caIssuersUrls, 'CA Issuers')}
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
                        <Button onClick={handleLint} disabled={isLinting || !isWasmReady}>
                            {isLinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !isWasmReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            { !isWasmReady ? 'Loading Linter...' : 'Run Linter' }
                        </Button>
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
                                            <TableHead>Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedLintResults.map((result, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Badge variant={result.status === 'pass' ? 'secondary' : 'destructive'} className="capitalize"><ResultStatusIcon status={result.status} /><span className="ml-1.5">{result.status}</span></Badge></TableCell>
                                                <TableCell className="font-mono text-xs">{result.lint_name}</TableCell>
                                                <TableCell>{result.details}</TableCell>
                                            </TableRow>
                                        ))}
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
