
'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Check } from "lucide-react";
import type { ToastProps } from '@/components/ui/toast'; // Ensure correct path

interface MetadataTabContentProps {
  rawJsonData: any;
  itemName: string;
  tabTitle: string; // e.g., "LamassuIoT Specific Metadata" or "Raw API Data"
  toast: ({ title, description, variant }: Omit<ToastProps, 'id'> & { title?: React.ReactNode; description?: React.ReactNode }) => void;
}

export const MetadataTabContent: React.FC<MetadataTabContentProps> = ({
  rawJsonData,
  itemName,
  tabTitle,
  toast,
}) => {
  const [metadataCopied, setMetadataCopied] = useState(false);

  const handleCopyMetadata = async () => {
    const jsonString = JSON.stringify(rawJsonData, null, 2);
    if (!jsonString || jsonString === 'null' || jsonString === '{}') {
      toast({ title: "Copy Failed", description: `No metadata found to copy for ${itemName}.`, variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(jsonString);
      setMetadataCopied(true);
      toast({ title: "Copied!", description: `Metadata for ${itemName} copied to clipboard.` });
      setTimeout(() => setMetadataCopied(false), 2000);
    } catch (err) {
      console.error(`Failed to copy metadata for ${itemName}: `, err);
      toast({ title: "Copy Failed", description: `Could not copy metadata for ${itemName}.`, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{tabTitle}</h3>
        <Button onClick={handleCopyMetadata} variant="outline" size="sm" disabled={!rawJsonData || Object.keys(rawJsonData).length === 0}>
          {metadataCopied ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
          {metadataCopied ? 'Copied!' : 'Copy JSON'}
        </Button>
      </div>
      {rawJsonData && Object.keys(rawJsonData).length > 0 ? (
        <ScrollArea className="h-96 w-full rounded-md border p-4 bg-muted/30">
          <pre className="text-xs whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(rawJsonData, null, 2)}
          </pre>
        </ScrollArea>
      ) : (
         <p className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
            No metadata available for this item.
          </p>
      )}
    </div>
  );
};
