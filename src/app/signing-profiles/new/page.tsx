
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, KeyRound, Server, Scroll, FileCode, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ href, title, description, icon: Icon }) => {
  const router = useRouter();
  return (
    <Card
      role="button"
      tabIndex={0}
      className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col group h-full"
      onClick={() => router.push(href)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(href); }}
    >
      <CardHeader className="flex-grow">
        <div className="flex items-start space-x-4">
          <div className="mt-1 p-2 bg-primary/10 rounded-lg">
             <Icon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg group-hover:text-primary transition-colors">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardFooter>
        <Button variant="default" className="w-full" tabIndex={-1}>
          Select Template <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}


export default function CreateSigningProfileHubPage() {
  const router = useRouter();

  return (
    <div className="w-full space-y-8 mb-8">
      <Button variant="outline" onClick={() => router.push('/signing-profiles')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Issuance Profiles
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-headline font-semibold">Create Issuance Profile</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Choose a pre-configured template as a starting point for your new profile, or create a custom profile from scratch to define every setting manually.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        <TemplateCard
            href="/signing-profiles/edit?template=device-auth"
            title="IoT Device Authentication"
            description="A profile with settings optimized for device identity certificates, including client and server authentication."
            icon={KeyRound}
        />
         <TemplateCard
            href="/signing-profiles/edit?template=server-cert"
            title="TLS Web Server"
            description="A profile tailored for issuing standard HTTPS/TLS certificates for web servers and other network services."
            icon={Server}
        />
        <TemplateCard
            href="/signing-profiles/edit?template=code-signing"
            title="Code Signing"
            description="A profile designed for creating code signing certificates to ensure software integrity and authenticity."
            icon={FileCode}
        />
        <TemplateCard
            href="/signing-profiles/edit"
            title="Custom Profile"
            description="Start with a blank slate and configure every aspect of the issuance profile manually for your specific needs."
            icon={Scroll}
        />
      </div>
    </div>
  );
}
