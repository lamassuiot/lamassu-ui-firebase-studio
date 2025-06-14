
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check, Layers } from "lucide-react";
import type { ToastProps } from '@/components/ui/toast'; // Ensure correct path

interface PemTabContentProps {
  singlePemData: string | undefined;
  fullChainPemData: string | undefined;
  itemName: string;
  itemPathToRootCount?: number;
  toast: ({ title, description, variant }: Omit<ToastProps, 'id'> & { title?: React.ReactNode; description?: React.ReactNode }) => void;
}

export const PemTabContent: React.FC<PemTabContentProps> = ({
  singlePemData,
  fullChainPemData,
  itemName,
  itemPathToRootCount,
  toast,
}) => {
  const [singlePemCopied, setSinglePemCopied] = useState(false);
  const [fullChainCopied, setFullChainCopied] = useState(false);

  const handleCopyText = async (textToCopy: string | undefined, type: 'Certificate' | 'Full Chain') => {
    if (!textToCopy || !textToCopy.trim()) {
      toast({ title: "Copy Failed", description: `No ${type.toLowerCase()} data found to copy for ${itemName}.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(textToCopy.replace(/\\n/g, '\\n'));
      if (type === 'Certificate') setSinglePemCopied(true);
      if (type === 'Full Chain') setFullChainCopied(true);
      toast({ title: "Copied!", description: `${type} for ${itemName} copied to clipboard.` });
      setTimeout(() => {
        if (type === 'Certificate') setSinglePemCopied(false);
        if (type === 'Full Chain') setFullChainCopied(false);
      }, 2000);
    } catch (err) {
      console.error(`Failed to copy ${type.toLowerCase()} for ${itemName}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy ${type.toLowerCase()} data for ${itemName}.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-semibold">Certificate PEM</h4>
          <Button onClick={() => handleCopyText(singlePemData, 'Certificate')} variant="outline" size="sm" disabled={!singlePemData}>
            {singlePemCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {singlePemCopied ? 'Copied!' : 'Copy PEM'}
          </Button>
        </div>
        {singlePemData ? (
          <ScrollArea className="h-80 w-full rounded-md border p-3 bg-muted/30">
            <pre className="text-xs whitespace-pre-wrap break-all font-mono">{singlePemData.replace(/\\n/g, '\\n')}</pre>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
            No individual certificate PEM data available.
          </p>
        )}
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-semibold">Full Chain PEM</h4>
          <Button onClick={() => handleCopyText(fullChainPemData, 'Full Chain')} variant="outline" size="sm" disabled={!fullChainPemData || !fullChainPemData.trim()}>
            {fullChainCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Layers className="mr-2 h-4 w-4" />}
            {fullChainCopied ? 'Copied!' : 'Copy Chain'}
          </Button>
        </div>
        {fullChainPemData && fullChainPemData.trim() ? (
          <>
            <ScrollArea className="h-96 w-full rounded-md border p-3 bg-muted/30">
              <pre className="text-xs whitespace-pre-wrap break-all font-mono">{fullChainPemData.replace(/\\n/g, '\\n')}</pre>
            </ScrollArea>
            {itemPathToRootCount !== undefined && (
                <p className="text-xs text-muted-foreground mt-2">
                    The full chain includes {itemPathToRootCount} certificate(s): This item and its issuer(s) up to the root.
                    The order is: Current Item, Intermediate CA(s) (if any), Root CA.
                </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
            Full chain PEM could not be constructed or is not available.
          </p>
        )}
      </div>
    </div>
  );
};
