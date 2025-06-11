'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { signData, type SignDataInput, type SignDataOutput } from '@/ai/flows/kms-sign-flow';
import { Loader2, Copy, Check } from 'lucide-react';

interface SignDataModalProps {
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

export function SignDataModal({ isOpen, onOpenChange, keyAlias }: SignDataModalProps) {
  const { toast } = useToast();
  const [dataToSign, setDataToSign] = useState('');
  const [algorithm, setAlgorithm] = useState(signatureAlgorithms[0].value);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSign = async () => {
    if (!keyAlias || !dataToSign || !algorithm) {
      toast({ title: "Missing Information", description: "Please provide data to sign and select an algorithm.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSignature(null);
    try {
      const input: SignDataInput = { keyAlias, dataToSign, algorithm };
      const result: SignDataOutput = await signData(input);
      setSignature(result.signature);
      toast({ title: "Data Signed (Mock)", description: "Mock signature generated successfully." });
    } catch (error) {
      console.error("Error signing data:", error);
      toast({ title: "Signing Error", description: "Failed to sign data (mock). Check console for details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (signature) {
      navigator.clipboard.writeText(signature);
      setCopied(true);
      toast({title: "Copied!", description: "Signature copied to clipboard."});
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!keyAlias) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sign Data with Key: {keyAlias}</DialogTitle>
          <DialogDescription>
            Enter the data you want to sign and select the signature algorithm.
            This is a mock operation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="dataToSign">Data to Sign</Label>
            <Textarea
              id="dataToSign"
              value={dataToSign}
              onChange={(e) => setDataToSign(e.target.value)}
              placeholder="Enter text or base64 encoded data here..."
              rows={5}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="signAlgorithm">Signature Algorithm</Label>
            <Select value={algorithm} onValueChange={setAlgorithm}>
              <SelectTrigger id="signAlgorithm" className="mt-1">
                <SelectValue placeholder="Select algorithm" />
              </SelectTrigger>
              <SelectContent>
                {signatureAlgorithms.map(algo => (
                  <SelectItem key={algo.value} value={algo.value}>{algo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {signature && (
            <div>
              <Label htmlFor="generatedSignature">Generated Signature (Mock)</Label>
              <div className="relative mt-1">
                <Textarea
                  id="generatedSignature"
                  value={signature}
                  readOnly
                  rows={3}
                  className="font-mono bg-muted/50 pr-10"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleCopyToClipboard}
                    title="Copy signature"
                >
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSign} disabled={isLoading || !dataToSign}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
