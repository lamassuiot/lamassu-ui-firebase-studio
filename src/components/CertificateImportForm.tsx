
"use client";

import type { FormEvent } from 'react';
import React, { useRef, useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { importCertificateAction } from '@/lib/actions/certificateActions';
import type { CertificateData } from '@/types/certificate';

interface CertificateImportFormProps {
  onCertificateImported: (certificate: CertificateData) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
      Import Certificate
    </Button>
  );
}

export function CertificateImportForm({ onCertificateImported }: CertificateImportFormProps) {
  const initialState: { message: string; certificate?: CertificateData, errorFields?: Record<string, string[]> } = { message: '', errorFields: {} };
  const [state, dispatchFormAction] = useActionState(importCertificateAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPendingTransition, startTransition] = useTransition();
  
  React.useEffect(() => {
    if (state.message && state.certificate) {
        onCertificateImported(state.certificate);
        if (formRef.current) {
          formRef.current.reset();
        }
    }
  }, [state.certificate, state.message, onCertificateImported]);


  return (
    <div className="w-full max-w-lg"> {/* Was Card */}
      <div className="mb-4"> {/* Was CardHeader, using mb-4 for spacing */}
        <h2 className="font-headline text-2xl font-semibold">Import Certificate</h2> {/* Was CardTitle */}
        <p className="text-sm text-muted-foreground mt-1.5">Upload an X.509 certificate file (PEM, CRT, or CER format).</p> {/* Was CardDescription */}
      </div>
      <div> {/* Was CardContent */}
        <form 
          ref={formRef} 
          action={payload => {
            startTransition(() => {
              dispatchFormAction(payload);
            });
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="certificateFile">Certificate File</Label>
            <Input
              id="certificateFile"
              name="certificateFile"
              type="file"
              ref={fileInputRef}
              accept=".pem,.crt,.cer"
              required
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
            {state.errorFields?.certificateFile && (
              <p className="text-sm text-destructive">{state.errorFields.certificateFile.join(', ')}</p>
            )}
          </div>
          
          <SubmitButton />

          {state.message && !state.certificate && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Error</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
           {state.message && state.certificate && (
             <Alert variant="default" className="mt-4 bg-accent/20 border-accent text-accent-foreground">
               <CheckCircle className="h-4 w-4 text-green-600" />
               <AlertTitle>Success</AlertTitle>
               <AlertDescription>{state.message}</AlertDescription>
             </Alert>
           )}
        </form>
      </div>
    </div>
  );
}
