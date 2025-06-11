'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { verifySignature, type VerifySignatureInput, type VerifySignatureOutput } from '@/ai/flows/kms-verify-flow';
import { Loader2, CheckCircle, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface VerifySignatureModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  keyAlias: string | null;
}

const signatureAlgorithms = [
  { value: 'SHA256withRSA', label: 'SHA256 with RSA' },
  { value: 'SHA384withRSA', label: 'SHA384 with RSA' },
  { value: 'SHA512withRSA', label: 'SHA512 with RSA' },
  { value: 'SHA256withECDSA', label: 'SHA256 with ECDSA' },
  { value: 'SHA384withECDSA', label: 'SHA384 with ECDSA' },
  { value: 'SHA512withECDSA', label: 'SHA512 with ECDSA' },
];

export function VerifySignatureModal({ isOpen, onOpenChange, keyAlias }: VerifySignatureModalProps) {
  const { toast } = useToast();
  const [originalData, setOriginalData] = useState('');
  const [signatureToVerify, setSignatureToVerify] = useState('');
  const [algorithm, setAlgorithm] = useState(signatureAlgorithms[0].value);
  const [verificationResult, setVerificationResult] = useState<{isValid: boolean; details: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!keyAlias || !originalData || !signatureToVerify || !algorithm) {
      toast({ title: "Missing Information", description: "Please provide original data, signature, and select an algorithm.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setVerificationResult(null);
    try {
      const input: VerifySignatureInput = { keyAlias, originalData, signature: signatureToVerify, algorithm };
      const result: VerifySignatureOutput = await verifySignature(input);
      setVerificationResult(result);
      toast({ title: "Verification Attempted (Mock)", description: result.details });
    } catch (error) {
      console.error("Error verifying signature:", error);
      toast({ title: "Verification Error", description: "Failed to verify signature (mock). Check console for details.", variant: "destructive" });
      setVerificationResult({ isValid: false, details: "An error occurred during verification." });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!keyAlias) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if (!open) setVerificationResult(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verify Signature with Key: {keyAlias}</DialogTitle>
          <DialogDescription>
            Enter the original data, the signature to verify, and select the algorithm.
            This is a mock operation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="originalData">Original Data</Label>
            <Textarea
              id="originalData"
              value={originalData}
              onChange={(e) => setOriginalData(e.target.value)}
              placeholder="Enter the original text or base64 data..."
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="signatureToVerify">Signature to Verify</Label>
            <Textarea
              id="signatureToVerify"
              value={signatureToVerify}
              onChange={(e) => setSignatureToVerify(e.target.value)}
              placeholder="Paste the signature (e.g., base64 encoded)..."
              rows={3}
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor="verifyAlgorithm">Signature Algorithm</Label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger id="verifyAlgorithm" className="mt-1">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent>
                {signatureAlgorithms.map(algo => (
                  <SelectItem key={algo.value} value={algo.value}>{algo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {verificationResult && (
            <Alert variant={verificationResult.isValid ? "default" : "destructive"} className={verificationResult.isValid ? "bg-green-50 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300" : ""}>
              {verificationResult.isValid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              <AlertTitle>{verificationResult.isValid ? "Signature Valid (Mock)" : "Signature Invalid (Mock)"}</AlertTitle>
              <AlertDescription>{verificationResult.details}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleVerify} disabled={isLoading || !originalData || !signatureToVerify}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
