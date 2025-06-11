
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
import { ArrowLeft, PlusCircle, Settings2, KeyRound, ListChecks } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';

const rsaKeyStrengths = ["2048", "3072", "4096"] as const;
const ecdsaCurves = ["P-256", "P-384", "P-521"] as const;
const signatureAlgorithms = [
  "SHA256withRSA", "SHA384withRSA", "SHA512withRSA",
  "SHA256withECDSA", "SHA384withECDSA", "SHA512withECDSA"
] as const;

const keyUsageOptions = [
  "digitalSignature", "nonRepudiation", "keyEncipherment", "dataEncipherment",
  "keyAgreement", "keyCertSign", "cRLSign", "encipherOnly", "decipherOnly"
] as const;
type KeyUsageOption = typeof keyUsageOptions[number];

const extendedKeyUsageOptions = [
  "serverAuth", "clientAuth", "codeSigning", "emailProtection",
  "timeStamping", "ocspSigning", "anyExtendedKeyUsage"
] as const;
type ExtendedKeyUsageOption = typeof extendedKeyUsageOptions[number];

const signingProfileSchema = z.object({
  profileName: z.string().min(3, "Profile name must be at least 3 characters long."),
  description: z.string().optional(),
  duration: z.string().min(1, "Duration is required (e.g., '1y', '90d')."),
  subjectPolicyNotes: z.string().optional(),
  extensionsPolicyNotes: z.string().optional(),
  allowRsa: z.boolean().default(false),
  allowEcdsa: z.boolean().default(false),
  rsaKeyStrength: z.enum(rsaKeyStrengths).optional(),
  ecdsaCurve: z.enum(ecdsaCurves).optional(),
  defaultSignatureAlgorithm: z.enum(signatureAlgorithms).optional(),
  keyUsages: z.array(z.enum(keyUsageOptions)).optional().default([]),
  extendedKeyUsages: z.array(z.enum(extendedKeyUsageOptions)).optional().default([]),
}).refine(data => data.allowRsa || data.allowEcdsa, {
  message: "At least one key type (RSA or ECDSA) must be allowed.",
  path: ["allowRsa"], 
}).refine(data => data.allowRsa ? !!data.rsaKeyStrength : true, {
    message: "RSA Key Strength is required if RSA is allowed.",
    path: ["rsaKeyStrength"],
}).refine(data => data.allowEcdsa ? !!data.ecdsaCurve : true, {
    message: "ECDSA Curve is required if ECDSA is allowed.",
    path: ["ecdsaCurve"],
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
      subjectPolicyNotes: '',
      extensionsPolicyNotes: '',
      allowRsa: true,
      allowEcdsa: false,
      rsaKeyStrength: "2048",
      keyUsages: ['digitalSignature', 'keyEncipherment'], // Example default
      extendedKeyUsages: ['clientAuth'], // Example default
    },
  });

  const watchAllowRsa = form.watch("allowRsa");
  const watchAllowEcdsa = form.watch("allowEcdsa");

  function onSubmit(data: SigningProfileFormValues) {
    console.log('New Signing Profile Data:', data);
    toast({
      title: "Profile Creation Mock",
      description: `Signing Profile "${data.profileName}" submitted. Check console for details.`,
    });
    // router.push('/dashboard/signing-profiles'); // Optionally navigate back
  }

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/dashboard/signing-profiles')} className="mb-0">
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
                name="subjectPolicyNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Policy Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe how subject DN attributes are handled. E.g., 'Respects CSR CN, O, OU. Appends specific L, ST, C.'" {...field} />
                    </FormControl>
                    <FormDescription>Notes on subject distinguished name (DN) handling for this profile.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extensionsPolicyNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extensions Policy Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe how X.509 extensions are handled. E.g., 'Adds KeyUsage (Digital Sig, Key Encipherment), EKU (Client Auth). Basic Constraints CA:FALSE.'" {...field} />
                    </FormControl>
                    <FormDescription>Notes on X.509 extensions (Key Usage, EKU, SANs, etc.) for this profile.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  name="rsaKeyStrength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RSA Key Strength</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select RSA key strength" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rsaKeyStrengths.map(strength => (
                            <SelectItem key={strength} value={strength}>{strength}-bit</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchAllowEcdsa && (
                <FormField
                  control={form.control}
                  name="ecdsaCurve"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ECDSA Curve</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ECDSA curve" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ecdsaCurves.map(curve => (
                            <SelectItem key={curve} value={curve}>{curve}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                name="keyUsages"
                render={() => ( // Main render for the group
                  <FormItem>
                    <FormLabel>Key Usage</FormLabel>
                    <FormDescription>Select the allowed key usages for certificates signed with this profile.</FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                      {keyUsageOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="keyUsages" // The array field
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

              <FormField
                control={form.control}
                name="extendedKeyUsages"
                render={() => ( // Main render for the group
                  <FormItem>
                    <FormLabel>Extended Key Usage</FormLabel>
                    <FormDescription>Select the allowed extended key usages (EKUs).</FormDescription>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-2 border p-3 rounded-md shadow-sm">
                      {extendedKeyUsageOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="extendedKeyUsages" // The array field
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


              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/dashboard/signing-profiles')}>
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
