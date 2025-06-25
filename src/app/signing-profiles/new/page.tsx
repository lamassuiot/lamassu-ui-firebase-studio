
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Settings2, KeyRound, ListChecks, Info } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const rsaKeyStrengths = ["2048", "3072", "4096"] as const;
const ecdsaCurves = ["P-256", "P-384", "P-521"] as const;
const signatureAlgorithms = [
  "SHA256withRSA", "SHA384withRSA", "SHA512withRSA",
  "SHA256withECDSA", "SHA384withECDSA", "SHA512withECDSA"
] as const;

const keyUsageOptions = [
  "DigitalSignature", "NonRepudiation", "KeyEncipherment", "DataEncipherment",
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
  duration: z.string().min(1, "Duration is required (e.g., '1y', '90d')."),
  
  honorSubject: z.boolean().default(true),
  overrideCountry: z.string().optional(),
  overrideState: z.string().optional(),
  overrideOrganization: z.string().optional(),
  overrideOrgUnit: z.string().optional(),

  allowRsa: z.boolean().default(false),
  allowEcdsa: z.boolean().default(false),
  allowedRsaKeyStrengths: z.array(z.enum(rsaKeyStrengths)).optional().default([]),
  allowedEcdsaCurves: z.array(z.enum(ecdsaCurves)).optional().default([]),
  defaultSignatureAlgorithm: z.enum(signatureAlgorithms).optional(),
  
  honorKeyUsage: z.boolean().default(false),
  keyUsages: z.array(z.enum(keyUsageOptions)).optional().default([]),
  
  honorExtendedKeyUsage: z.boolean().default(false),
  extendedKeyUsages: z.array(z.enum(extendedKeyUsageOptions)).optional().default([]),
}).refine(data => data.allowRsa || data.allowEcdsa, {
  message: "At least one key type (RSA or ECDSA) must be allowed.",
  path: ["allowRsa"], 
}).refine(data => data.allowRsa ? data.allowedRsaKeyStrengths && data.allowedRsaKeyStrengths.length > 0 : true, {
    message: "At least one RSA Key Strength must be selected if RSA is allowed.",
    path: ["allowedRsaKeyStrengths"],
}).refine(data => data.allowEcdsa ? data.allowedEcdsaCurves && data.allowedEcdsaCurves.length > 0 : true, {
    message: "At least one ECDSA Curve must be selected if ECDSA is allowed.",
    path: ["allowedEcdsaCurves"],
});


type SigningProfileFormValues = z.infer<typeof signingProfileSchema>;

// Helper to format camelCase to Title Case
const toTitleCase = (str: string) => {
  return str
    .replace(/([A-Z])/g, ' $1') // insert a space before all caps
    .replace(/^./, (s) => s.toUpperCase()); // uppercase the first character
};


