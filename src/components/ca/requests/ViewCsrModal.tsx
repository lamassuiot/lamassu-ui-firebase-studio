
'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ViewCsrModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  csrPem: string | null;
}

export const ViewCsrModal: React.FC<ViewCsrModalProps> = ({ isOpen, onOpenChange, csrPem }) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!csrPem) return;
    try {
      await navigator.clipboard.writeText(csrPem);
      setCopied(true);
      toast({ title: "Copied!", description: "CSR content copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader>
          <DialogTitle>Certificate Signing Request (CSR)</DialogTitle>
          <DialogDescription>
            This is the generated CSR for the CA request. It should be signed by an appropriate authority.
          </DialogDescription>
        </DialogHeader>
        <div className="relative my-4">
          <ScrollArea className="h-80 w-full rounded-md border bg-muted/30">
            <pre className="p-4 text-xs whitespace-pre-wrap break-all font-mono">
              <code>{csrPem || 'No CSR data available.'}</code>
            </pre>
          </ScrollArea>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={handleCopy}
            disabled={!csrPem}
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            <span className="sr-only">Copy CSR</span>
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
