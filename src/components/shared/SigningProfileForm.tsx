

'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Settings2, KeyRound, ListChecks, Info, Shield } from "lucide-react"; 
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { ExpirationInput, type ExpirationConfig } from '@/components/shared/ExpirationInput';
import type { ApiSigningProfile } from '@/lib/ca-data';

const rsaKeyStrengths = ["2048", "3072", "4096"] as const;
const ecdsaCurves = ["P-256", "P-384", "P-521"] as const;

const keyUsageOptions = [
  "DigitalSignature", "contentCommitment", "KeyEncipherment", "DataEncipherment",
  "KeyAgreement", "CertSign", "CRLSign", "EncipherOnly", "DecipherOnly"
] as const;
type KeyUsageOption = typeof keyUsageOptions[number];

const extendedKeyUsageOptions = [
  "ServerAuth", "ClientAuth", "CodeSigning", "EmailProtection",
  "TimeStamping", "OCSPSigning", "AnyExtendedKeyUsage"
] as const;
type ExtendedKeyUsageOption = typeof extendedKeyUsageOptions[number];

const signingProfileSchema = z.object({
  profileName: z.string().min(3, "Profile name must be at least 3 characters long."),
  description: z.string().optional(),
  
  validity: z.object({
    type: z.enum(["Duration", "Date", "Indefinite"]),
    durationValue: z.string().optional(),
    dateValue: z.date().optional(),
  }).refine(data => {
      if (data.type === 'Duration') return !!data.durationValue;
      if (data.type === 'Date') return !!data.dateValue;
      return true; // Indefinite is always valid
  }, {
      message: "A value is required for the selected validity type.",
      path: ["durationValue"], // Or an appropriate path
  }),

  signAsCa: z.boolean().default(false),
  
  honorSubject: z.boolean().default(true),
  overrideCountry: z.string().optional(),
  overrideState: z.string().optional(),
  overrideOrganization: z.string().optional(),
  overrideOrgUnit: z.string().optional(),

  cryptoEnforcement: z.object({
    enabled: z.boolean().default(false),
    allowRsa: z.boolean().default(false),
    allowEcdsa: z.boolean().default(false),
    allowedRsaKeySizes: z.array(z.number()).optional().default([]),
    allowedEcdsaCurves: z.array(z.number()).optional().default([]),
  }),
  
  honorKeyUsage: z.boolean().default(false),
  keyUsages: z.array(z.enum(keyUsageOptions)).optional().default([]),
  
  honorExtendedKeyUsage: z.boolean().default(false),
  extendedKeyUsages: z.array(z.enum(extendedKeyUsageOptions)).optional().default([]),
});

export type SigningProfileFormValues = z.infer<typeof signingProfileSchema>;

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
};

const mapEcdsaCurveToBitSize = (curve: string): number => {
    switch (curve) {
        case 'P-256': return 256;
        case 'P-384': return 384;
        case 'P-521': return 521;
        default: return 0;
    }
};

// Helper to map API data to form values
const mapApiProfileToFormValues = (profile: ApiSigningProfile): SigningProfileFormValues => {
    const crypto = profile.crypto_enforcement || {};
    
    let validityConfig: ExpirationConfig = { type: 'Duration', durationValue: '1y' };
    if (profile.validity) {
        const type = profile.validity.type;
        if (type === 'Duration' && profile.validity.duration) {
            validityConfig = { type: 'Duration', durationValue: profile.validity.duration };
        } else if (type === 'Date' && profile.validity.time) {
            if (profile.validity.time.startsWith('9999-12-31')) {
                validityConfig = { type: 'Indefinite' };
            } else {
                validityConfig = { type: 'Date', dateValue: new Date(profile.validity.time) };
            }
        } else if (type === "Indefinite") {
            validityConfig = { type: 'Indefinite' };
        }
    }
    
    return {
        profileName: profile.name || '',
        description: profile.description || '',
        validity: validityConfig,
        signAsCa: profile.sign_as_ca || false,
        honorSubject: profile.honor_subject,
        overrideCountry: profile.subject?.country || '',
        overrideState: profile.subject?.state || '',
        overrideOrganization: profile.subject?.organization || '',
        overrideOrgUnit: profile.subject?.organizational_unit || '',
        cryptoEnforcement: {
            enabled: crypto.enabled || false,
            allowRsa: crypto.allow_rsa_keys || false,
            allowEcdsa: crypto.allow_ecdsa_keys || false,
            allowedRsaKeySizes: crypto.allowed_rsa_key_sizes || [],
            allowedEcdsaCurves: crypto.allowed_ecdsa_key_sizes || [],
        },
        honorKeyUsage: profile.honor_key_usage,
        keyUsages: (profile.key_usage || []) as KeyUsageOption[],
        honorExtendedKeyUsage: profile.honor_extended_key_usage,
        extendedKeyUsages: (profile.extended_key_usage || []) as ExtendedKeyUsageOption[],
    };
};

