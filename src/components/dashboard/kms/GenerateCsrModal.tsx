'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { generateCsr, type GenerateCsrInput, type GenerateCsrOutput } from '@/ai/flows/kms-generate-csr-flow';
import { Loader2, Copy, Check, FilePlus2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GenerateCsrModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  keyAlias: string | null;
}

export function GenerateCsrModal({ isOpen, onOpenChange, keyAlias }: GenerateCsrModalProps) {
  const { toast } = useToast();
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');
  const [locality, setLocality] = useState('');
  const [stateOrProvince, setStateOrProvince] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const [generatedCsr, setGeneratedCsr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    if (!keyAlias || !commonName.trim()) {
      toast({ title: "Missing Information", description: "Common Name (CN) is required.", variant: "destructive" });
      return;
    }
    if (countryCode.trim() && countryCode.trim().length !== 2) {
        toast({ title: "Validation Error", description: "Country Code must be exactly 2 letters.", variant: "destructive" });
        return;
    }

    setIsLoading(true);
    setGeneratedCsr(null);
    try {
      const input: GenerateCsrInput = { 
        keyAlias, 
        commonName,
        organization: organization.trim() || undefined,
        organizationalUnit: organizationalUnit.trim() || undefined,
        locality: locality.trim() || undefined,
        stateOrProvince: stateOrProvince.trim() || undefined,
        countryCode: countryCode.trim().toUpperCase() || undefined,
      };
      const result: GenerateCsrOutput = await generateCsr(input);
      setGeneratedCsr(result.csrPem);
      toast({ title: "CSR Generated (Mock)", description: "Mock CSR generated successfully." });
    } catch (error) {
      console.error("Error generating CSR:", error);
      toast({ title: "CSR Generation Error", description: "Failed to generate CSR (mock). Check console for details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedCsr) {
      navigator.clipboard.writeText(generatedCsr);
      setCopied(true);
      toast({title: "Copied!", description: "CSR copied to clipboard."});
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setCommonName('');
    setOrganization('');
    setOrganizationalUnit('');
    setLocality('');
    setStateOrProvince('');
    setCountryCode('');
    setGeneratedCsr(null);
    setCopied(false);
  }

  if (!keyAlias) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { onOpenChange(open); if(!open) resetForm(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center"><FilePlus2 className="mr-2 h-6 w-6"/>Generate CSR for Key: {keyAlias}</DialogTitle>
          <DialogDescription>
            Enter the subject information for the Certificate Signing Request.
            This is a mock operation.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="space-y-4 py-2">
            <div>
                <Label htmlFor="csrCommonName">Common Name (CN) <span className="text-destructive">*</span></Label>
                <Input id="csrCommonName" value={commonName} onChange={(e) => setCommonName(e.target.value)} placeholder="e.g., mydevice.example.com" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="csrOrganization">Organization (O)</Label>
                    <Input id="csrOrganization" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g., LamassuIoT Corp" />
                </div>
                <div>
                    <Label htmlFor="csrOrganizationalUnit">Organizational Unit (OU)</Label>
                    <Input id="csrOrganizationalUnit" value={organizationalUnit} onChange={(e) => setOrganizationalUnit(e.target.value)} placeholder="e.g., Engineering" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="csrLocality">Locality (L)</Label>
                    <Input id="csrLocality" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="e.g., San Francisco" />
                </div>
                <div>
                    <Label htmlFor="csrStateOrProvince">State/Province (ST)</Label>
                    <Input id="csrStateOrProvince" value={stateOrProvince} onChange={(e) => setStateOrProvince(e.target.value)} placeholder="e.g., California" />
                </div>
                <div>
                    <Label htmlFor="csrCountryCode">Country Code (C)</Label>
                    <Input id="csrCountryCode" value={countryCode} onChange={(e) => setCountryCode(e.target.value.toUpperCase())} placeholder="e.g., US" maxLength={2} />
                </div>
            </div>
            
            {generatedCsr && (
                <div className="pt-4">
                <Label htmlFor="generatedCsr">Generated CSR (Mock)</Label>
                <div className="relative mt-1">
                    <Textarea
                    id="generatedCsr"
                    value={generatedCsr}
                    readOnly
                    rows={10}
                    className="font-mono bg-muted/50 pr-10 text-xs leading-relaxed"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={handleCopyToClipboard}
                        title="Copy CSR"
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
                </div>
            )}
            </div>
        </ScrollArea>
        
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isLoading || !commonName.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate CSR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
