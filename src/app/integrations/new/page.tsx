
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, PlusCircle, AlertTriangle, Loader2, Cloud, Settings, Network } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription as AlertDescUI, AlertTitle } from "@/components/ui/alert";
import { TagInput } from '@/components/shared/TagInput';
import { fetchAllRegistrationAuthorities, updateRaMetadata, type ApiRaItem } from '@/lib/dms-api';

const awsIotCoreSchema = z.object({
  registration_mode: z.enum(["JITP", "PRE_REGISTRATION"]),
  groups: z.array(z.string()).optional(),
  policies: z.array(z.string()).optional(),
  jitp_config: z.object({
    arn: z.string().optional(),
    aws_ca_id: z.string().optional(),
    provisioning_role_arn: z.string().min(1, "Provisioning Role ARN is required for JITP"),
    enable_template: z.boolean().default(true),
  }),
  shadow_config: z.object({
    enable: z.boolean().default(false),
    shadow_name: z.string().optional(),
  }),
});

type AwsIotCoreFormValues = z.infer<typeof awsIotCoreSchema>;

const mockedConnectors = [
  { id: 'aws.iot-core', name: 'AWS IoT Core' },
];

export default function CreateIntegrationPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [ras, setRas] = useState<ApiRaItem[]>([]);
  const [isLoadingRas, setIsLoadingRas] = useState(true);
  const [errorRas, setErrorRas] = useState<string | null>(null);

  const [selectedRaId, setSelectedRaId] = useState<string>('');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AwsIotCoreFormValues>({
    resolver: zodResolver(awsIotCoreSchema),
    defaultValues: {
      registration_mode: "JITP",
      groups: [],
      policies: [],
      jitp_config: {
        arn: '',
        aws_ca_id: '',
        provisioning_role_arn: '',
        enable_template: true,
      },
      shadow_config: {
        enable: false,
        shadow_name: ''
      }
    },
  });

  const watchRegistrationMode = form.watch("registration_mode");
  const watchShadowEnable = form.watch("shadow_config.enable");

  const loadRAs = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) return;
    setIsLoadingRas(true);
    setErrorRas(null);
    try {
      const data = await fetchAllRegistrationAuthorities(user.access_token);
      setRas(data);
    } catch (err: any) {
      setErrorRas(err.message);
    } finally {
      setIsLoadingRas(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadRAs();
    }
  }, [authLoading, loadRAs]);

  const onSubmit = async (data: AwsIotCoreFormValues) => {
    if (!selectedRaId || !selectedConnectorId || !user?.access_token) {
        toast({ title: "Validation Error", description: "Please select an RA, a Connector, and ensure you are logged in.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    
    try {
        const selectedRa = ras.find(r => r.id === selectedRaId);
        if (!selectedRa) {
            throw new Error("Selected Registration Authority not found.");
        }

        const newIntegrationKey = `lamassu.io/iot/${selectedConnectorId}`;
        
        // This is a simplified transformation. A real implementation might need more logic
        // to handle optional fields based on switches, etc.
        const newIntegrationValue = { ...data };
        if (newIntegrationValue.registration_mode !== 'JITP') {
            delete (newIntegrationValue as any).jitp_config;
        }
        if (!newIntegrationValue.shadow_config.enable) {
            delete newIntegrationValue.shadow_config.shadow_name;
        }

        const existingMetadata = selectedRa.metadata || {};
        const updatedMetadata = {
            ...existingMetadata,
            [newIntegrationKey]: newIntegrationValue,
        };

        await updateRaMetadata(selectedRaId, updatedMetadata, user.access_token);

        toast({
            title: "Integration Created",
            description: `Successfully added ${selectedConnectorId} integration to ${selectedRa.name}.`,
        });
        router.push('/integrations');

    } catch (err: any) {
        toast({ title: "Creation Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="flex items-center space-x-3">
        <Network className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-semibold">
          Create New Platform Integration
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>1. Select Target</CardTitle>
              <CardDescription>Choose the Registration Authority and the Connector you want to configure.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="ra-select">Registration Authority</Label>
                    {isLoadingRas || authLoading ? (
                        <div className="flex items-center space-x-2 h-10"><Loader2 className="h-5 w-5 animate-spin"/><p>Loading RAs...</p></div>
                    ) : errorRas ? (
                        <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescUI>{errorRas}</AlertDescUI></Alert>
                    ) : (
                        <Select value={selectedRaId} onValueChange={setSelectedRaId} disabled={isSubmitting}>
                            <SelectTrigger id="ra-select"><SelectValue placeholder="Select an RA..."/></SelectTrigger>
                            <SelectContent>
                                {ras.map(ra => <SelectItem key={ra.id} value={ra.id}>{ra.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="connector-select">Connector</Label>
                    <Select value={selectedConnectorId} onValueChange={setSelectedConnectorId} disabled={isSubmitting}>
                        <SelectTrigger id="connector-select"><SelectValue placeholder="Select a connector..."/></SelectTrigger>
                        <SelectContent>
                            {mockedConnectors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
          </Card>
          
          {selectedRaId && selectedConnectorId === 'aws.iot-core' && (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Cloud className="mr-2 text-orange-500"/>2. Configure AWS IoT Core</CardTitle>
                    <CardDescription>Provide the necessary details for the AWS IoT Core integration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="registration_mode" render={({ field }) => (
                        <FormItem><FormLabel>Registration Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="JITP">JITP (Just-In-Time Provisioning)</SelectItem><SelectItem value="PRE_REGISTRATION">Pre-registration</SelectItem></SelectContent></Select>
                        <FormMessage/></FormItem>
                    )}/>

                    {watchRegistrationMode === 'JITP' && (
                        <div className="space-y-4 p-4 border rounded-md">
                            <h4 className="font-semibold text-md text-muted-foreground">JITP Configuration</h4>
                            <FormField control={form.control} name="jitp_config.provisioning_role_arn" render={({ field }) => (
                                <FormItem><FormLabel>Provisioning Role ARN</FormLabel><FormControl><Input placeholder="arn:aws:iam::..." {...field}/></FormControl><FormMessage/></FormItem>
                            )}/>
                            <FormField control={form.control} name="jitp_config.arn" render={({ field }) => (
                                <FormItem><FormLabel>Template ARN (Optional)</FormLabel><FormControl><Input placeholder="arn:aws:iot:..." {...field}/></FormControl></FormItem>
                            )}/>
                            <FormField control={form.control} name="jitp_config.aws_ca_id" render={({ field }) => (
                                <FormItem><FormLabel>AWS CA Certificate ID (Optional)</FormLabel><FormControl><Input placeholder="e.g., a1b2c3d4e5..." {...field}/></FormControl></FormItem>
                            )}/>
                             <FormField control={form.control} name="jitp_config.enable_template" render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 pt-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl><FormLabel>Enable Template</FormLabel></FormItem>
                            )}/>
                        </div>
                    )}
                    
                    <Separator/>
                    <div className="space-y-4">
                        <FormField control={form.control} name="groups" render={({ field }) => (
                            <FormItem><FormLabel>IoT Thing Groups</FormLabel><FormControl><TagInput placeholder="Add group name and press Enter..." {...field}/></FormControl><FormDescription>Optionally, specify Thing Groups to add devices to.</FormDescription><FormMessage/></FormItem>
                        )}/>
                        <FormField control={form.control} name="policies" render={({ field }) => (
                            <FormItem><FormLabel>IoT Policies</FormLabel><FormControl><TagInput placeholder="Add policy name and press Enter..." {...field}/></FormControl><FormDescription>Optionally, specify IoT Policies to attach to the device certificate.</FormDescription><FormMessage/></FormItem>
                        )}/>
                    </div>

                    <Separator/>
                     <div className="space-y-4">
                        <FormField control={form.control} name="shadow_config.enable" render={({ field }) => (
                           <FormItem className="flex flex-row items-center space-x-2 pt-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl><FormLabel>Enable Shadow Configuration</FormLabel></FormItem>
                        )}/>
                        {watchShadowEnable && (
                             <FormField control={form.control} name="shadow_config.shadow_name" render={({ field }) => (
                                <FormItem><FormLabel>Shadow Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., my_device_shadow" {...field}/></FormControl><FormDescription>If blank, the default (unnamed) shadow will be used.</FormDescription><FormMessage/></FormItem>
                            )}/>
                        )}
                     </div>
                </CardContent>
            </Card>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting || !selectedRaId || !selectedConnectorId}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Settings className="mr-2 h-4 w-4"/>}
              {isSubmitting ? 'Saving...' : 'Save Integration'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
