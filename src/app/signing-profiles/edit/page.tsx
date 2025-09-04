
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, Save, Settings2, KeyRound, ListChecks, Info, Loader2, Shield, AlertTriangle } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription as AlertDescUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import {
  fetchSigningProfileById,
  updateSigningProfile,
  type CreateSigningProfilePayload,
  type ApiSigningProfile,
} from '@/lib/ca-data';


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
    allowedRsaKeyStrengths: z.array(z.enum(rsaKeyStrengths)).optional().default([]),
    allowedEcdsaCurves: z.array(z.enum(ecdsaCurves)).optional().default([]),
  }),
  defaultSignatureAlgorithm: z.enum(signatureAlgorithms).optional(),
  
  honorKeyUsage: z.boolean().default(false),
  keyUsages: z.array(z.enum(keyUsageOptions)).optional().default([]),
  
  honorExtendedKeyUsage: z.boolean().default(false),
  extendedKeyUsages: z.array(z.enum(extendedKeyUsageOptions)).optional().default([]),
}).refine(data => {
  if (!data.cryptoEnforcement.enabled) return true;
  return data.cryptoEnforcement.allowRsa || data.cryptoEnforcement.allowEcdsa;
}, {
  message: "At least one key type (RSA or ECDSA) must be allowed when enforcement is enabled.",
  path: ["cryptoEnforcement.allowRsa"], 
}).refine(data => {
    if (!data.cryptoEnforcement.enabled || !data.cryptoEnforcement.allowRsa) return true;
    return data.cryptoEnforcement.allowedRsaKeyStrengths && data.cryptoEnforcement.allowedRsaKeyStrengths.length > 0;
}, {
    message: "At least one RSA Key Strength must be selected if RSA is allowed.",
    path: ["cryptoEnforcement.allowedRsaKeyStrengths"],
}).refine(data => {
    if (!data.cryptoEnforcement.enabled || !data.cryptoEnforcement.allowEcdsa) return true;
    return data.cryptoEnforcement.allowedEcdsaCurves && data.cryptoEnforcement.allowedEcdsaCurves.length > 0;
}, {
    message: "At least one ECDSA Curve must be selected if ECDSA is allowed.",
    path: ["cryptoEnforcement.allowedEcdsaCurves"],
});


type SigningProfileFormValues = z.infer<typeof signingProfileSchema>;

// Helper to format camelCase to Title Case
const toTitleCase = (str: string) => {
  return str
    .replace(/([A-Z])/g, ' $1') // insert a space before all caps
    .replace(/^./, (s) => s.toUpperCase()); // uppercase the first character
};

// Helper to map API data to form values, handling potential undefined fields
const mapApiProfileToFormValues = (profile: ApiSigningProfile): SigningProfileFormValues => {
    const crypto = profile.crypto_enforcement || {};
    return {
        profileName: profile.name || '',
        description: profile.description || '',
        duration: profile.validity?.duration || '1y',
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
            allowedRsaKeyStrengths: crypto.allowed_rsa_key_strengths || [],
            allowedEcdsaCurves: crypto.allowed_ecdsa_curves || [],
        },
        defaultSignatureAlgorithm: profile.default_signature_algorithm as any,
        honorKeyUsage: profile.honor_key_usage,
        keyUsages: (profile.key_usage || []) as KeyUsageOption[],
        honorExtendedKeyUsage: profile.honor_extended_key_usage,
        extendedKeyUsages: (profile.extended_key_usage || []) as ExtendedKeyUsageOption[],
    };
};


