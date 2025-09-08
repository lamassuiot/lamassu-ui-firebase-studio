

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, Settings2, Loader2, AlertTriangle, PlusCircle, Edit, FileText, Code, Lock, Shield } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription as AlertDescUI, AlertTitle as AlertTitleUI } from "@/components/ui/alert";
import {
  fetchSigningProfileById,
  updateSigningProfile,
  createSigningProfile,
  type CreateSigningProfilePayload,
  type ApiSigningProfile,
} from '@/lib/ca-data';
import { SigningProfileForm, type SigningProfileFormValues } from '@/components/shared/SigningProfileForm';


const defaultFormValues: SigningProfileFormValues = {
    profileName: '',
    description: '',
    validity: { type: 'Duration', durationValue: '1y' },
    signAsCa: false,
    honorSubject: true,
    overrideCountry: '',
    overrideState: '',
    overrideOrganization: '',
    overrideOrgUnit: '',
    cryptoEnforcement: {
        enabled: true,
        allowRsa: true,
        allowEcdsa: true,
        allowedRsaKeySizes: [2048, 3072, 4096],
        allowedEcdsaCurves: [256, 384, 521],
    },
    honorKeyUsage: false,
    keyUsages: [],
    honorExtendedKeyUsage: false,
    extendedKeyUsages: [],
};

const templateDefaults: Record<string, Partial<SigningProfileFormValues>> = {
  'device-auth': {
    profileName: 'IoT Device Authentication Profile',
    description: 'For authenticating IoT devices. Includes client and server authentication.',
    validity: { type: 'Duration', durationValue: '5y' },
    cryptoEnforcement: { ...defaultFormValues.cryptoEnforcement },
    keyUsages: ['DigitalSignature', 'KeyEncipherment'],
    extendedKeyUsages: ['ClientAuth', 'ServerAuth'],
    honorKeyUsage: false,
    honorExtendedKeyUsage: false,
  },
  'code-signing': {
    profileName: 'Code Signing Profile',
    description: 'For signing application code and executables.',
    validity: { type: 'Duration', durationValue: '3y' },
    cryptoEnforcement: { ...defaultFormValues.cryptoEnforcement, allowEcdsa: false, allowedRsaKeySizes: [4096] }, // Often RSA
    keyUsages: ['DigitalSignature', 'contentCommitment'],
    extendedKeyUsages: ['CodeSigning'],
    honorKeyUsage: false,
    honorExtendedKeyUsage: false,
  },
  'server-cert': {
    profileName: 'TLS Web Server Profile',
    description: 'For standard TLS web server certificates (HTTPS).',
    validity: { type: 'Duration', durationValue: '1y' },
    cryptoEnforcement: { ...defaultFormValues.cryptoEnforcement },
    keyUsages: ['DigitalSignature', 'KeyEncipherment'],
    extendedKeyUsages: ['ServerAuth'],
    honorKeyUsage: false,
    honorExtendedKeyUsage: false,
  },
  'ca-cert': {
    profileName: 'Intermediate CA Profile',
    description: 'For issuing intermediate CA certificates that can sign other certificates.',
    validity: { type: 'Duration', durationValue: '5y' },
    signAsCa: true,
    cryptoEnforcement: { ...defaultFormValues.cryptoEnforcement },
    keyUsages: ['CertSign', 'CRLSign'],
    extendedKeyUsages: [],
    honorKeyUsage: false,
    honorExtendedKeyUsage: false,
  },
};

const templateMetadata = [
    { id: 'blank', title: 'Blank Template', description: 'Start with an empty, default profile.', icon: FileText },
    { id: 'device-auth', title: 'IoT Device Auth', description: 'For standard device client/server authentication.', icon: Shield },
    { id: 'server-cert', title: 'TLS Web Server', description: 'Standard profile for HTTPS web servers.', icon: Lock },
    { id: 'code-signing', title: 'Code Signing', description: 'For signing application binaries and code.', icon: Code },
    { id: 'ca-cert', title: 'Intermediate CA', description: 'Profile for creating a new sub-CA.', icon: Settings2 },
];

