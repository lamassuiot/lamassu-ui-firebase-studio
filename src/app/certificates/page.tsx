
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData } from '@/types/certificate';
import { FileText, Loader2 as Loader2Icon, AlertCircle as AlertCircleIcon, RefreshCw, Search, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data'; 
import { fetchAndProcessCAs, type CA } from '@/lib/ca-data';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';


import { CaSelectorModal } from '@/components/shared/CaSelectorModal';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { useToast } from '@/hooks/use-toast';

export type SortableCertColumn = 'commonName' | 'serialNumber' | 'expires' | 'status' | 'validFrom';
export type SortDirection = 'asc' | 'desc';

export interface CertSortConfig {
  column: SortableCertColumn;
  direction: SortDirection;
}

const API_STATUS_VALUES = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  // PENDING: 'PENDING', // Add if API supports filtering by PENDING
} as const;

type ApiStatusFilterValue = typeof API_STATUS_VALUES[keyof typeof API_STATUS_VALUES] | 'ALL';


export default function CertificatesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCaSelectorOpen, setIsCaSelectorOpen] = useState(false);
  
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pagination State
  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]); 
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); 
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null); 

  // Filtering & Sorting State
  const [pageSize, setPageSize] = useState<string>('10');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'commonName' | 'serialNumber'>('commonName');
  const [statusFilter, setStatusFilter] = useState<ApiStatusFilterValue>('ALL');
  const [sortConfig, setSortConfig] = useState<CertSortConfig | null>({ column: 'expires', direction: 'desc' });

  const [allCAs, setAllCAs] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoadingCryptoEngines, setIsLoadingCryptoEngines] = useState(true);
  const [errorCryptoEngines, setErrorCryptoEngines] = useState<string | null>(null);


  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset pagination when filters or sorting change
  useEffect(() => {
    setCurrentPageIndex(0);
    setBookmarkStack([null]);
  }, [pageSize, debouncedSearchTerm, searchField, statusFilter, sortConfig]);


  const loadCertificatesAndCAs = useCallback(async (bookmarkToFetch: string | null) => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()) {
        setApiError("User not authenticated. Please log in.");
        setErrorCAs("User not authenticated. Please log in.");
        setErrorCryptoEngines("User not authenticated. Please log in.");
        setCertificates([]);
        setAllCAs([]);
        setAllCryptoEngines([]);
        setNextTokenFromApi(null);
      }
      setIsLoadingApi(false);
      setIsLoadingCAs(false);
      setIsLoadingCryptoEngines(false);
      return;
    }
    
    setIsLoadingApi(true);
    if(allCAs.length === 0) setIsLoadingCAs(true);
    if(allCryptoEngines.length === 0) setIsLoadingCryptoEngines(true);
    setApiError(null);
    if(allCAs.length === 0) setErrorCAs(null);
    if(allCryptoEngines.length === 0) setErrorCryptoEngines(null);

    try {
      // API parameters
      const apiParams = new URLSearchParams();
      if (sortConfig) {
        let sortByApiField = '';
        switch (sortConfig.column) {
          case 'commonName': sortByApiField = 'subject.common_name'; break;
          case 'serialNumber': sortByApiField = 'serial_number'; break;
          case 'expires': sortByApiField = 'valid_to'; break;
          case 'status': sortByApiField = 'status'; break;
          case 'validFrom': sortByApiField = 'valid_from'; break;
          default: sortByApiField = 'valid_from';
        }
        apiParams.append('sort_by', sortByApiField);
        apiParams.append('sort_mode', sortConfig.direction);
      } else {
        apiParams.append('sort_by', 'valid_from'); // Default sort
        apiParams.append('sort_mode', 'desc');
      }

      apiParams.append('page_size', pageSize);
      if (bookmarkToFetch) apiParams.append('bookmark', bookmarkToFetch);

      // Filters
      const filtersToApply: string[] = [];
      if (statusFilter !== 'ALL') {
        filtersToApply.push(`status[equal]${statusFilter}`);
      }
      if (debouncedSearchTerm.trim() !== '') {
        if (searchField === 'commonName') {
          filtersToApply.push(`subject.common_name[contains]${debouncedSearchTerm.trim()}`);
        } else if (searchField === 'serialNumber') {
          filtersToApply.push(`serial_number[contains]${debouncedSearchTerm.trim()}`);
        }
      }
      filtersToApply.forEach(f => apiParams.append('filter', f));
      
      const certResult = await fetchIssuedCertificates({
        accessToken: user.access_token,
        apiQueryString: apiParams.toString(), // Pass the constructed query string
      });
      setCertificates(certResult.certificates);
      setNextTokenFromApi(certResult.nextToken);

    } catch (err: any) {
      setApiError(err.message || 'Failed to load issued certificates.');
      setCertificates([]);
      setNextTokenFromApi(null);
    } finally {
      setIsLoadingApi(false);
    }

    // Fetch CAs (only if not already loaded or if a reload is forced)
    if (allCAs.length === 0 && isAuthenticated() && user?.access_token) { 
      try {
        const fetchedCAs = await fetchAndProcessCAs(user.access_token);
        setAllCAs(fetchedCAs);
      } catch (err: any) {
        setErrorCAs(err.message || 'Failed to load CA list for linking.');
      } finally {
        setIsLoadingCAs(false);
      }
    } else if (allCAs.length > 0) {
        setIsLoadingCAs(false); // Already loaded
    }

    // Fetch Crypto Engines (only if needed)
    if (allCryptoEngines.length === 0 && isAuthenticated() && user?.access_token) {
        try {
            const response = await fetch('https://lab.lamassu.io/api/ca/v1/engines', {
                headers: { 'Authorization': `Bearer ${user.access_token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch crypto engines');
            const enginesData: ApiCryptoEngine[] = await response.json();
            setAllCryptoEngines(enginesData);
        } catch (err: any) {
            setErrorCryptoEngines(err.message || 'Failed to load Crypto Engines.');
        } finally {
            setIsLoadingCryptoEngines(false);
        }
    } else if (allCryptoEngines.length > 0) {
        setIsLoadingCryptoEngines(false);
    }

  }, [
      user?.access_token, isAuthenticated, authLoading, 
      pageSize, debouncedSearchTerm, searchField, statusFilter, sortConfig, 
      allCAs.length, allCryptoEngines.length
  ]);

  useEffect(() => {
    // This effect triggers the API call when relevant state changes.
    // It uses currentPageIndex to fetch the correct page's bookmark.
    if (!authLoading && isAuthenticated()) {
        loadCertificatesAndCAs(bookmarkStack[currentPageIndex]);
    } else if (!authLoading && !isAuthenticated()){
        setIsLoadingApi(false);
        setIsLoadingCAs(false);
        setIsLoadingCryptoEngines(false);
        setApiError("User not authenticated. Please log in.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [
    authLoading, isAuthenticated, // Auth related
    currentPageIndex, // Pagination change
    pageSize, debouncedSearchTerm, searchField, statusFilter, sortConfig // Filter/sort changes that reset pagination
  ]); 

  const handleCaSelectedForIssuance = (ca: CA) => {
    if (ca.status !== 'active' || new Date(ca.expires) < new Date()) {
      toast({
        title: "Cannot Issue Certificate",
        description: `CA "${ca.name}" is not active or is expired.`,
        variant: "destructive"
      });
      return;
    }
    if (ca.rawApiData?.certificate.type === 'EXTERNAL_PUBLIC') {
      toast({
        title: "Cannot Issue Certificate",
        description: `CA "${ca.name}" is an external public CA and cannot be used for issuance.`,
        variant: "destructive"
      });
      return;
    }
    setIsCaSelectorOpen(false);
    router.push(`/certificate-authorities/issue-certificate?caId=${ca.id}`);
  };


  const handleInspectCertificate = (certificate: CertificateData) => {
    setSelectedCertificate(certificate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCertificate(null);
  };

  const handleCertificateUpdated = (updatedCertificate: CertificateData) => {
    setCertificates(prevCerts =>
      prevCerts.map(cert => cert.id === updatedCertificate.id ? updatedCertificate : cert)
    );
  };

  const handleRefresh = () => {
    if (currentPageIndex < bookmarkStack.length) {
        loadCertificatesAndCAs(bookmarkStack[currentPageIndex]);
    }
  };

  const handleNextPage = () => {
    if (isLoadingApi) return;
    const potentialNextPageIndex = currentPageIndex + 1;

    if (potentialNextPageIndex < bookmarkStack.length) { 
        setCurrentPageIndex(potentialNextPageIndex);
    } else if (nextTokenFromApi) { 
        const newPageBookmark = nextTokenFromApi;
        const newStack = bookmarkStack.slice(0, currentPageIndex + 1); 
        setBookmarkStack([...newStack, newPageBookmark]); 
        setCurrentPageIndex(newStack.length); 
    }
  };

  const handlePreviousPage = () => {
    if (isLoadingApi || currentPageIndex === 0) return;
    const prevIndex = currentPageIndex - 1;
    setCurrentPageIndex(prevIndex); 
  };

  const requestSort = (column: SortableCertColumn) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };
  
  const loadingText = authLoading 
      ? "Authenticating..." 
      : isLoadingApi 
          ? "Loading Certificates..." 
          : isLoadingCAs
              ? "Loading CA Data..."
              : isLoadingCryptoEngines 
                  ? "Loading Crypto Engines..."
                  : "Loading...";


  if (authLoading || (isLoadingApi && certificates.length === 0) || (isLoadingCAs && allCAs.length === 0) || (isLoadingCryptoEngines && allCryptoEngines.length === 0 && isCaSelectorOpen) ) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">{loadingText}</p>
        </div>
    );
  }
  
  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Active', value: API_STATUS_VALUES.ACTIVE },
    { label: 'Expired', value: API_STATUS_VALUES.EXPIRED },
    { label: 'Revoked', value: API_STATUS_VALUES.REVOKED },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Issued Certificates</h1>
        </div>
        <div className="flex items-center space-x-2 self-start sm:self-center">
            <Button onClick={handleRefresh} variant="outline" disabled={isLoadingApi && certificates.length > 0}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingApi && certificates.length > 0 && "animate-spin")} /> Refresh List
            </Button>
            <Button onClick={() => setIsCaSelectorOpen(true)} variant="default">
                <PlusCircle className="mr-2 h-4 w-4" /> Issue Certificate
            </Button>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="relative col-span-1 md:col-span-1">
            <Label htmlFor="certSearchTermInput">Search Term</Label>
            <Search className="absolute left-3 top-[calc(50%+6px)] -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                id="certSearchTermInput"
                type="text"
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 mt-1"
                disabled={isLoadingApi || authLoading}
            />
        </div>
        <div className="col-span-1 md:col-span-1">
            <Label htmlFor="certSearchFieldSelect">Search In</Label>
            <Select value={searchField} onValueChange={(value: 'commonName' | 'serialNumber') => setSearchField(value)} disabled={isLoadingApi || authLoading}>
                <SelectTrigger id="certSearchFieldSelect" className="w-full mt-1">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="commonName">Common Name</SelectItem>
                    <SelectItem value="serialNumber">Serial Number</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="col-span-1 md:col-span-1">
            <Label htmlFor="certStatusFilterSelect">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApiStatusFilterValue)} disabled={isLoadingApi || authLoading}>
                <SelectTrigger id="certStatusFilterSelect" className="w-full mt-1">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>


      <p className="text-sm text-muted-foreground">
        A list of end-entity certificates issued by the system. Filters and sorting are applied via API calls.
      </p>

      {(apiError || errorCAs || errorCryptoEngines) && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>
            {apiError && <p>Certificates: {apiError}</p>}
            {errorCAs && <p>CAs for Linking: {errorCAs}</p>}
            {errorCryptoEngines && <p>Crypto Engines: {errorCryptoEngines}</p>}
            <Button variant="link" onClick={() => loadCertificatesAndCAs(bookmarkStack[currentPageIndex])} className="p-0 h-auto">Try again?</Button>
          </AlertDescription>
        </Alert>
      )}

      {!(apiError || errorCAs || errorCryptoEngines) && (
        <>
          <CertificateList
            certificates={certificates}
            onInspectCertificate={handleInspectCertificate}
            onCertificateUpdated={handleCertificateUpdated}
            allCAs={allCAs}
            sortConfig={sortConfig}
            requestSort={requestSort}
            isLoading={isLoadingApi && certificates.length > 0} // For visual feedback on table during load
          />
          {certificates.length === 0 && !isLoadingApi && (
            <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
              <h3 className="text-lg font-semibold text-muted-foreground">No Issued Certificates Found</h3>
              <p className="text-sm text-muted-foreground">
                There are no certificates to display based on the current filters or none have been issued yet.
              </p>
            </div>
          )}
        </>
      )}
      
      {!(apiError || errorCAs || errorCryptoEngines) && (certificates.length > 0 || isLoadingApi) && (
        <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSizeSelectCertList" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
              <Select
                value={pageSize}
                onValueChange={(value) => { setPageSize(value); }} // Pagination reset is handled by useEffect
                disabled={isLoadingApi || authLoading || isLoadingCAs}
              >
                <SelectTrigger id="pageSizeSelectCertList" className="w-[80px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
                <Button
                    onClick={handlePreviousPage}
                    disabled={isLoadingApi || currentPageIndex === 0}
                    variant="outline"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button
                    onClick={handleNextPage}
                    disabled={isLoadingApi || !(currentPageIndex < bookmarkStack.length -1 || nextTokenFromApi) }
                    variant="outline"
                >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
      )}

      <CertificateDetailsModal
        certificate={selectedCertificate}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      <CaSelectorModal
        isOpen={isCaSelectorOpen}
        onOpenChange={setIsCaSelectorOpen}
        title="Select an Issuer CA"
        description="Choose the Certificate Authority that will issue the new certificate."
        availableCAs={allCAs}
        isLoadingCAs={isLoadingCAs}
        errorCAs={errorCAs}
        loadCAsAction={() => loadCertificatesAndCAs(bookmarkStack[currentPageIndex])}
        onCaSelected={handleCaSelectedForIssuance}
        isAuthLoading={authLoading}
        allCryptoEngines={allCryptoEngines}
      />
    </div>
  );
}
