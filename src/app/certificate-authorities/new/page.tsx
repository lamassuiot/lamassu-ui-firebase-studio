
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ScrollArea is now used within CaSelectorModal
import { ArrowLeft, PlusCircle, FolderTree, ChevronRight, Minus, Settings, Info, CalendarDays, KeyRound, Repeat, UploadCloud, FileText, Loader2, AlertTriangle } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs } from '@/lib/ca-data';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from "@/components/ui/textarea";
import { cn } from '@/lib/utils';
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { CryptoEngineSelector } from '@/components/shared/CryptoEngineSelector';
import { ExpirationInput, type ExpirationConfig } from '@/components/shared/ExpirationInput';
import { formatISO } from 'date-fns';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal'; // Import shared modal
import type { ApiCryptoEngine } from '@/types/crypto-engine';

const keyTypes = [
  { value: 'RSA', label: 'RSA' },
  { value: 'ECDSA', label: 'ECDSA' },
];

const rsaKeySizes = [
  { value: '2048', label: '2048 bit' },
  { value: '3072', label: '3072 bit' },
  { value: '4096', label: '4096 bit' },
];

const ecdsaKeySizes = [ 
  { value: 'P-256', label: 'P-256' },
  { value: 'P-384', label: 'P-384' },
  { value: 'P-521', label: 'P-521' },
];

