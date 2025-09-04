
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollTextIcon, PlusCircle, Settings2, Clock, Fingerprint, BookText, Edit, KeyRound, ShieldCheck, Loader2, RefreshCw, AlertTriangle, Scale } from "lucide-react";

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSigningProfiles, type ApiSigningProfile } from '@/lib/ca-data';


interface SigningProfile {
  id: string;
  name: string;
  description: string;
  duration: string;
  subjectPolicy: string;
  extensionsPolicy: string;
  allowedKeyTypes: string[];
  signAsCa: boolean;
}

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
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<SigningProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformAndSetProfiles = useCallback((apiProfiles: ApiSigningProfile[]) => {
    const transformed = apiProfiles.map(p => {
        let subjectPolicy = 'Honors Subject DN from CSR.';
        if (!p.honor_subject) {
            const overrides = Object.entries(p.subject || {})
                .filter(([, value]) => value)
                .map(([key, value]) => `${key.substring(0,2).toUpperCase()}=${value}`)
                .join(', ');
            subjectPolicy = `Overrides subject with: ${overrides || 'No specific overrides defined'}`;
        }

        let extensionsPolicy = '';
        if (p.honor_key_usage) {
            extensionsPolicy += 'Honors Key Usage from CSR. ';
        } else {
            extensionsPolicy += `Enforces KU: ${p.key_usage?.join(', ') || 'None'}. `;
        }
        if (p.honor_extended_key_usage) {
            extensionsPolicy += 'Honors EKU from CSR.';
        } else {
            extensionsPolicy += `Enforces EKU: ${p.extended_key_usage?.join(', ') || 'None'}.`;
        }

        const allowedKeyTypes = [];
        if (p.crypto_enforcement?.allow_rsa_keys) allowedKeyTypes.push('RSA');
        if (p.crypto_enforcement?.allow_ecdsa_keys) allowedKeyTypes.push('ECDSA');

        return {
            id: p.id,
            name: p.name,
            description: p.description,
            duration: p.validity?.duration || 'Not specified',
            subjectPolicy,
            extensionsPolicy,
            allowedKeyTypes,
            signAsCa: p.sign_as_ca
        };
    });
    setProfiles(transformed);
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSigningProfiles(user.access_token);
      transformAndSetProfiles(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching profiles.");
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, authLoading, transformAndSetProfiles]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
        fetchProfiles();
    }
  }, [fetchProfiles, authLoading, isAuthenticated]);

  const handleCreateNewProfile = () => {
    router.push('/signing-profiles/new');
  };

  const handleEditProfile = (profileId: string) => {
    router.push(`/signing-profiles/edit?id=${profileId}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{authLoading ? "Authenticating..." : "Loading Issuance Profiles..."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ScrollTextIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Issuance Profiles</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={fetchProfiles} variant="outline" disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button onClick={handleCreateNewProfile}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage templates that define how certificates are signed, including duration, subject attributes, and extensions.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Profiles</AlertTitle>
          <AlertDescription>{error} <Button variant="link" onClick={fetchProfiles} className="p-0 h-auto">Try again?</Button></AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card
              key={profile.id}
              className={cn(
                "flex flex-col group shadow-md border border-border hover:border-primary/60 hover:shadow-xl transition-all duration-200 overflow-hidden relative",
                profile.signAsCa && "ring-2 ring-primary/30"
              )}
              style={{ minHeight: 320 }}
            >
              {/* Accent bar */}
              <div className="h-2 w-full bg-gradient-to-r from-primary to-primary/60" />
              <CardHeader className="pb-2 pt-4 flex flex-row items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-md p-2 bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Scale className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">{profile.name}</CardTitle>
                    <CardDescription className="text-xs pt-1 text-muted-foreground max-w-xs line-clamp-2">{profile.description}</CardDescription>
                  </div>
                </div>
                {profile.signAsCa && (
                  <Badge variant="default" className="ml-2 text-xs px-2 py-1 bg-green-600/90 text-white">CA</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm flex-grow pt-0">
                <DetailRow icon={Clock} label="Validity Duration" value={profile.duration} />
                <DetailRow icon={Fingerprint} label="Subject Policy" value={profile.subjectPolicy} />
                <DetailRow icon={BookText} label="Extensions Policy" value={profile.extensionsPolicy} />
                <DetailRow
                  icon={KeyRound}
                  label="Allowed Key Types"
                  value={
                    <div className="flex flex-wrap gap-1">
                      {profile.allowedKeyTypes.map(kt => (
                        <Badge key={kt} variant="secondary" className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200">
                          {kt}
                        </Badge>
                      ))}
                      {profile.allowedKeyTypes.length === 0 && <Badge variant="outline">None</Badge>}
                    </div>
                  }
                />
              </CardContent>
              <CardFooter className="border-t pt-2 pb-2 bg-muted/30 flex justify-end gap-2 min-h-0">
                <Button
                  variant="destructive"
                  size="sm"
                  className="group-hover:border-destructive"
                  onClick={() => alert(`Delete profile ${profile.name} (placeholder)`)}
                >
                  Delete
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="group-hover:bg-primary/90"
                  onClick={() => handleEditProfile(profile.id)}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
         !isLoading && !error && <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No Issuance Profiles Defined</h3>
            <p className="text-sm text-muted-foreground">
            Get started by creating a new issuance profile.
            </p>
            <Button onClick={handleCreateNewProfile} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </Button>
        </div>
      )}
    </div>
  );
}
