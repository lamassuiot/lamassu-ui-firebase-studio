
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, Repeat, UploadCloud, FileText, ChevronRight, FileSignature } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const creationModes = [
  {
    id: 'generate',
    href: '/certificate-authorities/new/generate',
    title: 'Create New CA (Direct)',
    description: 'Provision a new Root or Intermediate CA directly. The CA will be active immediately upon creation.',
    icon: <KeyRound className="h-8 w-8 text-primary" />,
    isComingSoon: false,
  },
  {
    id: 'generate-csr',
    href: '/certificate-authorities/new/generate-csr',
    title: 'Request New CA (Server-side Key)',
    description: 'Generate a key pair and CSR on the backend. This request must be approved and signed by an administrator.',
    icon: <FileSignature className="h-8 w-8 text-primary" />,
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
    isComingSoon: false,
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
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-semibold">Choose CA Creation Method</h1>
        <p className="text-muted-foreground mt-2">Select how you want to create or import your Certificate Authority.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {creationModes.map(mode => {
            const cardContent = (
              <Card
                className={cn(
                  "flex flex-col group h-full",
                  mode.isComingSoon
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:shadow-lg transition-shadow cursor-pointer"
                )}
              >
                <CardHeader className="flex-grow">
                  <div className="flex items-start space-x-4">
                    <div className="mt-1">{mode.icon}</div>
                    <div>
                      <div className="flex justify-between items-center gap-2">
                          <CardTitle className={cn("text-xl", !mode.isComingSoon && "group-hover:text-primary transition-colors")}>
                            {mode.title}
                          </CardTitle>
                          {mode.isComingSoon && (
                              <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300 whitespace-nowrap">
                                  Coming Soon
                              </Badge>
                          )}
                      </div>
                      <CardDescription className="mt-1 text-sm">{mode.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter>
                    <Button variant="default" className="w-full" disabled={mode.isComingSoon}>
                        Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
              </Card>
            );

            if (mode.isComingSoon) {
              return <div key={mode.id}>{cardContent}</div>;
            }

            return (
              <Link href={mode.href} key={mode.id} className="no-underline">
                {cardContent}
              </Link>
            );
        })}
      </div>
    </div>
  );
}
