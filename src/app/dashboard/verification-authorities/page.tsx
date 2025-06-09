
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Settings, FileText, ListChecks, Clock, Repeat, UploadCloud, KeyRound, Bell, TestTube2, Terminal, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData } from '@/lib/ca-data';

interface VAConfig {
  caId: string;
  general: {
    crlEnabled: boolean;
    ocspEnabled: boolean;
  };
  crl: {
    retrievalInterval: number;
    retrievalUnit: 'minutes' | 'hours' | 'days';
    cacheDuration: number;
    cacheUnit: 'minutes' | 'hours' | 'days';
    retryAttempts: number;
    retryInterval: number;
    retryIntervalUnit: 'minutes' | 'seconds';
    manualCrls: Array<{ id: string, name: string, uploadDate: string }>;
    validateSignature: boolean;
    logVerbosity: 'none' | 'basic' | 'detailed' | 'debug';
    logStoragePath: string;
    logRotationMaxSizeMB: number;
    logRotationMaxFiles: number;
  };
  ocsp: {
    responderUrls: Array<{ id: string, url: string }>;
    requestTimeoutMs: number;
    cacheDuration: number;
    cacheUnit: 'minutes' | 'hours';
    cacheSizeLimitMB: number;
    retryAttempts: number;
    retryInterval: number;
    retryIntervalUnit: 'minutes' | 'seconds';
    enableNonce: boolean;
    trustedResponderCertificates: Array<{ id: string, name: string }>;
    validateResponseSignature: boolean;
    verifyResponderCertificate: boolean;
    checkResponseFreshness: boolean;
    logVerbosity: 'none' | 'basic' | 'detailed' | 'debug';
    logStoragePath: string;
    logRotationMaxSizeMB: number;
    logRotationMaxFiles: number;
  };
  advanced: {
    alertingEmail: string;
    alertOnFailure: boolean;
    alertOnCriticalEvent: boolean;
    automatedTestingEnabled: boolean;
    automatedTestingSchedule: string; // cron string
    apiEndpoint: string;
  };
}

const getDefaultVAConfig = (caId: string): VAConfig => ({
  caId,
  general: {
    crlEnabled: true,
    ocspEnabled: true,
  },
  crl: {
    retrievalInterval: 24,
    retrievalUnit: 'hours',
    cacheDuration: 6,
    cacheUnit: 'hours',
    retryAttempts: 3,
    retryInterval: 5,
    retryIntervalUnit: 'minutes',
    manualCrls: [],
    validateSignature: true,
    logVerbosity: 'basic',
    logStoragePath: `/var/log/lamassu_va/${caId}/crl.log`,
    logRotationMaxSizeMB: 100,
    logRotationMaxFiles: 5,
  },
  ocsp: {
    responderUrls: [{ id: crypto.randomUUID(), url: 'http://ocsp.example.com/primary' }],
    requestTimeoutMs: 5000,
    cacheDuration: 1,
    cacheUnit: 'hours',
    cacheSizeLimitMB: 256,
    retryAttempts: 2,
    retryInterval: 30,
    retryIntervalUnit: 'seconds',
    enableNonce: true,
    trustedResponderCertificates: [],
    validateResponseSignature: true,
    verifyResponderCertificate: true,
    checkResponseFreshness: true,
    logVerbosity: 'basic',
    logStoragePath: `/var/log/lamassu_va/${caId}/ocsp.log`,
    logRotationMaxSizeMB: 100,
    logRotationMaxFiles: 5,
  },
  advanced: {
    alertingEmail: 'alerts@example.com',
    alertOnFailure: true,
    alertOnCriticalEvent: true,
    automatedTestingEnabled: false,
    automatedTestingSchedule: '0 0 * * *', // every day at midnight
    apiEndpoint: `https://api.example.com/va/${caId}/config`,
  },
});


