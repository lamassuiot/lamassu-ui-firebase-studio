
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Download, ShieldAlert, Edit, Loader2, AlertCircle, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Eye, Info, KeyRound, Lock, Link as LinkIcon, Network, ListChecks, Users, Search, ChevronsUpDown, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10 } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { findCaById, fetchAndProcessCAs, getCaDisplayName } from '@/lib/ca-data';
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RevocationModal } from '@/components/shared/RevocationModal';

import { InformationTabContent } from '@/components/shared/details-tabs/InformationTabContent';
import { PemTabContent } from '@/components/shared/details-tabs/PemTabContent';
import { MetadataTabContent } from '@/components/shared/details-tabs/MetadataTabContent';
import { format, parseISO, isPast } from 'date-fns';

// Define Sortable Columns and Direction for issued certificates list
type SortableIssuedCertColumn = 'subject' | 'serialNumber' | 'expires' | 'status';
type SortDirection = 'asc' | 'desc';
interface IssuedCertSortConfig {
  column: SortableIssuedCertColumn;
  direction: SortDirection;
}

const API_STATUS_VALUES_FOR_FILTER = {
  ALL: 'ALL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
type ApiStatusFilterValue = typeof API_STATUS_VALUES_FOR_FILTER[keyof typeof API_STATUS_VALUES_FOR_FILTER];


const buildCaPathToRoot = (targetCaId: string | undefined, allCAs: CA[]): CA[] => {
  if (!targetCaId) return [];
  const path: CA[] = [];
  let current: CA | null = findCaById(targetCaId, allCAs);
  let safetyNet = 0;
  while (current && safetyNet < 10) {
    path.unshift(current);
    if (current.issuer === 'Self-signed' || !current.issuer || current.id === current.issuer) {
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

  // State for Issued Certificates Tab
  const [issuedCertificatesList, setIssuedCertificatesList] = useState<CertificateData[]>([]);
  const [isLoadingIssuedCerts, setIsLoadingIssuedCerts] = useState(false);
  const [errorIssuedCerts, setErrorIssuedCerts] = useState<string | null>(null);
  const [issuedCertsPageSize, setIssuedCertsPageSize] = useState<string>('10');
  const [issuedCertsBookmarkStack, setIssuedCertsBookmarkStack] = useState<(string | null)[]>([null]);
  const [issuedCertsCurrentPageIndex, setIssuedCertsCurrentPageIndex] = useState<number>(0);
  const [issuedCertsNextTokenFromApi, setIssuedCertsNextTokenFromApi] = useState<string | null>(null);
  
  const [issuedCertsSearchTermCN, setIssuedCertsSearchTermCN] = useState('');
  const [issuedCertsDebouncedSearchTermCN, setIssuedCertsDebouncedSearchTermCN] = useState('');
  const [issuedCertsSearchTermSN, setIssuedCertsSearchTermSN] = useState('');
  const [issuedCertsDebouncedSearchTermSN, setIssuedCertsDebouncedSearchTermSN] = useState('');
  const [issuedCertsStatusFilter, setIssuedCertsStatusFilter] = useState<ApiStatusFilterValue>(API_STATUS_VALUES_FOR_FILTER.ALL);
  const [issuedCertsSortConfig, setIssuedCertsSortConfig] = useState<IssuedCertSortConfig | null>({ column: 'expires', direction: 'desc' });


  // Debounce search terms for issued certificates
  useEffect(() => {
    const cnHandler = setTimeout(() => setIssuedCertsDebouncedSearchTermCN(issuedCertsSearchTermCN), 500);
    const snHandler = setTimeout(() => setIssuedCertsDebouncedSearchTermSN(issuedCertsSearchTermSN), 500);
    return () => { clearTimeout(cnHandler); clearTimeout(snHandler); };
  }, [issuedCertsSearchTermCN, issuedCertsSearchTermSN]);

  // Reset pagination for issued certificates when filters or sorting change
  useEffect(() => {
    if (activeTab === 'issued') {
      setIssuedCertsCurrentPageIndex(0);
      setIssuedCertsBookmarkStack([null]);
    }
  }, [issuedCertsPageSize, issuedCertsDebouncedSearchTermCN, issuedCertsDebouncedSearchTermSN, issuedCertsStatusFilter, issuedCertsSortConfig, activeTab]);


  const mockLamassuMetadata = caId ? {
    caId: caDetails?.id,
    name: caDetails?.name,
    status: caDetails?.status,
    configuration: {
      maxPathLength: caDetails?.issuer === 'Self-signed' ? -1 : (caDetails?.children && caDetails.children.length > 0 ? 1 : 0),
      crlDistributionPoints: [`http://crl.example.com/${caDetails?.id.replace(/-/g, '')}.crl`],
      ocspServers: [`http://ocsp.example.com/${caDetails?.id.replace(/-/g, '')}`],
      defaultCertificateLifetime: '365d',
      allowedKeyTypes: ['RSA 2048', 'ECDSA P-256'],
    },
    usageStats: {
      activeCertificates: Math.floor(Math.random() * 1000),
      revokedCertificates: Math.floor(Math.random() * 50),
      expiredCertificates: Math.floor(Math.random() * 100),
      lastIssuedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    auditLogSummary: [
      { timestamp: new Date().toISOString(), action: "CA Created", user: "admin" },
      { timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), action: "Certificate Issued (SN: ...)", user: "system" },
    ]
  } : {};

  useEffect(() => {
    const loadCAs = async () => {
      if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) {
          setErrorCAs("User not authenticated. Cannot load CA data.");
        }
        setIsLoadingCAs(false);
        return;
      }
      setIsLoadingCAs(true);
      setErrorCAs(null);
      try {
        const fetchedCAs = await fetchAndProcessCAs(user.access_token);
        setAllCertificateAuthoritiesData(fetchedCAs);
      } catch (err: any) {
        setErrorCAs(err.message || 'Failed to load CA data.');
      } finally {
        setIsLoadingCAs(false);
      }
    };
    if (!authLoading) loadCAs();
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (isLoadingCAs || !caId || allCertificateAuthoritiesData.length === 0) {
      setCaDetails(null);
      setCaPathToRoot([]);
      setFullChainPemString('');
      return;
    }
    const foundCa = findCaById(caId, allCertificateAuthoritiesData);
    setCaDetails(foundCa);
    if (foundCa) {
      const path = buildCaPathToRoot(foundCa.id, allCertificateAuthoritiesData);
      setCaPathToRoot(path);
      const chainPem = path.map(p => p.pemData).filter(Boolean).join('\\n\\n');
      setFullChainPemString(chainPem);
      setPlaceholderSerial(`${Math.random().toString(16).slice(2,10)}:${Math.random().toString(16).slice(2,10)}`);
    } else {
      setErrorCAs(`CA with ID "${caId}" not found.`);
    }
  }, [caId, allCertificateAuthoritiesData, isLoadingCAs]);


  const loadIssuedCertificatesByCa = useCallback(async (bookmark: string | null) => {
    if (!caDetails?.id || !isAuthenticated() || !user?.access_token) {
      setErrorIssuedCerts("Cannot load certificates: Missing CA ID or user not authenticated.");
      return;
    }
    setIsLoadingIssuedCerts(true);
    setErrorIssuedCerts(null);
    try {
      const apiParams = new URLSearchParams();
      if (issuedCertsSortConfig) {
        let sortByApiField = '';
        switch (issuedCertsSortConfig.column) {
          case 'subject': sortByApiField = 'subject.common_name'; break;
          case 'serialNumber': sortByApiField = 'serial_number'; break;
          case 'expires': sortByApiField = 'valid_to'; break;
          case 'status': sortByApiField = 'status'; break;
          default: sortByApiField = 'valid_from'; 
        }
        apiParams.append('sort_by', sortByApiField);
        apiParams.append('sort_mode', issuedCertsSortConfig.direction);
      } else {
        apiParams.append('sort_by', 'valid_from'); // Default sort
        apiParams.append('sort_mode', 'desc');
      }

      apiParams.append('page_size', issuedCertsPageSize);
      if (bookmark) apiParams.append('bookmark', bookmark);

      const filtersToApply: string[] = [];
      if (issuedCertsStatusFilter !== API_STATUS_VALUES_FOR_FILTER.ALL) {
        filtersToApply.push(`status[equal]${issuedCertsStatusFilter}`);
      }
      if (issuedCertsDebouncedSearchTermCN.trim() !== '') {
        filtersToApply.push(`subject.common_name[contains]${issuedCertsDebouncedSearchTermCN.trim()}`);
      }
      if (issuedCertsDebouncedSearchTermSN.trim() !== '') {
        filtersToApply.push(`serial_number[contains]${issuedCertsDebouncedSearchTermSN.trim()}`);
      }
      filtersToApply.forEach(f => apiParams.append('filter', f));
      
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
  }, [
    caDetails?.id, user?.access_token, isAuthenticated, 
    issuedCertsPageSize, issuedCertsSortConfig, 
    issuedCertsDebouncedSearchTermCN, issuedCertsDebouncedSearchTermSN, issuedCertsStatusFilter
  ]);

  useEffect(() => {
    if (activeTab === 'issued' && caDetails?.id) {
      // This effect triggers the API call when relevant state changes (filters, sort, pagination, or tab activation).
      // Pagination reset useEffects handle resetting to first page on filter/sort changes.
      loadIssuedCertificatesByCa(issuedCertsBookmarkStack[issuedCertsCurrentPageIndex]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [
      activeTab, caDetails?.id, 
      issuedCertsCurrentPageIndex, // For pagination changes
      issuedCertsPageSize, issuedCertsDebouncedSearchTermCN, issuedCertsDebouncedSearchTermSN, issuedCertsStatusFilter, issuedCertsSortConfig // For filter/sort changes that reset pagination
  ]);


  useEffect(() => {
    if (activeTab !== 'issued' || (caDetails?.id && issuedCertificatesList.length > 0 && issuedCertificatesList[0]?.issuerCaId !== caDetails.id)) {
      setIssuedCertificatesList([]);
      setIssuedCertsBookmarkStack([null]);
      setIssuedCertsCurrentPageIndex(0);
      setIssuedCertsNextTokenFromApi(null);
      setErrorIssuedCerts(null);
    }
  }, [activeTab, caDetails?.id, issuedCertificatesList]);


  const handleCARevocation = () => {
    if (caDetails) {
      setCaToRevoke(caDetails);
      setIsRevocationModalOpen(true);
    }
  };

  const handleConfirmCARevocation = (reason: string) => {
    if (caToRevoke) {
      setCaDetails(prev => prev ? {...prev, status: 'revoked'} : null);
      toast({
        title: "CA Revocation (Mock)",
        description: `CA "${caToRevoke.name}" marked as revoked with reason: ${reason}.`,
        variant: "default"
      });
    }
    setIsRevocationModalOpen(false);
    setCaToRevoke(null);
  };

  const handleNextIssuedCertsPage = () => {
    if (isLoadingIssuedCerts) return;
    const potentialNextPageIndex = issuedCertsCurrentPageIndex + 1;
    if (potentialNextPageIndex < issuedCertsBookmarkStack.length) {
        setIssuedCertsCurrentPageIndex(potentialNextPageIndex);
    } else if (issuedCertsNextTokenFromApi) {
        const newStack = [...issuedCertsBookmarkStack, issuedCertsNextTokenFromApi];
        setIssuedCertsBookmarkStack(newStack);
        setIssuedCertsCurrentPageIndex(newStack.length -1);
    }
  };

  const handlePreviousIssuedCertsPage = () => {
    if (isLoadingIssuedCerts || issuedCertsCurrentPageIndex === 0) return;
    const prevIndex = issuedCertsCurrentPageIndex - 1;
    setIssuedCertsCurrentPageIndex(prevIndex);
  };
  
  const requestSortForIssuedCerts = (column: SortableIssuedCertColumn) => {
    let direction: SortDirection = 'asc';
    if (issuedCertsSortConfig && issuedCertsSortConfig.column === column && issuedCertsSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setIssuedCertsSortConfig({ column, direction });
  };

  const SortableIssuedCertHeader: React.FC<{ column: SortableIssuedCertColumn; title: string; className?: string }> = ({ column, title, className }) => {
    const isSorted = issuedCertsSortConfig?.column === column;
    let Icon = ChevronsUpDown;
    if (isSorted) {
      Icon = issuedCertsSortConfig?.direction === 'asc' ? (column === 'expires' ? ArrowUp01 : ArrowUpZA) : (column === 'expires' ? ArrowDown10 : ArrowDownAZ);
    }
    return (
      <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSortForIssuedCerts(column)}>
        <div className="flex items-center gap-1">
          {title} <Icon className={cn("h-4 w-4", isSorted ? "text-primary" : "text-muted-foreground/50")} />
        </div>
      </TableHead>
    );
  };


  if (authLoading || isLoadingCAs) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading CA details...</p>
      </div>
    );
  }

  if (errorCAs && !caDetails) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => routerHook.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading CA</AlertTitle>
          <AlertDescription>{errorCAs}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!caDetails) {
    return (
      <div className="w-full space-y-6 flex flex-col items-center justify-center py-10">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">CA with ID "{caId || 'Unknown'}" not found or data is unavailable.</p>
        <Button variant="outline" onClick={() => routerHook.push('/certificate-authorities')} className="mt-4">
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
    case 'revoked':
      statusColorClass = 'bg-red-500 hover:bg-red-600';
      statusVariant = 'destructive';
      break;
    case 'expired':
      statusColorClass = 'bg-orange-500 hover:bg-orange-600';
      statusVariant = 'destructive';
      break;
    default:
      statusColorClass = 'bg-yellow-500 hover:bg-yellow-600';
  }

  return (
    <div className="w-full space-y-6">
       <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => routerHook.push('/certificate-authorities')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to CAs
        </Button>
      </div>

      <div className="w-full">
        <div className="p-6 border-b">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div>
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-headline font-semibold">{caDetails.name}</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1.5">
                CA ID: {caDetails.id}
              </p>
            </div>
             <Badge variant={statusVariant} className={cn("text-sm self-start sm:self-auto mt-2 sm:mt-0", statusVariant !== 'outline' ? statusColorClass : '')}>{caDetails.status.toUpperCase()}</Badge>
          </div>
        </div>

        <div className="p-6 space-x-2 border-b">
          <Button variant="outline" onClick={() => alert('Download CRL (placeholder)')}><Download className="mr-2 h-4 w-4" /> Download CRL</Button>
          <Button variant="destructive" onClick={handleCARevocation} disabled={caDetails.status === 'revoked'}><ShieldAlert className="mr-2 h-4 w-4" /> Revoke CA</Button>
          <Button variant="outline" onClick={() => alert('Edit Configuration (placeholder)')}><Edit className="mr-2 h-4 w-4" /> Edit Configuration</Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="information"><Info className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Information</TabsTrigger>
            <TabsTrigger value="certificate"><KeyRound className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Certificate PEM</TabsTrigger>
            <TabsTrigger value="metadata"><Lock className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Lamassu Metadata</TabsTrigger>
            <TabsTrigger value="issued"><ListChecks className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Issued Certificates</TabsTrigger>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-4">
                <div className="relative col-span-1 md:col-span-1">
                    <Label htmlFor="issuedCertSearchCN">Search CN</Label>
                    <Search className="absolute left-3 top-[calc(50%+6px)] -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        id="issuedCertSearchCN"
                        type="text"
                        placeholder="Filter by Common Name..."
                        value={issuedCertsSearchTermCN}
                        onChange={(e) => setIssuedCertsSearchTermCN(e.target.value)}
                        className="w-full pl-10 mt-1"
                        disabled={isLoadingIssuedCerts || authLoading}
                    />
                </div>
                <div className="relative col-span-1 md:col-span-1">
                    <Label htmlFor="issuedCertSearchSN">Search SN</Label>
                    <Search className="absolute left-3 top-[calc(50%+6px)] -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        id="issuedCertSearchSN"
                        type="text"
                        placeholder="Filter by Serial Number..."
                        value={issuedCertsSearchTermSN}
                        onChange={(e) => setIssuedCertsSearchTermSN(e.target.value)}
                        className="w-full pl-10 mt-1"
                        disabled={isLoadingIssuedCerts || authLoading}
                    />
                </div>
                <div className="col-span-1 md:col-span-1">
                    <Label htmlFor="issuedCertStatusFilter">Status</Label>
                    <Select value={issuedCertsStatusFilter} onValueChange={(value) => setIssuedCertsStatusFilter(value as ApiStatusFilterValue)} disabled={isLoadingIssuedCerts || authLoading}>
                        <SelectTrigger id="issuedCertStatusFilter" className="w-full mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(API_STATUS_VALUES_FOR_FILTER).map(([key, val]) => <SelectItem key={val} value={val}>{val === 'ALL' ? 'All Statuses' : key.charAt(0) + key.slice(1).toLowerCase()}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
              </div>

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
                  <div className={cn("overflow-x-auto overflow-y-auto max-h-[60vh]", isLoadingIssuedCerts && "opacity-50")}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableIssuedCertHeader column="subject" title="Subject" />
                          <SortableIssuedCertHeader column="serialNumber" title="Serial Number" className="hidden md:table-cell" />
                          <SortableIssuedCertHeader column="expires" title="Expires" />
                          <SortableIssuedCertHeader column="status" title="Status" />
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
