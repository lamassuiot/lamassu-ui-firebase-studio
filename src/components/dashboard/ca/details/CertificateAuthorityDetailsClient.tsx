
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, ShieldAlert, Edit, Loader2, AlertCircle, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { findCaById, fetchAndProcessCAs } from '@/lib/ca-data';
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal';

import { InformationTabContent } from '@/components/shared/details-tabs/InformationTabContent';
import { PemTabContent } from '@/components/shared/details-tabs/PemTabContent';
import { MetadataTabContent } from '@/components/shared/details-tabs/MetadataTabContent';
import { format, parseISO } from 'date-fns';


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

const IssuedCertApiStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const upperStatus = status.toUpperCase();
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = AlertCircle; 

  if (upperStatus.includes('ACTIVE')) {
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
    Icon = CheckCircle;
  } else if (upperStatus.includes('REVOKED')) {
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
    Icon = XCircle;
  } else if (upperStatus.includes('EXPIRED')) {
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    Icon = AlertCircle;
  } else if (upperStatus.includes('PENDING')) {
    badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    Icon = Clock;
  }
  return <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap", badgeClass)}><Icon className="mr-1 h-3 w-3" />{upperStatus.replace('_', ' ')}</Badge>;
};

const getCertSubjectCommonName = (subject: string): string => {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subject; 
};


