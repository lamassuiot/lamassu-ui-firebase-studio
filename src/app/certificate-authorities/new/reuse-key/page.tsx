
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Settings, Info, CalendarDays, Repeat, Loader2 } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs } from '@/lib/ca-data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ExpirationInput, type ExpirationConfig } from '@/components/shared/ExpirationInput';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal';
import type { ApiCryptoEngine } from '@/types/crypto-engine';

export default function CreateCaReuseKeyPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [caType, setCaType] = useState('root');
  const [selectedParentCa, setSelectedParentCa] = useState<CA | null>(null);
  const [caId, setCaId] = useState('');
  const [caName, setCaName] = useState('');
  
  const [existingKeyId, setExistingKeyId] = useState('');

  const [country, setCountry] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [locality, setLocality] = useState('');
  const [organization, setOrganization] = useState('');
  const [organizationalUnit, setOrganizationalUnit] = useState('');

  const [caExpiration, setCaExpiration] = useState<ExpirationConfig>({ type: 'Duration', durationValue: '10y' });
  const [issuanceExpiration, setIssuanceExpiration] = useState<ExpirationConfig>({ type: 'Duration', durationValue: '1y' });

  const [isParentCaModalOpen, setIsParentCaModalOpen] = useState(false);

  const [availableParentCAs, setAvailableParentCAs] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(false);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  
  useEffect(() => {
    setCaId(crypto.randomUUID());
  }, []);

  const loadCaData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) setErrorCAs("User not authenticated. Cannot load parent CAs.");
      setIsLoadingCAs(false);
      return;
    }
    
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      setAvailableParentCAs(fetchedCAs); 
    } catch (err: any) {
      setErrorCAs(err.message || 'Failed to load available parent CAs.');
      setAvailableParentCAs([]);
    } finally {
      setIsLoadingCAs(false);
    }

    // This mode doesn't select an engine, but other components need the list
    try {
        const response = await fetch('https://lab.lamassu.io/api/ca/v1/engines', {
            headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch crypto engines');
        const enginesData: ApiCryptoEngine[] = await response.json();
        setAllCryptoEngines(enginesData);
    } catch (err: any) {
        setAllCryptoEngines([]);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        loadCaData();
    }
  }, [loadCaData, authLoading]);

  const handleCaTypeChange = (value: string) => {
    setCaType(value);
    setSelectedParentCa(null);
  };
  
  const handleParentCaSelectFromModal = (ca: CA) => {
    setSelectedParentCa(ca);
    setIsParentCaModalOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (caType === 'intermediate' && !selectedParentCa) {
      toast({ title: "Validation Error", description: "Please select a Parent CA for intermediate CAs.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (!caName.trim() || !existingKeyId.trim()) {
      toast({ title: "Validation Error", description: "CA Name and Existing Key ID are required.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const formData = {
      caType,
      parentCaId: caType === 'root' ? 'Self-signed' : selectedParentCa?.id,
      caId,
      caName,
      existingKeyId,
      subjectDN: { C: country, ST: stateProvince, L: locality, O: organization, OU: organizationalUnit, CN: caName },
      caExpiration,
      issuanceExpiration,
    };
    
    console.log(`Mock Creating CA (Reuse Key Mode) with data:`, formData);
    toast({ title: "Mock CA Creation", description: `Reuse Key mode submitted for "${caName}". Details in console.`, variant: "default" });
    router.push('/certificate-authorities');

    setIsSubmitting(false);
  };

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/certificate-authorities/new')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Creation Methods
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Repeat className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">
              Create CA (Reuse Key Pair)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            Provision a new Root or Intermediate CA using an existing key pair from your KMS.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Repeat className="mr-2 h-5 w-5 text-muted-foreground" />KMS: Reuse Existing Key Pair</h3>
              <div className="space-y-4 p-4 border rounded-md">
                <div>
                  <Label htmlFor="cryptoEngineReuse">Crypto Engine</Label>
                  <Input id="cryptoEngineReuse" value="Determined by existing key" disabled className="mt-1 bg-muted/50" />
                  <p className="text-xs text-muted-foreground mt-1">The crypto engine will be determined by the selected key.</p>
                </div>
                <div>
                  <Label htmlFor="existingKeyId">Existing Key ID (from KMS)</Label>
                  <Input id="existingKeyId" value={existingKeyId} onChange={(e) => setExistingKeyId(e.target.value)} placeholder="Enter existing Key ID from your KMS" required className="mt-1"/>
                  {!existingKeyId.trim() && <p className="text-xs text-destructive mt-1">Existing Key ID is required.</p>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Settings className="mr-2 h-5 w-5 text-muted-foreground" />CA Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caType">CA Type</Label>
                  <Select value={caType} onValueChange={handleCaTypeChange}>
                    <SelectTrigger id="caType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Root CA</SelectItem>
                      <SelectItem value="intermediate">Intermediate CA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {caType === 'intermediate' && (
                  <div>
                    <Label htmlFor="parentCa">Parent CA</Label>
                    <Button
                      type="button" variant="outline" onClick={() => setIsParentCaModalOpen(true)}
                      className="w-full justify-start text-left font-normal mt-1" id="parentCa"
                      disabled={isLoadingCAs || authLoading}
                    >
                      {isLoadingCAs || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : selectedParentCa ? `Selected: ${selectedParentCa.name}` : "Select Parent CA..."}
                    </Button>
                    {selectedParentCa && <div className="mt-2"><CaVisualizerCard ca={selectedParentCa} className="shadow-none border-border" allCryptoEngines={allCryptoEngines}/></div>}
                    {!selectedParentCa && <p className="text-xs text-destructive mt-1">A parent CA must be selected.</p>}
                  </div>
                )}
                {caType === 'root' && (
                  <div>
                    <Label htmlFor="issuerName">Issuer</Label>
                    <Input id="issuerName" value="Self-signed" disabled className="mt-1 bg-muted/50" />
                  </div>
                )}
                <div>
                  <Label htmlFor="caId">CA ID (generated)</Label>
                  <Input id="caId" value={caId} readOnly className="mt-1 bg-muted/50" />
                </div>
                <div>
                  <Label htmlFor="caName">CA Name (Subject Common Name)</Label>
                  <Input id="caName" value={caName} onChange={(e) => setCaName(e.target.value)} placeholder="e.g., LamassuIoT Secure Services CA" required className="mt-1" />
                  {!caName.trim() && <p className="text-xs text-destructive mt-1">CA Name is required.</p>}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground" />Subject Distinguished Name (DN)</h3>
              {/* ... (Identical DN form fields as generate/page.tsx) ... */}
            </section>
            
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />Expiration Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ExpirationInput idPrefix="ca-exp" label="CA Certificate Expiration" value={caExpiration} onValueChange={setCaExpiration} />
                <ExpirationInput idPrefix="issuance-exp" label="Default End-Entity Certificate Issuance Expiration" value={issuanceExpiration} onValueChange={setIssuanceExpiration} />
              </div>
            </section>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                Create CA
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <CaSelectorModal
        isOpen={isParentCaModalOpen}
        onOpenChange={setIsParentCaModalOpen}
        title="Select Parent Certificate Authority"
        description="Choose an existing CA to be the issuer for this new intermediate CA."
        availableCAs={availableParentCAs}
        isLoadingCAs={isLoadingCAs}
        errorCAs={errorCAs}
        loadCAsAction={loadCaData}
        onCaSelected={handleParentCaSelectFromModal}
        currentSelectedCaId={selectedParentCa?.id}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      />
    </div>
  );
}
