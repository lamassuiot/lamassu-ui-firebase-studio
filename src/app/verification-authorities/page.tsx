
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Settings, PlusCircle, Loader2 } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, findCaById } from '@/lib/ca-data';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { useAuth } from '@/contexts/AuthContext';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal'; 

interface VAConfig {
  caId: string; 
  refreshInterval: string; 
  validity: string;        
  subjectKeyIDSigner: string | null; 
  regenerateOnRevoke: boolean;
}

const getDefaultVAConfig = (caId: string): VAConfig => ({
  caId,
  refreshInterval: '24h',
  validity: '7d',
  subjectKeyIDSigner: null,
  regenerateOnRevoke: true,
});

export default function VerificationAuthoritiesPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedCaForConfig, setSelectedCaForConfig] = useState<CA | null>(null);
  const [config, setConfig] = useState<VAConfig | null>(null);
  
  const [isCaSelectModalOpen, setIsCaSelectModalOpen] = useState(false);
  const [isSubjectKeyIdSignerModalOpen, setIsSubjectKeyIdSignerModalOpen] = useState(false);
  
  const [availableCAs, setAvailableCAs] = useState<CA[]>([]); 
  const [isLoadingCAs, setIsLoadingCAs] = useState(false);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const loadCAs = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) setErrorCAs("User not authenticated. Cannot load CAs.");
      setIsLoadingCAs(false);
      return;
    }
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      setAvailableCAs(fetchedCAs);
    } catch (err: any) {
      let errorMessage = 'Failed to load available CAs.';
      if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }
      setErrorCAs(errorMessage);
      setAvailableCAs([]);
    } finally {
      setIsLoadingCAs(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        loadCAs();
    }
  }, [loadCAs, authLoading]);

  useEffect(() => {
    if (selectedCaForConfig) {
      console.log(`Fetching/loading VA config for CA: ${selectedCaForConfig.id}`);
      setConfig(getDefaultVAConfig(selectedCaForConfig.id));
    } else {
      setConfig(null);
    }
  }, [selectedCaForConfig]);

  const handleCaSelectedForConfiguration = (ca: CA) => {
    setSelectedCaForConfig(ca);
    setIsCaSelectModalOpen(false);
  };

  const handleSubjectKeyIdSignerSelected = (ca: CA) => {
    if (config) {
      setConfig({ ...config, subjectKeyIDSigner: ca.id });
    }
    setIsSubjectKeyIdSignerModalOpen(false);
  };

  const handleInputChange = (key: 'refreshInterval' | 'validity', value: string) => {
    if (config) {
      setConfig({ ...config, [key]: value });
    }
  };
  
  const handleSwitchChange = (key: 'regenerateOnRevoke') => {
    if (config) {
      setConfig({ ...config, [key]: !config[key] });
    }
  };

  const handleSaveConfig = () => {
    if (config && selectedCaForConfig) {
      console.log("Saving VA Configuration for CA:", selectedCaForConfig.id, config);
      alert(`Mock saving configuration for CA: ${selectedCaForConfig.name}`);
    }
  };
  
  const subjectKeyIdSignerCaDetails = config?.subjectKeyIDSigner 
    ? findCaById(config.subjectKeyIDSigner, availableCAs) 
    : null;
  
  return (
    <div className="space-y-6 w-full">
      <div> 
        <div className="p-6"> 
          <div className="flex items-center space-x-3 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Validation Authority (VA) Configuration</h1> 
          </div>
          <p className="text-sm text-muted-foreground">Configure VA settings per Certificate Authority.</p> 
        </div>
        <div className="p-6 pt-0"> 
          <div className="mb-6 space-y-1">
            <Label htmlFor="ca-select-button" className="block text-base font-medium">
                Select Certificate Authority to Configure
            </Label>
            <Button
                id="ca-select-button"
                variant="outline"
                onClick={() => setIsCaSelectModalOpen(true)}
                className="w-full md:w-2/3 lg:w-1/2 justify-start text-left font-normal"
                disabled={isLoadingCAs || authLoading}
            >
                {isLoadingCAs || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (selectedCaForConfig ? `${selectedCaForConfig.name} (${selectedCaForConfig.id.substring(0,8)}...)` : "Click to Select a CA...")}
            </Button>
          </div>

          <CaSelectorModal
            isOpen={isCaSelectModalOpen}
            onOpenChange={setIsCaSelectModalOpen}
            title="Select CA for VA Configuration"
            description="Choose an existing CA to configure its Validation Authority settings."
            availableCAs={availableCAs}
            isLoadingCAs={isLoadingCAs}
            errorCAs={errorCAs}
            loadCAsAction={loadCAs}
            onCaSelected={handleCaSelectedForConfiguration}
            currentSelectedCaId={selectedCaForConfig?.id}
            isAuthLoading={authLoading}
          />
          
          {selectedCaForConfig && (
            <div className="my-4">
              <CaVisualizerCard ca={selectedCaForConfig} className="shadow-md border-primary max-w-md" />
            </div>
          )}

          {config && selectedCaForConfig && (
            <Card className="border-primary/50 shadow-md mt-4"> 
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Settings className="mr-2 h-6 w-6 text-primary" />
                  VA Settings for: <span className="font-semibold ml-1">{selectedCaForConfig.name}</span>
                </CardTitle>
                <CardDescription>Define validation parameters for this CA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div>
                  <Label htmlFor="va-refreshInterval">CRL Refresh Interval</Label>
                  <Input 
                    id="va-refreshInterval" 
                    value={config.refreshInterval} 
                    onChange={(e) => handleInputChange('refreshInterval', e.target.value)} 
                    placeholder="e.g., 24h, 30m, 7d"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">How often to check for new CRLs. Units: h, m, d.</p>
                </div>
                <div>
                  <Label htmlFor="va-validity">CRL Max Validity / Cache Duration</Label>
                  <Input 
                    id="va-validity" 
                    value={config.validity} 
                    onChange={(e) => handleInputChange('validity', e.target.value)} 
                    placeholder="e.g., 7d, 48h"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Maximum time to consider a cached CRL valid. Units: h, m, d.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="va-subjectKeyIDSigner" className="block">Subject Key ID Signer CA</Label>
                  <Button
                    id="va-subjectKeyIDSigner"
                    type="button"
                    variant="outline"
                    onClick={() => setIsSubjectKeyIdSignerModalOpen(true)}
                    className="w-full md:w-2/3 lg:w-1/2 justify-start text-left font-normal"
                    disabled={isLoadingCAs || authLoading}
                  >
                    {isLoadingCAs || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                     subjectKeyIdSignerCaDetails ? `${subjectKeyIdSignerCaDetails.name} (${subjectKeyIdSignerCaDetails.id.substring(0,8)}...)` 
                     : "Select Signer CA..."}
                  </Button>
                  {subjectKeyIdSignerCaDetails && (
                    <div className="mt-2">
                      <CaVisualizerCard ca={subjectKeyIdSignerCaDetails} className="shadow-none border-border max-w-xs" />
                    </div>
                  )}
                   <p className="text-xs text-muted-foreground mt-1">CA responsible for signing the certificate used for SubjectKeyIdentifier checks.</p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="va-regenerateOnRevoke" 
                    checked={config.regenerateOnRevoke} 
                    onCheckedChange={() => handleSwitchChange('regenerateOnRevoke')} 
                  />
                  <Label htmlFor="va-regenerateOnRevoke">Regenerate CRL Immediately on Revocation</Label>
                </div>

                <CaSelectorModal
                    isOpen={isSubjectKeyIdSignerModalOpen}
                    onOpenChange={setIsSubjectKeyIdSignerModalOpen}
                    title="Select Subject Key ID Signer CA"
                    description="Choose the CA whose key will be used to sign certificates for SubjectKeyIdentifier matching."
                    availableCAs={availableCAs} 
                    isLoadingCAs={isLoadingCAs}
                    errorCAs={errorCAs}
                    loadCAsAction={loadCAs}
                    onCaSelected={handleSubjectKeyIdSignerSelected}
                    currentSelectedCaId={config.subjectKeyIDSigner}
                    isAuthLoading={authLoading}
                />

                <div className="mt-8 flex justify-end">
                  <Button onClick={handleSaveConfig} size="lg">
                    <PlusCircle className="mr-2 h-5 w-5"/> Save VA Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedCaForConfig && !isLoadingCAs && !authLoading && (
            <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                <h3 className="text-lg font-semibold text-muted-foreground">Select a CA</h3>
                <p className="text-sm text-muted-foreground">Choose a Certificate Authority from the selector above to view or edit its VA settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

