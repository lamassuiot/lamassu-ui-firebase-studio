
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TagInput } from '@/components/shared/TagInput';
import { AlertTriangle, Info, Loader2, Save, Trash2, CheckCircle, XCircle, Settings2, UserPlus, Server, Users2, Edit, BookOpenCheck, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiRaItem, RaCreationPayload } from '@/lib/dms-api';
import { createOrUpdateRa } from '@/lib/dms-api';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { findCaById, fetchAndProcessCAs, updateCaMetadata, type CA, type PatchOperation } from '@/lib/ca-data';
import { cn } from '@/lib/utils';
import { CaVisualizerCard } from '../CaVisualizerCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Switch } from '@/components/ui/switch';
import { AwsPolicyEditorModal } from './AwsPolicyEditorModal';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { policyBuilder } from '@/lib/integrations-api';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Label } from '../ui/label';
import { DetailItem } from '../shared/DetailItem';


const awsPolicySchema = z.object({
  policy_name: z.string().min(1, 'Policy name is required.'),
  policy_document: z.string().refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, { message: 'Policy document must be a valid JSON string.'}),
});

const awsIntegrationSchema = z.object({
  aws_iot_manager_instance: z.string().optional(),
  registration_mode: z.enum(['none', 'auto', 'jitp']).default('none'),
  groups: z.array(z.string()).optional(),
  policies: z.array(awsPolicySchema).optional(),
  shadow_config: z.object({
    enable: z.boolean().default(false),
    shadow_name: z.string().optional(),
  }).optional(),
  remediation_config: z.object({
    account_id: z.string().optional(),
  }).optional(),
});

export type AwsPolicy = z.infer<typeof awsPolicySchema>;
type AwsIntegrationFormValues = z.infer<typeof awsIntegrationSchema>;

interface AwsIotIntegrationTabProps {
  ra: ApiRaItem;
  onUpdate: () => void;
}

const AWS_IOT_METADATA_KEY = 'lamassu.io/iot/aws.iot-core';

// This function now defines the complete default state.
const getDefaultFormValues = (ra?: ApiRaItem | null): AwsIntegrationFormValues => {
  const config = ra?.metadata?.[AWS_IOT_METADATA_KEY] || {};
  
  return {
    aws_iot_manager_instance: config.aws_iot_manager_instance || 'aws.iot',
    registration_mode: config.registration_mode || 'none',
    groups: config.groups || ['LAMASSU'],
    policies: config.policies || [],
    shadow_config: {
        enable: config.shadow_config?.enable ?? false,
        shadow_name: config.shadow_config?.shadow_name || '',
    },
    remediation_config: {
        account_id: config.remediation_config?.account_id || '',
    },
  };
};