export default function VerificationAuthoritiesPage() {
  const [selectedCaId, setSelectedCaId] = useState<string | undefined>(undefined);
  const [config, setConfig] = useState<VAConfig | null>(null);
  const [allCAs, setAllCAs] = useState<CA[]>([]);

  useEffect(() => {
    // Flatten the CA tree for the selector
    const flattenCAs = (cas: CA[], targetArray: CA[] = []) => {
      for (const ca of cas) {
        targetArray.push(ca);
        if (ca.children) {
          flattenCAs(ca.children, targetArray);
        }
      }
      return targetArray;
    };
    setAllCAs(flattenCAs(certificateAuthoritiesData));
  }, []);

  useEffect(() => {
    if (selectedCaId) {
      // In a real app, you'd fetch existing config or use defaults
      setConfig(getDefaultVAConfig(selectedCaId));
    } else {
      setConfig(null);
    }
  }, [selectedCaId]);

  const handleInputChange = <K1 extends keyof VAConfig, K2 extends keyof VAConfig[K1]>(
    section: K1,
    key: K2,
    value: VAConfig[K1][K2]
  ) => {
    setConfig(prevConfig => {
      if (!prevConfig) return null;
      return {
        ...prevConfig,
        [section]: {
          ...prevConfig[section],
          [key]: value,
        },
      };
    });
  };
  
  const handleSwitchChange = <K1 extends keyof VAConfig, K2 extends keyof VAConfig[K1]>(
    section: K1,
    key: K2
  ) => {
    setConfig(prevConfig => {
      if (!prevConfig) return null;
      const currentSection = prevConfig[section];
      // Ensure the key exists and is boolean before toggling
      if (typeof currentSection[key] === 'boolean') {
        return {
          ...prevConfig,
          [section]: {
            ...currentSection,
            [key]: !currentSection[key] as VAConfig[K1][K2], // Type assertion
          },
        };
      }
      return prevConfig;
    });
  };


  const handleSaveConfig = () => {
    if (config) {
      console.log("Saving VA Configuration for CA:", selectedCaId, config);
      alert(`Mock saving configuration for CA: ${selectedCaId}`);
    }
  };

  const handleAddOcspUrl = () => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ocsp: {
          ...prev.ocsp,
          responderUrls: [...prev.ocsp.responderUrls, {id: crypto.randomUUID(), url: ''}]
        }
      }
    })
  };

  const handleRemoveOcspUrl = (id: string) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ocsp: {
          ...prev.ocsp,
          responderUrls: prev.ocsp.responderUrls.filter(item => item.id !== id)
        }
      }
    })
  };
  
  const handleOcspUrlChange = (id: string, newUrl: string) => {
    setConfig(prev => {
      if (!prev) return null;
      return {
        ...prev,
        ocsp: {
          ...prev.ocsp,
          responderUrls: prev.ocsp.responderUrls.map(item => item.id === id ? {...item, url: newUrl} : item)
        }
      }
    })
  };

  if (!config && selectedCaId) {
    return <p>Loading configuration for {selectedCaId}...</p>;
  }
  
  const selectedCa = allCAs.find(ca => ca.id === selectedCaId);

  return (
    <div className="space-y-6 w-full">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-headline">Validation Authority (VA) Configuration</CardTitle>
          </div>
          <CardDescription>Configure CRL and OCSP settings per Certificate Authority.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <Label htmlFor="ca-select">Select Certificate Authority to Configure</Label>
            <Select value={selectedCaId} onValueChange={setSelectedCaId}>
              <SelectTrigger id="ca-select" className="w-full md:w-1/2">
                <SelectValue placeholder="Select a CA..." />
              </SelectTrigger>
              <SelectContent>
                {allCAs.map(ca => (
                  <SelectItem key={ca.id} value={ca.id}>{ca.name} ({ca.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config && selectedCa && (
            <Card className="border-primary shadow-md">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-primary" />
                  VA Settings for: <span className="font-semibold ml-1">{selectedCa.name}</span>
                </CardTitle>
                <CardDescription>Customize CRL, OCSP, and advanced validation parameters for this CA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* General Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">General Validation Methods</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch id="crlEnabled" checked={config.general.crlEnabled} onCheckedChange={() => handleSwitchChange('general', 'crlEnabled')} />
                      <Label htmlFor="crlEnabled">Enable CRL Validation</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="ocspEnabled" checked={config.general.ocspEnabled} onCheckedChange={() => handleSwitchChange('general', 'ocspEnabled')} />
                      <Label htmlFor="ocspEnabled">Enable OCSP Validation</Label>
                    </div>
                  </CardContent>
                </Card>

                <Accordion type="multiple" defaultValue={['crl', 'ocsp']} className="w-full">
                  {/* CRL Configuration */}
                  <AccordionItem value="crl">
                    <AccordionTrigger className="text-lg font-medium">
                      <FileText className="mr-2 h-5 w-5" /> CRL Configuration
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4 border rounded-md bg-muted/20">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="crlRetrievalInterval">Retrieval Interval</Label>
                          <div className="flex gap-2">
                            <Input id="crlRetrievalInterval" type="number" value={config.crl.retrievalInterval} onChange={e => handleInputChange('crl', 'retrievalInterval', parseInt(e.target.value))} className="w-2/3" />
                            <Select value={config.crl.retrievalUnit} onValueChange={val => handleInputChange('crl', 'retrievalUnit', val as VAConfig['crl']['retrievalUnit'])}>
                              <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="crlCacheDuration">Cache Duration</Label>
                           <div className="flex gap-2">
                            <Input id="crlCacheDuration" type="number" value={config.crl.cacheDuration} onChange={e => handleInputChange('crl', 'cacheDuration', parseInt(e.target.value))} className="w-2/3" />
                            <Select value={config.crl.cacheUnit} onValueChange={val => handleInputChange('crl', 'cacheUnit', val as VAConfig['crl']['cacheUnit'])}>
                              <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="minutes">Minutes</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <Label>Retry Logic</Label>
                      <div className="grid md:grid-cols-3 gap-4 p-3 border rounded">
                        <div>
                          <Label htmlFor="crlRetryAttempts">Attempts</Label>
                          <Input id="crlRetryAttempts" type="number" value={config.crl.retryAttempts} onChange={e => handleInputChange('crl', 'retryAttempts', parseInt(e.target.value))} />
                        </div>
                        <div>
                          <Label htmlFor="crlRetryInterval">Interval</Label>
                           <div className="flex gap-2">
                            <Input id="crlRetryInterval" type="number" value={config.crl.retryInterval} onChange={e => handleInputChange('crl', 'retryInterval', parseInt(e.target.value))} className="w-2/3"/>
                             <Select value={config.crl.retryIntervalUnit} onValueChange={val => handleInputChange('crl', 'retryIntervalUnit', val as VAConfig['crl']['retryIntervalUnit'])}>
                              <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="seconds">Seconds</SelectItem>
                                <SelectItem value="minutes">Minutes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                       <div>
                        <Label>Manual CRLs</Label>
                        <Button variant="outline" size="sm" className="ml-2"><UploadCloud className="mr-2 h-4 w-4" /> Upload CRL</Button>
                        {/* Placeholder for listing managed CRLs */}
                        {config.crl.manualCrls.length > 0 && <div className="mt-2 text-sm text-muted-foreground">Managed CRLs: ...</div>}
                      </div>
                       <div className="flex items-center space-x-2">
                        <Switch id="crlValidateSignature" checked={config.crl.validateSignature} onCheckedChange={() => handleSwitchChange('crl', 'validateSignature')} />
                        <Label htmlFor="crlValidateSignature">Enable CRL Signature Validation</Label>
                      </div>
                      <Label>Logging</Label>
                       <div className="grid md:grid-cols-2 gap-4 p-3 border rounded">
                          <div>
                            <Label htmlFor="crlLogVerbosity">Verbosity</Label>
                            <Select value={config.crl.logVerbosity} onValueChange={val => handleInputChange('crl', 'logVerbosity', val as VAConfig['crl']['logVerbosity'])}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="basic">Basic</SelectItem>
                                <SelectItem value="detailed">Detailed</SelectItem>
                                <SelectItem value="debug">Debug</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                           <div>
                            <Label htmlFor="crlLogStoragePath">Storage Path</Label>
                            <Input id="crlLogStoragePath" value={config.crl.logStoragePath} onChange={e => handleInputChange('crl', 'logStoragePath', e.target.value)} />
                          </div>
                           <div>
                            <Label htmlFor="crlLogRotationMaxSizeMB">Max Size (MB)</Label>
                            <Input id="crlLogRotationMaxSizeMB" type="number" value={config.crl.logRotationMaxSizeMB} onChange={e => handleInputChange('crl', 'logRotationMaxSizeMB', parseInt(e.target.value))} />
                          </div>
                           <div>
                            <Label htmlFor="crlLogRotationMaxFiles">Max Files</Label>
                            <Input id="crlLogRotationMaxFiles" type="number" value={config.crl.logRotationMaxFiles} onChange={e => handleInputChange('crl', 'logRotationMaxFiles', parseInt(e.target.value))} />
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* OCSP Configuration */}
                  <AccordionItem value="ocsp">
                    <AccordionTrigger className="text-lg font-medium">
                      <ListChecks className="mr-2 h-5 w-5" /> OCSP Configuration
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4 border rounded-md bg-muted/20">
                        <div>
                            <Label>OCSP Responder URLs (Failover Order)</Label>
                            {config.ocsp.responderUrls.map((item, index) => (
                                <div key={item.id} className="flex items-center gap-2 mt-1">
                                    <Input 
                                        value={item.url} 
                                        onChange={e => handleOcspUrlChange(item.id, e.target.value)}
                                        placeholder={`http://ocsp.responder${index + 1}.com`}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOcspUrl(item.id)} title="Remove URL">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddOcspUrl} className="mt-2">
                                <Plus className="mr-2 h-4 w-4" /> Add Responder URL
                            </Button>
                        </div>
                         <div>
                          <Label htmlFor="ocspRequestTimeoutMs">Request Timeout (ms)</Label>
                          <Input id="ocspRequestTimeoutMs" type="number" value={config.ocsp.requestTimeoutMs} onChange={e => handleInputChange('ocsp', 'requestTimeoutMs', parseInt(e.target.value))} />
                        </div>
                        <Label>Caching</Label>
                        <div className="grid md:grid-cols-2 gap-4 p-3 border rounded">
                           <div>
                            <Label htmlFor="ocspCacheDuration">Duration</Label>
                             <div className="flex gap-2">
                               <Input id="ocspCacheDuration" type="number" value={config.ocsp.cacheDuration} onChange={e => handleInputChange('ocsp', 'cacheDuration', parseInt(e.target.value))} className="w-2/3" />
                               <Select value={config.ocsp.cacheUnit} onValueChange={val => handleInputChange('ocsp', 'cacheUnit', val as VAConfig['ocsp']['cacheUnit'])}>
                                <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="hours">Hours</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                          </div>
                           <div>
                            <Label htmlFor="ocspCacheSizeLimitMB">Size Limit (MB)</Label>
                            <Input id="ocspCacheSizeLimitMB" type="number" value={config.ocsp.cacheSizeLimitMB} onChange={e => handleInputChange('ocsp', 'cacheSizeLimitMB', parseInt(e.target.value))} />
                          </div>
                        </div>
                         <Label>Retry Logic</Label>
                        <div className="grid md:grid-cols-2 gap-4 p-3 border rounded">
                           <div>
                            <Label htmlFor="ocspRetryAttempts">Attempts</Label>
                            <Input id="ocspRetryAttempts" type="number" value={config.ocsp.retryAttempts} onChange={e => handleInputChange('ocsp', 'retryAttempts', parseInt(e.target.value))} />
                          </div>
                           <div>
                            <Label htmlFor="ocspRetryInterval">Interval</Label>
                            <div className="flex gap-2">
                                <Input id="ocspRetryInterval" type="number" value={config.ocsp.retryInterval} onChange={e => handleInputChange('ocsp', 'retryInterval', parseInt(e.target.value))} className="w-2/3"/>
                                <Select value={config.ocsp.retryIntervalUnit} onValueChange={val => handleInputChange('ocsp', 'retryIntervalUnit', val as VAConfig['ocsp']['retryIntervalUnit'])}>
                                <SelectTrigger className="w-1/3"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="seconds">Seconds</SelectItem>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Switch id="ocspEnableNonce" checked={config.ocsp.enableNonce} onCheckedChange={() => handleSwitchChange('ocsp', 'enableNonce')} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Using a nonce helps prevent replay attacks for OCSP responses.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <Label htmlFor="ocspEnableNonce">Enable Nonce Usage</Label>
                        </div>
                        <div>
                            <Label>Trusted OCSP Responder Certificates</Label>
                            <Button variant="outline" size="sm" className="ml-2"><KeyRound className="mr-2 h-4 w-4" /> Manage Certificates</Button>
                             {config.ocsp.trustedResponderCertificates.length > 0 && <div className="mt-2 text-sm text-muted-foreground">Trusted Responders: ...</div>}
                        </div>
                        <Label>Response Validation</Label>
                        <div className="space-y-2 p-3 border rounded">
                            <div className="flex items-center space-x-2">
                                <Switch id="ocspValidateResponseSignature" checked={config.ocsp.validateResponseSignature} onCheckedChange={() => handleSwitchChange('ocsp', 'validateResponseSignature')}/>
                                <Label htmlFor="ocspValidateResponseSignature">Check Response Signature</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="ocspVerifyResponderCertificate" checked={config.ocsp.verifyResponderCertificate} onCheckedChange={() => handleSwitchChange('ocsp', 'verifyResponderCertificate')}/>
                                <Label htmlFor="ocspVerifyResponderCertificate">Verify Responder's Certificate</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <TooltipProvider>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Switch id="ocspCheckResponseFreshness" checked={config.ocsp.checkResponseFreshness} onCheckedChange={() => handleSwitchChange('ocsp', 'checkResponseFreshness')}/>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Ensures the OCSP response is recent and not outdated.</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Label htmlFor="ocspCheckResponseFreshness">Check Response Freshness (thisUpdate, nextUpdate)</Label>
                            </div>
                        </div>
                        <Label>Logging</Label>
                        <div className="grid md:grid-cols-2 gap-4 p-3 border rounded">
                          <div>
                            <Label htmlFor="ocspLogVerbosity">Verbosity</Label>
                            <Select value={config.ocsp.logVerbosity} onValueChange={val => handleInputChange('ocsp', 'logVerbosity', val as VAConfig['ocsp']['logVerbosity'])}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="basic">Basic</SelectItem>
                                <SelectItem value="detailed">Detailed</SelectItem>
                                <SelectItem value="debug">Debug</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                           <div>
                            <Label htmlFor="ocspLogStoragePath">Storage Path</Label>
                            <Input id="ocspLogStoragePath" value={config.ocsp.logStoragePath} onChange={e => handleInputChange('ocsp', 'logStoragePath', e.target.value)} />
                          </div>
                           <div>
                            <Label htmlFor="ocspLogRotationMaxSizeMB">Max Size (MB)</Label>
                            <Input id="ocspLogRotationMaxSizeMB" type="number" value={config.ocsp.logRotationMaxSizeMB} onChange={e => handleInputChange('ocsp', 'logRotationMaxSizeMB', parseInt(e.target.value))} />
                          </div>
                           <div>
                            <Label htmlFor="ocspLogRotationMaxFiles">Max Files</Label>
                            <Input id="ocspLogRotationMaxFiles" type="number" value={config.ocsp.logRotationMaxFiles} onChange={e => handleInputChange('ocsp', 'logRotationMaxFiles', parseInt(e.target.value))} />
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Advanced Options */}
                  <AccordionItem value="advanced">
                    <AccordionTrigger className="text-lg font-medium">
                      <Settings className="mr-2 h-5 w-5" /> Advanced Options
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-4 border rounded-md bg-muted/20">
                      <div className="space-y-2">
                        <Label htmlFor="alertingEmail"><Bell className="inline mr-1 h-4 w-4" />Alerting Email</Label>
                        <Input id="alertingEmail" type="email" placeholder="admin@example.com" value={config.advanced.alertingEmail} onChange={e => handleInputChange('advanced', 'alertingEmail', e.target.value)} />
                        <div className="flex items-center space-x-2">
                            <Switch id="alertOnFailure" checked={config.advanced.alertOnFailure} onCheckedChange={() => handleSwitchChange('advanced', 'alertOnFailure')}/>
                            <Label htmlFor="alertOnFailure">Alert on Validation Failures</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="alertOnCriticalEvent" checked={config.advanced.alertOnCriticalEvent} onCheckedChange={() => handleSwitchChange('advanced', 'alertOnCriticalEvent')}/>
                            <Label htmlFor="alertOnCriticalEvent">Alert on Critical System Events</Label>
                        </div>
                      </div>
                       <div className="space-y-2">
                        <Label><TestTube2 className="inline mr-1 h-4 w-4" />Scheduled Automated Testing</Label>
                         <div className="flex items-center space-x-2">
                            <Switch id="automatedTestingEnabled" checked={config.advanced.automatedTestingEnabled} onCheckedChange={() => handleSwitchChange('advanced', 'automatedTestingEnabled')}/>
                            <Label htmlFor="automatedTestingEnabled">Enable Automated Validation Checks</Label>
                        </div>
                        {config.advanced.automatedTestingEnabled && (
                             <div>
                                <Label htmlFor="automatedTestingSchedule">Testing Schedule (Cron)</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input id="automatedTestingSchedule" placeholder="0 2 * * *" value={config.advanced.automatedTestingSchedule} onChange={e => handleInputChange('advanced', 'automatedTestingSchedule', e.target.value)} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Standard cron format. e.g., '0 2 * * *' for 2 AM daily.</p>
                                    </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label><Terminal className="inline mr-1 h-4 w-4" />API/Scripting Interface</Label>
                         <Textarea readOnly value={`Mock API Endpoint: ${config.advanced.apiEndpoint}\nUse API Key: XXXXXX-YYYYYY-ZZZZZZ (example)`} rows={3} />
                         <p className="text-xs text-muted-foreground">Details for automation and integration.</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveConfig} size="lg">
                    Save VA Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedCaId && (
            <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                <h3 className="text-lg font-semibold text-muted-foreground">Select a CA</h3>
                <p className="text-sm text-muted-foreground">Choose a Certificate Authority from the dropdown above to view or edit its VA settings.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

