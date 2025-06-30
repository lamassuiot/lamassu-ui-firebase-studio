
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, RefreshCw, FilePlus2, ChevronLeft, ChevronRight, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { CertificateList } from '@/components/CertificateList'; // Import the reusable component
import type { CA } from '@/lib/ca-data';
import type { CertSortConfig, SortDirection, SortableCertColumn } from '@/app/certificates/page';

const API_STATUS_VALUES_FOR_FILTER = {
  ALL: 'ALL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
type ApiStatusFilterValue = typeof API_STATUS_VALUES_FOR_FILTER[keyof typeof API_STATUS_VALUES_FOR_FILTER];

interface IssuedCertificatesTabProps {
    caId: string;
    caIsActive: boolean;
    allCAs: CA[];
}

export const IssuedCertificatesTab: React.FC<IssuedCertificatesTabProps> = ({ caId, caIsActive, allCAs }) => {
    const routerHook = useRouter();
    const { toast } = useToast();
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();

    const [certificates, setCertificates] = useState<CertificateData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const loadCertificates = useCallback(async (bookmarkToFetch: string | null) => {
        if (!caId || !isAuthenticated() || !user?.access_token) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError(null);
        try {
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
                apiParams.append('sort_by', 'valid_from');
                apiParams.append('sort_mode', 'desc');
            }

            apiParams.append('page_size', pageSize);
            if (bookmarkToFetch) apiParams.append('bookmark', bookmarkToFetch);

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

            const result = await fetchIssuedCertificates({
                accessToken: user.access_token,
                forCaId: caId,
                apiQueryString: apiParams.toString(),
            });
            setCertificates(result.certificates);
            setNextTokenFromApi(result.nextToken);

        } catch (err: any) {
            setError(err.message || 'Failed to load issued certificates.');
            setCertificates([]);
            setNextTokenFromApi(null);
        } finally {
            setIsLoading(false);
        }
    }, [caId, user?.access_token, isAuthenticated, pageSize, sortConfig, debouncedSearchTerm, searchField, statusFilter]);

    useEffect(() => {
        if (!authLoading && isAuthenticated()) {
            loadCertificates(bookmarkStack[currentPageIndex]);
        } else if (!authLoading && !isAuthenticated()){
            setIsLoading(false);
            setError("User not authenticated.");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated, currentPageIndex, bookmarkStack, loadCertificates]); 

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
        if (isLoading) return;
        const potentialNextPageIndex = currentPageIndex + 1;

        if (potentialNextPageIndex < bookmarkStack.length) {
            setCurrentPageIndex(potentialNextPageIndex);
        } else if (nextTokenFromApi) {
            const newStack = [...bookmarkStack, nextTokenFromApi];
            setBookmarkStack(newStack);
            setCurrentPageIndex(newStack.length - 1);
        }
    };

    const handlePreviousPage = () => {
        if (isLoading || currentPageIndex === 0) return;
        setCurrentPageIndex(prev => prev - 1);
    };

    const requestSort = (column: SortableCertColumn) => {
        let direction: SortDirection = 'asc';
        if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
          direction = 'desc';
        }
        setSortConfig({ column, direction });
    };

    const handleIssueNewCertificate = () => {
        if (caId) {
            routerHook.push(`/certificate-authorities/issue-certificate?caId=${caId}`);
        } else {
            toast({ title: "Error", description: "Cannot issue certificate, CA ID is missing.", variant: "destructive" });
        }
    };

    const statusOptions = Object.entries(API_STATUS_VALUES_FOR_FILTER).map(([key, val]) => ({
        label: val === 'ALL' ? 'All Statuses' : key.charAt(0) + key.slice(1).toLowerCase(),
        value: val
    }));

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="relative col-span-1 md:col-span-1">
                        <Label htmlFor="issuedCertSearchTerm">Search</Label>
                         <div className="relative mt-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="issuedCertSearchTerm"
                                type="text"
                                placeholder="Filter by CN or Serial..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10"
                                disabled={isLoading || authLoading}
                            />
                        </div>
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <Label htmlFor="issuedCertSearchField">Search In</Label>
                        <Select value={searchField} onValueChange={(value: 'commonName' | 'serialNumber') => setSearchField(value)} disabled={isLoading || authLoading}>
                            <SelectTrigger id="issuedCertSearchField" className="w-full mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="commonName">Common Name</SelectItem>
                                <SelectItem value="serialNumber">Serial Number</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <Label htmlFor="issuedCertStatusFilter">Status</Label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ApiStatusFilterValue)} disabled={isLoading || authLoading}>
                            <SelectTrigger id="issuedCertStatusFilter" className="w-full mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end space-x-2">
                    <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
                    </Button>
                    <Button onClick={handleIssueNewCertificate} variant="default" disabled={!caIsActive}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Issue New
                    </Button>
                </div>
            </div>

            {isLoading && certificates.length === 0 ? (
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">Loading issued certificates...</p>
                </div>
            ) : error ? (
                <Alert variant="destructive">
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error Loading Certificates</AlertTitle>
                  <AlertDescription>
                    {error}
                    <Button variant="link" onClick={handleRefresh} className="p-0 h-auto ml-1">Try again?</Button>
                  </AlertDescription>
                </Alert>
            ) : certificates.length > 0 ? (
                <>
                    <CertificateList
                        certificates={certificates}
                        allCAs={allCAs}
                        onCertificateUpdated={handleCertificateUpdated}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        isLoading={isLoading}
                        accessToken={user?.access_token}
                        showIssuerColumn={false}
                    />
                    <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center space-x-2">
                            <Label htmlFor="pageSizeSelect" className="text-sm text-muted-foreground">Page Size:</Label>
                            <Select value={pageSize} onValueChange={setPageSize}>
                                <SelectTrigger id="pageSizeSelect" className="w-[80px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                onClick={handlePreviousPage}
                                disabled={isLoading || currentPageIndex === 0}
                                variant="outline" size="sm"
                            >
                                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                            </Button>
                            <Button
                                onClick={handleNextPage}
                                disabled={isLoading || !nextTokenFromApi}
                                variant="outline" size="sm"
                            >
                                Next <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                        No certificates have been issued by this CA yet, or none match the current filter.
                    </p>
                </div>
            )}
        </div>
    )
}
