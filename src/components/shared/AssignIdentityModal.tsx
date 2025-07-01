
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, CornerDownRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { SelectableCertificateItem } from './SelectableCertificateItem';
import { CaVisualizerCard } from '../CaVisualizerCard';
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, fetchCryptoEngines } from '@/lib/ca-data';
import type { ApiCryptoEngine } from '@/types/crypto-engine';

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
  const router = useRouter();

  // View state
  const [view, setView] = useState<'select' | 'issue'>('select');
  
  // State for 'select' view
  const [eligibleCerts, setEligibleCerts] = useState<CertificateData[]>([]);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [errorCerts, setErrorCerts] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [certBookmarkStack, setCertBookmarkStack] = useState<(string | null)[]>([null]);
  const [certCurrentPageIndex, setCertCurrentPageIndex] = useState<number>(0);
  const [certNextToken, setCertNextToken] = useState<string | null>(null);
  const certPageSize = '10';

  // State for 'issue' view
  const [availableCAs, setAvailableCAs] = useState<CA[]>([]);
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(false);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);
  const [selectedCA, setSelectedCA] = useState<CA | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
        setView('select');
        setSelectedCert(null);
        setSelectedCA(null);
        setCertCurrentPageIndex(0);
        setCertBookmarkStack([null]);
    }
  }, [isOpen]);

  const loadCertificates = useCallback(async (bookmarkToFetch: string | null) => {
    if (!isOpen || authLoading || !isAuthenticated() || !user?.access_token) return;

    setIsLoadingCerts(true);
    setErrorCerts(null);
    setSelectedCert(null);

    try {
        const params = new URLSearchParams({
            sort_by: 'valid_from',
            sort_mode: 'desc',
            page_size: certPageSize,
            filter: `status[equal]ACTIVE`,
            filter: `subject.common_name[equal]${deviceId}`
        });
        if (bookmarkToFetch) params.append('bookmark', bookmarkToFetch);

        const result = await fetchIssuedCertificates({ accessToken: user.access_token, apiQueryString: params.toString() });
        setEligibleCerts(result.certificates.filter(cert => !cert.rawApiData?.is_ca));
        setCertNextToken(result.nextToken);
    } catch (err: any) {
        setErrorCerts(err.message || 'Failed to load eligible certificates.');
    } finally {
        setIsLoadingCerts(false);
    }
  }, [isOpen, authLoading, isAuthenticated, user?.access_token, deviceId]);

  const loadCAs = useCallback(async () => {
    if (!isOpen || authLoading || !isAuthenticated() || !user?.access_token) return;
    
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
        const [cas, engines] = await Promise.all([
            fetchAndProcessCAs(user.access_token),
            fetchCryptoEngines(user.access_token)
        ]);
        setAvailableCAs(cas.filter(ca => ca.status === 'active' && ca.caType !== 'EXTERNAL_PUBLIC'));
        setAllCryptoEngines(engines);
    } catch (e: any) {
        setErrorCAs(e.message || "Failed to load CAs.");
    } finally {
        setIsLoadingCAs(false);
    }
  }, [isOpen, authLoading, isAuthenticated, user?.access_token]);
  
  useEffect(() => {
    if (isOpen && view === 'select') {
      loadCertificates(certBookmarkStack[certCurrentPageIndex]);
    } else if (isOpen && view === 'issue') {
      if(availableCAs.length === 0) loadCAs();
    }
  }, [isOpen, view, certCurrentPageIndex, loadCertificates, loadCAs, availableCAs.length, certBookmarkStack]);


  const handleNextPage = () => {
    if (isLoadingCerts || !certNextToken) return;
    const newStack = [...certBookmarkStack, certNextToken];
    setCertBookmarkStack(newStack);
    setCertCurrentPageIndex(newStack.length - 1);
  };
  const handlePreviousPage = () => {
    if (isLoadingCerts || certCurrentPageIndex === 0) return;
    setCertCurrentPageIndex(prev => prev - 1);
  };
  const handleConfirm = () => {
    if (selectedCert) onAssignConfirm(selectedCert.serialNumber);
  };
  const handleClose = () => {
      if(!isAssigning) onOpenChange(false);
  };
  const handleContinueToIssue = () => {
    if (selectedCA) {
        onOpenChange(false); // Close the modal
        router.push(`/certificate-authorities/issue-certificate?caId=${selectedCA.id}&prefill_cn=${deviceId}`);
    }
  };


  const renderSelectView = () => (
    <div className="flex-grow my-4 overflow-hidden flex flex-col min-h-[300px]">
        {isLoadingCerts ? (
            <div className="flex-grow flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading eligible certificates...</p>
            </div>
        ) : errorCerts ? (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error Loading Certificates</AlertTitle><AlertDescription>{errorCerts}</AlertDescription></Alert>
        ) : eligibleCerts.length > 0 ? (
            <>
                <ScrollArea className="flex-grow border rounded-md"><ul className="p-2 space-y-1">{eligibleCerts.map(cert => (<SelectableCertificateItem key={cert.id} certificate={cert} onSelect={setSelectedCert} isSelected={selectedCert?.id === cert.id}/>))}</ul></ScrollArea>
                <div className="flex justify-end items-center mt-2 pt-2 border-t space-x-2">
                    <Button onClick={handlePreviousPage} disabled={certCurrentPageIndex === 0 || isLoadingCerts} variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1"/>Previous</Button>
                    <Button onClick={handleNextPage} disabled={!certNextToken || isLoadingCerts} variant="outline" size="sm">Next<ChevronRight className="h-4 w-4 ml-1"/></Button>
                </div>
            </>
        ) : (
            <div className="flex-grow flex items-center justify-center h-full text-center text-muted-foreground p-4 border rounded-md bg-muted/20">
                No active, non-CA certificates found with CN="{deviceId}".
            </div>
        )}
    </div>
  );

  const renderIssueView = () => (
    <div className="flex-grow my-4 overflow-hidden flex flex-col min-h-[300px]">
        {isLoadingCAs ? (
            <div className="flex-grow flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/><p className="ml-2">Loading Issuers...</p></div>
        ) : errorCAs ? (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error Loading CAs</AlertTitle><AlertDescription>{errorCAs}</AlertDescription></Alert>
        ) : availableCAs.length > 0 ? (
            <>
                <p className="text-sm text-muted-foreground mb-2">Select an active CA to issue the new certificate.</p>
                <ScrollArea className="flex-grow border rounded-md"><ul className="p-2 space-y-1">{availableCAs.map(ca => (<CaVisualizerCard key={ca.id} ca={ca} onClick={() => setSelectedCA(ca)} className={selectedCA?.id === ca.id ? 'ring-2 ring-primary' : 'hover:bg-muted'} allCryptoEngines={allCryptoEngines}/>))}</ul></ScrollArea>
            </>
        ) : (
            <div className="flex-grow flex items-center justify-center h-full text-center text-muted-foreground p-4 border rounded-md bg-muted/20">No active issuing CAs found.</div>
        )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign Identity to Device</DialogTitle>
          <DialogDescription>
            {view === 'select' 
              ? `Select an active certificate with a Common Name matching the device ID to bind as its identity.` 
              : `Choose a Certificate Authority to issue a new certificate for this device.`}
          </DialogDescription>
        </DialogHeader>

        {view === 'select' ? renderSelectView() : renderIssueView()}

        <DialogFooter>
          {view === 'select' ? (
            <div className="w-full flex justify-between items-center">
                <Button variant="outline" onClick={() => setView('issue')}><CornerDownRight className="mr-2 h-4 w-4"/>Issue New Instead</Button>
                <div className="flex space-x-2">
                    <Button type="button" variant="ghost" onClick={handleClose} disabled={isAssigning}>Cancel</Button>
                    <Button type="button" onClick={handleConfirm} disabled={!selectedCert || isAssigning}>
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {isAssigning ? 'Assigning...' : 'Assign Selected'}
                    </Button>
                </div>
            </div>
          ) : (
            <div className="w-full flex justify-between items-center">
                <Button variant="ghost" onClick={() => setView('select')}><ArrowLeft className="mr-2 h-4 w-4"/>Back to Select</Button>
                <div className="flex space-x-2">
                    <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button type="button" onClick={handleContinueToIssue} disabled={!selectedCA}>Continue to Issue</Button>
                </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
