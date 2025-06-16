
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Link as LinkIcon } from "lucide-react";
import type { ToastProps } from '@/components/ui/toast';

interface PemTabContentProps {
  singlePemData: string | undefined;
  fullChainPemData?: string | undefined;
  itemName: string;
  itemPathToRootCount?: number; // Number of certs in the chain (including the end-entity)
  toast: ({ title, description, variant }: Omit<ToastProps, 'id'> & { title?: React.ReactNode; description?: React.ReactNode }) => void;
}

export const PemTabContent: React.FC<PemTabContentProps> = ({
  singlePemData,
  fullChainPemData,
  itemName,
  itemPathToRootCount,
  toast,
}) => {
  const [certificateCopied, setCertificateCopied] = useState(false);
  const [chainCopied, setChainCopied] = useState(false);

  const handleCopyCertificate = async () => {
    if (!singlePemData || !singlePemData.trim()) {
      toast({ title: "Copy Failed", description: `No certificate PEM data found to copy for ${itemName}.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(singlePemData.replace(/\\n/g, '\n'));
      setCertificateCopied(true);
      toast({ title: "Copied!", description: `Certificate PEM for ${itemName} copied to clipboard.` });
      setTimeout(() => setCertificateCopied(false), 2000);
    } catch (err) {
      console.error(`Failed to copy certificate PEM for ${itemName}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy certificate PEM for ${itemName}.`, variant: "destructive" });
    }
  };

  const handleCopyChain = async () => {
    if (!fullChainPemData || !fullChainPemData.trim()) {
      toast({ title: "Copy Failed", description: `No certificate chain PEM data found to copy for ${itemName}.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(fullChainPemData.replace(/\\n/g, '\n'));
      setChainCopied(true);
      toast({ title: "Copied!", description: `Certificate chain PEM for ${itemName} copied to clipboard.` });
      setTimeout(() => setChainCopied(false), 2000);
    } catch (err) {
      console.error(`Failed to copy certificate chain PEM for ${itemName}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy certificate chain PEM for ${itemName}.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-semibold">Certificate PEM</h4>
          <Button onClick={handleCopyCertificate} variant="outline" size="sm" disabled={!singlePemData}>
            {certificateCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {certificateCopied ? 'Copied!' : 'Copy Certificate'}
          </Button>
        </div>
        {singlePemData ? (
          <ScrollArea className="h-80 w-full rounded-md border p-3 bg-muted/30">
            <pre className="text-xs whitespace-pre-wrap break-all font-mono">{singlePemData.replace(/\\n/g, '\n')}</pre>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
            No certificate PEM data available for this item.
          </p>
        )}
      </div>

      {fullChainPemData && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-md font-semibold flex items-center">
              <LinkIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Full Chain PEM {itemPathToRootCount ? `(${itemPathToRootCount} certificate${itemPathToRootCount > 1 ? 's' : ''})` : ''}
            </h4>
            <Button onClick={handleCopyChain} variant="outline" size="sm">
              {chainCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
              {chainCopied ? 'Copied!' : 'Copy Full Chain'}
            </Button>
          </div>
          <ScrollArea className="h-96 w-full rounded-md border p-3 bg-muted/30">
            <pre className="text-xs whitespace-pre-wrap break-all font-mono">{fullChainPemData.replace(/\\n/g, '\n')}</pre>
          </ScrollArea>
           <p className="text-xs text-muted-foreground mt-1">
            The full chain typically includes the end-entity certificate followed by its issuer(s), up to the root CA.
          </p>
        </div>
      )}
    </div>
  );
};