export default function CreateSigningProfilePage() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<SigningProfileFormValues>({
    resolver: zodResolver(signingProfileSchema),
    defaultValues: {
      profileName: '',
      description: '',
      duration: '1y',
      honorSubject: true,
      allowRsa: true,
      allowEcdsa: false,
      allowedRsaKeyStrengths: ["2048"],
      allowedEcdsaCurves: [],
      honorKeyUsage: false,
      keyUsages: ['DigitalSignature', 'KeyEncipherment'],
      honorExtendedKeyUsage: false,
      extendedKeyUsages: ['ClientAuth'],
    },
  });

  const watchAllowRsa = form.watch("allowRsa");
  const watchAllowEcdsa = form.watch("allowEcdsa");
  const watchHonorSubject = form.watch("honorSubject");
  const watchHonorKeyUsage = form.watch("honorKeyUsage");
  const watchHonorExtendedKeyUsage = form.watch("honorExtendedKeyUsage");

  function onSubmit(data: SigningProfileFormValues) {
    console.log('New Signing Profile Data:', data);
    toast({
      title: "Profile Creation Mock",
      description: `Signing Profile "${data.profileName}" submitted. Check console for details.`,
    });
    router.push('/signing-profiles'); 
  }

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/signing-profiles')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Signing Profiles
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <PlusCircle className="h-7 w-7 text-primary" />
            <CardTitle className="text-xl font-headline">Create New Signing Profile</CardTitle>
          </div>
          <CardDescription>
            Define the parameters for a new certificate signing profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1y, 365d, 2w" {...field} />
                    </FormControl>
                    <FormDescription>Default validity period for certificates signed with this profile (e.g., '1y' for 1 year, '90d' for 90 days).</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                  control={form.control}
                  name="honorSubject"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Honor Subject From CSR</FormLabel>
                        <FormDescription>
                          Use the Subject DN fields from the CSR. If off, you can specify override values.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!watchHonorSubject && (
                  <div className="space-y-4 p-4 border rounded-md ml-4 -mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="overrideCountry" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Country (C)</FormLabel>
                                <FormControl><Input placeholder="e.g., US (2-letter code)" maxLength={2} {...field} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="overrideState" render={({ field }) => (
                            <FormItem>
                                <FormLabel>State / Province (ST)</FormLabel>
                                <FormControl><Input placeholder="e.g., California" {...field} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="overrideOrganization" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Organization (O)</FormLabel>
                                <FormControl><Input placeholder="e.g., LamassuIoT Corp" {...field} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="overrideOrgUnit" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Organizational Unit (OU)</FormLabel>
                                <FormControl><Input placeholder="e.g., Secure Devices" {...field} /></FormControl>
                            </FormItem>
                        )}/>
                    </div>
                     <div className="flex items-start space-x-2 text-muted-foreground bg-muted/50 p-2 rounded-md">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="text-xs">
                          The Common Name (CN) from the CSR's subject is always honored and used. These fields will be appended to or replace other subject attributes.
                        </p>
                    </div>
                  </div>
                )}

              <Separator />
              <h3 className="text-lg font-semibold flex items-center"><KeyRound className="mr-2 h-5 w-5 text-muted-foreground"/>Cryptographic Settings</h3>
              
              <div>
                <FormLabel>Allowed Key Types</FormLabel>
                 <FormDescription className="mb-2">Select at least one cryptographic key type.</FormDescription>
                <div className="space-y-2 mt-1">
                  <FormField
                    control={form.control}
                    name="allowRsa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow RSA Keys</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="allowEcdsa"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Allow ECDSA Keys</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                 {form.formState.errors.allowRsa && (
                    <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.allowRsa.message}</p>
                )}
              </div>
              
              {watchAllowRsa && (
                <FormField
                  control={form.control}
                  name="allowedRsaKeyStrengths"
                  render={() => (
                    <FormItem className="p-3 border rounded-md">
                      <FormLabel>Allowed RSA Key Strengths</FormLabel>
                      <FormDescription>Select which RSA key strengths are permitted by this profile.</FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                        {rsaKeyStrengths.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="allowedRsaKeyStrengths"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, item])
                                        : field.onChange(currentValue.filter((value) => value !== item));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">{item}-bit</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchAllowEcdsa && (
                <FormField
                  control={form.control}
                  name="allowedEcdsaCurves"
                  render={() => (
                    <FormItem className="p-3 border rounded-md">
                      <FormLabel>Allowed ECDSA Curves</FormLabel>
                      <FormDescription>Select which ECDSA curves are permitted by this profile.</FormDescription>
                      <div className="grid grid-cols-1 gap-x-4 gap-y-2 pt-2">
                        {ecdsaCurves.map((item) => (
                          <FormField
                            key={item}
                            control={form.control}
                            name="allowedEcdsaCurves"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      return checked
                                        ? field.onChange([...currentValue, item])
                                        : field.onChange(currentValue.filter((value) => value !== item));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">{item}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                  control={form.control}
                  name="defaultSignatureAlgorithm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Signature Algorithm</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a default signature algorithm (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {signatureAlgorithms.map(algo => (
                            <SelectItem key={algo} value={algo}>{algo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Overrides CA's default if specified. Ensure compatibility with selected key types.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <Separator />
              <h3 className="text-lg font-semibold flex items-center"><ListChecks className="mr-2 h-5 w-5 text-muted-foreground"/>Certificate Usage Policies</h3>
              
               <FormField
                  control={form.control}
                  name="honorKeyUsage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Honor Key Usage From CSR</FormLabel>
                        <FormDescription>
                          Use the Key Usage extension from the CSR. If off, specify usages below.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

              {!watchHonorKeyUsage && (
                <div className="ml-4 -mt-4">
                  <FormField
                    control={form.control}
                    name="keyUsages"
                    render={() => ( 
                      <FormItem>
                        <FormLabel>Key Usage</FormLabel>
                        <FormDescription>Select the allowed key usages for certificates signed with this profile.</FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                          {keyUsageOptions.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="keyUsages"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, item])
                                            : field.onChange(
                                                currentValue.filter(
                                                  (value) => value !== item
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {toTitleCase(item)}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                  control={form.control}
                  name="honorExtendedKeyUsage"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Honor Extended Key Usage From CSR</FormLabel>
                        <FormDescription>
                           Use the Extended Key Usage (EKU) extension from the CSR. If off, specify EKUs below.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              
              {!watchHonorExtendedKeyUsage && (
                 <div className="ml-4 -mt-4">
                  <FormField
                    control={form.control}
                    name="extendedKeyUsages"
                    render={() => ( 
                      <FormItem>
                        <FormLabel>Extended Key Usage</FormLabel>
                        <FormDescription>Select the allowed extended key usages (EKUs).</FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                          {extendedKeyUsageOptions.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="extendedKeyUsages"
                              render={({ field }) => {
                                return (
                                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          const currentValue = field.value || [];
                                          return checked
                                            ? field.onChange([...currentValue, item])
                                            : field.onChange(
                                                currentValue.filter(
                                                  (value) => value !== item
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {toTitleCase(item)}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                 </div>
              )}


              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/signing-profiles')}>
                  Cancel
                </Button>
                <Button type="submit">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
