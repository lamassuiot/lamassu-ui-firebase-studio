
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpirationInput } from '@/components/shared/ExpirationInput';
import { IssuanceProfileCard } from '@/components/shared/IssuanceProfileCard';
import { DurationInput } from './DurationInput';
import { Settings2, BookText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiSigningProfile } from '@/lib/ca-data';
import type { ExpirationConfig } from '@/components/shared/ExpirationInput';

const KEY_USAGE_OPTIONS = [
    { id: "DigitalSignature", label: "Digital Signature" },
    { id: "ContentCommitment", label: "Content Commitment (Non-Repudiation)" },
    { id: "KeyEncipherment", label: "Key Encipherment" },
    { id: "DataEncipherment", label: "Data Encipherment" },
    { id: "KeyAgreement", label: "Key Agreement" },
    { id: "CertSign", label: "Certificate Signing" },
    { id: "CRLSign", label: "CRL Signing" },
    { id: "EncipherOnly", label: "Encipher Only" },
    { id: "DecipherOnly", label: "Decipher Only" },
] as const;

const EKU_OPTIONS = [
    { id: "ServerAuth", label: "Server Authentication" },
    { id: "ClientAuth", label: "Client Authentication" },
    { id: "CodeSigning", label: "Code Signing" },
    { id: "EmailProtection", label: "Email Protection" },
    { id: "TimeStamping", label: "Time Stamping" },
    { id: "OcspSigning", label: "OCSP Signing" },
] as const;

export type ProfileMode = 'reuse' | 'inline' | 'create';

interface SigningProfileSelectorProps {
  profileMode: ProfileMode;
  onProfileModeChange: (mode: ProfileMode) => void;
  availableProfiles: ApiSigningProfile[];
  isLoadingProfiles: boolean;
  selectedProfileId: string | null;
  onProfileIdChange: (id: string) => void;
  
  // Props for 'inline' mode
  inlineModeEnabled?: boolean;
  validity?: ExpirationConfig;
  onValidityChange?: (config: ExpirationConfig) => void;
  validityWarning?: string | null;
  keyUsages?: string[];
  onKeyUsageChange?: (id: string, checked: boolean) => void;
  extendedKeyUsages?: string[];
  onExtendedKeyUsageChange?: (id: string, checked: boolean) => void;

  // Props for 'create' mode
  createModeEnabled?: boolean;
  newProfileName?: string;
  onNewProfileNameChange?: (name: string) => void;
  newProfileDuration?: string;
  onNewProfileDurationChange?: (duration: string) => void;
}

