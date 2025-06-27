
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { SelectableCertificateItem } from './SelectableCertificateItem';

interface AssignIdentityModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAssignConfirm: (certificateSerialNumber: string) => void;
  deviceId: string;
  isAssigning: boolean;
}

export const AssignIdentityModal: React.FC<AssignIdentityModalProps> = ({
  isOpen,
  onOpenChange,
  onAssignConfirm,
  deviceId,
  isAssigning,
}) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [eligibleCerts, setEligibleCerts] = useState<CertificateData[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [errorCerts, setErrorCerts] = useState<string | null>(null);
  
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);

  // Pagination (simplified for this modal)
  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);
  const pageSize = '10';

  const loadCertificates = useCallback(async (bookmarkToFetch: string | null) => {
    if (!isOpen || authLoading || !isAuthenticated() || !user?.access_token) {
      return;
    }

    setIsLoadingCerts(true);
    setErrorCerts(null);
    setSelectedCert(null); // Reset selection on new page load

    try {
      const params = new URLSearchParams();
      params.append('sort_by', 'valid_from');
      params.append('sort_mode', 'desc');
      params.append('page_size', pageSize);
      if (bookmarkToFetch) params.append('bookmark', bookmarkToFetch);
      
      // Crucial filters for this modal
      params.append('filter', `status[equal]ACTIVE`);
      params.append('filter', `subject.common_name[equal]${deviceId}`);

      const result = await fetchIssuedCertificates({
        accessToken: user.access_token,
        apiQueryString: params.toString(),
      });
      
      const nonCaCerts = result.certificates.filter(cert => !cert.rawApiData?.is_ca);
      setEligibleCerts(nonCaCerts);
      setNextTokenFromApi(result.nextToken);

    } catch (err: any) {
      setErrorCerts(err.message || 'Failed to load eligible certificates.');
      setEligibleCerts([]);
      setNextTokenFromApi(null);
    } finally {
      setIsLoadingCerts(false);
    }
  }, [isOpen, authLoading, isAuthenticated, user?.access_token, deviceId]);

  useEffect(() => {
    if (isOpen) {
        // Reset pagination and load first page when modal opens
        setCurrentPageIndex(0);
        setBookmarkStack([null]);
        loadCertificates(null);
    }
  }, [isOpen, loadCertificates]);

  useEffect(() => {
    if(isOpen) {
        loadCertificates(bookmarkStack[currentPageIndex]);
    }
  }, [currentPageIndex, isOpen, loadCertificates, bookmarkStack]);

  const handleNextPage = () => {
    if (isLoadingCerts || !nextTokenFromApi) return;
    const newBookmark = nextTokenFromApi;
    const newStack = bookmarkStack.slice(0, currentPageIndex + 1);
    setBookmarkStack([...newStack, newBookmark]);
    setCurrentPageIndex(newStack.length -1);
  };

  const handlePreviousPage = () => {
    if (isLoadingCerts || currentPageIndex === 0) return;
    setCurrentPageIndex(prev => prev - 1);
  };
  
  const handleSelectCertificate = (certificate: CertificateData) => {
    setSelectedCert(certificate);
  };

  const handleConfirm = () => {
    if (selectedCert) {
      onAssignConfirm(selectedCert.serialNumber);
    }
  };
  
  const handleClose = () => {
      if(!isAssigning) {
          onOpenChange(false);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Identity to Device</DialogTitle>
          <DialogDescription>
            Select an active certificate with a Common Name matching the device ID (<span className="font-mono">{deviceId}</span>) to bind as its identity.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow my-4 overflow-hidden flex flex-col min-h-[300px]">
          {isLoadingCerts ? (
            <div className="flex-grow flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading eligible certificates...</p>
            </div>
          ) : errorCerts ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Certificates</AlertTitle>
              <AlertDescription>{errorCerts}</AlertDescription>
            </Alert>
          ) : eligibleCerts.length > 0 ? (
            <>
              <ScrollArea className="flex-grow border rounded-md">
                <ul className="p-2 space-y-1">
                  {eligibleCerts.map(cert => (
                    <SelectableCertificateItem
                      key={cert.id}
                      certificate={cert}
                      onSelect={handleSelectCertificate}
                      isSelected={selectedCert?.id === cert.id}
                    />
                  ))}
                </ul>
              </ScrollArea>
              {/* Pagination */}
              <div className="flex justify-end items-center mt-2 pt-2 border-t space-x-2">
                <Button onClick={handlePreviousPage} disabled={currentPageIndex === 0 || isLoadingCerts} variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button onClick={handleNextPage} disabled={!nextTokenFromApi || isLoadingCerts} variant="outline" size="sm">
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center h-full text-center text-muted-foreground p-4 border rounded-md bg-muted/20">
              No active, non-CA certificates found with CN="{deviceId}".
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isAssigning}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={!selectedCert || isAssigning}>
            {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAssigning ? 'Assigning...' : 'Assign Selected Certificate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
