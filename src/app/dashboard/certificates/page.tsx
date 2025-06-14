
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData } from '@/types/certificate';
import { FileText, Loader2 as Loader2Icon, AlertCircle as AlertCircleIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data'; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';


export default function CertificatesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]); 
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0); 
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null); 

  const [pageSize, setPageSize] = useState<string>('10');
  
  const loadCertificates = useCallback(async (bookmarkToFetch: string | null) => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()) {
        setApiError("User not authenticated. Please log in.");
        setCertificates([]);
        setNextTokenFromApi(null);
        setIsLoadingApi(false);
      }
      return;
    }
    setIsLoadingApi(true);
    setApiError(null);
    try {
      const result = await fetchIssuedCertificates({
        accessToken: user.access_token,
        bookmark: bookmarkToFetch,
        pageSize,
      });
      setCertificates(result.certificates);
      setNextTokenFromApi(result.nextToken);
    } catch (err: any) {
      setApiError(err.message || 'Failed to load issued certificates.');
      setCertificates([]);
      setNextTokenFromApi(null);
    } finally {
      setIsLoadingApi(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading, pageSize]);

  useEffect(() => {
    if (!authLoading) { 
      loadCertificates(bookmarkStack[currentPageIndex]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [authLoading, currentPageIndex, pageSize]); 

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
        loadCertificates(bookmarkStack[currentPageIndex]);
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


  if (authLoading) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Authenticating...</p>
        </div>
    );
  }
  
  if (isLoadingApi && certificates.length === 0) { 
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading Certificates...</p>
        </div>
    );
  }


  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Issued Certificates</h1>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoadingApi && certificates.length > 0}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingApi && certificates.length > 0 && "animate-spin")} /> Refresh List
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        A list of end-entity certificates issued by the system, displaying their Common Name (CN), serial number, issuing CA, and current status.
      </p>

      {apiError && (
        <Alert variant="destructive">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error Loading Certificates</AlertTitle>
          <AlertDescription>{apiError} <Button variant="link" onClick={() => loadCertificates(bookmarkStack[currentPageIndex])} className="p-0 h-auto">Try again?</Button></AlertDescription>
        </Alert>
      )}

      {!apiError && (
        <>
          <CertificateList
            certificates={certificates}
            onInspectCertificate={handleInspectCertificate}
            onCertificateUpdated={handleCertificateUpdated}
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
      
      {(!apiError && (certificates.length > 0 || isLoadingApi)) && (
        <div className="flex justify-between items-center mt-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSizeSelectCertList" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
              <Select
                value={pageSize}
                onValueChange={(value) => {
                  setPageSize(value);
                  setBookmarkStack([null]); 
                  setCurrentPageIndex(0);
                }}
                disabled={isLoadingApi || authLoading}
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
    </div>
  );
}
