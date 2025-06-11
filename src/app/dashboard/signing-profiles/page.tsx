
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollTextIcon, PlusCircle, Settings2, Clock, Fingerprint, BookText, Eye, Edit } from "lucide-react";
import { useRouter } from 'next/navigation';

interface SigningProfile {
  id: string;
  name: string;
  description: string;
  duration: string;
  subjectPolicy: string;
  extensionsPolicy: string;
  allowedKeyTypes: string[];
  keyStrength: string;
  signatureAlgorithm: string;
}

const mockSigningProfilesData: SigningProfile[] = [
  {
    id: 'profile-iot-standard',
    name: 'IoT Device Standard Profile',
    description: 'General purpose profile for most IoT devices, balancing security and operational needs.',
    duration: '1 year (Fixed)',
    subjectPolicy: 'Respects CSR CN, appends OU=Managed Devices, O=LamassuIoT',
    extensionsPolicy: 'Honors CSR EKU (if present), adds KeyUsage: Digital Signature, Client Auth. Basic Constraints: CA:FALSE',
    allowedKeyTypes: ['RSA', 'ECDSA'],
    keyStrength: 'RSA: min 2048-bit, ECDSA: P-256 or P-384',
    signatureAlgorithm: 'SHA256withRSA or SHA256withECDSA (based on key type)',
  },
  {
    id: 'profile-web-server-tls',
    name: 'Web Server TLS Profile',
    description: 'Profile for issuing TLS certificates for web servers and services.',
    duration: '90 days (Fixed)',
    subjectPolicy: 'Requires CN, O, L, ST, C. CSR values are used.',
    extensionsPolicy: 'Strict: KeyUsage: Key Encipherment, Digital Signature. EKU: Server Authentication. Includes SAN from CSR.',
    allowedKeyTypes: ['RSA', 'ECDSA'],
    keyStrength: 'RSA: min 2048-bit, ECDSA: P-256',
    signatureAlgorithm: 'SHA256withRSA or SHA256withECDSA',
  },
  {
    id: 'profile-code-signing',
    name: 'Code Signing Profile',
    description: 'Profile for issuing code signing certificates for software and firmware.',
    duration: '3 years (Fixed)',
    subjectPolicy: 'Requires CN (Developer/Company Name), O. CSR values are used.',
    extensionsPolicy: 'Strict: KeyUsage: Digital Signature. EKU: Code Signing. No Basic Constraints.',
    allowedKeyTypes: ['RSA'],
    keyStrength: 'RSA: min 3072-bit',
    signatureAlgorithm: 'SHA384withRSA',
  },
  {
    id: 'profile-short-lived-api',
    name: 'Short-Lived API Client Profile',
    description: 'For machine-to-machine API client authentication with short validity periods.',
    duration: '24 hours (Fixed)',
    subjectPolicy: 'CN generated based on service account ID. Fixed O and OU.',
    extensionsPolicy: 'Strict: KeyUsage: Digital Signature. EKU: Client Authentication. Basic Constraints: CA:FALSE',
    allowedKeyTypes: ['ECDSA'],
    keyStrength: 'ECDSA: P-256',
    signatureAlgorithm: 'SHA256withECDSA',
  },
];

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-2 py-1">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {typeof value === 'string' ? <p className="text-sm text-foreground">{value}</p> : value}
    </div>
  </div>
);

export default function SigningProfilesPage() {
  const router = useRouter();

  const handleCreateNewProfile = () => {
    // Placeholder for navigating to a new profile creation page
    alert('Navigate to Create New Signing Profile page (placeholder)');
    // router.push('/dashboard/signing-profiles/new');
  };

  const handleEditProfile = (profileId: string) => {
    alert(`Edit profile ${profileId} (placeholder)`);
    // router.push(`/dashboard/signing-profiles/${profileId}/edit`);
  };

  const handleViewUsage = (profileId: string) => {
     alert(`View usage for profile ${profileId} (placeholder)`);
    // router.push(`/dashboard/signing-profiles/${profileId}/usage`);
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ScrollTextIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Signing Profiles</h1>
        </div>
        <Button onClick={handleCreateNewProfile}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage templates that define how certificates are signed, including duration, subject attributes, and extensions.
      </p>

      {mockSigningProfilesData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockSigningProfilesData.map((profile) => (
            <Card key={profile.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-2">
                   <Settings2 className="h-5 w-5 text-primary" />
                   <CardTitle className="text-lg">{profile.name}</CardTitle>
                </div>
                <CardDescription className="text-xs pt-1">{profile.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow">
                <DetailRow icon={Clock} label="Duration" value={profile.duration} />
                <DetailRow icon={Fingerprint} label="Subject Policy" value={profile.subjectPolicy} />
                <DetailRow icon={BookText} label="Extensions Policy" value={profile.extensionsPolicy} />
                <DetailRow 
                  icon={KeyRound} 
                  label="Allowed Key Types" 
                  value={
                    <div className="flex flex-wrap gap-1">
                      {profile.allowedKeyTypes.map(kt => <Badge key={kt} variant="secondary" className="text-xs">{kt}</Badge>)}
                    </div>
                  } 
                />
                 <DetailRow icon={ShieldCheck} label="Key Strength" value={profile.keyStrength} />
                 <DetailRow icon={PenTool} label="Signature Algorithm" value={profile.signatureAlgorithm} />
              </CardContent>
              <CardFooter className="border-t pt-4">
                <div className="flex w-full justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewUsage(profile.id)}>
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> View Usage
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleEditProfile(profile.id)}>
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No Signing Profiles Defined</h3>
            <p className="text-sm text-muted-foreground">
            Get started by creating a new signing profile.
            </p>
            <Button onClick={handleCreateNewProfile} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </Button>
        </div>
      )}
    </div>
  );
}
// Helper Lucide icons, assuming they might not be auto-imported sometimes
// If not already available in lucide-react, these would need to be handled.
// For this mock, we assume PenTool and ShieldCheck are available or can be substituted.
const PenTool = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 20h9"/>
    <path d="M16.3761 3.22386L19.5563 6.40406C20.4632 7.31093 20.5222 8.79813 19.6951 9.78853L9.16202 21.2547C8.9634 21.4727 8.68903 21.6033 8.39266 21.6033H3V17.2107C3 16.9143 3.12732 16.6399 3.34533 16.4413L13.8784 4.9751C14.8688 4.14805 16.208 4.08907 17.1148 4.99594C17.1148 4.99594 17.1148 4.99594 17.1148 4.99594L16.3761 3.22386Z"/>
    <path d="M14.5 6.5L18 10"/>
  </svg>
);
const KeyRound = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 10h-3.38a3 3 0 0 1-2.28-5.18l1.32-1.92A1.94 1.94 0 0 0 15 1H9a6 6 0 0 0-6 6v6a6 6 0 0 0 6 6h2"/>
    <circle cx="16.5" cy="16.5" r="2.5"/>
  </svg>
);
const ShieldCheck = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

