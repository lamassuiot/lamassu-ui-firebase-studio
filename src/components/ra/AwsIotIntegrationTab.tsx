
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { TagInput } from '@/components/shared/TagInput';
import { AlertTriangle, Info, Loader2, Save, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiRaItem, RaCreationPayload } from '@/lib/dms-api';
import { createOrUpdateRa } from '@/lib/dms-api';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { findCaById, fetchAndProcessCAs, updateCaMetadata, type CA, type PatchOperation } from '@/lib/ca-data';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { cn } from '@/lib/utils';

const awsPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required.'),
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
  registration: z.object({
      primary_account: z.boolean(),
      registration_request_time: z.string(),
      status: z.string(),
  }).optional(),
});

type AwsIntegrationFormValues = z.infer<typeof awsIntegrationSchema>;

interface AwsIotIntegrationTabProps {
  ra: ApiRaItem;
  onUpdate: () => void;
}

const AWS_IOT_METADATA_KEY = 'lamassu.io/iot/aws.iot-core';

const defaultFormValues: AwsIntegrationFormValues = {
    aws_iot_manager_instance: 'aws.iot',
    registration_mode: 'none',
    groups: ['LAMASSU'],
    policies: [],
    shadow_config: {
        enable: false,
        shadow_name: '',
    },
    remediation_config: {
        account_id: '',
    },
};

