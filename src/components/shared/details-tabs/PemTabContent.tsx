
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import type { ToastProps } from '@/components/ui/toast'; 

interface PemTabContentProps {
  singlePemData: string | undefined;
  itemName: string;
  toast: ({ title, description, variant }: Omit<ToastProps, 'id'> & { title?: React.ReactNode; description?: React.ReactNode }) => void;
}

export const PemTabContent: React.FC<PemTabContentProps> = ({
  singlePemData,
  itemName,
  toast,
}) => {
  const [publicKeyCopied, setPublicKeyCopied] = useState(false);

  const handleCopyPublicKey = async () => {
    if (!singlePemData || !singlePemData.trim()) {
      toast({ title: "Copy Failed", description: `No public key PEM data found to copy for ${itemName}.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(singlePemData.replace(/\\n/g, '\n')); // Ensure newlines are actual newlines
      setPublicKeyCopied(true);
      toast({ title: "Copied!", description: `Public Key PEM for ${itemName} copied to clipboard.` });
      setTimeout(() => setPublicKeyCopied(false), 2000);
    } catch (err) {
      console.error(`Failed to copy Public Key PEM for ${itemName}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy Public Key PEM for ${itemName}.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-md font-semibold">Public Key PEM</h4>
          <Button onClick={handleCopyPublicKey} variant="outline" size="sm" disabled={!singlePemData}>
            {publicKeyCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
            {publicKeyCopied ? 'Copied!' : 'Copy Public Key'}
          </Button>
        </div>
        {singlePemData ? (
          <ScrollArea className="h-80 w-full rounded-md border p-3 bg-muted/30">
            <pre className="text-xs whitespace-pre-wrap break-all font-mono">{singlePemData.replace(/\\n/g, '\n')}</pre>
          </ScrollArea>
        ) : (
          <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
            No public key PEM data available for this item.
          </p>
        )}
      </div>
    </div>
  );
};

