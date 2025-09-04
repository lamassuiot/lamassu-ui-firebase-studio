
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings2, Clock, Fingerprint, BookText, KeyRound, ShieldCheck } from "lucide-react";
import type { ApiSigningProfile } from '@/lib/ca-data';
import { cn } from '@/lib/utils';

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start space-x-2 py-1">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {typeof value === 'string' ? <p className="text-sm text-foreground">{value}</p> : value}
    </div>
  </div>
);

interface IssuanceProfileCardProps {
  profile: ApiSigningProfile;
  className?: string;
}

export const IssuanceProfileCard: React.FC<IssuanceProfileCardProps> = ({ profile, className }) => {
  const allowedKeyTypes = [];
  if (profile.crypto_enforcement?.allow_rsa_keys) allowedKeyTypes.push('RSA');
  if (profile.crypto_enforcement?.allow_ecdsa_keys) allowedKeyTypes.push('ECDSA');

  let subjectPolicy = 'Honors Subject DN from CSR.';
  if (!profile.honor_subject) {
      const overrides = Object.entries(profile.subject || {})
          .filter(([, value]) => value)
          .map(([key, value]) => `${key.substring(0,2).toUpperCase()}=${value}`)
          .join(', ');
      subjectPolicy = `Overrides subject with: ${overrides || 'No specific overrides defined'}`;
  }

  let extensionsPolicy = '';
  if (profile.honor_key_usage) {
      extensionsPolicy += 'Honors Key Usage from CSR. ';
  } else {
      extensionsPolicy += `Enforces KU: ${profile.key_usage?.join(', ') || 'None'}. `;
  }
  if (profile.honor_extended_key_usage) {
      extensionsPolicy += 'Honors EKU from CSR.';
  } else {
      extensionsPolicy += `Enforces EKU: ${profile.extended_key_usage?.join(', ') || 'None'}.`;
  }

  return (
    <Card className={cn("shadow-sm border-border", className)}>
      <CardHeader className="p-4">
        <div className="flex items-center space-x-2">
           <Settings2 className="h-5 w-5 text-primary" />
           <CardTitle className="text-md">{profile.name}</CardTitle>
        </div>
        <CardDescription className="text-xs pt-1">{profile.description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 text-sm">
        <DetailRow icon={Clock} label="Validity Duration" value={profile.validity?.duration || 'Not specified'} />
        <DetailRow icon={Fingerprint} label="Subject Policy" value={subjectPolicy} />
        <DetailRow icon={BookText} label="Extensions Policy" value={extensionsPolicy} />
        <DetailRow 
          icon={KeyRound} 
          label="Allowed Key Types" 
          value={
            <div className="flex flex-wrap gap-1">
              {allowedKeyTypes.map(kt => <Badge key={kt} variant="secondary" className="text-xs">{kt}</Badge>)}
              {allowedKeyTypes.length === 0 && <Badge variant="outline">None</Badge>}
            </div>
          } 
        />
         <DetailRow 
            icon={ShieldCheck} 
            label="Can Sign as CA" 
            value={<Badge variant={profile.sign_as_ca ? "default" : "secondary"}>{profile.sign_as_ca ? 'Yes' : 'No'}</Badge>}
         />
      </CardContent>
    </Card>
  );
};
