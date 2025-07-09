
'use client';

import React, { useEffect } from 'react';
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
import { AlertTriangle, Loader2, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ApiRaItem, RaCreationPayload } from '@/lib/dms-api';
import { createOrUpdateRa } from '@/lib/dms-api';
import { useAuth } from '@/contexts/AuthContext';

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
        }
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
  
  const sectionTitleStyle = "text-lg font-semibold";

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
            {watchRegistrationMode === 'JITP_BY_CA' && (
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="space-y-3">
                        <p>The selected Enrollment CA is not registered in AWS. Make sure to synchronize it first.</p>
                        <div className="flex items-end gap-4">
                            <div className="flex-grow">
                                <Label>Register as Primary Account</Label>
                                <Select defaultValue="owner">
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="owner">Primary Account - Register as CA owner</SelectItem></SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Only one account can be registered as the CA owner within the same AWS Region. It is required to have access to the CA private key.
                                </p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => alert("Sync CA (placeholder)")}>Synchronize CA</Button>
                        </div>
                    </AlertDescription>
                </Alert>
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

        <h3 className={sectionTitleStyle}>Shadows & Device Automation</h3>
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