interface SigningProfileFormProps {
  profileToEdit?: ApiSigningProfile | null;
  initialValues?: SigningProfileFormValues | null;
  onSubmit: (data: SigningProfileFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitButton?: React.ReactNode;
}

export const SigningProfileForm: React.FC<SigningProfileFormProps> = ({
  profileToEdit,
  initialValues,
  onSubmit,
  isSubmitting,
  submitButton,
}) => {
  const form = useForm<SigningProfileFormValues>({
    resolver: zodResolver(signingProfileSchema),
    defaultValues: profileToEdit 
      ? mapApiProfileToFormValues(profileToEdit) 
      : {
        ...initialValues,
        validity: initialValues?.validity || { type: 'Duration', durationValue: '1y' },
        cryptoEnforcement: initialValues?.cryptoEnforcement || { enabled: false, allowRsa: false, allowEcdsa: false, allowedRsaKeySizes: [], allowedEcdsaCurves: [] },
      },
  });

  const watchCryptoEnforcement = form.watch("cryptoEnforcement");
  const watchHonorSubject = form.watch("honorSubject");
  const watchHonorKeyUsage = form.watch("honorKeyUsage");
  const watchHonorExtendedKeyUsage = form.watch("honorExtendedKeyUsage");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="profileName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Standard IoT Device Profile" {...field} />
              </FormControl>
              <FormDescription>A unique and descriptive name for this profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose and typical use case for this profile." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Separator />
        <h3 className="text-lg font-semibold flex items-center"><Settings2 className="mr-2 h-5 w-5 text-muted-foreground"/>Policy Configuration</h3>
         <FormField
          control={form.control}
          name="validity"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                  <ExpirationInput
                      idPrefix="profile-validity"
                      label="Certificate Validity"
                      value={field.value}
                      onValueChange={field.onChange}
                  />
              </FormControl>
              <FormDescription>Default validity for certificates signed with this profile.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="signAsCa"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="flex items-center"><Shield className="mr-2 h-4 w-4 text-muted-foreground"/>Sign as Certificate Authority</FormLabel>
                <FormDescription>Allow certificates signed with this profile to act as intermediate CAs. This enables the `isCA:TRUE` basic constraint.</FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="honorSubject"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5"><FormLabel>Honor Subject From CSR</FormLabel><FormDescription>Use the Subject DN fields from the CSR. If off, you can specify override values.</FormDescription></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )}
        />
        {!watchHonorSubject && (
          <div className="space-y-4 p-4 border rounded-md ml-4 -mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="overrideCountry" render={({ field }) => ( <FormItem><FormLabel>Country (C)</FormLabel><FormControl><Input placeholder="e.g., US (2-letter code)" maxLength={2} {...field} /></FormControl></FormItem> )}/>
                <FormField control={form.control} name="overrideState" render={({ field }) => ( <FormItem><FormLabel>State / Province (ST)</FormLabel><FormControl><Input placeholder="e.g., California" {...field} /></FormControl></FormItem> )}/>
                <FormField control={form.control} name="overrideOrganization" render={({ field }) => ( <FormItem><FormLabel>Organization (O)</FormLabel><FormControl><Input placeholder="e.g., LamassuIoT Corp" {...field} /></FormControl></FormItem> )}/>
                <FormField control={form.control} name="overrideOrgUnit" render={({ field }) => ( <FormItem><FormLabel>Organizational Unit (OU)</FormLabel><FormControl><Input placeholder="e.g., Secure Devices" {...field} /></FormControl></FormItem> )}/>
            </div>
             <div className="flex items-start space-x-2 text-muted-foreground bg-muted/50 p-2 rounded-md"><Info className="h-4 w-4 mt-0.5 flex-shrink-0" /><p className="text-xs">The Common Name (CN) from the CSR's subject is always honored and used. These fields will be appended to or replace other subject attributes.</p></div>
          </div>
        )}
        <Separator />
        <h3 className="text-lg font-semibold flex items-center"><KeyRound className="mr-2 h-5 w-5 text-muted-foreground"/>Cryptographic Settings</h3>
        <FormField
          control={form.control}
          name="cryptoEnforcement.enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5"><FormLabel>Enable Crypto Enforcement</FormLabel><FormDescription>Enforce specific key types (RSA, ECDSA) and their parameters.</FormDescription></div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )}
        />
        {watchCryptoEnforcement.enabled && (
          <div className="space-y-4 p-4 border rounded-md ml-4 -mt-4">
            <FormField control={form.control} name="cryptoEnforcement.allowRsa" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between"><FormLabel>Allow RSA Keys</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )}/>
            {watchCryptoEnforcement.allowRsa && (
              <FormField control={form.control} name="cryptoEnforcement.allowedRsaKeySizes" render={() => (
                <FormItem className="p-3 border rounded-md bg-background ml-4">
                  <FormLabel>Allowed RSA Key Size</FormLabel>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                    {rsaKeyStrengths.map((item) => (
                      <FormField key={item} control={form.control} name="cryptoEnforcement.allowedRsaKeySizes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl><Checkbox checked={field.value?.includes(parseInt(item, 10))} onCheckedChange={(checked) => { const intItem = parseInt(item, 10); const currentValue = field.value || []; return checked ? field.onChange([...currentValue, intItem]) : field.onChange(currentValue.filter((value) => value !== intItem)); }} /></FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">{item}-bit</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}/>
            )}
            <FormField control={form.control} name="cryptoEnforcement.allowEcdsa" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between"><FormLabel>Allow ECDSA Keys</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem> )}/>
            {watchCryptoEnforcement.allowEcdsa && (
              <FormField control={form.control} name="cryptoEnforcement.allowedEcdsaCurves" render={() => (
                <FormItem className="p-3 border rounded-md bg-background ml-4">
                  <FormLabel>Allowed ECDSA Curves</FormLabel>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 pt-2">
                    {ecdsaCurves.map((item) => (
                      <FormField key={item} control={form.control} name="cryptoEnforcement.allowedEcdsaCurves"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl><Checkbox checked={field.value?.includes(mapEcdsaCurveToBitSize(item))} onCheckedChange={(checked) => { const bitSize = mapEcdsaCurveToBitSize(item); const currentValue = field.value || []; return checked ? field.onChange([...currentValue, bitSize]) : field.onChange(currentValue.filter((value) => value !== bitSize)); }} /></FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">{item}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}/>
            )}
          </div>
        )}
        <Separator />
        <h3 className="text-lg font-semibold flex items-center"><ListChecks className="mr-2 h-5 w-5 text-muted-foreground"/>Certificate Usage Policies</h3>
         <FormField control={form.control} name="honorKeyUsage" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Honor Key Usage From CSR</FormLabel><FormDescription>Use the Key Usage extension from the CSR. If off, specify usages below.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )}/>
        {!watchHonorKeyUsage && (
          <div className="ml-4 -mt-4">
            <FormField control={form.control} name="keyUsages"
              render={() => ( 
                <FormItem><FormLabel>Key Usage</FormLabel><FormDescription>Select the allowed key usages for certificates signed with this profile.</FormDescription>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                    {keyUsageOptions.map((item) => (
                      <FormField key={item} control={form.control} name="keyUsages"
                        render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => { const currentValue = field.value || []; return checked ? field.onChange([...currentValue, item]) : field.onChange(currentValue.filter((value) => value !== item)); }}/></FormControl><FormLabel className="text-sm font-normal cursor-pointer">{toTitleCase(item)}</FormLabel></FormItem> )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
        <FormField control={form.control} name="honorExtendedKeyUsage" render={({ field }) => ( <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Honor Extended Key Usage From CSR</FormLabel><FormDescription>Use the Extended Key Usage (EKU) extension from the CSR. If off, specify EKUs below.</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem> )}/>
        {!watchHonorExtendedKeyUsage && (
           <div className="ml-4 -mt-4">
            <FormField control={form.control} name="extendedKeyUsages"
              render={() => ( 
                <FormItem><FormLabel>Extended Key Usage</FormLabel><FormDescription>Select the allowed extended key usages (EKUs).</FormDescription>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                    {extendedKeyUsageOptions.map((item) => (
                      <FormField key={item} control={form.control} name="extendedKeyUsages"
                        render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => { const currentValue = field.value || []; return checked ? field.onChange([...currentValue, item]) : field.onChange(currentValue.filter((value) => value !== item)); }}/></FormControl><FormLabel className="text-sm font-normal cursor-pointer">{toTitleCase(item)}</FormLabel></FormItem> )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
           </div>
        )}
        {submitButton && <div className="pt-4">{submitButton}</div>}
      </form>
    </Form>
  );
};
