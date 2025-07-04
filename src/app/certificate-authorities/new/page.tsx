
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, Repeat, UploadCloud, FileText, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CreationMode {
  id: string;
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const creationModes: CreationMode[] = [
  {
    id: 'generate',
    href: '/certificate-authorities/new/generate',
    title: 'Create New CA (new Key Pair)',
    description: 'Provision a new Root or Intermediate CA directly. The CA will be active immediately upon creation.',
    icon: <KeyRound className="h-8 w-8 text-primary" />,
  },
  {
    id: 'reuse-key',
    href: '/certificate-authorities/new/reuse-key',
    title: 'Create CA (Reuse Key)',
    description: 'Provision a new Root or Intermediate CA using an existing key from your KMS.',
    icon: <Repeat className="h-8 w-8 text-primary" />,
    disabled: true,
  },
  {
    id: 'import-full',
    href: '/certificate-authorities/new/import-full',
    title: 'Import External CA (with Private Key)',
    description: 'Import an existing CA certificate along with its private key. This CA will be fully managed by LamassuIoT.',
    icon: <UploadCloud className="h-8 w-8 text-primary" />,
  },
  {
    id: 'import-public',
    href: '/certificate-authorities/new/import-public',
    title: 'Import Certificate Only (no Private Key)',
    description: "Import an existing CA certificate (public key only) for trust anchor or reference purposes. LamassuIoT will not be able to sign certificates with this CA.",
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
];

const ComingSoonBadge = () => (
    <Badge variant="outline" className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 border-yellow-300">
      Coming Soon
    </Badge>
);


export default function CreateCaHubPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-8 mb-8">
      <Button variant="outline" onClick={() => router.push('/certificate-authorities')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-semibold">Choose CA Creation Method</h1>
        <p className="text-muted-foreground mt-2">Select how you want to create or import your Certificate Authority.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {creationModes.map(mode => (
          <Card
            key={mode.id}
            role="button"
            tabIndex={mode.disabled ? -1 : 0}
            aria-disabled={mode.disabled}
            className={cn(
              "hover:shadow-lg transition-shadow flex flex-col group h-full relative",
              mode.disabled
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            )}
            onClick={() => {
              if (!mode.disabled) router.push(mode.href);
            }}
            onKeyDown={(e) => {
              if (!mode.disabled && (e.key === 'Enter' || e.key === ' ')) {
                router.push(mode.href);
              }
            }}
          >
            {mode.disabled && <ComingSoonBadge />}
            <CardHeader className="flex-grow">
              <div className="flex items-start space-x-4">
                <div className="mt-1">{mode.icon}</div>
                <div>
                  <CardTitle className={cn("text-xl", !mode.disabled && "group-hover:text-primary transition-colors")}>{mode.title}</CardTitle>
                  <CardDescription className="mt-1 text-sm">{mode.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Button variant="default" className="w-full" disabled={mode.disabled} tabIndex={-1}>
                  Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
