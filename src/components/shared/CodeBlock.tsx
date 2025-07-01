
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Copy, Check, Download } from 'lucide-react';
import { Label } from '../ui/label';

interface CodeBlockProps {
  content: string;
  title?: string;
  showDownload?: boolean;
  downloadFilename?: string;
  downloadMimeType?: string;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  content,
  title,
  showDownload = false,
  downloadFilename = 'download.txt',
  downloadMimeType = 'text/plain',
  className,
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };
  
  const handleDownload = () => {
    if (!content) return;
    try {
        const blob = new Blob([content], { type: downloadMimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        toast({ title: 'Download failed', variant: 'destructive' });
    }
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {title && <Label className="text-sm font-semibold text-muted-foreground">{title}</Label>}
      <div className="relative group">
        <ScrollArea className="h-64 w-full rounded-md border bg-background">
          <pre className="text-xs whitespace-pre-wrap break-all font-mono p-4">
            <code>{content}</code>
          </pre>
        </ScrollArea>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {showDownload && (
                 <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleDownload}
                    title="Download content"
                >
                    <Download className="h-4 w-4" />
                </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy to clipboard"
            >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
      </div>
    </div>
  );
};
