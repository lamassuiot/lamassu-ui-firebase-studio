
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, ShieldAlert, Edit, Database, Loader2 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { findCaById, fetchAndProcessCAs } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal';

import { InformationTabContent } from '@/components/shared/details-tabs/InformationTabContent';
import { PemTabContent } from '@/components/shared/details-tabs/PemTabContent';
import { MetadataTabContent } from '@/components/shared/details-tabs/MetadataTabContent';


const buildCaPathToRoot = (targetCaId: string | undefined, allCAs: CA[]): CA[] => {
  if (!targetCaId) return [];
  const path: CA[] = [];
  let current: CA | null = findCaById(targetCaId, allCAs);
  let safetyNet = 0; 
  while (current && safetyNet < 10) { 
    path.unshift(current); 
    if (current.issuer === 'Self-signed' || !current.issuer) {
      break;
    }
    const parentCa = findCaById(current.issuer, allCAs);
    if (!parentCa || path.some(p => p.id === parentCa.id)) { 
        break;
    }
    current = parentCa;
    safetyNet++;
  }
  return path;
};


export default function CertificateAuthorityDetailsClient() {
  const params = useParams();
  const routerHook = useRouter(); // Renamed to avoid conflict with router prop if any
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const caId = params.caId as string;
  
  const [allCertificateAuthoritiesData, setAllCertificateAuthoritiesData] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const [caDetails, setCaDetails] = useState<CA | null>(null);
  const [caPathToRoot, setCaPathToRoot] = useState<CA[]>([]);
  const [placeholderSerial, setPlaceholderSerial] = useState<string>('');
  const [fullChainPemString, setFullChainPemString] = useState<string>('');
  
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [caToRevoke, setCaToRevoke] = useState<CA | null>(null);

  // Mock Lamassu Metadata will be passed to MetadataTabContent
  const mockLamassuMetadata = {
    lamassuInternalId: `lm_ca_${caId.replace(/-/g, '_')}`,
    provisioningProfile: "Default IoT Device Profile",
    associatedDeviceGroups: ["group_thermostats_emea", "group_sensors_floor_1"],
    customPoliciesApplied: [
      { policyId: "pol_strict_key_usage", version: "1.2" },
      { policyId: "pol_geo_fence_eu", version: "1.0" }
    ],
    lastAuditDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    monitoringEndpoints: {
      status: `https://monitoring.lamassu.io/ca/${caId}/status`,
      crl_health: `https://monitoring.lamassu.io/ca/${caId}/crl_health`
    },
    tags: ["production", "iot", "device-auth"],
    operationalNotes: "Standard CA for production device authentication. Monitored by Ops Team X.",
    backupFrequency: "daily",
    kmsIntegration: {
        enabled: true,
        keyId: caDetails?.kmsKeyId || `arn:aws:kms:eu-west-1:123456789012:key/mock-kms-${caId}`
    }
  };

  useEffect(() => {
    const loadCAs = async () => {
      if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) {
          setErrorCAs("User not authenticated. Please log in.");
          setIsLoadingCAs(false);
        }
        return;
      }
      setIsLoadingCAs(true);
      setErrorCAs(null);
      try {
        const fetchedCAs = await fetchAndProcessCAs(user.access_token);
        setAllCertificateAuthoritiesData(fetchedCAs);
      } catch (err: any) {
        setErrorCAs(err.message || 'Failed to load Certificate Authorities data.');
      } finally {
        setIsLoadingCAs(false);
      }
    };

    if (!authLoading) {
      loadCAs();
    }
  }, [user?.access_token, isAuthenticated, authLoading]);


  useEffect(() => {
    if (allCertificateAuthoritiesData.length > 0 && !isLoadingCAs) {
      const foundCa = findCaById(caId, allCertificateAuthoritiesData);
      setCaDetails(foundCa);
      if (foundCa) {
        const path = buildCaPathToRoot(foundCa.id, allCertificateAuthoritiesData);
        setCaPathToRoot(path);

        const chainInOrderForPem = [...path].reverse(); 
        const chainPem = chainInOrderForPem
          .map(caNode => caNode.pemData || '')
          .filter(pem => pem.trim() !== '')
          .join('\\n\\n'); // Use escaped newlines for pre block display
        setFullChainPemString(chainPem);

      } else {
        setCaPathToRoot([]);
        setFullChainPemString('');
        setErrorCAs(prevError => prevError ? prevError : `CA with ID "${caId}" not found in the loaded data.`);
      }
      setPlaceholderSerial(Math.random().toString(16).slice(2, 10).toUpperCase() + ':' + Math.random().toString(16).slice(2, 10).toUpperCase());
    }
  }, [caId, allCertificateAuthoritiesData, isLoadingCAs]);


  const handleOpenRevokeCAModal = () => {
    if (caDetails) {
      setCaToRevoke(caDetails);
      setIsRevocationModalOpen(true);
    }
  };

  const handleConfirmCARevocation = (reason: string) => {
    if (caToRevoke) {
      console.log(`Revoking CA: ${caToRevoke.name} (ID: ${caToRevoke.id}) for reason: ${reason}`);
      setCaDetails(prev => prev ? {...prev, status: 'revoked'} : null);
      toast({
        title: "CA Revocation (Mock)",
        description: `CA "${caToRevoke.name}" marked as revoked with reason: ${reason}.`,
        variant: "default"
      });
      setAllCertificateAuthoritiesData(prevCAs => 
        prevCAs.map(ca => ca.id === caToRevoke.id ? {...ca, status: 'revoked'} : ca)
      );
    }
    setIsRevocationModalOpen(false);
    setCaToRevoke(null);
  };


  if (authLoading || isLoadingCAs) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {authLoading ? "Authenticating..." : "Loading CA data..."}
        </p>
      </div>
    );
  }

  if (errorCAs && !caDetails) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => routerHook.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
          </Button>
        <Alert variant="destructive">
          <FileText className="h-4 w-4" />
          <AlertTitle>Error Loading CA Details</AlertTitle>
          <AlertDescription>{errorCAs}</AlertDescription>
        </Alert>
      </div>
    );
  }


  if (!caDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground animate-pulse" />
        <p className="text-muted-foreground">Searching for CA details for ID: {caId}...</p>
        <Button variant="outline" onClick={() => routerHook.back()} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
      </div>
    );
  }

  let statusColorClass = '';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  switch (caDetails.status) {
    case 'active':
      statusColorClass = 'bg-green-500 hover:bg-green-600';
      statusVariant = 'default';
      break;
    case 'expired':
      statusColorClass = 'bg-orange-500 hover:bg-orange-600';
      statusVariant = 'destructive';
      break;
    case 'revoked':
      statusColorClass = 'bg-red-500 hover:bg-red-500';
      statusVariant = 'destructive';
      break;
    default:
      statusColorClass = 'bg-muted hover:bg-muted/80';
      statusVariant = 'outline';
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => routerHook.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
      </div>
      
      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold">{caDetails.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                CA ID: {caDetails.id}
              </p>
            </div>
             <Badge variant={statusVariant} className={cn("text-sm", statusVariant !== 'outline' ? statusColorClass : '')}>{caDetails.status.toUpperCase()}</Badge>
          </div>
        </div>

        <div className="p-6 space-x-2 border-b">
          <Button variant="outline" onClick={() => alert('Download CRL (placeholder)')}><Download className="mr-2 h-4 w-4" /> Download CRL</Button>
          <Button variant="destructive" onClick={handleOpenRevokeCAModal} disabled={caDetails.status === 'revoked'}><ShieldAlert className="mr-2 h-4 w-4" /> Revoke CA</Button>
          <Button variant="outline" onClick={() => alert('Edit Configuration (placeholder)')}><Edit className="mr-2 h-4 w-4" /> Edit Configuration</Button>
        </div>

        <Tabs defaultValue="information" className="w-full p-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="information">Information</TabsTrigger>
            <TabsTrigger value="certificate">Certificate PEM</TabsTrigger>
            <TabsTrigger value="metadata">Lamassu Metadata</TabsTrigger>
            <TabsTrigger value="issued">Issued Certificates</TabsTrigger>
          </TabsList>

          <TabsContent value="information">
            <InformationTabContent
              item={caDetails}
              itemType="ca"
              caSpecific={{
                pathToRoot: caPathToRoot,
                allCAsForLinking: allCertificateAuthoritiesData,
                currentCaId: caDetails.id,
                placeholderSerial: placeholderSerial,
              }}
              routerHook={routerHook}
            />
          </TabsContent>

          <TabsContent value="certificate">
            <PemTabContent
              singlePemData={caDetails.pemData}
              fullChainPemData={fullChainPemString}
              itemName={caDetails.name}
              itemPathToRootCount={caPathToRoot.length}
              toast={toast}
            />
          </TabsContent>

          <TabsContent value="metadata">
             <MetadataTabContent
              rawJsonData={mockLamassuMetadata}
              itemName={caDetails.name}
              tabTitle="LamassuIoT Specific Metadata"
              toast={toast}
            />
          </TabsContent>

          <TabsContent value="issued">
             <div className="space-y-4 py-4">
                <h3 className="text-lg font-semibold">Certificates Issued by this CA</h3>
                <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-4">
                        A list of certificates directly issued by <strong>{caDetails.name}</strong> would be displayed here.
                    </p>
                    <Button variant="secondary" onClick={() => routerHook.push(`/dashboard/certificates?issuerCaId=${caDetails.id}`)}>
                        View/Manage Issued Certificates
                    </Button>
                </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {caToRevoke && (
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setCaToRevoke(null);
          }}
          onConfirm={handleConfirmCARevocation}
          itemName={caToRevoke.name}
          itemType="CA"
        />
      )}
    </div>
  );
}

    