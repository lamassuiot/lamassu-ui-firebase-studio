'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TagInput } from '@/components/shared/TagInput';
import { AlertTriangle, Info, Loader2, Save, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiRaItem, RaCreationPayload } from '@/lib/dms-api';
import { createOrUpdateRa } from '@/lib/dms-api';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

const awsPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required.'),
});

const awsIntegrationSchema = z.object({
  aws_iot_manager_instance: z.string().optional(),
  registration_mode: z.enum(['NONE', 'AUTOMATIC_REGISTRATION', 'JITP_BY_CA']).default('NONE'),
  groups: z.array(z.string()).optional(),
  policies: z.array(awsPolicySchema).optional(),
  shadow_config: z.object({
    enable: z.boolean().default(false),
    shadow_type: z.enum(['Classic', 'Named']).default('Classic'),
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

export const AwsIotIntegrationTab: React.FC<AwsIotIntegrationTabProps> = ({ ra, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [accountType, setAccountType] = useState<'primary' | 'secondary'>('primary');
  const [isSyncing, setIsSyncing] = useState(false);

  const form = useForm<AwsIntegrationFormValues>({
    resolver: zodResolver(awsIntegrationSchema),
    defaultValues: {},
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "policies",
  });

  useEffect(() => {
    if (ra?.metadata && ra.metadata[AWS_IOT_METADATA_KEY]) {
      const config = ra.metadata[AWS_IOT_METADATA_KEY];
      const shadowType = config.shadow_config?.shadow_name ? 'Named' : 'Classic';
      
      form.reset({
        aws_iot_manager_instance: config.aws_iot_manager_instance || 'aws.iot',
        registration_mode: config.registration_mode || 'NONE',
        groups: config.groups || [],
        policies: config.policies || [],
        shadow_config: {
            enable: config.shadow_config?.enable || false,
            shadow_type: shadowType,
            shadow_name: config.shadow_config?.shadow_name || '',
        },
        remediation_config: {
            account_id: config.remediation_config?.account_id || '',
        },
        registration: config.registration,
      });
    }
  }, [ra, form]);

  const watchShadowEnable = form.watch('shadow_config.enable');
  const watchShadowType = form.watch('shadow_config.shadow_type');
  const watchRegistrationMode = form.watch('registration_mode');

  const onSubmit = async (data: AwsIntegrationFormValues) => {
    if (!user?.access_token) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }
    
    const updatedRaPayload: RaCreationPayload = JSON.parse(JSON.stringify({
        id: ra.id,
        name: ra.name,
        metadata: ra.metadata,
        settings: ra.settings,
    }));
    
    if (data.shadow_config?.shadow_type === 'Classic') {
      if (data.shadow_config.shadow_name) {
        data.shadow_config.shadow_name = '';
      }
    }
    
    // Preserve registration info if it exists
    const existingRegistration = ra.metadata?.[AWS_IOT_METADATA_KEY]?.registration;
    
    const newAwsConfig = { ...data };
    if (existingRegistration) {
        newAwsConfig.registration = existingRegistration;
    }
    
    if (updatedRaPayload.metadata) {
        updatedRaPayload.metadata[AWS_IOT_METADATA_KEY] = newAwsConfig;
    } else {
        updatedRaPayload.metadata = { [AWS_IOT_METADATA_KEY]: newAwsConfig };
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
    if (!user?.access_token) {
        toast({ title: 'Authentication Error', variant: 'destructive' });
        return;
    }
    setIsSyncing(true);
    try {
        const updatedRaPayload: RaCreationPayload = JSON.parse(JSON.stringify({
            id: ra.id,
            name: ra.name,
            metadata: ra.metadata,
            settings: ra.settings,
        }));

        const awsConfig = form.getValues();
        
        const registrationPayload = {
            primary_account: accountType === 'primary',
            registration_request_time: new Date().toISOString(),
            status: "REQUESTED"
        };
        
        const newAwsConfig = { ...awsConfig, registration: registrationPayload };

        if (updatedRaPayload.metadata) {
            updatedRaPayload.metadata[AWS_IOT_METADATA_KEY] = newAwsConfig;
        } else {
            updatedRaPayload.metadata = { [AWS_IOT_METADATA_KEY]: newAwsConfig };
        }
        
        await createOrUpdateRa(updatedRaPayload, user.access_token, true, ra.id);
        toast({ title: "Success", description: "CA synchronization request has been sent." });
        onUpdate();
    } catch (e: any) {
        toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };
  
  const sectionTitleStyle = "text-lg font-semibold";
  const registrationInfo = ra?.metadata?.[AWS_IOT_METADATA_KEY]?.registration;

  const getStatusContent = (regInfo: any) => {
    switch(regInfo.status) {
        case 'COMPLETED':
            return {
                Icon: CheckCircle,
                variant: 'default',
                title: 'CA Registration Status: COMPLETED',
                message: `CA registration completed successfully at ${format(parseISO(regInfo.registration_request_time), 'PPpp')}.`,
            };
        case 'FAILED':
             return {
                Icon: XCircle,
                variant: 'destructive',
                title: 'CA Registration Status: FAILED',
                message: `CA registration failed. Please check logs and try again.`,
            };
        case 'REQUESTED':
        default:
             return {
                Icon: AlertTriangle,
                variant: 'warning',
                title: 'CA Registration Status: REQUESTED',
                message: "Registering process underway. CA should be registered soon, click on 'Reload & Check' periodically.",
            };
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <h3 className={sectionTitleStyle}>AWS IoT Settings</h3>
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="aws_iot_manager_instance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AWS IoT Manager Instance</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue="aws.iot">
                    <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="aws.iot">aws.iot</SelectItem></SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <h3 className={sectionTitleStyle}>Thing Provisioning</h3>
        <Card>
          <CardContent className="pt-6 space-y-4">
             <FormField
                control={form.control}
                name="registration_mode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Registration Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="NONE">None</SelectItem>
                                <SelectItem value="AUTOMATIC_REGISTRATION">Automatic Registration on Enrollment</SelectItem>
                                <SelectItem value="JITP_BY_CA">JITP Template</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                )}
            />

            {(watchRegistrationMode === 'JITP_BY_CA' || watchRegistrationMode === 'AUTOMATIC_REGISTRATION') && (
                <>
                {registrationInfo ? (() => {
                    const { Icon, variant, title, message } = getStatusContent(registrationInfo);
                    return (
                        <Alert variant={variant as any}>
                            <Icon className="h-4 w-4" />
                            <AlertTitle>{title}</AlertTitle>
                            <AlertDescription asChild>
                                <div className="space-y-3">
                                    <p>{message}</p>
                                    <div className="bg-gray-900 text-gray-200 font-mono text-xs p-4 rounded-md overflow-x-auto">
                                        <pre><code>{JSON.stringify({ registration: registrationInfo }, null, 2)}</code></pre>
                                    </div>
                                    <Button type="button" variant="link" className="p-0 h-auto font-semibold" onClick={onUpdate}>
                                        Reload & Check Status
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )
                })() : (
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Enrollment CA Not Synchronized</AlertTitle>
                      <AlertDescription asChild>
                        <div className="space-y-3 mt-2">
                          <p>The selected Enrollment CA is not registered in AWS. Make sure to synchronize it first.</p>
                          <div className="flex items-end gap-4 pt-2">
                              <div className="flex-grow space-y-1">
                                  <Label>Register as</Label>
                                  <Select value={accountType} onValueChange={(v) => setAccountType(v as any)} disabled={isSyncing}>
                                      <SelectTrigger>
                                          <SelectValue placeholder="Select account type..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="primary">
                                              <div className="flex flex-col items-start text-left py-1 whitespace-normal">
                                                  <p>Primary Account - Register as CA owner</p>
                                                  <p className="text-xs text-muted-foreground">Only one account can be registered as the CA owner within the same AWS Region. It is required to have access to the CA private key.</p>
                                              </div>
                                          </SelectItem>
                                          <SelectItem value="secondary">
                                              <div className="flex flex-col items-start text-left py-1 whitespace-normal">
                                                  <p>Secondary Account</p>
                                                  <p className="text-xs text-muted-foreground">No access to the CA private key is needed.</p>
                                              </div>
                                          </SelectItem>
                                      </SelectContent>
                                  </Select>
                              </div>
                              <Button type="button" variant="outline" onClick={handleSyncCa} disabled={isSyncing}>
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Synchronize CA
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
        <Card>
            <CardContent className="pt-6">
                <FormField
                    control={form.control}
                    name="groups"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <TagInput {...field} placeholder="Add thing groups..."/>
                            </FormControl>
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>

        <h3 className={sectionTitleStyle}>AWS IoT Core Policies</h3>
        <Card>
            <CardContent className="pt-6 space-y-2">
                 {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 mb-2">
                        <FormField
                        control={form.control}
                        name={`policies.${index}.name`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <Input {...field} placeholder="Enter policy name"/>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="flex-shrink-0">
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                 ))}
                 <Button type="button" variant="default" size="sm" onClick={() => append({ name: '' })}>
                    Add Policy
                 </Button>
            </CardContent>
        </Card>

        <h3 className={sectionTitleStyle}>Shadows &amp; Device Automation</h3>
        <Card>
            <CardContent className="pt-6 space-y-4">
                 <FormField
                    control={form.control}
                    name="shadow_config.enable"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel>Update Device - Thing Shadow on relevant events</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl>
                        </FormItem>
                    )}
                />

                {watchShadowEnable && (
                     <div className="pl-4 space-y-4 border-l ml-2 pt-2">
                        <FormField
                            control={form.control}
                            name="shadow_config.shadow_type"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Shadow Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Classic">Classic</SelectItem>
                                        <SelectItem value="Named">Named</SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                         {watchShadowType === 'Named' && (
                             <FormField
                                control={form.control}
                                name="shadow_config.shadow_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Shadow Name</FormLabel>
                                        <Input {...field} placeholder="Enter named shadow..."/>
                                    </FormItem>
                                )}
                            />
                         )}

                        <Alert variant="warning">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Policy Required</AlertTitle>
                            <AlertDescription>
                                Make sure to add a policy allowing access to shadow topics
                            </AlertDescription>
                        </Alert>
                     </div>
                )}
            </CardContent>
        </Card>
        
        <h3 className={sectionTitleStyle}>Remediation</h3>
        <Card>
            <CardHeader><CardTitle className="text-base">AWS Account ID</CardTitle></CardHeader>
            <CardContent>
                 <FormField
                    control={form.control}
                    name="remediation_config.account_id"
                    render={({ field }) => (
                        <FormItem>
                            <Input {...field} placeholder="e.g., 123456789012" />
                            <Button type="button" variant="link" className="p-0 h-auto mt-2" onClick={() => alert("Add remediation policy (placeholder)")}>
                                Add "lms-remediation-access" Policy
                            </Button>
                        </FormItem>
                    )}
                />
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
