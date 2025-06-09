"use client";

import type { FormEvent } from 'react';
import React, { useRef, useState, useTransition } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const initialState = { message: '', errorFields: {} };
  const [state, formAction] = useFormState(importCertificateAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPendingTransition, startTransition] = useTransition();


  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(async () => {
      const result = await importCertificateAction(state, formData);
      if (result.certificate) {
        onCertificateImported(result.certificate);
        formRef.current?.reset();
      }
      // @ts-ignore TODO: Fix useFormState typing if possible with custom action signature
      formAction(formData); 
    });
  };
  
  React.useEffect(() => {
    if (state.message && state.certificate) {
        // Handled by onCertificateImported callback triggered via explicit call
        // Potentially show a success toast here if not resetting form.
        if (formRef.current) formRef.current.reset();
    }
  }, [state.certificate, state.message, onCertificateImported]);


  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Import Certificate</CardTitle>
        <CardDescription>Upload an X.509 certificate file (PEM, CRT, or CER format).</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-6">
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
      </CardContent>
    </Card>
  );
}
