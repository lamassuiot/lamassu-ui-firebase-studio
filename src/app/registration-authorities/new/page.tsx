
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, PlusCircle, Cpu, HelpCircle, Settings, Key, Server, PackageCheck, AlertTriangle, Loader2, Tag as TagIconLucide, Edit } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, findCaById } from '@/lib/ca-data';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CaVisualizerCard } from '@/components/CaVisualizerCard';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { CaSelectorModal } from '@/components/shared/CaSelectorModal'; 
import { SelectableCaTreeItem } from '@/components/shared/SelectableCaTreeItem'; 
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter, DialogClose } from '@/components/ui/dialog'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from '@/components/ui/separator';
import { TagInput } from '@/components/shared/TagInput';
import { DeviceIconSelectorModal, getLucideIconByName } from '@/components/shared/DeviceIconSelectorModal';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { useToast } from '@/hooks/use-toast';

// --- API and Form Types ---
interface ApiRaSettings {
    enrollment_settings: {
        registration_mode: string;
        enrollment_ca: string;
        protocol: string;
        enable_replaceable_enrollment: boolean;
        est_rfc7030_settings?: {
            auth_mode: string;
            client_certificate_settings?: {
                chain_level_validation: number;
                validation_cas: string[];
                allow_expired: boolean;
            };
        };
        device_provisioning_profile: {
            icon: string;
            icon_color: string;
            tags: string[];
        };
    };
    reenrollment_settings: {
        revoke_on_reenrollment: boolean;
        enable_expired_renewal: boolean;
        critical_delta: string;
        preventive_delta: string;
        reenrollment_delta: string;
        additional_validation_cas: string[];
    };
    server_keygen_settings: {
        enabled: boolean;
        key?: {
            bits: number;
            type: string;
        };
    };
    ca_distribution_settings: {
        include_enrollment_ca: boolean;
        include_system_ca: boolean;
        managed_cas: string[];
    };
}
interface ApiRaItem {
    id: string;
    name: string;
    settings: ApiRaSettings;
}

const mockSigningProfiles = [
  { id: 'profile-iot-standard', name: 'IoT Device Standard Profile' },
  { id: 'profile-web-server-tls', name: 'Web Server TLS Profile' },
  { id: 'profile-code-signing', name: 'Code Signing Profile' },
  { id: 'profile-short-lived-api', name: 'Short-Lived API Client Profile' },
];

const serverKeygenTypes = [ { value: 'RSA', label: 'RSA' }, { value: 'ECDSA', label: 'ECDSA' }];
const serverKeygenRsaBits = [ { value: '2048', label: '2048 bit' }, { value: '3072', label: '3072 bit' }, { value: '4096', label: '4096 bit' }];
const serverKeygenEcdsaCurves = [ { value: 'P-256', label: 'P-256' }, { value: 'P-384', label: 'P-384' }, { value: 'P-521', label: 'P-521' }];

