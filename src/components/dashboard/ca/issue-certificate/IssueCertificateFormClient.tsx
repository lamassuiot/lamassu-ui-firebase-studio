
'use client'; 

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Changed from useParams
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FilePlus2 } from "lucide-react";

// Client Component for the form
export default function IssueCertificateFormClient() {
  const searchParams = useSearchParams(); // Changed from useParams
  const router = useRouter();
  const caId = searchParams.get('caId'); // Get caId from query params

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!caId) {
        alert("Error: CA ID is missing from the URL.");
        return;
    }
    console.log(`Issuing certificate from CA: ${caId} with form data...`);
    alert(`Mock issue certificate from CA ${caId}`);
    // Potentially redirect or show a success message
    // router.push(`/certificate-authorities/details?caId=${caId}`);
  };

  if (!caId) {
    return (
        <div className="w-full space-y-6 p-4">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="text-destructive">Error: CA ID is missing from URL. Cannot issue certificate.</div>
        </div>
    );
  }

  return (
    <div className="w-full space-y-6">
       <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to CA Details
      </Button>
      <div className="w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <FilePlus2 className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Issue Certificate from CA: {caId}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Fill out the details below to issue a new certificate signed by CA ID: {caId}.
          </p>
        </div>
        <div className="p-6 pt-0">
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
        </div>
      </div>
    </div>
  );
}
