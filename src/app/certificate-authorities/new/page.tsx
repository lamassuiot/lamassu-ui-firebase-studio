
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, Repeat, UploadCloud, FileText, ChevronRight, FileSignature, ShieldCheck } from "lucide-react";
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
    isComingSoon: false,
  },
  {
    id: 'import-full',
    href: '/certificate-authorities/new/import-full',
    title: 'Import External CA (with Private Key)',
    description: 'Import an existing CA certificate along with its private key. This CA will be fully managed by LamassuIoT.',
    icon: <UploadCloud className="h-8 w-8 text-primary" />,
    isComingSoon: false,
  },
  {
    id: 'import-public',
    href: '/certificate-authorities/new/import-public',
    title: 'Import Certificate Only (no Private Key)',
    description: "Import an existing CA certificate (public key only) for trust anchor or reference purposes. LamassuIoT will not be able to sign certificates with this CA.",
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
  {
    id: 'reuse-key',
    href: '/certificate-authorities/new/reuse-key',
    title: 'Create CA (Reuse Key)',
    description: 'Provision a new Root or Intermediate CA using an existing key pair from your KMS.',
    icon: <Repeat className="h-8 w-8 text-primary" />,
    disabled: true,
  },
];

const ComingSoonBadge = () => (
    <Badge variant="outline" className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 border-yellow-300">
      Coming Soon
    </Badge>
);

const CardWrapper: React.FC<{ mode: CreationMode, children: React.ReactNode }> = ({ mode, children }) => {
    if (mode.disabled) {
        return <div className="relative opacity-50 cursor-not-allowed">{children}<ComingSoonBadge /></div>;
    }
    // The link is wrapped so that it's not applied on disabled cards
    return <Link href={mode.href} className="no-underline relative">{children}</Link>;
};


export default function CreateCaHubPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-8 mb-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-semibold">Choose CA Creation Method</h1>
        <p className="text-muted-foreground mt-2">Select how you want to create or import your Certificate Authority.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {creationModes.map(mode => (
          <CardWrapper key={mode.id} mode={mode}>
            <Card
              className={cn("hover:shadow-lg transition-shadow flex flex-col group h-full", mode.disabled ? "" : "cursor-pointer")}
            >
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
                  <Button variant="default" className="w-full" disabled={mode.disabled}>
                      Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
            </Card>
          </CardWrapper>
        ))}
      </div>
    </div>
  );
}