function hslToHex(h: number, s: number, l: number) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export default function CreateOrEditRegistrationAuthorityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raIdFromQuery = searchParams.get('raId');
  const isEditMode = !!raIdFromQuery;
  
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [raData, setRaData] = useState<ApiRaItem | null>(null);
  const [isLoadingRA, setIsLoadingRA] = useState(isEditMode);
  const [errorRA, setErrorRA] = useState<string | null>(null);

  // Form State
  const [raName, setRaName] = useState('');
  const [raId, setRaId] = useState('');
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
  const [allowedRenewalDelta, setAllowedRenewalDelta] = useState('100d');
  const [preventiveRenewalDelta, setPreventiveRenewalDelta] = useState('31d');
  const [criticalRenewalDelta, setCriticalRenewalDelta] = useState('7d');
  const [additionalValidationCAs, setAdditionalValidationCAs] = useState<CA[]>([]);
  const [enableKeyGeneration, setEnableKeyGeneration] = useState(false);
  const [serverKeygenType, setServerKeygenType] = useState('RSA');
  const [serverKeygenSpec, setServerKeygenSpec] = useState('4096');
  const [includeDownstreamCA, setIncludeDownstreamCA] = useState(true);
  const [includeEnrollmentCA, setIncludeEnrollmentCA] = useState(false);
  const [managedCAs, setManagedCAs] = useState<CA[]>([]);
  const [selectedDeviceIconName, setSelectedDeviceIconName] = useState<string | null>('Router');
  const [selectedDeviceIconColor, setSelectedDeviceIconColor] = useState<string>('#0f67ff');
  const [selectedDeviceIconBgColor, setSelectedDeviceIconBgColor] = useState<string>('#F0F8FF');
  
  // Modal and Data Loading State
  const [isDeviceIconModalOpen, setIsDeviceIconModalOpen] = useState(false);
  const [isEnrollmentCaModalOpen, setIsEnrollmentCaModalOpen] = useState(false);
  const [isValidationCaModalOpen, setIsValidationCaModalOpen] = useState(false);
  const [isAdditionalValidationCaModalOpen, setIsAdditionalValidationCaModalOpen] = useState(false);
  const [isManagedCaModalOpen, setIsManagedCaModalOpen] = useState(false);
  const [availableCAsForSelection, setAvailableCAsForSelection] = useState<CA[]>([]);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(true);
  const [errorDependencies, setErrorDependencies] = useState<string | null>(null);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);

  const loadDependencies = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) return;
    setIsLoadingDependencies(true);
    setErrorDependencies(null);
    try {
        const [cas, enginesResponse] = await Promise.all([
            fetchAndProcessCAs(user.access_token),
            fetch('https://lab.lamassu.io/api/ca/v1/engines', {
                headers: { 'Authorization': `Bearer ${user.access_token}` },
            })
        ]);
        setAvailableCAsForSelection(cas);
        if (!enginesResponse.ok) throw new Error('Failed to fetch crypto engines.');
        const enginesData = await enginesResponse.json();
        setAllCryptoEngines(enginesData);
    } catch (err: any) {
        setErrorDependencies(err.message || 'Failed to load dependencies');
    } finally {
        setIsLoadingDependencies(false);
    }
  }, [user?.access_token, isAuthenticated]);

  const fetchRaDetails = useCallback(async () => {
    if (!raIdFromQuery || !isAuthenticated() || !user?.access_token) return;
    setIsLoadingRA(true);
    setErrorRA(null);
    try {
        const response = await fetch(`https://lab.lamassu.io/api/dmsmanager/v1/dms/${raIdFromQuery}`, {
            headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) {
             let errorJson;
             let errorMessage = `Failed to fetch RA details. HTTP error ${response.status}`;
             try {
                errorJson = await response.json();
                errorMessage = `Failed to fetch RA details: ${errorJson.err || errorJson.message || 'Unknown error'}`;
             } catch (e) {/* ignore */}
             throw new Error(errorMessage);
        }
        const data: ApiRaItem = await response.json();
        setRaData(data);
    } catch (err: any) {
        setErrorRA(err.message);
    } finally {
        setIsLoadingRA(false);
    }
  }, [raIdFromQuery, user?.access_token, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      loadDependencies();
      if (isEditMode) {
        fetchRaDetails();
      }
    }
  }, [authLoading, isEditMode, loadDependencies, fetchRaDetails]);

  // Effect to populate form once RA data and CA list are available (for edit mode)
  useEffect(() => {
    if (isEditMode && raData && availableCAsForSelection.length > 0) {
        const { settings } = raData;
        setRaName(raData.name);
        setRaId(raData.id);
        
        const { enrollment_settings, reenrollment_settings, server_keygen_settings, ca_distribution_settings } = settings;
        setRegistrationMode(enrollment_settings.registration_mode);
        setProtocol(enrollment_settings.protocol === 'EST_RFC7030' ? 'EST' : 'CMP');
        setEnrollmentCa(findCaById(enrollment_settings.enrollment_ca, availableCAsForSelection));
        setAllowOverrideEnrollment(enrollment_settings.enable_replaceable_enrollment);

        const authSettings = enrollment_settings.est_rfc7030_settings;
        if (authSettings) {
            const authModeMap: { [key: string]: string } = { 'CLIENT_CERTIFICATE': 'Client Certificate', 'EXTERNAL_WEBHOOK': 'External Webhook', 'NONE': 'No Auth' };
            setAuthMode(authModeMap[authSettings.auth_mode] || 'Client Certificate');
            if (authSettings.client_certificate_settings) {
                setChainValidationLevel(authSettings.client_certificate_settings.chain_level_validation);
                setAllowExpiredAuth(authSettings.client_certificate_settings.allow_expired);
                setValidationCAs(authSettings.client_certificate_settings.validation_cas.map(id => findCaById(id, availableCAsForSelection)).filter(Boolean) as CA[]);
            }
        }

        const { device_provisioning_profile } = enrollment_settings;
        setTags(device_provisioning_profile.tags);
        const [iconColor, bgColor] = device_provisioning_profile.icon_color.split('-');
        setSelectedDeviceIconName(device_provisioning_profile.icon);
        setSelectedDeviceIconColor(iconColor);
        setSelectedDeviceIconBgColor(bgColor);

        setRevokeOnReEnroll(reenrollment_settings.revoke_on_reenrollment);
        setAllowExpiredRenewal(reenrollment_settings.enable_expired_renewal);
        setAllowedRenewalDelta(reenrollment_settings.reenrollment_delta);
        setPreventiveRenewalDelta(reenrollment_settings.preventive_delta);
        setCriticalRenewalDelta(reenrollment_settings.critical_delta);
        setAdditionalValidationCAs(reenrollment_settings.additional_validation_cas.map(id => findCaById(id, availableCAsForSelection)).filter(Boolean) as CA[]);

        setEnableKeyGeneration(server_keygen_settings.enabled);
        if (server_keygen_settings.enabled && server_keygen_settings.key) {
            setServerKeygenType(server_keygen_settings.key.type);
            const keySpec = server_keygen_settings.key.type === 'RSA' 
                ? String(server_keygen_settings.key.bits)
                : { 256: 'P-256', 384: 'P-384', 521: 'P-521' }[server_keygen_settings.key.bits] || 'P-256';
            setServerKeygenSpec(keySpec);
        }

        setIncludeEnrollmentCA(ca_distribution_settings.include_enrollment_ca);
        setIncludeDownstreamCA(ca_distribution_settings.include_system_ca);
        setManagedCAs(ca_distribution_settings.managed_cas.map(id => findCaById(id, availableCAsForSelection)).filter(Boolean) as CA[]);
    }
  }, [isEditMode, raData, availableCAsForSelection]);
  
  // Effect to randomize icon color for new RAs
  useEffect(() => {
    if (!isEditMode) {
      const randomHue = Math.floor(Math.random() * 360);
      const saturation = 80;

      const iconLightness = 50;
      const iconColorHex = hslToHex(randomHue, saturation, iconLightness);
      setSelectedDeviceIconColor(iconColorHex);

      const bgLightness = 92;
      const bgColorHex = hslToHex(randomHue, saturation, bgLightness);
      setSelectedDeviceIconBgColor(bgColorHex);
    }
  }, [isEditMode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!raName.trim() || (!isEditMode && !raId.trim())) {
        toast({ title: "Validation Error", description: "RA Name and RA ID are required.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!enrollmentCa) {
        toast({ title: "Validation Error", description: "An Enrollment CA must be selected.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!user?.access_token) {
        toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    const protocolMapping = { 'EST': 'EST_RFC7030', 'CMP': 'CMP_RFC4210' };
    const authModeMapping = { 'Client Certificate': 'CLIENT_CERTIFICATE', 'External Webhook': 'EXTERNAL_WEBHOOK', 'No Auth': 'NONE' };
    let keySettings;
    if (enableKeyGeneration) {
        const bits = serverKeygenType === 'ECDSA' 
            ? ({ 'P-256': 256, 'P-384': 384, 'P-521': 521 }[serverKeygenSpec] || 256)
            : parseInt(serverKeygenSpec, 10);
        keySettings = { type: serverKeygenType, bits };
    }
    const payload = {
      name: raName.trim(),
      id: isEditMode ? raIdFromQuery : raId.trim(),
      metadata: {},
      settings: {
        enrollment_settings: {
          enrollment_ca: enrollmentCa.id,
          protocol: protocolMapping[protocol as keyof typeof protocolMapping],
          enable_replaceable_enrollment: allowOverrideEnrollment,
          est_rfc7030_settings: {
            auth_mode: authModeMapping[authMode as keyof typeof authModeMapping],
            client_certificate_settings: {
              chain_level_validation: chainValidationLevel,
              validation_cas: validationCAs.map(ca => ca.id),
              allow_expired: allowExpiredAuth,
            }
          },
          device_provisioning_profile: {
            icon: selectedDeviceIconName,
            icon_color: `${selectedDeviceIconColor}-${selectedDeviceIconBgColor}`,
            metadata: {},
            tags: tags,
          },
          registration_mode: registrationMode,
        },
        reenrollment_settings: {
          revoke_on_reenrollment: revokeOnReEnroll,
          enable_expired_renewal: allowExpiredRenewal,
          critical_delta: criticalRenewalDelta,
          preventive_delta: preventiveRenewalDelta,
          reenrollment_delta: allowedRenewalDelta,
          additional_validation_cas: additionalValidationCAs.map(ca => ca.id),
        },
        server_keygen_settings: {
          enabled: enableKeyGeneration,
          ...(enableKeyGeneration && { key: keySettings }),
        },
        ca_distribution_settings: {
          include_enrollment_ca: includeEnrollmentCA,
          include_system_ca: includeDownstreamCA,
          managed_cas: managedCAs.map(ca => ca.id),
        }
      }
    };
    
    const url = isEditMode
        ? `https://lab.lamassu.io/api/dmsmanager/v1/dms/${raIdFromQuery}`
        : 'https://lab.lamassu.io/api/dmsmanager/v1/dms';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.access_token}` },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorJson;
            let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} RA. Status: ${response.status}`;
            try {
                errorJson = await response.json();
                errorMessage = `RA ${isEditMode ? 'update' : 'creation'} failed: ${errorJson.err || errorJson.message || 'Unknown error'}`;
            } catch (e) { /* ignore */ }
            throw new Error(errorMessage);
        }
        
        toast({ title: "Success!", description: `Registration Authority "${raName}" ${isEditMode ? 'updated' : 'created'} successfully.` });
        router.push('/registration-authorities');

    } catch (error: any) {
        toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderMultiSelectCaDialogContent = (
    currentMultiSelectedCAs: CA[],
    setterForMultiSelectedCAs: React.Dispatch<React.SetStateAction<CA[]>>,
    setIsOpen: (open: boolean) => void 
  ) => {
    const toggleCaSelectionInList = (caToToggle: CA) => {
        setterForMultiSelectedCAs(prev => 
            prev.find(c => c.id === caToToggle.id) 
            ? prev.filter(c => c.id !== caToToggle.id) 
            : [...prev, caToToggle]
        );
    };
    return (
      <>
        {(isLoadingDependencies || authLoading) && <div className="flex items-center justify-center h-72"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">{authLoading ? "Authenticating..." : "Loading CAs..."}</p></div>}
        {errorDependencies && !isLoadingDependencies && !authLoading && <Alert variant="destructive" className="my-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading Data</AlertTitle><AlertDescription>{errorDependencies} <Button variant="link" onClick={loadDependencies} className="p-0 h-auto">Try again?</Button></AlertDescription></Alert>}
        {!isLoadingDependencies && !authLoading && !errorDependencies && availableCAsForSelection.length > 0 && (
          <ScrollArea className="h-72 my-4 border rounded-md"><ul className="space-y-0.5 p-2">{availableCAsForSelection.map((ca) => (<SelectableCaTreeItem key={ca.id} ca={ca} level={0} onSelect={() => {}} showCheckbox={true} isMultiSelected={!!currentMultiSelectedCAs.find(sel => sel.id === ca.id)} onMultiSelectToggle={toggleCaSelectionInList} _currentMultiSelectedCAsPassedToDialog={currentMultiSelectedCAs} allCryptoEngines={allCryptoEngines}/>))}</ul></ScrollArea>
        )}
        <DialogFooter><DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Done</Button></DialogClose></DialogFooter>
      </>
    );
  };
  
  if (authLoading || (isEditMode && isLoadingRA)) {
      return (
          <div className="flex flex-col items-center justify-center flex-1 p-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg text-muted-foreground">{authLoading ? "Authenticating..." : "Loading RA Details..."}</p>
          </div>
      );
  }

  if (isEditMode && errorRA) {
      return (
          <div className="w-full space-y-4 p-4">
              <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to RAs</Button>
              <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading RA</AlertTitle><AlertDescription>{errorRA}</AlertDescription></Alert>
          </div>
      );
  }
  
  const sectionHeadingStyle = "text-lg font-semibold flex items-center mb-3 mt-15";
  const SelectedIconComponent = getLucideIconByName(selectedDeviceIconName);
  const currentServerKeygenSpecOptions = serverKeygenType === 'RSA' ? serverKeygenRsaBits : serverKeygenEcdsaCurves;
  const PageIcon = isEditMode ? Edit : PlusCircle;

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to RAs</Button>
      <div> 
        <div className="flex flex-col space-y-1.5 p-6"> 
          <h1 className="text-xl font-headline flex items-center font-semibold leading-none tracking-tight"> 
            <PageIcon className="mr-2 h-6 w-6 text-primary" /> {isEditMode ? 'Edit' : 'Create New'} Registration Authority
          </h1>
          <p className="text-sm text-muted-foreground"> 
            {isEditMode ? 'Modify settings for the Registration Authority.' : 'Configure all settings for the new Registration Authority below.'}
          </p>
        </div>
        <div className="p-6 pt-0"> 
          <form onSubmit={handleSubmit}>
            <h3 className={cn(sectionHeadingStyle)}><Settings className="mr-2 h-5 w-5 text-muted-foreground"/>General RA Settings</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4"><div className="space-y-4"><div><Label htmlFor="raName">RA Name</Label><Input id="raName" value={raName} onChange={(e) => setRaName(e.target.value)} placeholder="e.g., Main IoT Enrollment Service" required className="mt-1" />{!raName.trim() && <p className="text-xs text-destructive mt-1">RA Name is required.</p>}</div><div><Label htmlFor="raId">RA ID</Label><Input id="raId" value={raId} onChange={(e) => setRaId(e.target.value)} placeholder="e.g., main-iot-ra" required disabled={isEditMode} className="mt-1" />{!raId.trim() && !isEditMode && <p className="text-xs text-destructive mt-1">RA ID is required.</p>}</div></div></CardContent></Card>
            <Separator className="my-6"/>
            <h3 className={cn(sectionHeadingStyle)}><Cpu className="mr-2 h-5 w-5 text-muted-foreground" /> Enrollment Device Registration</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4">
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
                  <TagInput id="raTags" value={tags} onChange={setTags} placeholder="Add tags..." className="mt-1" />
                </div>
                <div className="pt-2">
                  <Label htmlFor="deviceIconButton">Device Icon</Label>
                  <Button id="deviceIconButton" type="button" variant="outline" onClick={() => setIsDeviceIconModalOpen(true)} className="w-full justify-start text-left font-normal flex items-center gap-2 mt-1">
                    {SelectedIconComponent ? (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-sm flex items-center justify-center" style={{ backgroundColor: selectedDeviceIconBgColor }}>
                          <SelectedIconComponent className="h-5 w-5" style={{ color: selectedDeviceIconColor }} />
                        </div>
                        {selectedDeviceIconName}
                      </div>
                    ) : "Select Device Icon..."}
                  </Button>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label htmlFor="deviceIconColor">Icon Color</Label>
                        <Input 
                            id="deviceIconColor" 
                            type="color" 
                            value={selectedDeviceIconColor} 
                            onChange={(e) => setSelectedDeviceIconColor(e.target.value)} 
                            className="w-24 h-10 p-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="deviceIconBgColor">Background Color</Label>
                        <Input 
                            id="deviceIconBgColor" 
                            type="color" 
                            value={selectedDeviceIconBgColor} 
                            onChange={(e) => setSelectedDeviceIconBgColor(e.target.value)}
                            className="w-24 h-10 p-1"
                        />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Default icon and colors for devices registered through this RA.</p>
              </div>
            </CardContent></Card>
            <Separator className="my-6"/>
            <h3 className={cn(sectionHeadingStyle)}><Key className="mr-2 h-5 w-5 text-muted-foreground"/>Enrollment Settings</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4"><div className="space-y-4"><div><Label htmlFor="protocol">Protocol</Label><Select value={protocol} onValueChange={setProtocol}><SelectTrigger id="protocol" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EST">EST</SelectItem><SelectItem value="CMP">CMP</SelectItem></SelectContent></Select></div><div><Label htmlFor="enrollmentCa">Enrollment CA</Label><Button type="button" variant="outline" onClick={() => setIsEnrollmentCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingDependencies || authLoading}>{isLoadingDependencies || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : enrollmentCa ? enrollmentCa.name : "Select Enrollment CA..."}</Button>{enrollmentCa && <div className="mt-2"><CaVisualizerCard ca={enrollmentCa} className="shadow-none border-border" allCryptoEngines={allCryptoEngines} /></div>}</div><div className="flex items-center space-x-2 pt-2"><Switch id="allowOverrideEnrollment" checked={allowOverrideEnrollment} onCheckedChange={setAllowOverrideEnrollment} /><Label htmlFor="allowOverrideEnrollment">Allow Override Enrollment</Label></div><div><Label htmlFor="authMode">Authentication Mode</Label><Select value={authMode} onValueChange={setAuthMode}><SelectTrigger id="authMode" className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Client Certificate">Client Certificate</SelectItem><SelectItem value="External Webhook">External Webhook</SelectItem><SelectItem value="No Auth">No Auth</SelectItem></SelectContent></Select></div><div><Label htmlFor="validationCAs">Validation CAs</Label><Button type="button" variant="outline" onClick={() => setIsValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingDependencies || authLoading}>{isLoadingDependencies || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : validationCAs.length > 0 ? `Selected ${validationCAs.length} CA(s) - Click to modify` : "Select Validation CAs..."}</Button>{validationCAs.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{validationCAs.map(ca => <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines} />)}</div>}</div><div className="flex items-center space-x-2 pt-2"><Switch id="allowExpiredAuth" checked={allowExpiredAuth} onCheckedChange={setAllowExpiredAuth} /><Label htmlFor="allowExpiredAuth">Allow Authenticating Expired Certificates</Label></div><div><Label htmlFor="chainValidationLevel" className="flex items-center">Chain Validation Level<TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="ml-1 h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger><TooltipContent><p>-1 equals full chain validation.</p></TooltipContent></Tooltip></TooltipProvider></Label><Input id="chainValidationLevel" type="number" value={chainValidationLevel} onChange={(e) => setChainValidationLevel(parseInt(e.target.value))} className="mt-1" /></div></div></CardContent></Card>
            <Separator className="my-6"/>
            <h3 className={cn(sectionHeadingStyle)}><PackageCheck className="mr-2 h-5 w-5 text-muted-foreground"/>Re-Enrollment Settings</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4"><div className="space-y-4"><div className="flex items-center space-x-2"><Switch id="revokeOnReEnroll" checked={revokeOnReEnroll} onCheckedChange={setRevokeOnReEnroll} /><Label htmlFor="revokeOnReEnroll">Revoke On Re-Enroll</Label></div><div className="flex items-center space-x-2"><Switch id="allowExpiredRenewal" checked={allowExpiredRenewal} onCheckedChange={setAllowExpiredRenewal} /><Label htmlFor="allowExpiredRenewal">Allow Expired Renewal</Label></div><div><Label htmlFor="allowedRenewalDelta">Allowed Renewal Delta (e.g., 100d)</Label><Input id="allowedRenewalDelta" value={allowedRenewalDelta} onChange={(e) => setAllowedRenewalDelta(e.target.value)} placeholder="e.g., 100d" className="mt-1" /></div><div><Label htmlFor="preventiveRenewalDelta">Preventive Renewal Delta (e.g., 31d)</Label><Input id="preventiveRenewalDelta" value={preventiveRenewalDelta} onChange={(e) => setPreventiveRenewalDelta(e.target.value)} placeholder="e.g., 31d" className="mt-1" /></div><div><Label htmlFor="criticalRenewalDelta">Critical Renewal Delta (e.g., 7d)</Label><Input id="criticalRenewalDelta" value={criticalRenewalDelta} onChange={(e) => setCriticalRenewalDelta(e.target.value)} placeholder="e.g., 7d" className="mt-1" /></div><div><Label htmlFor="additionalValidationCAs">Additional Validation CAs (for re-enrollment)</Label><Button type="button" variant="outline" onClick={() => setIsAdditionalValidationCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingDependencies || authLoading}>{isLoadingDependencies || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : additionalValidationCAs.length > 0 ? `Selected ${additionalValidationCAs.length} CA(s)` : "Select CAs..."}</Button>{additionalValidationCAs.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{additionalValidationCAs.map(ca => <CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines}/>)}</div>}</div></div></CardContent></Card>
            <Separator className="my-6"/>
            <h3 className={cn(sectionHeadingStyle)}><Server className="mr-2 h-5 w-5 text-muted-foreground"/>Server Key Generation</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4"><div className="space-y-4"><div className="flex items-center space-x-2"><Switch id="enableKeyGeneration" checked={enableKeyGeneration} onCheckedChange={setEnableKeyGeneration} /><Label htmlFor="enableKeyGeneration">Enable Server-Side Key Generation</Label></div>{enableKeyGeneration && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"><div><Label htmlFor="serverKeygenType">Key Type</Label><Select value={serverKeygenType} onValueChange={setServerKeygenType}><SelectTrigger id="serverKeygenType" className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{serverKeygenTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div><div><Label htmlFor="serverKeygenSpec">{serverKeygenType === 'RSA' ? 'Key Bits' : 'Curve'}</Label><Select value={serverKeygenSpec} onValueChange={setServerKeygenSpec}><SelectTrigger id="serverKeygenSpec" className="mt-1"><SelectValue/></SelectTrigger><SelectContent>{currentServerKeygenSpecOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div></div>)}</div></CardContent></Card>
            <Separator className="my-6"/>
            <h3 className={cn(sectionHeadingStyle)}><AlertTriangle className="mr-2 h-5 w-5 text-muted-foreground"/>CA Distribution</h3>
            <Card className="border-border shadow-sm rounded-md"><CardContent className="p-4"><div className="space-y-4"><div className="flex items-center space-x-2"><Switch id="includeDownstreamCA" checked={includeDownstreamCA} onCheckedChange={setIncludeDownstreamCA} /><Label htmlFor="includeDownstreamCA">Include 'Downstream' CA</Label></div><div className="flex items-center space-x-2"><Switch id="includeEnrollmentCA" checked={includeEnrollmentCA} onCheckedChange={setIncludeEnrollmentCA} /><Label htmlFor="includeEnrollmentCA">Include Enrollment CA</Label></div><div><Label htmlFor="managedCAs">Managed CAs</Label><Button type="button" variant="outline" onClick={() => setIsManagedCaModalOpen(true)} className="w-full justify-start text-left font-normal mt-1" disabled={isLoadingDependencies || authLoading}>{isLoadingDependencies || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : managedCAs.length > 0 ? `Selected ${managedCAs.length} CA(s)` : "Select CAs..."}</Button>{managedCAs.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{managedCAs.map(ca => (<CaVisualizerCard key={ca.id} ca={ca} className="shadow-none border-border max-w-xs" allCryptoEngines={allCryptoEngines}/>))}</div>}</div></div></CardContent></Card>
            <div className="flex justify-end space-x-2 pt-8">
                <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create RA'}
                </Button>
            </div>
          </form>
        </div>
      </div>
      <CaSelectorModal isOpen={isEnrollmentCaModalOpen} onOpenChange={setIsEnrollmentCaModalOpen} title="Select Enrollment CA" description="Choose the CA that will issue certificates." availableCAs={availableCAsForSelection} isLoadingCAs={isLoadingDependencies} errorCAs={errorDependencies} loadCAsAction={loadDependencies} onCaSelected={(ca) => { setEnrollmentCa(ca); setIsEnrollmentCaModalOpen(false); }} currentSelectedCaId={enrollmentCa?.id} isAuthLoading={authLoading} allCryptoEngines={allCryptoEngines} />
      <CaSelectorModal isOpen={isValidationCaModalOpen} onOpenChange={setIsValidationCaModalOpen} title="Select Validation CAs" description="Choose CAs to validate client certificates." availableCAs={availableCAsForSelection} isLoadingCAs={isLoadingDependencies} errorCAs={errorDependencies} loadCAsAction={loadDependencies} onCaSelected={() => {}} isAuthLoading={authLoading} allCryptoEngines={allCryptoEngines}>{renderMultiSelectCaDialogContent(validationCAs, setValidationCAs, setIsValidationCaModalOpen)}</CaSelectorModal>
      <CaSelectorModal isOpen={isAdditionalValidationCaModalOpen} onOpenChange={setIsAdditionalValidationCaModalOpen} title="Select Additional Validation CAs" description="Choose CAs for re-enrollment validation." availableCAs={availableCAsForSelection} isLoadingCAs={isLoadingDependencies} errorCAs={errorDependencies} loadCAsAction={loadDependencies} onCaSelected={() => {}} isAuthLoading={authLoading} allCryptoEngines={allCryptoEngines}>{renderMultiSelectCaDialogContent(additionalValidationCAs, setAdditionalValidationCAs, setIsAdditionalValidationCaModalOpen)}</CaSelectorModal>
      <CaSelectorModal isOpen={isManagedCaModalOpen} onOpenChange={setIsManagedCaModalOpen} title="Select Managed CAs" description="Choose CAs for the CA certs endpoint." availableCAs={availableCAsForSelection} isLoadingCAs={isLoadingDependencies} errorCAs={errorDependencies} loadCAsAction={loadDependencies} onCaSelected={() => {}} isAuthLoading={authLoading} allCryptoEngines={allCryptoEngines}>{renderMultiSelectCaDialogContent(managedCAs, setManagedCAs, setIsManagedCaModalOpen)}</CaSelectorModal>
      <DeviceIconSelectorModal isOpen={isDeviceIconModalOpen} onOpenChange={setIsDeviceIconModalOpen} onIconSelected={(name) => { setSelectedDeviceIconName(name); setIsDeviceIconModalOpen(false); }} currentSelectedIconName={selectedDeviceIconName} initialIconColor={selectedDeviceIconColor} initialBgColor={selectedDeviceIconBgColor} onColorsChange={({ iconColor, bgColor }) => { setSelectedDeviceIconColor(iconColor); setSelectedDeviceIconBgColor(bgColor); }} />
    </div>
  );
}