export default function CreateOrEditSigningProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileId = searchParams.get('id');
  const isEditMode = !!profileId;
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [profileData, setProfileData] = useState<ApiSigningProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(isEditMode);
  const [errorProfile, setErrorProfile] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for create flow: 'template' selection or 'form' view
  const [view, setView] = useState<'template' | 'form'>(isEditMode ? 'form' : 'template');
  const [initialFormValues, setInitialFormValues] = useState<SigningProfileFormValues | null>(isEditMode ? null : defaultFormValues);

  const fetchProfile = useCallback(async () => {
    if (!profileId || !user?.access_token) {
        if (isEditMode) setErrorProfile('Profile ID or user token is missing.');
        setIsLoadingProfile(false);
        return;
    }
    setIsLoadingProfile(true);
    try {
        const data = await fetchSigningProfileById(profileId, user.access_token);
        setProfileData(data);
        setErrorProfile(null);
    } catch (error: any) {
        setErrorProfile(error.message);
    } finally {
        setIsLoadingProfile(false);
    }
  }, [profileId, user?.access_token, isEditMode]);

  useEffect(() => {
    if (isEditMode && user?.access_token) {
        fetchProfile();
    }
  }, [user?.access_token, fetchProfile, isEditMode]);

  async function handleSubmit(data: SigningProfileFormValues) {
    if (!user?.access_token) {
        toast({ title: "Error", description: "Authentication token is missing.", variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    let validityPayload: { type: string; duration?: string; time?: string } = { type: 'Duration', duration: '1y' };
    if (data.validity.type === 'Duration') {
        validityPayload = { type: 'Duration', duration: data.validity.durationValue };
    } else if (data.validity.type === 'Date' && data.validity.dateValue) {
        validityPayload = { type: 'Date', time: data.validity.dateValue.toISOString() };
    } else if (data.validity.type === 'Indefinite') {
        validityPayload = { type: 'Date', time: "9999-12-31T23:59:59.999Z" };
    }

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
        payload.subject = {
            country: data.overrideCountry,
            state: data.overrideState,
            organization: data.overrideOrganization,
            organizational_unit: data.overrideOrgUnit,
        }
    }

    try {
        if (isEditMode) {
            await updateSigningProfile(profileId!, payload, user.access_token);
            toast({ title: "Profile Updated", description: `Issuance Profile "${data.profileName}" has been successfully updated.` });
        } else {
            await createSigningProfile(payload, user.access_token);
            toast({ title: "Profile Created", description: `Issuance Profile "${data.profileName}" has been successfully created.` });
        }
        router.push('/signing-profiles');
    } catch (error: any) {
        const action = isEditMode ? "Update" : "Creation";
        toast({ title: `${action} Failed`, description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'blank') {
        setInitialFormValues(defaultFormValues);
    } else {
        const templateData = templateDefaults[templateId];
        setInitialFormValues({ ...defaultFormValues, ...templateData });
    }
    setView('form');
  };
  
  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2"/> 
        Loading profile data...
      </div>
    );
  }

  if (errorProfile) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push('/signing-profiles')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Issuance Profiles
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitleUI>Error Loading Profile</AlertTitleUI>
          <AlertDescUI>{errorProfile}</AlertDescUI>
        </Alert>
      </div>
    );
  }

  const PageIcon = isEditMode ? Edit : PlusCircle;

  return (
    <div className="w-full space-y-6 mb-8">
      <Button variant="outline" onClick={() => router.push('/signing-profiles')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Issuance Profiles
      </Button>

      {view === 'template' && !isEditMode ? (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl font-headline">Select a Template</CardTitle>
                <CardDescription>Choose a template to pre-populate the profile with common settings, or start with a blank slate.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templateMetadata.map(({ id, title, description, icon: Icon }) => (
                        <Card key={id} className="hover:shadow-md hover:border-primary/50 transition-shadow cursor-pointer flex flex-col" onClick={() => handleTemplateSelect(id)}>
                            <CardHeader className="flex-grow">
                                <div className="flex items-center space-x-3 mb-2">
                                    <div className="p-2 bg-muted rounded-md"><Icon className="h-6 w-6 text-primary"/></div>
                                    <h3 className="font-semibold">{title}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
            <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <PageIcon className="h-7 w-7 text-primary" />
                <CardTitle className="text-xl font-headline">{isEditMode ? 'Edit' : 'Create'} Issuance Profile</CardTitle>
              </div>
              {!isEditMode && (
                <Button variant="ghost" onClick={() => setView('template')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Templates
                </Button>
              )}
            </div>
            <CardDescription>
              {isEditMode ? 'Modify the parameters for this certificate issuance profile.' : 'Define the parameters for a new certificate issuance profile.'}
            </CardDescription>
            </CardHeader>
            <CardContent>
            <SigningProfileForm
                profileToEdit={profileData}
                initialValues={initialFormValues}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                key={initialFormValues?.profileName || profileData?.id}
                />
            </CardContent>
        </Card>
      )}
    </div>
  );
}
