
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, PlusCircle, Cpu, HelpCircle, Settings, Key, Server, PackageCheck, AlertTriangle, Loader2, Tag as TagIconLucide, ScrollTextIcon } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs } from '@/lib/ca-data';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal'; 
import { SelectableCaTreeItem } from '@/components/shared/SelectableCaTreeItem'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/shared/TagInput';
import { DeviceIconSelectorModal, getLucideIconByName } from '@/components/shared/DeviceIconSelectorModal';
import type { ApiCryptoEngine } from '@/types/crypto-engine';


const mockSigningProfiles = [
  { id: 'profile-iot-standard', name: 'IoT Device Standard Profile' },
  { id: 'profile-web-server-tls', name: 'Web Server TLS Profile' },
  { id: 'profile-code-signing', name: 'Code Signing Profile' },
  { id: 'profile-short-lived-api', name: 'Short-Lived API Client Profile' },
];


export default function CreateRegistrationAuthorityPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [registrationMode, setRegistrationMode] = useState('JITP');
  const [tags, setTags] = useState<string[]>(['iot']);
  const [protocol, setProtocol] = useState('EST');
  const [signingProfileId, setSigningProfileId] = useState<string | null>(mockSigningProfiles[0].id);
  const [enrollmentCa, setEnrollmentCa] = useState<CA | null>(null);
  const [allowOverrideEnrollment, setAllowOverrideEnrollment] = useState(true);
  const [authMode, setAuthMode] = useState('Client Certificate');
  const [validationCAs, setValidationCAs] = useState<CA[]>([]);
  const [allowExpiredAuth, setAllowExpiredAuth] = useState(true);
  const [chainValidationLevel, setChainValidationLevel] = useState(-1);

  const [revokeOnReEnroll, setRevokeOnReEnroll] = useState(true);
  const [allowExpiredRenewal, setAllowExpiredRenewal] = useState(true);
  const [certLifespan, setCertLifespan] = useState('2y');
  const [allowedRenewalDelta, setAllowedRenewalDelta] = useState('14w2d');
  const [preventiveRenewalDelta, setPreventiveRenewalDelta] = useState('4w3d');
  const [criticalRenewalDelta, setCriticalRenewalDelta] = useState('1w');
  const [additionalValidationCAs, setAdditionalValidationCAs] = useState<CA[]>([]);

  const [enableKeyGeneration, setEnableKeyGeneration] = useState(false);

  const [includeDownstreamCA, setIncludeDownstreamCA] = useState(true);
  const [includeEnrollmentCA, setIncludeEnrollmentCA] = useState(false);
  const [managedCAs, setManagedCAs] = useState<CA[]>([]);

  const [selectedDeviceIconName, setSelectedDeviceIconName] = useState<string | null>('Router');
  const [selectedDeviceIconColor, setSelectedDeviceIconColor] = useState<string>('#0f67ff'); // Default primary blue
  const [selectedDeviceIconBgColor, setSelectedDeviceIconBgColor] = useState<string>('#F0F8FF'); // Default AliceBlue
  const [isDeviceIconModalOpen, setIsDeviceIconModalOpen] = useState(false);


  const [isEnrollmentCaModalOpen, setIsEnrollmentCaModalOpen] = useState(false);
  const [isValidationCaModalOpen, setIsValidationCaModalOpen] = useState(false);
  const [isAdditionalValidationCaModalOpen, setIsAdditionalValidationCaModalOpen] = useState(false);
  const [isManagedCaModalOpen, setIsManagedCaModalOpen] = useState(false);
  
  const [availableCAsForSelection, setAvailableCAsForSelection] = useState<CA[]>([]);
  const [isLoadingCAsForSelection, setIsLoadingCAsForSelection] = useState(false);
  const [errorCAsForSelection, setErrorCAsForSelection] = useState<string | null>(null);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoadingEngines, setIsLoadingEngines] = useState(false);
  const [errorEngines, setErrorEngines] = useState<string | null>(null);

  const loadCaData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setErrorCAsForSelection("User not authenticated. Cannot load CAs.");
        setErrorEngines("User not authenticated. Cannot load Crypto Engines.");
      }
      setIsLoadingCAsForSelection(false);
      setIsLoadingEngines(false);
      return;
    }

    setIsLoadingCAsForSelection(true);
    setErrorCAsForSelection(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      setAvailableCAsForSelection(fetchedCAs);
    } catch (err: any) {
      setErrorCAsForSelection(err.message || 'Failed to load available CAs.');
      setAvailableCAsForSelection([]);
    } finally {
      setIsLoadingCAsForSelection(false);
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


  const handleEnrollmentCaSelectFromModal = (ca: CA) => {
    setEnrollmentCa(ca);
    setIsEnrollmentCaModalOpen(false);
  };
  
  const toggleCaSelectionInList = (caToToggle: CA, currentSelection: CA[], setter: React.Dispatch<React.SetStateAction<CA[]>>) => {
    setter(prevSelected =>
      prevSelected.find(selected => selected.id === caToToggle.id)
        ? prevSelected.filter(selected => selected.id !== caToToggle.id)
        : [...prevSelected, caToToggle]
    );
  };

  const handleDeviceIconSelected = (iconName: string) => {
    setSelectedDeviceIconName(iconName);
    setIsDeviceIconModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = {
      dmsName: 'ECS DMS',
      dmsId: 'ecs-dms',
      registrationMode,
      tags,
      protocol,
      signingProfileId,
      enrollmentCaId: enrollmentCa?.id,
      allowOverrideEnrollment,
      authMode,
      validationCaIds: validationCAs.map(ca => ca.id),
      allowExpiredAuth,
      chainValidationLevel,
      revokeOnReEnroll,
      allowExpiredRenewal,
      certLifespan,
      allowedRenewalDelta,
      preventiveRenewalDelta,
      criticalRenewalDelta,
      additionalValidationCaIds: additionalValidationCAs.map(ca => ca.id),
      enableKeyGeneration,
      includeDownstreamCA,
      includeEnrollmentCA,
      managedCaIds: managedCAs.map(ca => ca.id),
      deviceIconName: selectedDeviceIconName,
      deviceIconColor: selectedDeviceIconColor,
      deviceIconBgColor: selectedDeviceIconBgColor,
    };
    console.log('Creating new RA with data:', formData);
    alert(`Mock RA Creation Submitted!\nCheck console for details.`);
    router.push('/registration-authorities'); 
  };
  
  const renderMultiSelectCaDialogContent = (
    currentMultiSelectedCAs: CA[],
    setterForMultiSelectedCAs: React.Dispatch<React.SetStateAction<CA[]>>,
    setIsOpen: (open: boolean) => void 
  ) => {
    return (
      <>
        {(isLoadingCAsForSelection || authLoading) && (
          <div className="flex items-center justify-center h-72">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">{authLoading ? "Authenticating..." : "Loading CAs..."}</p>
          </div>
        )}
        {errorCAsForSelection && !isLoadingCAsForSelection && !authLoading && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading CAs</AlertTitle>
            <AlertDescription>
              {errorCAsForSelection} <Button variant="link" onClick={loadCaData} className="p-0 h-auto">Try again?</Button>
            </AlertDescription>
          </Alert>
        )}
        {!isLoadingCAsForSelection && !authLoading && !errorCAsForSelection && availableCAsForSelection.length > 0 && (
          <ScrollArea className="h-72 my-4 border rounded-md">
            <ul className="space-y-0.5 p-2">
              {availableCAsForSelection.map((ca) => (
                <SelectableCaTreeItem 
                  key={ca.id} 
                  ca={ca} 
                  level={0} 
                  onSelect={() => {}} 
                  showCheckbox={true}
                  isMultiSelected={!!currentMultiSelectedCAs.find(sel => sel.id === ca.id)}
                  onMultiSelectToggle={(toggledCa) => toggleCaSelectionInList(toggledCa, currentMultiSelectedCAs, setterForMultiSelectedCAs)}
                  _currentMultiSelectedCAsPassedToDialog={currentMultiSelectedCAs}
                  allCryptoEngines={allCryptoEngines}
                />
              ))}
            </ul>
          </ScrollArea>
        )}
        {!isLoadingCAsForSelection && !authLoading && !errorCAsForSelection && availableCAsForSelection.length === 0 && (
          <p className="text-muted-foreground text-center my-4 p-4 border rounded-md bg-muted/20">No CAs available to select.</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Done</Button>
          </DialogClose>
        </DialogFooter>
      </>
    );
  };

  const sectionHeadingStyle = "text-lg font-semibold flex items-center mb-3 mt-6";
  const SelectedIconComponent = selectedDeviceIconName ? getLucideIconByName(selectedDeviceIconName) : null;

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to RAs
      </Button>
      
      <div> 
        <div className="flex flex-col space-y-1.5 p-6"> 
          <h1 className="text-xl font-headline flex items-center font-semibold leading-none tracking-tight"> 
            <PlusCircle className="mr-2 h-6 w-6 text-primary" /> Create New Registration Authority
          </h1>
          <p className="text-sm text-muted-foreground"> 
            Configure all settings for the new Registration Authority below.
          </p>
        </div>
        <div className="p-6 pt-0"> 
          <form onSubmit={handleSubmit} className="space-y-0">
            
            <h3 className={cn(sectionHeadingStyle)}>
              <Settings className="mr-2 h-5 w-5 text-muted-foreground"/>Device Manufacturing Definition
            </h3>
            <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dmsName">DMS Name</Label>
                    <Input id="dmsName" value="ECS DMS" readOnly className="mt-1 bg-card" />
                  </div>
                  <div>
                    <Label htmlFor="dmsId">DMS ID</Label>
                    <Input id="dmsId" value="ecs-dms" readOnly className="mt-1 bg-card" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6"/>

            <h3 className={cn(sectionHeadingStyle)}>
              <Cpu className="mr-2 h-5 w-5 text-muted-foreground" /> Enrollment Device Registration
            </h3>
            <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="registrationMode">Registration Mode</Label>
                    <Select value={registrationMode} onValueChange={setRegistrationMode}>
                      <SelectTrigger id="registrationMode" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JITP">JITP (Just-In-Time Provisioning)</SelectItem>
                        <SelectItem value="Pre registration">Pre-registration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="raTags"><TagIconLucide className="inline mr-1 h-4 w-4 text-muted-foreground"/>Tags</Label>
                    <TagInput
                      id="raTags"
                      value={tags}
                      onChange={setTags}
                      placeholder="Add tags (e.g., iot, sensor, production)"
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-2">
                    <Label htmlFor="deviceIconButton">Device Icon</Label>
                    <Button
                        id="deviceIconButton"
                        type="button"
                        variant="outline"
                        onClick={() => setIsDeviceIconModalOpen(true)}
                        className="w-full justify-start text-left font-normal flex items-center gap-2 mt-1"
                    >
                        {SelectedIconComponent ? (
                        <div className="flex items-center gap-2">
                            <div
                            className="p-1 rounded-sm flex items-center justify-center"
                            style={{ backgroundColor: selectedDeviceIconBgColor }}
                            >
                            <SelectedIconComponent
                                className="h-5 w-5"
                                style={{ color: selectedDeviceIconColor }}
                            />
                            </div>
                            {selectedDeviceIconName}
                        </div>
                        ) : (
                        "Select Device Icon..."
                        )}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="deviceIconColor" className="text-sm">Icon Color</Label>
                        <Input
                        id="deviceIconColor"
                        type="color"
                        value={selectedDeviceIconColor}
                        onChange={(e) => setSelectedDeviceIconColor(e.target.value)}
                        className="mt-1 h-10 w-full p-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="deviceIconBgColor" className="text-sm">Background Color</Label>
                        <Input
                        id="deviceIconBgColor"
                        type="color"
                        value={selectedDeviceIconBgColor}
                        onChange={(e) => setSelectedDeviceIconBgColor(e.target.value)}
                        className="mt-1 h-10 w-full p-1"
                        />
                    </div>
                  </div>
                   <p className="text-xs text-muted-foreground">Default icon and colors for devices registered through this RA.</p>
                </div>
              </CardContent>
            </Card>
          
            <Separator className="my-6"/>

            <h3 className={cn(sectionHeadingStyle)}>
              <Key className="mr-2 h-5 w-5 text-muted-foreground"/>Enrollment Settings
            </h3>
            <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select value={protocol} onValueChange={setProtocol}>
                      <SelectTrigger id="protocol" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EST">EST</SelectItem>
                        <SelectItem value="CMP">CMP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="signingProfile">Signing Profile</Label>
                    <Select value={signingProfileId ?? ''} onValueChange={setSigningProfileId}>
                      <SelectTrigger id="signingProfile" className="mt-1">
                        <SelectValue placeholder="Select a signing profile..." />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSigningProfiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      The policy that defines certificate parameters like duration and key usage.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="enrollmentCa">Enrollment CA</Label>
                    <Button type="button" variant="outline" onClick={() => setIsEnrollmentCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingCAsForSelection || authLoading}>
                      {isLoadingCAsForSelection || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : enrollmentCa ? enrollmentCa.name : "Select Enrollment CA..."}
                    </Button>
                    {enrollmentCa && (
                      <div className="mt-2">
                        <CaVisualizerCard ca={enrollmentCa} className="shadow-none border-border" allCryptoEngines={allCryptoEngines} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="allowOverrideEnrollment" checked={allowOverrideEnrollment} onCheckedChange={setAllowOverrideEnrollment} />
                    <Label htmlFor="allowOverrideEnrollment">Allow Override Enrollment</Label>
                  </div>
                  <div>
                    <Label htmlFor="authMode">Authentication Mode</Label>
                    <Select value={authMode} onValueChange={setAuthMode}>
                      <SelectTrigger id="authMode" className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Client Certificate">Client Certificate</SelectItem>
                        <SelectItem value="External Webhook">External Webhook</SelectItem>
                        <SelectItem value="No Auth">No Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="validationCAs">Validation CAs</Label>
                    <Button type="button" variant="outline" onClick={() => setIsValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingCAsForSelection || authLoading}>
                       {isLoadingCAsForSelection || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : validationCAs.length > 0 ? `Selected ${validationCAs.length} CA(s) - Click to modify` : "Select Validation CAs..."}
                    </Button>
                    {validationCAs.length > 0 && 
                      <div className="mt-2 flex flex-wrap gap-2">
                        {validationCAs.map(ca => (
                          <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines} />
                        ))}
                      </div>
                    }
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="allowExpiredAuth" checked={allowExpiredAuth} onCheckedChange={setAllowExpiredAuth} />
                    <Label htmlFor="allowExpiredAuth">Allow Authenticating Expired Certificates</Label>
                  </div>
                  <div>
                    <Label htmlFor="chainValidationLevel" className="flex items-center">
                      Chain Validation Level
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="ml-1 h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent><p>-1 equals full chain validation.</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input id="chainValidationLevel" type="number" value={chainValidationLevel} onChange={(e) => setChainValidationLevel(parseInt(e.target.value))} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6"/>

            <h3 className={cn(sectionHeadingStyle)}>
              <PackageCheck className="mr-2 h-5 w-5 text-muted-foreground"/>Re-Enrollment Settings
            </h3>
            <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="revokeOnReEnroll" checked={revokeOnReEnroll} onCheckedChange={setRevokeOnReEnroll} />
                    <Label htmlFor="revokeOnReEnroll">Revoke On Re-Enroll</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="allowExpiredRenewal" checked={allowExpiredRenewal} onCheckedChange={setAllowExpiredRenewal} />
                    <Label htmlFor="allowExpiredRenewal">Allow Expired Renewal</Label>
                  </div>
                  <div>
                    <Label htmlFor="certLifespan">Certificate Lifespan (e.g., 2y, 6m, 90d)</Label>
                    <Input id="certLifespan" value={certLifespan} onChange={(e) => setCertLifespan(e.target.value)} placeholder="e.g., 2y" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="allowedRenewalDelta">Allowed Renewal Delta (e.g., 14w2d)</Label>
                    <Input id="allowedRenewalDelta" value={allowedRenewalDelta} onChange={(e) => setAllowedRenewalDelta(e.target.value)} placeholder="e.g., 14w2d" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="preventiveRenewalDelta">Preventive Renewal Delta (e.g., 4w3d)</Label>
                    <Input id="preventiveRenewalDelta" value={preventiveRenewalDelta} onChange={(e) => setPreventiveRenewalDelta(e.target.value)} placeholder="e.g., 4w3d" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="criticalRenewalDelta">Critical Renewal Delta (e.g., 1w)</Label>
                    <Input id="criticalRenewalDelta" value={criticalRenewalDelta} onChange={(e) => setCriticalRenewalDelta(e.target.value)} placeholder="e.g., 1w" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="additionalValidationCAs">Additional Validation CAs (for re-enrollment)</Label>
                    <Button type="button" variant="outline" onClick={() => setIsAdditionalValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingCAsForSelection || authLoading}>
                       {isLoadingCAsForSelection || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : additionalValidationCAs.length > 0 ? `Selected ${additionalValidationCAs.length} CA(s) - Click to modify` : "Select Additional Validation CAs..."}
                    </Button>
                    {additionalValidationCAs.length > 0 && 
                      <div className="mt-2 flex flex-wrap gap-2">
                        {additionalValidationCAs.map(ca => (
                          <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines} />
                        ))}
                      </div>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6"/>

            <h3 className={cn(sectionHeadingStyle)}>
               <Server className="mr-2 h-5 w-5 text-muted-foreground"/>Server Key Generation Settings
            </h3>
            <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Devices will be able to enroll using EST-defined ServerKeyGen endpoints if enabled.</p>
                  <div className="flex items-center space-x-2">
                    <Switch id="enableKeyGeneration" checked={enableKeyGeneration} onCheckedChange={setEnableKeyGeneration} />
                    <Label htmlFor="enableKeyGeneration">Enable Server-Side Key Generation</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          
            <Separator className="my-6"/>

            <h3 className={cn(sectionHeadingStyle)}>
               <AlertTriangle className="mr-2 h-5 w-5 text-muted-foreground"/>CA Distribution
            </h3>
             <Card className="border-border shadow-sm rounded-md">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="includeDownstreamCA" checked={includeDownstreamCA} onCheckedChange={setIncludeDownstreamCA} />
                    <Label htmlFor="includeDownstreamCA">Include 'Downstream' CA used by Lamassu</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="includeEnrollmentCA" checked={includeEnrollmentCA} onCheckedChange={setIncludeEnrollmentCA} />
                    <Label htmlFor="includeEnrollmentCA">Include Enrollment CA</Label>
                  </div>
                  <div>
                    <Label htmlFor="managedCAs">Managed CAs (for CA certs endpoint)</Label>
                    <Button type="button" variant="outline" onClick={() => setIsManagedCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingCAsForSelection || authLoading}>
                      {isLoadingCAsForSelection || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : managedCAs.length > 0 ? `Selected ${managedCAs.length} CA(s) - Click to modify` : "Select Managed CAs..."}
                    </Button>
                    {managedCAs.length > 0 && 
                      <div className="mt-2 flex flex-wrap gap-2">
                        {managedCAs.map(ca => (
                          <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines}/>
                        ))}
                      </div>
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-8">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create RA
                </Button>
            </div>
          </form>
        </div>
      </div>

      <CaSelectorModal
        isOpen={isEnrollmentCaModalOpen}
        onOpenChange={setIsEnrollmentCaModalOpen}
        title="Select Enrollment CA"
        description="Choose the CA that will issue certificates for this RA."
        availableCAs={availableCAsForSelection}
        isLoadingCAs={isLoadingCAsForSelection}
        errorCAs={errorCAsForSelection}
        loadCAsAction={loadCaData}
        onCaSelected={handleEnrollmentCaSelectFromModal}
        currentSelectedCaId={enrollmentCa?.id}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      />
      
      <CaSelectorModal
        isOpen={isValidationCaModalOpen}
        onOpenChange={setIsValidationCaModalOpen}
        title="Select Validation CAs"
        description="Choose CAs to validate client certificates during enrollment."
        availableCAs={availableCAsForSelection}
        isLoadingCAs={isLoadingCAsForSelection}
        errorCAs={errorCAsForSelection}
        loadCAsAction={loadCaData}
        onCaSelected={() => {}} 
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      >
        {renderMultiSelectCaDialogContent(validationCAs, setValidationCAs, setIsValidationCaModalOpen)}
      </CaSelectorModal>

      <CaSelectorModal
        isOpen={isAdditionalValidationCaModalOpen}
        onOpenChange={setIsAdditionalValidationCaModalOpen}
        title="Select Additional Validation CAs"
        description="Choose CAs for validating certificates during re-enrollment."
        availableCAs={availableCAsForSelection}
        isLoadingCAs={isLoadingCAsForSelection}
        errorCAs={errorCAsForSelection}
        loadCAsAction={loadCaData}
        onCaSelected={() => {}}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      >
        {renderMultiSelectCaDialogContent(additionalValidationCAs, setAdditionalValidationCAs, setIsAdditionalValidationCaModalOpen)}
      </CaSelectorModal>

       <CaSelectorModal
        isOpen={isManagedCaModalOpen}
        onOpenChange={setIsManagedCaModalOpen}
        title="Select Managed CAs"
        description="Choose CAs to be distributed via the CA certs endpoint."
        availableCAs={availableCAsForSelection}
        isLoadingCAs={isLoadingCAsForSelection}
        errorCAs={errorCAsForSelection}
        loadCAsAction={loadCaData}
        onCaSelected={() => {}}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      >
        {renderMultiSelectCaDialogContent(managedCAs, setManagedCAs, setIsManagedCaModalOpen)}
      </CaSelectorModal>

      <DeviceIconSelectorModal
        isOpen={isDeviceIconModalOpen}
        onOpenChange={setIsDeviceIconModalOpen}
        onIconSelected={handleDeviceIconSelected}
        currentSelectedIconName={selectedDeviceIconName}
      />

    </div>
  );
}  
