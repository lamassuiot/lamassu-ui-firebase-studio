
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or similar
import { ArrowLeft, FilePlus2 } from "lucide-react";

export default function IssueCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const caId = params.caId as string;

  // In a real app, you would have form handling state and submission logic
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log(`Issuing certificate from CA: ${caId} with form data...`);
    // Add logic to submit form data
    alert(`Mock issue certificate from CA ${caId}`);
  };

  return (
    <div className="w-full space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
      </Button>
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <FilePlus2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">Issue Certificate from CA: {caId}</CardTitle>
          </div>
          <CardDescription>
            Fill out the details below to issue a new certificate signed by CA ID: {caId}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="commonName">Common Name (CN)</Label>
              <Input id="commonName" name="commonName" type="text" placeholder="e.g., mydevice.example.com" required />
            </div>
            <div>
              <Label htmlFor="organization">Organization (O)</Label>
              <Input id="organization" name="organization" type="text" placeholder="e.g., LamassuIoT Corp" />
            </div>
            <div>
              <Label htmlFor="validityDays">Validity (Days)</Label>
              <Input id="validityDays" name="validityDays" type="number" defaultValue="365" required />
            </div>
             <div>
              <Label htmlFor="sans">Subject Alternative Names (SANs, comma-separated)</Label>
              <Input id="sans" name="sans" type="text" placeholder="e.g., dns:alt.example.com,ip:192.168.1.10" />
            </div>
            <div>
              <Label htmlFor="csr">Certificate Signing Request (CSR) - Optional</Label>
              <Textarea id="csr" name="csr" placeholder="Paste PEM encoded CSR here if you have one..." rows={5} />
               <p className="text-xs text-muted-foreground mt-1">If no CSR is provided, a new key pair will be generated (mocked).</p>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Issue Certificate
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