export default function CertificateAuthorityDetailsClient() {
  const searchParams = useSearchParams();
  const routerHook = useRouter();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const caId = searchParams.get('caId');
  
  const [allCertificateAuthoritiesData, setAllCertificateAuthoritiesData] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const [caDetails, setCaDetails] = useState<CA | null>(null);
  const [caPathToRoot, setCaPathToRoot] = useState<CA[]>([]);
  const [placeholderSerial, setPlaceholderSerial] = useState<string>('');
  const [fullChainPemString, setFullChainPemString] = useState<string>('');
  
  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [caToRevoke, setCaToRevoke] = useState<CA | null>(null);

  const [activeTab, setActiveTab] = useState<string>("information");

  // State for issued certificates list
  const [issuedCertificatesList, setIssuedCertificatesList] = useState<CertificateData[]>([]);
  const [isLoadingIssuedCerts, setIsLoadingIssuedCerts] = useState(false);
  const [errorIssuedCerts, setErrorIssuedCerts] = useState<string | null>(null);
  const [issuedCertsPageSize, setIssuedCertsPageSize] = useState<string>('10');
  const [issuedCertsBookmarkStack, setIssuedCertsBookmarkStack] = useState<(string | null)[]>([null]);
  const [issuedCertsCurrentPageIndex, setIssuedCertsCurrentPageIndex] = useState<number>(0);
  const [issuedCertsNextTokenFromApi, setIssuedCertsNextTokenFromApi] = useState<string | null>(null);


  const mockLamassuMetadata = caId ? { /* ... (existing mock metadata) ... */ } : {};

  useEffect(() => {
    const loadCAs = async () => { /* ... (existing CA loading logic) ... */ };
    if (!authLoading) loadCAs();
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => { /* ... (existing caDetails and path logic) ... */ }, [caId, allCertificateAuthoritiesData, isLoadingCAs]);


  const loadIssuedCertificatesByCa = useCallback(async (bookmark: string | null) => {
    if (!caDetails?.id || !isAuthenticated() || !user?.access_token) {
      setErrorIssuedCerts("Cannot load certificates: Missing CA ID or user not authenticated.");
      return;
    }
    setIsLoadingIssuedCerts(true);
    setErrorIssuedCerts(null);
    try {
      const apiParams = new URLSearchParams();
      apiParams.append('sort_by', 'valid_from');
      apiParams.append('sort_mode', 'desc');
      apiParams.append('page_size', issuedCertsPageSize);
      if (bookmark) apiParams.append('bookmark', bookmark);

      const result = await fetchIssuedCertificates({
        accessToken: user.access_token,
        apiQueryString: apiParams.toString(),
        forCaId: caDetails.id,
      });
      setIssuedCertificatesList(result.certificates);
      setIssuedCertsNextTokenFromApi(result.nextToken);
    } catch (err: any) {
      setErrorIssuedCerts(err.message || 'Failed to load issued certificates for this CA.');
      setIssuedCertificatesList([]);
      setIssuedCertsNextTokenFromApi(null);
    } finally {
      setIsLoadingIssuedCerts(false);
    }
  }, [caDetails?.id, user?.access_token, isAuthenticated, issuedCertsPageSize]);

  useEffect(() => {
    if (activeTab === 'issued' && caDetails?.id) {
      // Reset pagination and load first page if data is not already loaded for this CA or if page size changes
      if (issuedCertificatesList.length === 0 || issuedCertsBookmarkStack.length === 1 && issuedCertsBookmarkStack[0] === null) {
        setIssuedCertsBookmarkStack([null]);
        setIssuedCertsCurrentPageIndex(0);
        loadIssuedCertificatesByCa(null);
      } else {
         loadIssuedCertificatesByCa(issuedCertsBookmarkStack[issuedCertsCurrentPageIndex]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, caDetails?.id, loadIssuedCertificatesByCa, issuedCertsPageSize]); // Add issuedCertsPageSize to trigger reload on change

  useEffect(() => {
    // Reset pagination when tab changes away from 'issued' or when caId changes
    if (activeTab !== 'issued' || (caDetails?.id && issuedCertificatesList.length > 0 && issuedCertificatesList[0]?.issuerCaId !== caDetails.id)) {
      setIssuedCertificatesList([]);
      setIssuedCertsBookmarkStack([null]);
      setIssuedCertsCurrentPageIndex(0);
      setIssuedCertsNextTokenFromApi(null);
      setErrorIssuedCerts(null);
    }
  }, [activeTab, caDetails?.id, issuedCertificatesList]);



  const handleCARevocation = () => { /* ... (existing CA revocation logic) ... */ };
  const handleConfirmCARevocation = (reason: string) => { /* ... (existing CA confirm revocation logic) ... */ };
  
  const handleNextIssuedCertsPage = () => {
    if (isLoadingIssuedCerts || !issuedCertsNextTokenFromApi) return;
    const newStack = [...issuedCertsBookmarkStack, issuedCertsNextTokenFromApi];
    setIssuedCertsBookmarkStack(newStack);
    setIssuedCertsCurrentPageIndex(newStack.length - 1);
    loadIssuedCertificatesByCa(issuedCertsNextTokenFromApi);
  };

  const handlePreviousIssuedCertsPage = () => {
    if (isLoadingIssuedCerts || issuedCertsCurrentPageIndex === 0) return;
    const prevIndex = issuedCertsCurrentPageIndex - 1;
    setIssuedCertsCurrentPageIndex(prevIndex);
    loadIssuedCertificatesByCa(issuedCertsBookmarkStack[prevIndex]);
  };


  if (authLoading || isLoadingCAs) { /* ... (existing loading display) ... */ }
  if (errorCAs && !caDetails) { /* ... (existing error display) ... */ }
  if (!caDetails) { /* ... (existing CA not found display) ... */ }

  let statusColorClass = '';
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "default";
  switch (caDetails.status) { /* ... (existing status styling) ... */ }

  return (
    <div className="w-full space-y-6">
      {/* ... (Back button, Header, Action buttons for CA) ... */}
       <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => routerHook.push('/certificate-authorities')}>
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
          <Button variant="destructive" onClick={handleCARevocation} disabled={caDetails.status === 'revoked'}><ShieldAlert className="mr-2 h-4 w-4" /> Revoke CA</Button>
          <Button variant="outline" onClick={() => alert('Edit Configuration (placeholder)')}><Edit className="mr-2 h-4 w-4" /> Edit Configuration</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-6">
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
              <h3 className="text-lg font-semibold">Certificates Issued by: {caDetails.name}</h3>
              {isLoadingIssuedCerts && (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading issued certificates...</p>
                </div>
              )}
              {errorIssuedCerts && !isLoadingIssuedCerts && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error Loading Issued Certificates</AlertTitle>
                  <AlertDescription>
                    {errorIssuedCerts}
                    <Button variant="link" onClick={() => loadIssuedCertificatesByCa(issuedCertsBookmarkStack[issuedCertsCurrentPageIndex])} className="p-0 h-auto ml-1">Try again?</Button>
                  </AlertDescription>
                </Alert>
              )}
              {!isLoadingIssuedCerts && !errorIssuedCerts && issuedCertificatesList.length > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="hidden md:table-cell">Serial Number</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issuedCertificatesList.map((cert) => (
                          <TableRow key={cert.id}>
                            <TableCell className="font-medium truncate max-w-[200px]">{getCertSubjectCommonName(cert.subject)}</TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[150px]">{cert.serialNumber}</TableCell>
                            <TableCell>{format(parseISO(cert.validTo), 'MMM dd, yyyy')}</TableCell>
                            <TableCell><IssuedCertApiStatusBadge status={cert.apiStatus} /></TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => routerHook.push(`/certificates/details?certificateId=${cert.serialNumber}`)}
                              >
                                <Eye className="mr-1 h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="issuedCertsPageSizeSelect" className="text-sm text-muted-foreground">Page Size:</Label>
                        <Select value={issuedCertsPageSize} onValueChange={setIssuedCertsPageSize}>
                            <SelectTrigger id="issuedCertsPageSizeSelect" className="w-[70px] h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            onClick={handlePreviousIssuedCertsPage}
                            disabled={isLoadingIssuedCerts || issuedCertsCurrentPageIndex === 0}
                            variant="outline" size="sm"
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                        </Button>
                        <Button
                            onClick={handleNextIssuedCertsPage}
                            disabled={isLoadingIssuedCerts || !issuedCertsNextTokenFromApi}
                            variant="outline" size="sm"
                        >
                            Next <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                  </div>
                </>
              )}
              {!isLoadingIssuedCerts && !errorIssuedCerts && issuedCertificatesList.length === 0 && (
                <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    No certificates have been issued by this CA yet, or none match the current filter.
                  </p>
                </div>
              )}
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

// Ensure existing functions like buildCaPathToRoot, findCaById, fetchAndProcessCAs are correctly defined or imported
// Ensure InformationTabContent, PemTabContent, MetadataTabContent, RevocationModal are correctly imported
// Ensure DetailItem and CaHierarchyPathNode are correctly imported if they were separate, or defined if part of InformationTabContent
// Ensure getCaDisplayName is correctly imported or defined
// The mockLamassuMetadata object and other placeholder logic should be filled or removed as needed.

// Helper local definitions if not imported:
// const getCertSubjectCommonName = (subject: string): string => {
//   const cnMatch = subject.match(/CN=([^,]+)/);
//   return cnMatch ? cnMatch[1] : subject; 
// };

// const IssuedCertApiStatusBadge: React.FC<{ status?: string }> = ({ status }) => { /* ... implementation ... */ };