export const AwsIotIntegrationTab: React.FC<AwsIotIntegrationTabProps> = ({ ra, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [enrollmentCa, setEnrollmentCa] = useState<CA | null>(null);
  const [isLoadingCa, setIsLoadingCa] = useState(false);
  const [errorCa, setErrorCa] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPrimaryAccount, setIsPrimaryAccount] = useState(true);

  // State for the policy modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(null);

  // State for remediation policy dialog
  const [remediationAccountId, setRemediationAccountId] = useState('');
  
  // Memoize the default values to prevent re-initializing the form on every render.
  const memoizedDefaultValues = useMemo(() => getDefaultFormValues(ra), [ra]);

  const form = useForm<AwsIntegrationFormValues>({
    resolver: zodResolver(awsIntegrationSchema),
    defaultValues: memoizedDefaultValues,
  });

  // When new `ra` data comes in, we reset the form with the new default values.
  useEffect(() => {
    form.reset(memoizedDefaultValues);
  }, [ra, memoizedDefaultValues, form]);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "policies",
  });
  
  // Use useWatch to reactively get form values
  const shadowEnabled = useWatch({ control: form.control, name: "shadow_config.enable" });
  const shadowName = useWatch({ control: form.control, name: "shadow_config.shadow_name" });
  const iotManagerInstance = useWatch({ control: form.control, name: "aws_iot_manager_instance" });
  const currentPolicies = useWatch({ control: form.control, name: "policies" });

  const hasRemediationPolicy = useMemo(() => {
    const policyName = `${ra.id}.lms-remediation-access`;
    return currentPolicies?.some(p => p.policy_name === policyName);
  }, [currentPolicies, ra.id]);


  useEffect(() => {
    // Extracts the 12-digit account ID from the instance string.
    const accountIdMatch = iotManagerInstance?.match(/\.([\d]{12})$/);
    setRemediationAccountId(accountIdMatch ? accountIdMatch[1] : '');
  }, [iotManagerInstance]);


  const loadCaData = useCallback(async () => {
    if (!user?.access_token || !ra?.settings.enrollment_settings.enrollment_ca) return;

    setIsLoadingCa(true);
    setErrorCa(null);
    try {
        const allCAs = await fetchAndProcessCAs(user.access_token);
        const foundCa = findCaById(ra.settings.enrollment_settings.enrollment_ca, allCAs);
        setEnrollmentCa(foundCa || null);
        if (!foundCa) {
          setErrorCa("Configured Enrollment CA could not be found.");
        }
    } catch (err: any) {
        setErrorCa(err.message || "Failed to load Enrollment CA details.");
    } finally {
        setIsLoadingCa(false);
    }
  }, [user?.access_token, ra]);

  useEffect(() => {
    loadCaData();
  }, [ra, loadCaData]);

  
  const onSubmit = async (data: AwsIntegrationFormValues) => {
    if (!user?.access_token) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }

    const updatedRaPayload: RaCreationPayload = JSON.parse(JSON.stringify({
        id: ra.id, name: ra.name, metadata: ra.metadata, settings: ra.settings,
    }));
    
    if (updatedRaPayload.metadata) {
        updatedRaPayload.metadata[AWS_IOT_METADATA_KEY] = data;
    } else {
        updatedRaPayload.metadata = { [AWS_IOT_METADATA_KEY]: data };
    }

    try {
        await createOrUpdateRa(updatedRaPayload, user.access_token, true, ra.id);
        toast({ title: "Success", description: "AWS IoT integration settings saved." });
        onUpdate();
    } catch (e: any) {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSyncCa = async (isRetry = false) => {
    if (!user?.access_token || !enrollmentCa) {
        toast({ title: 'Error', description: 'Enrollment CA not found or user not authenticated.', variant: 'destructive' });
        return;
    }
    setIsSyncing(true);
    try {
        let patchOperations: PatchOperation[] = [];
        const awsConfigPointer = `/lamassu.io~1iot~1aws.iot-core`;
        
        if (isRetry) {
             const statusPointer = `${awsConfigPointer}/registration/status`;
             patchOperations.push({ op: 'replace', path: statusPointer, value: 'REQUESTED' });
        } else {
            const registrationPayload = {
                primary_account: isPrimaryAccount,
                registration_request_time: new Date().toISOString(),
                status: "REQUESTED"
            };
            const registrationPointer = `${awsConfigPointer}/registration`;
            patchOperations.push({ op: 'add', path: registrationPointer, value: registrationPayload });
        }
        
        await updateCaMetadata(enrollmentCa.id, patchOperations, user.access_token);
        
        toast({ title: "Success", description: "CA synchronization request has been sent." });
        loadCaData();

    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const handleOpenPolicyModal = (index?: number) => {
    setEditingPolicyIndex(typeof index === 'number' ? index : null);
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = (policy: AwsPolicy) => {
    if (editingPolicyIndex !== null) {
      update(editingPolicyIndex, policy);
    } else {
      append(policy);
    }
  };

  const handleAddRemediationPolicy = () => {
    if (!remediationAccountId) {
        toast({ title: "Error", description: "AWS Account ID is required.", variant: 'destructive'});
        return;
    }
    const policyDocString = policyBuilder(remediationAccountId, shadowName || '');
    const policyName = `${ra.id}.lms-remediation-access`;
    
    const newPolicy: AwsPolicy = {
        policy_name: policyName,
        policy_document: policyDocString,
    };

    const existingIndex = fields.findIndex(p => p.policy_name === policyName);
    if (existingIndex > -1) {
        update(existingIndex, newPolicy);
        toast({ title: "Policy Updated", description: `'${policyName}' policy has been updated.`});
    } else {
        append(newPolicy);
        toast({ title: "Policy Added", description: `'${policyName}' policy has been added.`});
    }
  };


  const registrationInfo = enrollmentCa?.rawApiData?.metadata?.[AWS_IOT_METADATA_KEY]?.registration;

  const getStatusContent = (regInfo: any) => {
    switch(regInfo.status) {
        case 'SUCCEEDED': return { Icon: CheckCircle, variant: 'default', title: 'CA Registration Status: SUCCEEDED', message: `CA registration completed successfully at ${format(parseISO(regInfo.registration_request_time), 'PPpp')}.` };
        case 'FAILED': return { Icon: XCircle, variant: 'destructive', title: 'CA Registration Status: FAILED', message: `CA registration failed. Please check logs and try again.` };
        case 'REQUESTED': default: return { Icon: AlertTriangle, variant: 'warning', title: 'CA Registration Status: REQUESTED', message: "Registration process underway. Click 'Reload & Check' periodically." };
    }
  };
  
  const isIntegrationEnabled = registrationInfo && registrationInfo.status === 'SUCCEEDED';
  const accordionTriggerStyle = "text-md font-medium bg-muted/30 hover:bg-muted/40 data-[state=open]:bg-muted/50 px-4 py-3 rounded-md";

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Accordion type="multiple" defaultValue={['ca-registration']} className="w-full space-y-3">
            
            <AccordionItem value="ca-registration" className="border rounded-md shadow-sm">
                <AccordionTrigger className={accordionTriggerStyle}><Settings2 className="mr-2 h-5 w-5" /> 1. AWS CA Registration</AccordionTrigger>
                <AccordionContent className="p-4 pt-2">
                    <p className="text-sm text-muted-foreground mb-4">The Enrollment CA for this RA must be synchronized with AWS IoT Core for this integration to function.</p>
                     {isLoadingCa ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : 
                     errorCa ? <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{errorCa}</AlertDescription></Alert> :
                     !enrollmentCa ? <Alert variant="destructive"><AlertTitle>Configuration Error</AlertTitle><AlertDescription>No Enrollment CA found for this RA.</AlertDescription></Alert> :
                     (
                        <>
                            <CaVisualizerCard ca={enrollmentCa} allCryptoEngines={[]} />
                            <div className="pt-4">
                                 {registrationInfo ? (() => {
                                    const { Icon, variant, title, message } = getStatusContent(registrationInfo);
                                    return (
                                        <Alert variant={variant as any}>
                                            <Icon className="h-4 w-4" /> <AlertTitle>{title}</AlertTitle>
                                            <AlertDescription>
                                                <div className="space-y-3">
                                                    <p>{message}</p>
                                                    {registrationInfo.status === 'FAILED' ? (
                                                      <Button type="button" variant="outline" size="sm" onClick={() => handleSyncCa(true)} disabled={isSyncing}>
                                                        {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Retry Synchronization
                                                      </Button>
                                                    ) : (
                                                      <Button type="button" variant="link" className="p-0 h-auto font-semibold" onClick={loadCaData}>Reload & Check Status</Button>
                                                    )}
                                                    <Accordion type="single" collapsible className="w-full">
                                                        <AccordionItem value="item-1" className="border-t">
                                                            <AccordionTrigger className="text-xs pt-3">Details</AccordionTrigger>
                                                            <AccordionContent>
                                                                <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto mt-1">
                                                                    {JSON.stringify(registrationInfo, null, 2)}
                                                                </pre>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                </div>
                                            </AlertDescription>
                                        </Alert>
                                    )
                                })() : (
                                    <Alert variant="warning">
                                      <AlertTriangle className="h-4 w-4"/><AlertTitle>Enrollment CA Not Synchronized</AlertTitle>
                                      <AlertDescription>
                                        <div className="space-y-3 mt-2">
                                          <p>The selected Enrollment CA is not registered in AWS. Make sure to synchronize it first.</p>
                                          <div className="space-y-2 pt-2">
                                              <Label htmlFor="account-type-select">Register as Primary Account</Label>
                                              <Select onValueChange={(value) => setIsPrimaryAccount(value === 'primary')} defaultValue={isPrimaryAccount ? 'primary' : 'secondary'}>
                                                  <SelectTrigger id="account-type-select"><SelectValue /></SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="primary">
                                                          <div className="flex flex-col"><span className="font-semibold">Primary Account - Register as CA owner</span><span className="text-xs text-muted-foreground">Only one account can be registered as the CA owner within the same AWS Region. It is required to have access to the CA private key.</span></div>
                                                      </SelectItem>
                                                      <SelectItem value="secondary">
                                                           <div className="flex flex-col"><span className="font-semibold">Secondary Account</span><span className="text-xs text-muted-foreground">No access to the CA private key is needed.</span></div>
                                                      </SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                          <div className="flex justify-end pt-2">
                                              <Button type="button" variant="outline" onClick={() => handleSyncCa(false)} disabled={isSyncing}>
                                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                Synchronize CA with AWS
                                              </Button>
                                          </div>
                                        </div>
                                      </AlertDescription>
                                  </Alert>
                                )}
                            </div>
                        </>
                     )}
                </AccordionContent>
            </AccordionItem>

            <div className={cn("space-y-3", !isIntegrationEnabled && "opacity-50 pointer-events-none")}>
                {!isIntegrationEnabled && <Alert variant="warning"><AlertTriangle className="h-4 w-4"/><AlertTitle>Configuration Disabled</AlertTitle><AlertDescription>You must successfully register the CA with AWS before configuring the options below.</AlertDescription></Alert>}

                <AccordionItem value="provisioning" className="border rounded-md shadow-sm">
                    <AccordionTrigger className={accordionTriggerStyle}><UserPlus className="mr-2 h-5 w-5" /> 2. Thing Provisioning</AccordionTrigger>
                    <AccordionContent className="p-4 pt-2 space-y-4">
                         <FormField control={form.control} name="aws_iot_manager_instance" render={({ field }) => (
                            <FormItem>
                                <FormLabel>IoT Manager Instance</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g., aws.iot.eu-west-1.123456789012" /></FormControl>
                                <FormMessage />
                            </FormItem>
                         )}/>
                         <FormField control={form.control} name="registration_mode" render={({ field }) => (
                            <FormItem><FormLabel>Registration Mode</FormLabel>
                                 <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="auto">Automatic Registration on Enrollment</SelectItem>
                                        <SelectItem value="jitp">JITP Template</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                         )}/>
                    </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="groups-policies" className="border rounded-md shadow-sm">
                    <AccordionTrigger className={accordionTriggerStyle}><Users2 className="mr-2 h-5 w-5" /> 3. AWS Thing Groups &amp; Policies</AccordionTrigger>
                    <AccordionContent className="p-4 pt-2 space-y-4">
                        <FormField control={form.control} name="groups" render={({ field }) => (<FormItem><FormLabel>Thing Groups</FormLabel><FormControl><TagInput {...field} placeholder="Add thing groups..."/></FormControl></FormItem>)}/>
                        
                        <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <FormLabel>IoT Policies</FormLabel>
                                 <Button type="button" variant="default" size="sm" onClick={() => handleOpenPolicyModal()}>Add Custom Policy</Button>
                             </div>
                             <Card className="p-3">
                                <ul className="space-y-2">
                                    {fields.map((item, index) => (
                                        <li key={item.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <BookOpenCheck className="h-4 w-4 text-primary"/>
                                                <span className="font-mono text-sm">{item.policy_name}</span>
                                            </div>
                                            <div className="space-x-1">
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenPolicyModal(index)}><Edit className="h-4 w-4"/></Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </div>
                                        </li>
                                    ))}
                                    {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No policies added.</p>}
                                </ul>
                             </Card>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="shadow" className="border rounded-md shadow-sm">
                    <AccordionTrigger className={accordionTriggerStyle}><Server className="mr-2 h-5 w-5" /> 4. Device Shadow &amp; Automation</AccordionTrigger>
                    <AccordionContent className="p-4 pt-2 space-y-4">
                        <FormField
                          control={form.control}
                          name="shadow_config.enable"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable Device Shadow</FormLabel>
                                <FormDescription>Allow Lamassu to interact with the device's shadow document in AWS IoT.</FormDescription>
                              </div>
                              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                          )}
                        />
                        {shadowEnabled && (
                          <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="shadow_config.shadow_name"
                                render={({ field }) => (
                                    <FormItem className="pl-6">
                                        <FormLabel>Named Shadow (Optional)</FormLabel>
                                        <FormControl><Input {...field} placeholder="Enter named shadow (e.g., 'config')..."/></FormControl>
                                        <FormDescription>Leave blank to use the classic, unnamed shadow.</FormDescription>
                                        <FormMessage/>
                                    </FormItem>
                                )}
                            />
                             {shadowEnabled && !hasRemediationPolicy && (
                                <Alert variant="warning">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Policy Required</AlertTitle>
                                    <AlertDescription>
                                        <div className="flex flex-col gap-3">
                                            <span>To enable shadow and remediation features, you must add the remediation policy.</span>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" variant="outline" size="sm" className="self-start">
                                                        <Plus className="mr-2 h-4 w-4"/>Add Remediation Policy
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Add Remediation Policy</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Confirm the AWS Account ID to generate the policy. This policy allows Lamassu to manage device certificates and shadows.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <div className="space-y-2 py-2">
                                                      <Label htmlFor="aws-account-id">AWS Account ID</Label>
                                                      <Input id="aws-account-id" value={remediationAccountId} onChange={(e) => setRemediationAccountId(e.target.value)} />
                                                      <p className="text-xs text-muted-foreground">Extracted from IoT Manager Instance. Verify it's correct.</p>
                                                   </div>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleAddRemediationPolicy}>Add Policy</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                          </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </div>

        </Accordion>
        
        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting || !isIntegrationEnabled}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Update DMS
            </Button>
        </div>
      </form>
    </Form>
    <AwsPolicyEditorModal
        isOpen={isPolicyModalOpen}
        onOpenChange={setIsPolicyModalOpen}
        onSave={handleSavePolicy}
        existingPolicy={editingPolicyIndex !== null ? fields[editingPolicyIndex] : undefined}
    />
    </>
  );
};
