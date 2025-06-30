
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, Repeat, UploadCloud, FileText, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';

const creationModes = [
  {
    id: 'generate',
    href: '/certificate-authorities/new/generate',
    title: 'Create New CA (new Key Pair)',
    description: 'Provision a new Root or Intermediate CA. A new cryptographic key pair will be generated and managed by LamassuIoT.',
    icon: <KeyRound className="h-8 w-8 text-primary" />,
  },
  {
    id: 'reuse-key',
    href: '/certificate-authorities/new/reuse-key',
    title: 'Create CA (reuse Key Pair)',
    description: "Provision a new Root or Intermediate CA using an existing cryptographic key pair stored securely in LamassuIoT's KMS or an external HSM.",
    icon: <Repeat className="h-8 w-8 text-primary" />,
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
          <Link href={mode.href} key={mode.id} className="no-underline">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group h-full"
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">{mode.icon}</div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{mode.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">{mode.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                  <Button variant="default" className="w-full">
                      Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
