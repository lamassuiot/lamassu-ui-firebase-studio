
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Changed from useParams
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, ShieldAlert, Loader2, AlertTriangle, Layers, Code2, Info, ShieldCheck } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CertificateData } from '@/types/certificate';
import type { CA } from '@/lib/ca-data';
import { fetchIssuedCertificates, updateCertificateStatus } from '@/lib/issued-certificate-data';
import { fetchAndProcessCAs, findCaById, fetchCryptoEngines } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal';
import { AkiCaSelectorModal } from '@/components/shared/AkiCaSelectorModal';
import { InformationTabContent } from '@/components/shared/details-tabs/InformationTabContent';
import { PemTabContent } from '@/components/shared/details-tabs/PemTabContent';
import { MetadataTabContent } from '@/components/shared/details-tabs/MetadataTabContent';
import type { ApiCryptoEngine } from '@/types/crypto-engine';


const buildCertificateChainPem = (
  targetCert: CertificateData | null,
  allCAs: CA[]
): string => {
  if (!targetCert?.pemData) return '';

  const chain: string[] = [targetCert.pemData];
  let currentIssuerId = targetCert.issuerCaId;
  let safetyNet = 0;
  const maxDepth = 10; 

  while (currentIssuerId && safetyNet < maxDepth) {
    const issuerCa = findCaById(currentIssuerId, allCAs);
    if (!issuerCa || !issuerCa.pemData) break;

    chain.push(issuerCa.pemData);

    if (issuerCa.issuer === 'Self-signed' || !issuerCa.issuer || issuerCa.id === issuerCa.issuer) {
      break; 
    }
    currentIssuerId = issuerCa.issuer;
    safetyNet++;
  }
  return chain.join('\\n\\n'); 
};


