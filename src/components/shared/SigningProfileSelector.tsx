
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IssuanceProfileCard } from '@/components/shared/IssuanceProfileCard';
import { Settings2, BookText, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApiSigningProfile, CreateSigningProfilePayload } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createSigningProfile } from '@/lib/ca-data';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { SigningProfileForm, type SigningProfileFormValues } from './SigningProfileForm';


export type ProfileMode = 'reuse' | 'inline' | 'create';

interface SigningProfileSelectorProps {
  profileMode: ProfileMode;
  onProfileModeChange: (mode: ProfileMode) => void;
  availableProfiles: ApiSigningProfile[];
  isLoadingProfiles: boolean;
  selectedProfileId: string | null;
  onProfileIdChange: (id: string) => void;
  inlineModeEnabled?: boolean;
}

export const SigningProfileSelector: React.FC<SigningProfileSelectorProps> = ({
  profileMode,
  onProfileModeChange,
  availableProfiles,
  isLoadingProfiles,
  selectedProfileId,
  onProfileIdChange,
  inlineModeEnabled = false, // Set to false by default as it's not used now
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmittingNewProfile, setIsSubmittingNewProfile] = React.useState(false);
    
  const selectedProfile = React.useMemo(() => {
    if (profileMode === 'reuse' && selectedProfileId) {
      return availableProfiles.find(p => p.id === selectedProfileId);
    }
    return null;
  }, [profileMode, selectedProfileId, availableProfiles]);

  const handleCreateProfileSubmit = async (data: SigningProfileFormValues) => {
    if (!user?.access_token) {
        toast({ title: "Error", description: "Authentication token is missing.", variant: "destructive" });
        return;
    }
    
    setIsSubmittingNewProfile(true);

    let validityPayload: { type: string; duration?: string; time?: string } = { type: 'Duration', duration: '1y' };
    if (data.validity.type === 'Duration') validityPayload = { type: 'Duration', duration: data.validity.durationValue };
    else if (data.validity.type === 'Date' && data.validity.dateValue) validityPayload = { type: 'Date', time: data.validity.dateValue.toISOString() };
    else if (data.validity.type === 'Indefinite') validityPayload = { type: 'Date', time: "9999-12-31T23:59:59.999Z" };

    const payload: CreateSigningProfilePayload = {
        name: data.profileName,
        description: data.description,
        validity: validityPayload,
        sign_as_ca: data.signAsCa,
        honor_key_usage: data.honorKeyUsage,
        key_usage: data.keyUsages || [],
        honor_extended_key_usage: data.honorExtendedKeyUsage,
        extended_key_usage: data.extendedKeyUsages || [],
        honor_subject: data.honorSubject,
        honor_extensions: true,
        crypto_enforcement: {
            enabled: data.cryptoEnforcement.enabled,
            allow_rsa_keys: data.cryptoEnforcement.allowRsa,
            allow_ecdsa_keys: data.cryptoEnforcement.allowEcdsa,
            allowed_rsa_key_sizes: data.cryptoEnforcement.allowedRsaKeySizes || [],
            allowed_ecdsa_key_sizes: data.cryptoEnforcement.allowedEcdsaCurves || [],
        },
    };
    if (!data.honorSubject) {
        payload.subject = { country: data.overrideCountry, state: data.overrideState, organization: data.overrideOrganization, organizational_unit: data.overrideOrgUnit };
    }

    try {
        const newProfile = await createSigningProfile(payload, user.access_token);
        toast({ title: "Profile Created", description: `Issuance Profile "${newProfile.name}" created.` });
        onProfileIdChange(newProfile.id); // Automatically select the new profile
        onProfileModeChange('reuse'); // Switch back to reuse mode
        router.push('/certificate-authorities/new/generate'); // A bit of a hack to force re-render with new profile list
    } catch (error: any) {
        toast({ title: `Creation Failed`, description: error.message, variant: "destructive" });
    } finally {
        setIsSubmittingNewProfile(false);
    }
  };

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
        <Card className={cardClass('reuse')} onClick={() => onProfileModeChange('reuse')}>
          <CardHeader className="pb-3"><div className="flex items-center space-x-3"><div className={iconWrapperClass('reuse')}><BookText className="h-5 w-5" /></div><div><CardTitle className="text-base">Reuse Existing Profile</CardTitle><CardDescription className="text-sm">Use predefined issuance templates</CardDescription></div></div></CardHeader>
        </Card>
        <Card className={cardClass('create')} onClick={() => onProfileModeChange('create')}>
          <CardHeader className="pb-3"><div className="flex items-center space-x-3"><div className={iconWrapperClass('create')}><PlusCircle className="h-5 w-5" /></div><div><CardTitle className="text-base">Create New Profile</CardTitle><CardDescription className="text-sm">Define a full profile on the fly.</CardDescription></div></div></CardHeader>
        </Card>
      </div>

      {profileMode === 'reuse' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-select">Issuance Profile</Label>
            {isLoadingProfiles ? ( <Skeleton className="h-10 w-full md:w-1/2" /> ) : (
              <Select value={selectedProfileId || ''} onValueChange={onProfileIdChange}>
                <SelectTrigger id="profile-select" className="w-full md:w-1/2"><SelectValue placeholder="Select a profile..." /></SelectTrigger>
                <SelectContent>
                  {availableProfiles.length > 0 ? ( availableProfiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>) ) : ( <SelectItem value="none" disabled>No profiles available</SelectItem> )}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedProfile && (
            <div className="pt-2"><IssuanceProfileCard profile={selectedProfile} /></div>
          )}
        </div>
      )}

      {profileMode === 'create' && (
        <div className="pt-4 mt-4 border-t">
          <SigningProfileForm
            onSubmit={handleCreateProfileSubmit}
            isSubmitting={isSubmittingNewProfile}
            submitButton={
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmittingNewProfile}>
                  {isSubmittingNewProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                  Create Profile & Continue
                </Button>
              </div>
            }
          />
        </div>
      )}
    </div>
  );
};
