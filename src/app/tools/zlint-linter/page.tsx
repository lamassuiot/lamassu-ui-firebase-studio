
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Binary, AlertTriangle, Loader2, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';


interface ZlintResult {
  lint_name: string;
  status: 'pass' | 'error' | 'warn' | 'info' | 'fatal' | 'NA' | 'NE';
  details?: string;
}

// Extend the Window interface to include the properties set by wasm_exec.js and our Go code.
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
    NE: 5, // Not effective, can be hidden
    NA: 6,  // Not applicable, can be hidden
};


export default function ZlintLinterPage() {
  const { toast } = useToast();
  const [pem, setPem] = useState('');
  const [results, setResults] = useState<ZlintResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New state to manage script and WASM loading
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWasmReady, setIsWasmReady] = useState(false);
  
  // Accordion state
  const [activeAccordion, setActiveAccordion] = useState<string>("input");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  const goInstance = useRef<any>(null);

  const handleScriptLoad = () => {
    setIsScriptReady(true);
  };
  
  useEffect(() => {
    if (!isScriptReady || goInstance.current) {
      return;
    }
    
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
        toast({ title: "Zlint Ready", description: "WASM module loaded successfully." });
      })
      .catch(err => {
        console.error("WASM instantiation failed:", err);
        setError(`Failed to load and instantiate zlint.wasm: ${err.message}`);
      });
  }, [isScriptReady, toast]);

  const handleLint = () => {
    if (!isWasmReady) {
      toast({ title: "WASM Not Ready", description: "The linter is still loading. Please wait a moment.", variant: 'destructive' });
      return;
    }
    if (!pem.trim()) {
      setError('Please paste a certificate in PEM format.');
      setResults([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults([]);
    setCurrentPage(1);

    setTimeout(() => {
        try {
            const rawResult = window.zlintCertificateSimple(pem);
            
            if (rawResult && typeof rawResult === 'object' && rawResult.results) {
                 const transformedResults: ZlintResult[] = Object.entries(rawResult.results).map(([lintName, lintData]) => ({
                    lint_name: lintName,
                    status: lintData.result as ZlintResult['status'],
                    details: lintData.details,
                }));
                
                const filteredAndSortedResults = transformedResults
                    .filter(result => result.status !== 'NA' && result.status !== 'NE')
                    .sort((a, b) => statusSortOrder[a.status] - statusSortOrder[b.status]);

                setResults(filteredAndSortedResults);
                toast({ title: "Linting Complete", description: `Found ${filteredAndSortedResults.filter(r => r.status !== 'pass').length} issues.` });
                setActiveAccordion("results"); // Collapse input and show results
            } else {
                 throw new Error("The linting function did not return a valid result object.");
            }

        } catch (e: any) {
            console.error("Linting error:", e);
            setError(`An error occurred during linting: ${e.message || "Unknown error. Check the console."}`);
            setResults([]);
            setActiveAccordion("input"); // Keep input open on error
        } finally {
            setIsLoading(false);
        }
    }, 100);
  };
  
  // Pagination logic
  const lastIndex = currentPage * itemsPerPage;
  const firstIndex = lastIndex - itemsPerPage;
  const currentResults = results.slice(firstIndex, lastIndex);
  const totalPages = Math.ceil(results.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const ResultStatusIcon = ({ status }: { status: ZlintResult['status'] }) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'fatal': return <XCircle className="h-4 w-4 text-red-700" />;
      case 'warn': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <>
      <Script src="/wasm_exec.js" strategy="afterInteractive" onLoad={handleScriptLoad} />
      <div className="space-y-6 w-full pb-8">
        <div className="flex items-center space-x-3">
          <Binary className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Zlint Certificate Linter</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Analyze an X.509 certificate against Zlint's comprehensive set of linting rules.
        </p>
        
        <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion} className="w-full">
            <AccordionItem value="input">
                <AccordionTrigger>
                     <CardTitle>Certificate Input</CardTitle>
                </AccordionTrigger>
                <AccordionContent>
                    <CardHeader className="p-0 pb-4">
                        <CardDescription>
                            Paste a single X.509 certificate in PEM format. The wasm module will be used to process it.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-0">
                        <Textarea
                        value={pem}
                        onChange={(e) => setPem(e.target.value)}
                        placeholder="-----BEGIN CERTIFICATE-----..."
                        className="font-mono h-64"
                        disabled={isLoading || !isWasmReady}
                        />
                        <Button onClick={handleLint} disabled={isLoading || !isWasmReady || !pem.trim()}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : !isWasmReady ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        { !isWasmReady ? 'Loading Linter...' : 'Lint Certificate' }
                        </Button>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {results.length > 0 && (
            <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion}>
                <AccordionItem value="results">
                    <AccordionTrigger>
                        <CardTitle>Linting Results</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead>Lint Name</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentResults.map((result, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Badge variant={result.status === 'pass' ? 'secondary' : 'destructive'} className="capitalize">
                                                <ResultStatusIcon status={result.status} />
                                                <span className="ml-1.5">{result.status}</span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{result.lint_name}</TableCell>
                                        <TableCell>{result.details}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="itemsPerPage" className="text-sm text-muted-foreground">Items per page:</Label>
                                <Select value={String(itemsPerPage)} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
                                    <SelectTrigger id="itemsPerPage" className="w-[70px]">
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
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline" size="sm">
                                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                                </Button>
                                <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage >= totalPages} variant="outline" size="sm">
                                    Next <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        )}

      </div>
    </>
  );
}
