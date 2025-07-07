'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';

interface MetadataViewerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description?: string;
  data: object | null;
}

export const MetadataViewerModal: React.FC<MetadataViewerModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  data,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const jsonString = data ? JSON.stringify(data, null, 2) : "{}";
  const hasData = data && Object.keys(data).length > 0;

  const handleCopy = async () => {
    if (!hasData) return;
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast({ title: "Copied!", description: "Metadata JSON copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-grow my-4 overflow-hidden relative">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7 z-10"
                onClick={handleCopy}
                disabled={!hasData}
                title="Copy JSON"
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <ScrollArea className="h-full w-full rounded-md border bg-muted/30">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono p-4">
                    {hasData ? jsonString : "No metadata available for this item."}
                </pre>
            </ScrollArea>
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
