
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, RefreshCw, FilePlus2, ChevronLeft, ChevronRight, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { CertificateList } from '@/components/CertificateList';
import type { CA } from '@/lib/ca-data';
import { usePaginatedCertificateFetcher, type ApiStatusFilterValue } from '@/hooks/usePaginatedCertificateFetcher';

interface IssuedCertificatesTabProps {
    caId: string;
    caIsActive: boolean;
    allCAs: CA[];
}

export const IssuedCertificatesTab: React.FC<IssuedCertificatesTabProps> = ({ caId, caIsActive, allCAs }) => {
    const routerHook = useRouter();
    const { toast } = useToast();
    const { user, isLoading: authLoading } = useAuth();

    const {
        certificates,
        isLoading,
        error,
        pageSize, setPageSize,
        searchTerm, setSearchTerm,
        searchField, setSearchField,
        statusFilter, setStatusFilter,
        sortConfig, requestSort,
        currentPageIndex,
        nextTokenFromApi,
        handleNextPage, handlePreviousPage,
        refresh,
        onCertificateUpdated
      } = usePaginatedCertificateFetcher({ caId });

    const handleIssueNewCertificate = () => {
        if (caId) {
            routerHook.push(`/certificate-authorities/issue-certificate?caId=${caId}`);
        } else {
            toast({ title: "Error", description: "Cannot issue certificate, CA ID is missing.", variant: "destructive" });
        }
    };

    const statusOptions = [
        { label: 'All Statuses', value: 'ALL' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Expired', value: 'EXPIRED' },
        { label: 'Revoked', value: 'REVOKED' },
    ];

    return (
        <div className="space-y-4 py-4">
            <div className="flex justify-end space-x-2">
                <Button onClick={refresh} variant="outline" disabled={isLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
                </Button>
                <Button onClick={handleIssueNewCertificate} variant="default" disabled={!caIsActive}>
                    <FilePlus2 className="mr-2 h-4 w-4" /> Issue New
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-t pt-4">
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
                    <Button variant="link" onClick={refresh} className="p-0 h-auto ml-1">Try again?</Button>
                  </AlertDescription>
                </Alert>
            ) : certificates.length > 0 ? (
                <>
                    <CertificateList
                        certificates={certificates}
                        allCAs={allCAs}
                        onCertificateUpdated={onCertificateUpdated}
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
                            <Button onClick={handlePreviousPage} disabled={isLoading || currentPageIndex === 0} variant="outline" size="sm">
                                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                            </Button>
                            <Button onClick={handleNextPage} disabled={isLoading || !nextTokenFromApi} variant="outline" size="sm">
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
