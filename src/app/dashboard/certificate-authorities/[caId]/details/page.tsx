
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function CertificateAuthorityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const caId = params.caId as string;
  const [serialNumber, setSerialNumber] = useState<string | null>(null);

  useEffect(() => {
    // Generate serial number on client side to avoid hydration mismatch
    // In a real app, you would fetch this or have it as part of CA data
    const generateRandomHex = (length: number) => {
      const bytes = new Uint8Array(length);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    };
    setSerialNumber(generateRandomHex(10));
  }, []);


  // In a real app, you would fetch CA details based on caId
  // For now, we'll just display the ID and a placeholder.

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">CA Details: {caId}</CardTitle>
          </div>
          <CardDescription>
            Detailed information for Certificate Authority ID: {caId}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This is the detail panel for Certificate Authority <span className="font-semibold text-foreground">{caId}</span>.
            </p>
            <p><strong>Name:</strong> Placeholder CA Name for {caId}</p>
            <p><strong>Issuer:</strong> Placeholder Issuer</p>
            <p><strong>Status:</strong> Active (Placeholder)</p>
            <p><strong>Expires:</strong> 2030-12-31 (Placeholder)</p>
            <p><strong>Serial Number:</strong> {serialNumber ? serialNumber : 'Loading...'} (Placeholder)</p>
            
            <div className="mt-6 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
              <h3 className="text-lg font-semibold text-muted-foreground">Further Details</h3>
              <p className="text-sm text-muted-foreground">
                More specific attributes and configurations for this CA would be displayed here,
                such as CRL Distribution Points, OCSP URIs, policies, etc.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
