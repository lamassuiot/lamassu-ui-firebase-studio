
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, RefreshCw, FilePlus2, ChevronsUpDown, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10, Eye, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, MoreVertical, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Types from the original file
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

// Badge component from original file
const IssuedCertApiStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const upperStatus = status.toUpperCase();
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = AlertCircleIcon;

  if (upperStatus.includes('ACTIVE')) {
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
    Icon = CheckCircle;
  } else if (upperStatus.includes('REVOKED')) {
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
    Icon = XCircle;
  } else if (upperStatus.includes('EXPIRED')) {
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    Icon = AlertCircleIcon;
  } else if (upperStatus.includes('PENDING')) {
    badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    Icon = Clock;
  }
  return <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap", badgeClass)}><Icon className="mr-1 h-3 w-3" />{upperStatus.replace('_', ' ')}</Badge>;
};

// CN helper from original file
const getCertSubjectCommonName = (subject: string): string => {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subject;
};

interface IssuedCertificatesTabProps {
    caId: string;
    caIsActive: boolean;
}

export const IssuedCertificatesTab: React.FC<IssuedCertificatesTabProps> = ({ caId, caIsActive }) => {
    const routerHook = useRouter();
    const { toast } = useToast();
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();

    const [issuedCertificatesList, setIssuedCertificatesList] = useState<CertificateData[]>([]);
    const [isLoadingIssuedCerts, setIsLoadingIssuedCerts] = useState(true);
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

    useEffect(() => {
        const cnHandler = setTimeout(() => setIssuedCertsDebouncedSearchTermCN(issuedCertsSearchTermCN), 500);
        const snHandler = setTimeout(() => setIssuedCertsDebouncedSearchTermSN(issuedCertsSearchTermSN), 500);
        return () => { clearTimeout(cnHandler); clearTimeout(snHandler); };
    }, [issuedCertsSearchTermCN, issuedCertsSearchTermSN]);

    useEffect(() => {
        setIssuedCertsCurrentPageIndex(0);
        setIssuedCertsBookmarkStack([null]);
    }, [issuedCertsPageSize, issuedCertsDebouncedSearchTermCN, issuedCertsDebouncedSearchTermSN, issuedCertsStatusFilter, issuedCertsSortConfig]);

    const actualLoadIssuedCertificatesByCa = useCallback(async (
        currentCaId: string,
        accessToken: string,
        bookmark: string | null,
        pageSize: string,
        sortConfig: IssuedCertSortConfig | null,
        filterCN: string,
        filterSN: string,
        filterStatus: ApiStatusFilterValue
    ) => {
        setIsLoadingIssuedCerts(true);
        setErrorIssuedCerts(null);
        try {
          const apiParams = new URLSearchParams();
          if (sortConfig) {
            let sortByApiField = '';
            switch (sortConfig.column) {
              case 'subject': sortByApiField = 'subject.common_name'; break;
              case 'serialNumber': sortByApiField = 'serial_number'; break;
              case 'expires': sortByApiField = 'valid_to'; break;
              case 'status': sortByApiField = 'status'; break;
              default: sortByApiField = 'valid_from';
            }
            apiParams.append('sort_by', sortByApiField);
            apiParams.append('sort_mode', sortConfig.direction);
          } else {
            apiParams.append('sort_by', 'valid_from');
            apiParams.append('sort_mode', 'desc');
          }

          apiParams.append('page_size', pageSize);
          if (bookmark) apiParams.append('bookmark', bookmark);

          const filtersToApply: string[] = [];
          if (filterStatus !== API_STATUS_VALUES_FOR_FILTER.ALL) {
            filtersToApply.push(`status[equal]${filterStatus}`);
          }
          if (filterCN.trim() !== '') {
            filtersToApply.push(`subject.common_name[contains]${filterCN.trim()}`);
          }
          if (filterSN.trim() !== '') {
            filtersToApply.push(`serial_number[contains]${filterSN.trim()}`);
          }
          filtersToApply.forEach(f => apiParams.append('filter', f));

          const result = await fetchIssuedCertificates({
            accessToken: accessToken,
            apiQueryString: apiParams.toString(),
            forCaId: currentCaId,
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
    }, []);

    useEffect(() => {
        if (caId && isAuthenticated() && user?.access_token) {
            actualLoadIssuedCertificatesByCa(
                caId,
                user.access_token,
                issuedCertsBookmarkStack[issuedCertsCurrentPageIndex],
                issuedCertsPageSize,
                issuedCertsSortConfig,
                issuedCertsDebouncedSearchTermCN,
                issuedCertsDebouncedSearchTermSN,
                issuedCertsStatusFilter
            );
        }
    }, [
        caId,
        isAuthenticated,
        user?.access_token,
        issuedCertsCurrentPageIndex,
        issuedCertsPageSize,
        issuedCertsSortConfig,
        issuedCertsDebouncedSearchTermCN,
        issuedCertsDebouncedSearchTermSN,
        issuedCertsStatusFilter,
        actualLoadIssuedCertificatesByCa,
        issuedCertsBookmarkStack
    ]);

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
    
    const handleRefreshIssuedCerts = () => {
        if (caId && user?.access_token) {
            actualLoadIssuedCertificatesByCa(
                caId,
                user.access_token,
                issuedCertsBookmarkStack[issuedCertsCurrentPageIndex],
                issuedCertsPageSize,
                issuedCertsSortConfig,
                issuedCertsDebouncedSearchTermCN,
                issuedCertsDebouncedSearchTermSN,
                issuedCertsStatusFilter
            );
        }
    };

    const handleIssueNewCertificate = () => {
        if (caId) {
            routerHook.push(`/certificate-authorities/issue-certificate?caId=${caId}`);
        } else {
            toast({ title: "Error", description: "Cannot issue certificate, CA ID is missing.", variant: "destructive" });
        }
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


    return (
        <div className="space-y-4 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end w-full sm:w-auto flex-grow">
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
                 <div className="flex space-x-2 mt-4 sm:mt-0">
                    <Button onClick={handleRefreshIssuedCerts} variant="outline" disabled={isLoadingIssuedCerts}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingIssuedCerts && "animate-spin")} /> Refresh
                    </Button>
                    <Button onClick={handleIssueNewCertificate} variant="default" disabled={!caIsActive}>
                        <FilePlus2 className="mr-2 h-4 w-4" /> Issue New
                    </Button>
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
                  <AlertCircleIcon className="h-4 w-4" />
                  <AlertTitle>Error Loading Issued Certificates</AlertTitle>
                  <AlertDescription>
                    {errorIssuedCerts}
                    <Button variant="link" onClick={handleRefreshIssuedCerts} className="p-0 h-auto ml-1">Try again?</Button>
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
                            <TableCell className="truncate max-w-[200px]">
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-medium text-left whitespace-normal"
                                    onClick={() => routerHook.push(`/certificates/details?certificateId=${cert.serialNumber}`)}
                                >
                                    {getCertSubjectCommonName(cert.subject)}
                                </Button>
                            </TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[150px]">{cert.serialNumber}</TableCell>
                            <TableCell>{format(parseISO(cert.validTo), 'MMM dd, yyyy')}</TableCell>
                            <TableCell><IssuedCertApiStatusBadge status={cert.apiStatus} /></TableCell>
                            <TableCell className="text-right">
                               <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <span className="sr-only">Open menu</span>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => routerHook.push(`/certificates/details?certificateId=${cert.serialNumber}`)}>
                                            <Eye className="mr-2 h-4 w-4" />
                                            <span>View Details</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
    )
}