export const SigningProfileSelector: React.FC<SigningProfileSelectorProps> = ({
  profileMode,
  onProfileModeChange,
  availableProfiles,
  isLoadingProfiles,
  selectedProfileId,
  onProfileIdChange,
  
  inlineModeEnabled = true,
  validity,
  onValidityChange,
  validityWarning,
  keyUsages,
  onKeyUsageChange,
  extendedKeyUsages,
  onExtendedKeyUsageChange,

  createModeEnabled = true,
  newProfileName,
  onNewProfileNameChange,
  newProfileDuration,
  onNewProfileDurationChange,
}) => {
    
  const selectedProfile = React.useMemo(() => {
    if (profileMode === 'reuse' && selectedProfileId) {
      return availableProfiles.find(p => p.id === selectedProfileId);
    }
    return null;
  }, [profileMode, selectedProfileId, availableProfiles]);

  const cardClass = (mode: ProfileMode) => cn(
    "cursor-pointer transition-all duration-200 hover:shadow-md border-2",
    profileMode === mode 
      ? "border-primary bg-primary/5 shadow-sm" 
      : "border-border hover:border-primary/50"
  );
  
  const iconWrapperClass = (mode: ProfileMode) => cn(
    "p-2 rounded-lg",
    profileMode === mode 
      ? "bg-primary text-primary-foreground" 
      : "bg-muted text-muted-foreground"
  );

  return (
    <div className="space-y-4">
      <Label>Profile Mode</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reuse Profile Card */}
        <Card className={cardClass('reuse')} onClick={() => onProfileModeChange('reuse')}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-3">
              <div className={iconWrapperClass('reuse')}><BookText className="h-5 w-5" /></div>
              <div>
                <CardTitle className="text-base">Reuse Existing Profile</CardTitle>
                <CardDescription className="text-sm">Use predefined issuance templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">Select from existing signing profiles with pre-configured security policies and certificate settings.</p>
          </CardContent>
        </Card>

        {inlineModeEnabled && (
           <Card className={cardClass('inline')} onClick={() => onProfileModeChange('inline')}>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className={iconWrapperClass('inline')}><Settings2 className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-base">Inline Profile</CardTitle>
                  <CardDescription className="text-sm">Configure certificate settings manually</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">Customize validity period, key usage, and extended key usage for this specific certificate issuance.</p>
            </CardContent>
          </Card>
        )}
        
        {createModeEnabled && (
            <Card className={cardClass('create')} onClick={() => onProfileModeChange('create')}>
            <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                <div className={iconWrapperClass('create')}><Settings2 className="h-5 w-5" /></div>
                <div>
                    <CardTitle className="text-base">Create New Profile</CardTitle>
                    <CardDescription className="text-sm">Define basic settings for a new profile.</CardDescription>
                </div>
                </div>
            </CardHeader>
            </Card>
        )}
      </div>

      {profileMode === 'reuse' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-select">Issuance Profile</Label>
            {isLoadingProfiles ? (
              <Skeleton className="h-10 w-full md:w-1/2" />
            ) : (
              <Select value={selectedProfileId || ''} onValueChange={onProfileIdChange}>
                <SelectTrigger id="profile-select" className="w-full md:w-1/2">
                  <SelectValue placeholder="Select a profile..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.length > 0 ? (
                    availableProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No profiles available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedProfile && (
            <div className="pt-2">
              <IssuanceProfileCard profile={selectedProfile} />
            </div>
          )}
        </div>
      )}

      {profileMode === 'inline' && inlineModeEnabled && validity && onValidityChange && onKeyUsageChange && onExtendedKeyUsageChange && (
        <div className="space-y-4">
          <ExpirationInput
            idPrefix="cert-validity"
            label="Certificate Validity"
            value={validity}
            onValueChange={onValidityChange}
          />
          {validityWarning && (
            <Alert variant="warning" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validityWarning}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><h4 className="font-medium">Key Usage</h4><div className="space-y-1.5 border p-3 rounded-md">{KEY_USAGE_OPTIONS.map(o=><div key={o.id} className="flex items-center space-x-2"><Checkbox id={`ku-${o.id}`} checked={keyUsages?.includes(o.id)} onCheckedChange={(c)=>onKeyUsageChange(o.id, !!c)}/><Label htmlFor={`ku-${o.id}`} className="font-normal">{o.label}</Label></div>)}</div></div>
            <div className="space-y-2"><h4 className="font-medium">Extended Key Usage</h4><div className="space-y-1.5 border p-3 rounded-md">{EKU_OPTIONS.map(o=><div key={o.id} className="flex items-center space-x-2"><Checkbox id={`eku-${o.id}`} checked={extendedKeyUsages?.includes(o.id)} onCheckedChange={(c)=>onExtendedKeyUsageChange(o.id, !!c)}/><Label htmlFor={`eku-${o.id}`} className="font-normal">{o.label}</Label></div>)}</div></div>
          </div>
        </div>
      )}

      {profileMode === 'create' && createModeEnabled && newProfileName !== undefined && onNewProfileNameChange && newProfileDuration !== undefined && onNewProfileDurationChange && (
          <div className="space-y-4 p-4 border rounded-md">
              <div>
                  <Label htmlFor="new-profile-name">New Profile Name</Label>
                  <Input id="new-profile-name" value={newProfileName} onChange={e => onNewProfileNameChange(e.target.value)} placeholder="e.g., Default IoT Device Profile" className="mt-1"/>
              </div>
              <DurationInput
                  id="new-profile-duration"
                  label="New Profile Default Duration"
                  value={newProfileDuration}
                  onChange={onNewProfileDurationChange}
                  placeholder="e.g., 90d"
              />
          </div>
      )}
    </div>
  );
};