export default function CertificateDetailsClient() { // Renamed component
  const searchParams = useSearchParams(); // Changed from useParams
  const routerHook = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const certificateId = searchParams.get('certificateId'); // Get certificateId from query params

  const [certificateDetails, setCertificateDetails] = useState<CertificateData | null>(null);
  const [allCAs, setAllCAs] = useState<CA[]>([]);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  
  const [isLoadingCert, setIsLoadingCert] = useState(true);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(true);
  const [errorCert, setErrorCert] = useState<string | null>(null);
  const [errorDependencies, setErrorDependencies] = useState<string | null>(null);
  
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState<CertificateData | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  
  const [isAkiModalOpen, setIsAkiModalOpen] = useState(false);
  const [akiToSearch, setAkiToSearch] = useState<string | null>(null);

  const fullChainPemString = useMemo(() => {
    if (certificateDetails && allCAs.length > 0) {
      return buildCertificateChainPem(certificateDetails, allCAs);
    }
    return '';
  }, [certificateDetails, allCAs]);

  const certificateChainForVisualizer: CA[] = useMemo(() => {
    if (!certificateDetails || allCAs.length === 0) return [];
    
    const path: CA[] = [];
    let currentIssuerId = certificateDetails.issuerCaId;
    let safetyNet = 0;
    const maxDepth = 10;

    while (currentIssuerId && safetyNet < maxDepth) {
        const issuerCa = findCaById(currentIssuerId, allCAs);
        if (!issuerCa) break;
        path.unshift(issuerCa); 
        if (issuerCa.issuer === 'Self-signed' || !issuerCa.issuer || issuerCa.id === issuerCa.issuer) {
            break;
        }
        currentIssuerId = issuerCa.issuer;
        safetyNet++;
    }
    return path;
  }, [certificateDetails, allCAs]);


  useEffect(() => {
    const loadCertificate = async () => {
      if (!certificateId) {
        setErrorCert("Certificate ID is missing from URL.");
        setIsLoadingCert(false);
        return;
      }
      if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()){
             setErrorCert("User not authenticated.");
        }
        setIsLoadingCert(false);
        return;
      }
      setIsLoadingCert(true);
      setErrorCert(null);
      try {
        // For simplicity, fetching a larger list to find the cert.
        // In a real app, you might have an endpoint like /api/certificates/:serialNumber
        const { certificates: certList } = await fetchIssuedCertificates({ 
            accessToken: user.access_token, 
            apiQueryString: `filter=serial_number[equal]${certificateId}&page_size=1` // More efficient filter
        });
        const foundCert = certList.length > 0 ? certList[0] : null; // Assuming serial is unique enough
        
        if (foundCert) {
          setCertificateDetails(foundCert);
        } else {
          setErrorCert(`Certificate with Serial Number "${certificateId}" not found.`);
        }
      } catch (err: any) {
        setErrorCert(err.message || 'Failed to load certificate details.');
      } finally {
        setIsLoadingCert(false);
      }
    };

    const loadDependencies = async () => {
        if (!isAuthenticated() || !user?.access_token) {
            if (!authLoading && !isAuthenticated()){
                setErrorDependencies("User not authenticated for dependencies.");
            }
            setIsLoadingDependencies(false);
            return;
        }
        setIsLoadingDependencies(true);
        setErrorDependencies(null);
        try {
            const [fetchedCAs, enginesData] = await Promise.all([
                fetchAndProcessCAs(user.access_token),
                fetchCryptoEngines(user.access_token),
            ]);
            setAllCAs(fetchedCAs);
            setAllCryptoEngines(enginesData);
        } catch (err: any) {
            setErrorDependencies(err.message || 'Failed to load CA list and engines for chain building.');
        } finally {
            setIsLoadingDependencies(false);
        }
    };
    
    if (!authLoading) {
        loadCertificate();
        loadDependencies();
    }

  }, [certificateId, user?.access_token, isAuthenticated, authLoading]);

  const handleOpenRevokeModal = () => {
    if (certificateDetails) {
      setCertificateToRevoke(certificateDetails);
      setIsRevocationModalOpen(true);
    }
  };

  const handleConfirmRevocation = async (reason: string) => {
    if (!certificateToRevoke || !user?.access_token) {
      toast({
        title: "Error",
        description: "Cannot revoke certificate. Missing details or authentication.",
        variant: "destructive",
      });
      return;
    }
    
    setIsRevocationModalOpen(false);
    setIsRevoking(true);

    try {
      await updateCertificateStatus({
        serialNumber: certificateToRevoke.serialNumber,
        status: 'REVOKED',
        reason: reason,
        accessToken: user.access_token,
      });

      setCertificateDetails(prev => prev ? {...prev, apiStatus: 'REVOKED', revocationReason: reason} : null);
      toast({
        title: "Certificate Revoked",
        description: `Certificate with SN: ${certificateToRevoke.serialNumber} has been revoked.`,
        variant: "default",
      });

    } catch (error: any) {
      toast({
        title: "Revocation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCertificateToRevoke(null);
      setIsRevoking(false);
    }
  };

  const handleReactivate = async () => {
    if (!certificateDetails || !user?.access_token) {
      toast({ title: "Error", description: "Cannot reactivate certificate. Missing details or authentication.", variant: "destructive" });
      return;
    }

    try {
       await updateCertificateStatus({
        serialNumber: certificateDetails.serialNumber,
        status: 'ACTIVE',
        accessToken: user.access_token,
      });

      setCertificateDetails(prev => prev ? {...prev, apiStatus: 'ACTIVE', revocationReason: undefined} : null);
      toast({
        title: "Certificate Re-activated",
        description: `Certificate with SN: ${certificateDetails.serialNumber} has been re-activated.`,
        variant: "default",
      });

    } catch (error: any) {
      toast({
        title: "Re-activation Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAkiClick = (aki: string) => {
    setAkiToSearch(aki);
    setIsAkiModalOpen(true);
  };


  if (authLoading || isLoadingCert || isLoadingDependencies) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">
          {authLoading ? "Authenticating..." : 
           isLoadingCert ? "Loading certificate details..." : 
           "Loading CA data..."}
        </p>
      </div>
    );
  }

  if (errorCert || errorDependencies) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => routerHook.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          {errorCert && <AlertDescription>Certificate Error: {errorCert}</AlertDescription>}
          {errorDependencies && <AlertDescription>Dependencies Error: {errorDependencies}</AlertDescription>}
        </Alert>
      </div>
    );
  }

  if (!certificateDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Certificate with Serial Number "{certificateId || 'Unknown'}" not found or data is unavailable.</p>
        <Button variant="outline" onClick={() => routerHook.push('/certificates')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Certificates List
        </Button>
      </div>
    );
  }
  
  const statusText = certificateDetails.apiStatus?.toUpperCase() || 'UNKNOWN';
  let statusColorClass = '';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "outline";

  if (statusText.includes('ACTIVE')) {
    statusColorClass = 'bg-green-500 hover:bg-green-600';
    statusVariant = 'default';
  } else if (statusText.includes('REVOKED')) {
    statusColorClass = 'bg-red-500 hover:bg-red-600';
    statusVariant = 'destructive';
  } else if (statusText.includes('EXPIRED')) {
    statusColorClass = 'bg-orange-500 hover:bg-orange-600';
    statusVariant = 'destructive';
  } else {
    statusColorClass = 'bg-yellow-500 hover:bg-yellow-600'; 
  }

  const isOnHold = certificateDetails.apiStatus?.toUpperCase() === 'REVOKED' && certificateDetails.revocationReason === 'CertificateHold';

  return (
    <div className="w-full space-y-6">
      <Button variant="outline" onClick={() => routerHook.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      
      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div>
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold truncate" title={certificateDetails.subject}>
                  {certificateDetails.subject || `Certificate: ${certificateDetails.serialNumber}`}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                Serial Number: {certificateDetails.serialNumber}
              </p>
            </div>
            <Badge variant={statusVariant} className={cn("text-sm self-start sm:self-auto mt-2 sm:mt-0", statusVariant !== 'outline' ? statusColorClass : '')}>
                {statusText}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-x-2 border-b">
          {isOnHold ? (
            <Button variant="outline" onClick={handleReactivate}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Re-activate Certificate
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={handleOpenRevokeModal} 
              disabled={statusText === 'REVOKED' || isRevoking}
            >
              {isRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              {isRevoking ? 'Revoking...' : 'Revoke Certificate'}
            </Button>
          )}
        </div>

        <Tabs defaultValue="information" className="w-full p-6">
          <TabsList className="mb-6">
            <TabsTrigger value="information"><Info className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Details</TabsTrigger>
            <TabsTrigger value="pem"><Code2 className="mr-2 h-4 w-4 sm:hidden md:inline-block" />PEM Data</TabsTrigger>
            <TabsTrigger value="raw_api"><Layers className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Raw API Data</TabsTrigger>
          </TabsList>

          <TabsContent value="information">
            <InformationTabContent
              item={certificateDetails}
              itemType="certificate"
              certificateSpecific={{
                certificateChainForVisualizer: certificateChainForVisualizer,
                statusBadgeVariant: statusVariant,
                statusBadgeClass: statusColorClass,
                apiStatusText: statusText,
              }}
              routerHook={routerHook}
              onAkiClick={handleAkiClick}
            />
          </TabsContent>

          <TabsContent value="pem">
            <PemTabContent
                singlePemData={certificateDetails.pemData}
                fullChainPemData={fullChainPemString}
                itemName={certificateDetails.subject || certificateDetails.serialNumber}
                itemPathToRootCount={certificateChainForVisualizer.length + 1} // Cert + CAs
                toast={toast}
            />
          </TabsContent>

          <TabsContent value="raw_api">
            <MetadataTabContent
              rawJsonData={certificateDetails.rawApiData}
              itemName={certificateDetails.subject || certificateDetails.serialNumber}
              tabTitle="Raw API Data"
              toast={toast}
            />
          </TabsContent>
        </Tabs>
      </div>
      {certificateToRevoke && (
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setCertificateToRevoke(null);
          }}
          onConfirm={handleConfirmRevocation}
          itemName={certificateToRevoke.subject}
          itemType="Certificate"
          isConfirming={isRevoking}
        />
      )}
      <AkiCaSelectorModal
        isOpen={isAkiModalOpen}
        onOpenChange={setIsAkiModalOpen}
        aki={akiToSearch}
        allCryptoEngines={allCryptoEngines}
      />
    </div>
  );
}