const creationModes = [
  {
    id: 'newKeyPair',
    title: 'Create New CA (new Key Pair)',
    description: 'Provision a new Root or Intermediate CA. A new cryptographic key pair will be generated and managed by LamassuIoT.',
    icon: <KeyRound className="h-8 w-8 text-primary" />,
  },
  {
    id: 'reuseKeyPair',
    title: 'Create CA (reuse Key Pair)',
    description: "Provision a new Root or Intermediate CA using an existing cryptographic key pair stored securely in LamassuIoT's KMS or an external HSM.",
    icon: <Repeat className="h-8 w-8 text-primary" />,
  },
  {
    id: 'importFull',
    title: 'Import External CA (with Private Key)',
    description: 'Import an existing CA certificate along with its private key. This CA will be fully managed by LamassuIoT.',
    icon: <UploadCloud className="h-8 w-8 text-primary" />,
  },
  {
    id: 'importCertOnly',
    title: 'Import Certificate Only (no Private Key)',
    description: "Import an existing CA certificate (public key only) for trust anchor or reference purposes. LamassuIoT will not be able to sign certificates with this CA.",
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
];

const INDEFINITE_DATE_API_VALUE = "9999-12-31T23:59:59.999Z";


export default function CreateCertificateAuthorityPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [caType, setCaType] = useState('root');
  const [cryptoEngineId, setCryptoEngineId] = useState<string | undefined>(undefined);
  const [selectedParentCa, setSelectedParentCa] = useState<CA | null>(null);
  const [caId, setCaId] = useState('');
  const [caName, setCaName] = useState('');

  const [keyType, setKeyType] = useState('RSA');
  const [keySize, setKeySize] = useState('2048');

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
  const [isLoadingEngines, setIsLoadingEngines] = useState(false);
  const [errorEngines, setErrorEngines] = useState<string | null>(null);


  useEffect(() => {
    setCaId(crypto.randomUUID());
  }, []);

  const loadCaData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setErrorCAs("User not authenticated. Cannot load parent CAs.");
        setErrorEngines("User not authenticated. Cannot load Crypto Engines.");
      }
      setIsLoadingCAs(false);
      setIsLoadingEngines(false);
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
    
    setIsLoadingEngines(true);
    setErrorEngines(null);
    try {
        const response = await fetch('https://lab.lamassu.io/api/ca/v1/engines', {
            headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch crypto engines');
        const enginesData: ApiCryptoEngine[] = await response.json();
        setAllCryptoEngines(enginesData);
    } catch (err: any) {
        setErrorEngines(err.message || 'Failed to load Crypto Engines.');
        setAllCryptoEngines([]);
    } finally {
        setIsLoadingEngines(false);
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
    if (value === 'root') {
      setCaExpiration({ type: 'Duration', durationValue: '10y' });
      setIssuanceExpiration({ type: 'Duration', durationValue: '1y' });
    } else {
      setCaExpiration({ type: 'Duration', durationValue: '5y' });
      setIssuanceExpiration({ type: 'Duration', durationValue: '90d' });
    }
  };

  const handleKeyTypeChange = (value: string) => {
    setKeyType(value);
    if (value === 'RSA') {
      setKeySize('2048');
    } else if (value === 'ECDSA') {
      setKeySize('P-256');
    }
  };

  const currentKeySizeOptions = keyType === 'RSA' ? rsaKeySizes : ecdsaKeySizes;

  const handleParentCaSelectFromModal = (ca: CA) => {
    if (ca.rawApiData?.certificate.type === 'EXTERNAL_PUBLIC' || ca.status !== 'active') {
        toast({
            title: "Invalid Parent CA",
            description: `CA "${ca.name}" cannot be used as a parent as it's external-public or not active.`,
            variant: "destructive"
        });
        return;
    }
    setSelectedParentCa(ca);
    setIsParentCaModalOpen(false);
  };

  const mapEcdsaCurveToBits = (curveName: string): number => {
    switch (curveName) {
      case 'P-256': return 256;
      case 'P-384': return 384;
      case 'P-521': return 521;
      default: return 256; 
    }
  };
  
  const formatExpirationForApi = (config: ExpirationConfig): { type: string; duration?: string; time?: string } => {
    if (config.type === "Duration") {
      return { type: "Duration", duration: config.durationValue };
    }
    if (config.type === "Date" && config.dateValue) {
      return { type: "Date", time: formatISO(config.dateValue) };
    }
    if (config.type === "Indefinite") {
      return { type: "Date", time: INDEFINITE_DATE_API_VALUE };
    }
    return { type: "Duration", duration: "1y" }; 
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (selectedMode !== 'importCertOnly' && caType === 'intermediate' && !selectedParentCa && selectedMode !== 'importFull') {
      toast({ title: "Validation Error", description: "Please select a Parent CA for intermediate CAs.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (selectedMode !== 'importCertOnly' && selectedMode !== 'importFull' && !caName.trim()) {
      toast({ title: "Validation Error", description: "CA Name (Common Name) cannot be empty.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
     if (selectedMode === 'newKeyPair' && !cryptoEngineId) {
      toast({ title: "Validation Error", description: "Please select a Crypto Engine.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    if (selectedMode === 'newKeyPair') {
        if (caExpiration.type === "Duration" && !caExpiration.durationValue?.trim()) {
             toast({ title: "Validation Error", description: "CA Expiration duration cannot be empty.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }
        if (issuanceExpiration.type === "Duration" && !issuanceExpiration.durationValue?.trim()) {
             toast({ title: "Validation Error", description: "Issuance Expiration duration cannot be empty.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }
         if (caExpiration.type === "Date" && !caExpiration.dateValue) {
             toast({ title: "Validation Error", description: "CA Expiration date must be selected.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }
        if (issuanceExpiration.type === "Date" && !issuanceExpiration.dateValue) {
             toast({ title: "Validation Error", description: "Issuance Expiration date must be selected.", variant: "destructive" });
             setIsSubmitting(false);
             return;
        }
    }


    if (selectedMode === 'newKeyPair') {
      if (!user?.access_token) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (!cryptoEngineId) { 
        toast({ title: "Validation Error", description: "Crypto Engine ID is missing.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }


      const payload = {
        parent_id: caType === 'root' ? null : selectedParentCa?.id || null,
        id: caId,
        engine_id: cryptoEngineId, 
        subject: {
          country: country || undefined,
          state_province: stateProvince || undefined,
          locality: locality || undefined,
          organization: organization || undefined,
          organization_unit: organizationalUnit || undefined,
          common_name: caName,
        },
        key_metadata: {
          type: keyType,
          bits: keyType === 'RSA' ? parseInt(keySize) : mapEcdsaCurveToBits(keySize),
        },
        ca_expiration: formatExpirationForApi(caExpiration),
        issuance_expiration: formatExpirationForApi(issuanceExpiration),
        ca_type: "MANAGED",
      };

      try {
        const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorJson;
          let errorMessage = `Failed to create CA. Status: ${response.status}`;
          try {
            errorJson = await response.json();
            if (errorJson && errorJson.err) {
              errorMessage = `Failed to create CA: ${errorJson.err}`;
            } else if (errorJson && errorJson.message) {
              errorMessage = `Failed to create CA: ${errorJson.message}`;
            }
          } catch (e) {
             console.error("Failed to parse error response as JSON for CA creation:", e);
          }
          throw new Error(errorMessage);
        }

        toast({ title: "CA Creation Successful", description: `CA "${caName}" has been created.`, variant: "default" });
        router.push('/certificate-authorities');

      } catch (error: any) {
        console.error("CA Creation API Error:", error);
        toast({ title: "CA Creation Failed", description: error.message || "An unknown error occurred.", variant: "destructive" });
      }

    } else {
      const subjectDN = { C: country, ST: stateProvince, L: locality, O: organization, OU: organizationalUnit, CN: caName };
      const formData = {
        creationMode: selectedMode,
        caType: selectedMode === 'importCertOnly' ? 'external_public' : caType,
        cryptoEngine: selectedMode === 'importCertOnly' ? 'N/A' : cryptoEngineId,
        parentCaId: caType === 'root' || selectedMode === 'importCertOnly' ? 'Self-signed / External' : selectedParentCa?.id,
        parentCaName: caType === 'root' || selectedMode === 'importCertOnly' ? 'Self-signed / External' : selectedParentCa?.name,
        caId, subjectDN,
        keyType: selectedMode === 'importCertOnly' ? 'N/A' : keyType,
        keySize: selectedMode === 'importCertOnly' ? 'N/A' : keySize,
        caExpiration: selectedMode === 'importCertOnly' ? 'N/A (external)' : caExpiration,
        issuanceExpiration: selectedMode === 'importCertOnly' ? 'N/A (external)' : issuanceExpiration,
      };
      console.log(`Mock Creating CA (Mode: ${selectedMode}) with data:`, formData);
      toast({ title: "Mock CA Creation (Non-API)", description: `Mock CA Submission for mode: ${selectedModeDetails?.title}. Details in console.`, variant: "default" });
      router.push('/certificate-authorities');
    }
    setIsSubmitting(false);
  };

  const selectedModeDetails = creationModes.find(m => m.id === selectedMode);

  if (!selectedMode) {
    return (
      <div className="w-full space-y-8 mb-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
        <div className="text-center">
          <h1 className="text-3xl font-headline font-semibold">Choose CA Creation Method</h1>
          <p className="text-muted-foreground mt-2">Select how you want to create or import your Certificate Authority.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {creationModes.map(mode => (
            <Card
              key={mode.id}
              className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group"
              onClick={() => setSelectedMode(mode.id)}
            >
              <CardHeader className="flex-grow">
                <div className="flex items-start space-x-4">
                  <div className="mt-1">{mode.icon}</div>
                  <div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{mode.title}</CardTitle>
                    <CardDescription className="mt-1 text-sm">{mode.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter>
                  <Button variant="default" className="w-full">
                      Select & Continue <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 mb-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
        <Button variant="ghost" onClick={() => setSelectedMode(null)} className="text-primary hover:text-primary/80">
            <ArrowLeft className="mr-2 h-4 w-4" /> Change Creation Method
        </Button>
      </div>

      <div className="w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            {selectedModeDetails?.icon ? React.cloneElement(selectedModeDetails.icon, {className: "h-8 w-8 text-primary"}) : <PlusCircle className="h-8 w-8 text-primary" />}
            <h1 className="text-2xl font-headline font-semibold">
              {selectedModeDetails ? selectedModeDetails.title : "Configure Certificate Authority"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {selectedModeDetails
              ? `Fill in the details for: ${selectedModeDetails.title}.`
              : "Fill in the details below to provision a new Certificate Authority."}
          </p>
           {selectedMode === 'importCertOnly' && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-md">
              Note: For 'Import Certificate Only', many fields like key generation and CA expiration are not applicable as these are defined by the external CA. You are primarily providing metadata and the public certificate.
            </p>
          )}
        </div>
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="space-y-8">

             {selectedMode === 'newKeyPair' && (
                <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><KeyRound className="mr-2 h-5 w-5 text-muted-foreground" />KMS: New Key Pair Generation settings</h3>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="cryptoEngine">Crypto Engine</Label>
                            <CryptoEngineSelector
                                value={cryptoEngineId}
                                onValueChange={setCryptoEngineId}
                                disabled={authLoading}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="keyType">Key Type</Label>
                                <Select value={keyType} onValueChange={handleKeyTypeChange}>
                                <SelectTrigger id="keyType"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {keyTypes.map(kt => <SelectItem key={kt.value} value={kt.value}>{kt.label}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="keySize">{keyType === 'ECDSA' ? 'ECDSA Curve' : 'Key Size'}</Label>
                                <Select value={keySize} onValueChange={setKeySize}>
                                <SelectTrigger id="keySize"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {currentKeySizeOptions.map(ks => <SelectItem key={ks.value} value={ks.value}>{ks.label}</SelectItem>)}
                                </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {selectedMode !== 'importCertOnly' && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Settings className="mr-2 h-5 w-5 text-muted-foreground" />CA Settings</h3>
                <div className={cn("space-y-4", ['reuseKeyPair', 'importFull'].includes(selectedMode || '') ? "p-4 border rounded-md" : "")}>
                  <div>
                    <Label htmlFor="caType">CA Type</Label>
                    <Select value={caType} onValueChange={handleCaTypeChange} disabled={selectedMode === 'importFull'}>
                      <SelectTrigger id="caType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="root">Root CA</SelectItem>
                        <SelectItem value="intermediate">Intermediate CA</SelectItem>
                      </SelectContent>
                    </Select>
                     {selectedMode === 'importFull' && <p className="text-xs text-muted-foreground mt-1">CA type will be determined from the imported certificate.</p>}
                  </div>

                  {caType === 'intermediate' && selectedMode !== 'importFull' && (
                    <div>
                      <Label htmlFor="parentCa">Parent CA</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsParentCaModalOpen(true)}
                        className="w-full justify-start text-left font-normal mt-1"
                        id="parentCa"
                        disabled={isLoadingCAs || authLoading}
                      >
                        {isLoadingCAs || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : selectedParentCa ? `Selected: ${selectedParentCa.name}` : "Select Parent CA..."}
                      </Button>
                      {selectedParentCa && (
                        <div className="mt-2">
                          <CaVisualizerCard ca={selectedParentCa} className="shadow-none border-border" allCryptoEngines={allCryptoEngines}/>
                        </div>
                      )}
                      {!selectedParentCa && <p className="text-xs text-destructive mt-1">A parent CA must be selected for intermediate CAs.</p>}
                    </div>
                  )}
                  {caType === 'root' && selectedMode !== 'importFull' && (
                       <div>
                          <Label htmlFor="issuerName">Issuer</Label>
                          <Input id="issuerName" value="Self-signed" disabled className="mt-1 bg-muted/50" />
                          <p className="text-xs text-muted-foreground mt-1">Root CAs are self-signed.</p>
                       </div>
                  )}

                  {selectedMode === 'importFull' && (
                     <div className="space-y-4">
                        <div>
                           <Label htmlFor="importedCaCertPem">CA Certificate (PEM)</Label>
                           <Textarea id="importedCaCertPem" placeholder="Paste the CA certificate PEM here..." rows={6} required className="mt-1 font-mono"/>
                           <p className="text-xs text-muted-foreground mt-1">The public certificate of the CA you are importing.</p>
                        </div>
                        <div>
                           <Label htmlFor="importedCaKeyPem">CA Private Key (PEM)</Label>
                           <Textarea id="importedCaKeyPem" placeholder="Paste the corresponding private key PEM here..." rows={6} required className="mt-1 font-mono"/>
                           <p className="text-xs text-muted-foreground mt-1">The key can be encrypted; you would typically provide a passphrase in a real scenario.</p>
                        </div>
                     </div>
                  )}

                  <div>
                    <Label htmlFor="caId">CA ID (generated)</Label>
                    <Input id="caId" value={caId} readOnly className="mt-1 bg-muted/50" />
                  </div>

                  <div>
                    <Label htmlFor="caName">CA Name (Subject Common Name)</Label>
                    <Input
                      id="caName"
                      value={caName}
                      onChange={(e) => setCaName(e.target.value)}
                      placeholder="e.g., LamassuIoT Secure Services CA"
                      required={selectedMode !== 'importFull'}
                      disabled={selectedMode === 'importFull'}
                      className="mt-1"
                    />
                    {selectedMode === 'importFull' && <p className="text-xs text-muted-foreground mt-1">Common Name will be extracted from the imported certificate.</p>}
                    {!caName.trim() && selectedMode !== 'importFull' && <p className="text-xs text-destructive mt-1">CA Name (Common Name) cannot be empty.</p>}
                  </div>
                </div>
              </section>
            )}
            
            {selectedMode === 'reuseKeyPair' && (
                 <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><Repeat className="mr-2 h-5 w-5 text-muted-foreground" />KMS: Reuse Existing Key Pair settings</h3>
                    <div className="space-y-4 p-4 border rounded-md">
                        <div>
                            <Label htmlFor="cryptoEngineReuse">Crypto Engine (determined by existing key)</Label>
                            <Input id="cryptoEngineReuse" value="Determined by Existing Key Selection" disabled className="mt-1 bg-muted/50" />
                            <p className="text-xs text-muted-foreground mt-1">Select the existing key below, its engine will be used.</p>
                        </div>
                        <div>
                            <Label htmlFor="existingKeyId">Existing Key ID (from KMS)</Label>
                            <Input id="existingKeyId" placeholder="Enter existing Key ID from your KMS" required className="mt-1"/>
                            <p className="text-xs text-muted-foreground mt-1">Key type, size, and crypto engine will be determined by the existing key.</p>
                        </div>
                    </div>
                 </section>
            )}

            {selectedMode === 'importCertOnly' && (
                 <section>
                    <h3 className="text-lg font-semibold mb-3 flex items-center"><FileText className="mr-2 h-5 w-5 text-muted-foreground" />Import CA Certificate</h3>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="caCertPem">CA Certificate (PEM format)</Label>
                            <Textarea id="caCertPem" placeholder="Paste the CA certificate PEM here..." rows={6} required className="mt-1 font-mono"/>
                            <p className="text-xs text-muted-foreground mt-1">Only the public certificate is needed for this import type.</p>
                        </div>
                         <div>
                            <Label htmlFor="caNameImportOnly">CA Name (for display)</Label>
                            <Input
                            id="caNameImportOnly"
                            value={caName}
                            onChange={(e) => setCaName(e.target.value)}
                            placeholder="e.g., External Partner Root CA"
                            required
                            className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Provide a descriptive name. Subject details will be read from the cert if possible.</p>
                        </div>
                    </div>
                 </section>
            )}


            {selectedMode !== 'importCertOnly' && <Separator />}

            {selectedMode !== 'importCertOnly' && selectedMode !== 'importFull' && (
              <section>
                <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-muted-foreground" />Subject Distinguished Name (DN)</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="country">Country (C)</Label>
                      <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g., US (2-letter code)" maxLength={2} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="stateProvince">State / Province (ST)</Label>
                      <Input id="stateProvince" value={stateProvince} onChange={e => setStateProvince(e.target.value)} placeholder="e.g., California" className="mt-1" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locality">Locality (L)</Label>
                      <Input id="locality" value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g., San Francisco" className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="organization">Organization (O)</Label>
                      <Input id="organization" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="e.g., LamassuIoT Corp" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="organizationalUnit">Organizational Unit (OU)</Label>
                    <Input id="organizationalUnit" value={organizationalUnit} onChange={e => setOrganizationalUnit(e.target.value)} placeholder="e.g., Secure Devices Division" className="mt-1" />
                  </div>
                  <p className="text-xs text-muted-foreground">The "CA Name" entered in CA Settings will be used as the Common Name (CN) for the subject.</p>
                </div>
              </section>
            )}
            {selectedMode !== 'importCertOnly' && selectedMode !== 'importFull' && <Separator />}

            {selectedMode !== 'importCertOnly' && selectedMode !== 'importFull' && (
              <section>
                   <h3 className="text-lg font-semibold mb-3 flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground" />Expiration Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <ExpirationInput
                        idPrefix="ca-exp"
                        label="CA Certificate Expiration"
                        value={caExpiration}
                        onValueChange={setCaExpiration}
                      />
                      <ExpirationInput
                        idPrefix="issuance-exp"
                        label="Default End-Entity Certificate Issuance Expiration"
                        value={issuanceExpiration}
                        onValueChange={setIssuanceExpiration}
                      />
                  </div>
              </section>
            )}


            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                {selectedMode === 'importCertOnly' ? 'Import Certificate' :
                 selectedMode === 'importFull' ? 'Import CA' :
                 (isSubmitting ? 'Creating...' : 'Create CA')}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <CaSelectorModal
        isOpen={isParentCaModalOpen}
        onOpenChange={setIsParentCaModalOpen}
        title="Select Parent Certificate Authority"
        description="Choose an existing CA to be the issuer for this new intermediate CA. Only active, non-external CAs can be selected."
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
