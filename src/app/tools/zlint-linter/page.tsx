
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Binary, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

export default function ZlintLinterPage() {
  const { toast } = useToast();
  const [pem, setPem] = useState('');
  const [results, setResults] = useState<ZlintResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New state to manage script and WASM loading
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [isWasmReady, setIsWasmReady] = useState(false);

  const goInstance = useRef<any>(null);

  const handleScriptLoad = () => {
    setIsScriptReady(true);
  };
  
  useEffect(() => {
    // This effect initializes the WASM module, but only after the script is ready.
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
        // Now, `zlintCertificateSimple` should be available on the window object.
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

    setTimeout(() => {
        try {
            const rawResult = window.zlintCertificateSimple(pem);
            
            // Check if the result is in the expected object format
            if (rawResult && typeof rawResult === 'object' && rawResult.results) {
                 const transformedResults: ZlintResult[] = Object.entries(rawResult.results).map(([lintName, lintData]) => ({
                    lint_name: lintName,
                    status: lintData.result as ZlintResult['status'],
                    details: lintData.details,
                }));
                setResults(transformedResults);
                toast({ title: "Linting Complete", description: `Found ${transformedResults.filter(r => r.status !== 'pass' && r.status !== 'NA' && r.status !== 'NE').length} issues.` });
            } else {
                 throw new Error("The linting function did not return a valid result object.");
            }

        } catch (e: any) {
            console.error("Linting error:", e);
            setError(`An error occurred during linting: ${e.message || "Unknown error. Check the console."}`);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, 100); // Small delay for UX
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

        <Card>
          <CardHeader>
            <CardTitle>Certificate Input</CardTitle>
            <CardDescription>
              Paste a single X.509 certificate in PEM format. The wasm module will be used to process it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {results.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Linting Results</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Status</TableHead>
                                <TableHead>Lint Name</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((result, index) => (
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
                </CardContent>
            </Card>
        )}

      </div>
    </>
  );
}
