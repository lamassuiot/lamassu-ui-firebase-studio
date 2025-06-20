
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { SelectableCertificateItem } from './SelectableCertificateItem';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';

interface CertificateSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  onCertificateSelected: (certificate: CertificateData) => void;
  currentSelectedCertificateId?: string | null;
}

export const CertificateSelectorModal: React.FC<CertificateSelectorModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  onCertificateSelected,
  currentSelectedCertificateId,
}) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [availableCerts, setAvailableCerts] = useState<CertificateData[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [errorCerts, setErrorCerts] = useState<string | null>(null);

  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<string>('10');


  const loadCertificates = useCallback(async (bookmarkToFetch: string | null) => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()) {
        setErrorCerts("User not authenticated.");
      }
      setIsLoadingCerts(false);
      return;
    }

    setIsLoadingCerts(true);
    setErrorCerts(null);
    try {
      const params = new URLSearchParams();
      params.append('sort_by', 'valid_from');
      params.append('sort_mode', 'desc');
      params.append('page_size', pageSize);
      if (bookmarkToFetch) params.append('bookmark', bookmarkToFetch);
      // Add a filter to fetch only non-CA certificates, if your API supports it.
      // Example: params.append('filter', 'is_ca[equal]false');
      // Or filter client-side if API doesn't support it, though less efficient.

      const result = await fetchIssuedCertificates({
        accessToken: user.access_token,
        apiQueryString: params.toString(),
      });
      
      // Filter for non-CA certs if API doesn't do it. This is a client-side filter.
      const nonCaCerts = result.certificates.filter(cert => 
        !cert.rawApiData?.is_ca 
      );

      setAvailableCerts(nonCaCerts);
      setNextTokenFromApi(result.nextToken);

    } catch (err: any) {
      setErrorCerts(err.message || 'Failed to load certificates.');
      setAvailableCerts([]);
      setNextTokenFromApi(null);
    } finally {
      setIsLoadingCerts(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading, pageSize]);

  useEffect(() => {
    if (isOpen && !authLoading && isAuthenticated()) {
        loadCertificates(bookmarkStack[currentPageIndex]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, authLoading, isAuthenticated, currentPageIndex, pageSize]); // loadCertificates is memoized

   useEffect(() => { // Reset pagination when page size changes
    setCurrentPageIndex(0);
    setBookmarkStack([null]);
  }, [pageSize, isOpen]); // Also reset when modal opens

  const handleRefresh = () => {
    if (currentPageIndex < bookmarkStack.length) {
        loadCertificates(bookmarkStack[currentPageIndex]);
    }
  };

  const handleNextPage = () => {
    if (isLoadingCerts) return;
    const potentialNextPageIndex = currentPageIndex + 1;
    if (potentialNextPageIndex < bookmarkStack.length) {
        setCurrentPageIndex(potentialNextPageIndex);
    } else if (nextTokenFromApi) {
        const newStack = [...bookmarkStack, nextTokenFromApi];
        setBookmarkStack(newStack);
        setCurrentPageIndex(newStack.length -1);
    }
  };

  const handlePreviousPage = () => {
    if (isLoadingCerts || currentPageIndex === 0) return;
    setCurrentPageIndex(prevIndex => prevIndex - 1);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-hidden flex flex-col">
            {(isLoadingCerts || authLoading) && (
            <div className="flex items-center justify-center h-72">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">{authLoading ? "Authenticating..." : "Loading certificates..."}</p>
            </div>
            )}
            {errorCerts && !isLoadingCerts && !authLoading && (
            <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Certificates</AlertTitle>
                <AlertDescription>
                {errorCerts} <Button variant="link" onClick={() => loadCertificates(bookmarkStack[currentPageIndex])} className="p-0 h-auto">Try again?</Button>
                </AlertDescription>
            </Alert>
            )}
            {!isLoadingCerts && !authLoading && !errorCerts && availableCerts.length > 0 && (
            <ScrollArea className="flex-grow h-72 my-4 border rounded-md">
                <ul className="space-y-0.5 p-2">
                {availableCerts.map((cert) => (
                    <SelectableCertificateItem
                    key={cert.id}
                    certificate={cert}
                    onSelect={onCertificateSelected}
                    isSelected={currentSelectedCertificateId === cert.id}
                    />
                ))}
                </ul>
            </ScrollArea>
            )}
            {!isLoadingCerts && !authLoading && !errorCerts && availableCerts.length === 0 && (
            <p className="text-muted-foreground text-center my-4 p-4 border rounded-md bg-muted/20">
                No non-CA certificates found or available to select.
            </p>
            )}
        </div>
        
        {/* Pagination Controls */}
        {(!isLoadingCerts && !authLoading && !errorCerts && (availableCerts.length > 0 || nextTokenFromApi || currentPageIndex > 0)) && (
          <div className="flex justify-between items-center mt-2 pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Label htmlFor="pageSizeSelectCertModal" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
                <Select
                    value={pageSize}
                    onValueChange={(value) => setPageSize(value)}
                    disabled={isLoadingCerts || authLoading}
                >
                    <SelectTrigger id="pageSizeSelectCertModal" className="w-[80px] h-9">
                    <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                </Select>
                 <Button onClick={handleRefresh} variant="outline" size="icon" className="h-9 w-9" disabled={isLoadingCerts}>
                    <RefreshCw className={cn("h-4 w-4", isLoadingCerts && "animate-spin")} />
                    <span className="sr-only">Refresh</span>
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                  <Button
                      onClick={handlePreviousPage}
                      disabled={isLoadingCerts || currentPageIndex === 0}
                      variant="outline" size="sm"
                  >
                      <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <Button
                      onClick={handleNextPage}
                      disabled={isLoadingCerts || !(currentPageIndex < bookmarkStack.length -1 || nextTokenFromApi)}
                      variant="outline" size="sm"
                  >
                      Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
              </div>
          </div>
        )}

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