export default function EditSigningProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('id');
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);

  const form = useForm<SigningProfileFormValues>({
    resolver: zodResolver(signingProfileSchema),
    defaultValues: {},
  });

  const fetchProfile = useCallback(async () => {
    if (!profileId || !user?.access_token) {
        setErrorProfile('Profile ID or user token is missing.');
        setIsLoadingProfile(false);
        return;
    }
    try {
        const data = await fetchSigningProfileById(profileId, user.access_token);
        const formValues = mapApiProfileToFormValues(data);
        form.reset(formValues);
        setErrorProfile(null);
    } catch (error: any) {
        setErrorProfile(error.message);
    } finally {
        setIsLoadingProfile(false);
    }
  }, [profileId, user?.access_token, form]);

  useEffect(() => {
    if (user?.access_token) {
        fetchProfile();
    }
  }, [user?.access_token, fetchProfile]);

  const { isSubmitting } = form.formState;
  const watchCryptoEnforcement = form.watch("cryptoEnforcement");
  const watchHonorSubject = form.watch("honorSubject");
  const watchHonorKeyUsage = form.watch("honorKeyUsage");
  const watchHonorExtendedKeyUsage = form.watch("honorExtendedKeyUsage");

  async function onSubmit(data: SigningProfileFormValues) {
    if (!profileId || !user?.access_token) {
        toast({ title: "Error", description: "Profile ID or authentication token is missing.", variant: "destructive" });
        return;
    }

    const payload: CreateSigningProfilePayload = {
        name: data.profileName,
        description: data.description,
        validity: { type: "duration", duration: data.duration },
        sign_as_ca: data.signAsCa,
        honor_key_usage: data.honorKeyUsage,
        key_usage: data.keyUsages || [],
        honor_extended_key_usage: data.honorExtendedKeyUsage,
        extended_key_usage: data.extendedKeyUsages || [],
        honor_subject: data.honorSubject,
        honor_extensions: true,
        crypto_enforcement: {
            enabled: data.cryptoEnforcement.enabled,
            allow_rsa_keys: data.cryptoEnforcement.allowRsa,
            allow_ecdsa_keys: data.cryptoEnforcement.allowEcdsa,
            allowed_rsa_key_strengths: data.cryptoEnforcement.allowedRsaKeyStrengths,
            allowed_ecdsa_curves: data.cryptoEnforcement.allowedEcdsaCurves,
        },
        default_signature_algorithm: data.defaultSignatureAlgorithm,
    };
    
    if (!data.honorSubject) {
        payload.subject = {
            country: data.overrideCountry,
            state: data.overrideState,
            organization: data.overrideOrganization,
            organizational_unit: data.overrideOrgUnit,
        }
    }

    try {
        await updateSigningProfile(profileId, payload, user.access_token);
        toast({ title: "Profile Updated", description: `Issuance Profile "${data.profileName}" has been successfully updated.` });
        router.push('/signing-profiles');
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  }
  
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2"/> 
        Loading profile data...
      </div>
    );
  }

  if (errorProfile) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/signing-profiles')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Issuance Profiles
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitleUI>Error Loading Profile</AlertTitleUI>
          <AlertDescUI>{errorProfile}</AlertDescUI>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/signing-profiles')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Issuance Profiles
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Settings2 className="h-7 w-7 text-primary" />
            <CardTitle className="text-xl font-headline">Edit Issuance Profile</CardTitle>
          </div>
          <CardDescription>
            Modify the parameters for this certificate issuance profile.
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
                name="signAsCa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center"><Shield className="mr-2 h-4 w-4 text-muted-foreground"/>Sign as Certificate Authority</FormLabel>
                      <FormDescription>
                        Allow certificates signed with this profile to act as intermediate CAs. This enables the `isCA:TRUE` basic constraint.
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
              
              <FormField
                control={form.control}
                name="cryptoEnforcement.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Crypto Enforcement</FormLabel>
                      <FormDescription>
                        Enforce specific key types (RSA, ECDSA) and their parameters.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {watchCryptoEnforcement.enabled && (
                <div className="space-y-4 p-4 border rounded-md ml-4 -mt-4">
                    <div>
                        <FormLabel>Allowed Key Types</FormLabel>
                        <FormDescription className="mb-2">Select at least one cryptographic key type.</FormDescription>
                        <div className="space-y-2 mt-1">
                        <FormField
                            control={form.control}
                            name="cryptoEnforcement.allowRsa"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>Allow RSA Keys</FormLabel></div>
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cryptoEnforcement.allowEcdsa"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-background">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>Allow ECDSA Keys</FormLabel></div>
                            </FormItem>
                            )}
                        />
                        </div>
                        <FormMessage>{form.formState.errors.cryptoEnforcement?.allowRsa?.message}</FormMessage>
                    </div>

                    {watchCryptoEnforcement.allowRsa && (
                        <FormField control={form.control} name="cryptoEnforcement.allowedRsaKeyStrengths" render={() => (
                            <FormItem className="p-3 border rounded-md bg-background">
                                <FormLabel>Allowed RSA Key Strengths</FormLabel>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 pt-2">
                                    {rsaKeyStrengths.map((item) => (
                                    <FormField key={item} control={form.control} name="cryptoEnforcement.allowedRsaKeyStrengths"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                                    const currentValue = field.value || [];
                                                    return checked ? field.onChange([...currentValue, item]) : field.onChange(currentValue.filter((value) => value !== item));
                                                }} /></FormControl>
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
                    {watchCryptoEnforcement.allowEcdsa && (
                        <FormField control={form.control} name="cryptoEnforcement.allowedEcdsaCurves" render={() => (
                            <FormItem className="p-3 border rounded-md bg-background">
                                <FormLabel>Allowed ECDSA Curves</FormLabel>
                                <div className="grid grid-cols-1 gap-x-4 gap-y-2 pt-2">
                                    {ecdsaCurves.map((item) => (
                                    <FormField key={item} control={form.control} name="cryptoEnforcement.allowedEcdsaCurves"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                                <FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {
                                                    const currentValue = field.value || [];
                                                    return checked ? field.onChange([...currentValue, item]) : field.onChange(currentValue.filter((value) => value !== item));
                                                }} /></FormControl>
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


              <FormField
                  control={form.control}
                  name="defaultSignatureAlgorithm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Signature Algorithm</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