export const AwsIotIntegrationTab: React.FC<AwsIotIntegrationTabProps> = ({ ra, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [enrollmentCa, setEnrollmentCa] = useState<CA | null>(null);
  const [isLoadingCa, setIsLoadingCa] = useState(false);
  const [errorCa, setErrorCa] = useState<string | null>(null);

  const [shadowType, setShadowType] = useState<'disabled' | 'classic' | 'named'>('disabled');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPrimaryAccount, setIsPrimaryAccount] = useState(true);

  const form = useForm<AwsIntegrationFormValues>({
    resolver: zodResolver(awsIntegrationSchema),
    defaultValues: defaultFormValues,
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "policies",
  });

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
    if (ra) {
      loadCaData();

      const config = ra.metadata?.[AWS_IOT_METADATA_KEY] || {};
      const mergedValues = {
        ...defaultFormValues, ...config,
        shadow_config: { ...defaultFormValues.shadow_config, ...(config.shadow_config || {}) },
        remediation_config: { ...defaultFormValues.remediation_config, ...(config.remediation_config || {}) },
      };
      form.reset(mergedValues);

      if (mergedValues.shadow_config?.enable) {
        setShadowType(mergedValues.shadow_config.shadow_name ? 'named' : 'classic');
      } else {
        setShadowType('disabled');
      }
    }
  }, [ra, form, loadCaData]);

  const watchRegistrationMode = form.watch('registration_mode');
  
  const onSubmit = async (data: AwsIntegrationFormValues) => {
    if (!user?.access_token) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }
    
    // Transform shadowType state into the data structure
    const transformedData = { ...data };
    if (shadowType === 'disabled') {
        transformedData.shadow_config = { enable: false, shadow_name: '' };
    } else {
        transformedData.shadow_config = { enable: true, shadow_name: shadowType === 'named' ? data.shadow_config?.shadow_name || '' : '' };
    }

    const updatedRaPayload: RaCreationPayload = JSON.parse(JSON.stringify({
        id: ra.id, name: ra.name, metadata: ra.metadata, settings: ra.settings,
    }));
    
    if (updatedRaPayload.metadata) {
        updatedRaPayload.metadata[AWS_IOT_METADATA_KEY] = transformedData;
    } else {
        updatedRaPayload.metadata = { [AWS_IOT_METADATA_KEY]: transformedData };
    }

    try {
        await createOrUpdateRa(updatedRaPayload, user.access_token, true, ra.id);
        toast({ title: "Success", description: "AWS IoT integration settings saved." });
        onUpdate();
    } catch (e: any) {
        toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSyncCa = async () => {
    if (!user?.access_token || !enrollmentCa) {
        toast({ title: 'Error', description: 'Enrollment CA not found or user not authenticated.', variant: 'destructive' });
        return;
    }
    setIsSyncing(true);
    try {
        const registrationPayload = {
            primary_account: isPrimaryAccount,
            registration_request_time: new Date().toISOString(),
            status: "REQUESTED"
        };
        
        const existingCaMetadata = enrollmentCa.rawApiData?.metadata || {};
        const existingAwsConfig = existingCaMetadata[AWS_IOT_METADATA_KEY] || {};
        const newAwsConfig = { ...existingAwsConfig, registration: registrationPayload };

        const op: PatchOperation['op'] = existingCaMetadata[AWS_IOT_METADATA_KEY] ? 'replace' : 'add';
        const path = `/${AWS_IOT_METADATA_KEY.replace(/\//g, '~1')}`;
        
        const patchOperations: PatchOperation[] = [{ op, path, value: newAwsConfig }];
        
        await updateCaMetadata(enrollmentCa.id, patchOperations, user.access_token);
        
        toast({ title: "Success", description: "CA synchronization request has been sent." });
        loadCaData(); // Refresh the CA data to get the new status

    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const sectionTitleStyle = "text-lg font-semibold";
  const registrationInfo = enrollmentCa?.rawApiData?.metadata?.[AWS_IOT_METADATA_KEY]?.registration;

  const getStatusContent = (regInfo: any) => {
    switch(regInfo.status) {
        case 'COMPLETED': return { Icon: CheckCircle, variant: 'default', title: 'CA Registration Status: COMPLETED', message: `CA registration completed successfully at ${format(parseISO(regInfo.registration_request_time), 'PPpp')}.` };
        case 'FAILED': return { Icon: XCircle, variant: 'destructive', title: 'CA Registration Status: FAILED', message: `CA registration failed. Please check logs and try again.` };
        case 'REQUESTED': default: return { Icon: AlertTriangle, variant: 'warning', title: 'CA Registration Status: REQUESTED', message: "Registration process underway. Click 'Reload & Check' periodically." };
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <h3 className={sectionTitleStyle}>Thing Provisioning</h3>
        <Card>
          <CardContent className="pt-6 space-y-4">
             <FormField
                control={form.control} name="registration_mode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Registration Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="auto">Automatic Registration on Enrollment</SelectItem>
                                <SelectItem value="jitp">JITP Template</SelectItem>
                            </SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )}
            />
            {(watchRegistrationMode === 'jitp' || watchRegistrationMode === 'auto') && (
                <>
                {isLoadingCa ? <Loader2 className="animate-spin" /> : errorCa ? <Alert variant="destructive"><AlertTitle>Error loading CA</AlertTitle><AlertDescription>{errorCa}</AlertDescription></Alert> : registrationInfo ? (() => {
                    const { Icon, variant, title, message } = getStatusContent(registrationInfo);
                    return (
                        <Alert variant={variant as any}>
                            <Icon className="h-4 w-4" /> <AlertTitle>{title}</AlertTitle>
                            <AlertDescription asChild>
                                <div className="space-y-3">
                                    <p>{message}</p>
                                    <div className="bg-gray-900 text-gray-200 font-mono text-xs p-4 rounded-md overflow-x-auto">
                                        <pre><code>{JSON.stringify({ registration: registrationInfo }, null, 2)}</code></pre>
                                    </div>
                                    <Button type="button" variant="link" className="p-0 h-auto font-semibold" onClick={loadCaData}>Reload & Check Status</Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )
                })() : (
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" /><AlertTitle>Enrollment CA Not Synchronized</AlertTitle>
                      <AlertDescription asChild>
                        <div className="space-y-3 mt-2">
                          <p>The selected Enrollment CA is not registered in AWS. Make sure to synchronize it first.</p>
                          <div className="space-y-2 pt-2">
                              <Label htmlFor="account-type-select">Register as Primary Account</Label>
                              <Select onValueChange={(value) => setIsPrimaryAccount(value === 'primary')} defaultValue={isPrimaryAccount ? 'primary' : 'secondary'}>
                                  <SelectTrigger id="account-type-select">
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="primary">
                                          <div className="flex flex-col">
                                              <span className="font-semibold">Primary Account - Register as CA owner</span>
                                              <span className="text-xs text-muted-foreground">Only one account can be registered as the CA owner within the same AWS Region. It is required to have access to the CA private key.</span>
                                          </div>
                                      </SelectItem>
                                      <SelectItem value="secondary">
                                           <div className="flex flex-col">
                                              <span className="font-semibold">Secondary Account</span>
                                              <span className="text-xs text-muted-foreground">No access to the CA private key is needed.</span>
                                          </div>
                                      </SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="flex justify-end pt-2">
                              <Button type="button" variant="outline" onClick={handleSyncCa} disabled={isSyncing}>
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Synchronize CA with AWS
                              </Button>
                          </div>
                        </div>
                      </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <h3 className={sectionTitleStyle}>AWS Thing Groups</h3>
        <Card><CardContent className="pt-6"><FormField control={form.control} name="groups" render={({ field }) => (<FormItem><FormControl><TagInput {...field} placeholder="Add thing groups..."/></FormControl></FormItem>)}/></CardContent></Card>
        
        <h3 className={sectionTitleStyle}>AWS IoT Core Policies</h3>
        <Card>
            <CardContent className="pt-6 space-y-2">
                 {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 mb-2">
                        <FormField control={form.control} name={`policies.${index}.name`} render={({ field }) => (<FormItem className="flex-grow"><Input {...field} placeholder="Enter policy name"/><FormMessage /></FormItem>)}/>
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="flex-shrink-0"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                 ))}
                 <Button type="button" variant="default" size="sm" onClick={() => append({ name: '' })}>Add Policy</Button>
            </CardContent>
        </Card>

        <h3 className={sectionTitleStyle}>Shadows &amp; Device Automation</h3>
        <Card>
            <CardContent className="pt-6 space-y-4">
                <RadioGroup value={shadowType} onValueChange={(v) => setShadowType(v as any)} className="space-y-2">
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="disabled" id="shadow-disabled"/></FormControl><FormLabel className="font-normal">Disabled</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="classic" id="shadow-classic"/></FormControl><FormLabel className="font-normal">Use Classic (unnamed) Shadow</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="named" id="shadow-named"/></FormControl><FormLabel className="font-normal">Use Named Shadow</FormLabel></FormItem>
                </RadioGroup>
                
                {shadowType === 'named' && (
                    <div className="pl-8 pt-2">
                        <FormField control={form.control} name="shadow_config.shadow_name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Shadow Name</FormLabel>
                                <Input {...field} placeholder="Enter the named shadow..."/>
                                <FormMessage/>
                            </FormItem>
                        )}/>
                    </div>
                )}
                
                {shadowType !== 'disabled' && (
                    <Alert variant="warning">
                        <AlertTriangle className="h-4 w-4" /><AlertTitle>Policy Required</AlertTitle>
                        <AlertDescription>Make sure to add a policy allowing access to shadow topics.</AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
        
        <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                Update DMS
            </Button>
        </div>
      </form>
    </Form>
  );
};
