
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, FileSignature, AlertTriangle, Cpu, ChevronsUpDown, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10, Search, ChevronLeft, ChevronRight, MoreVertical, Trash2, Layers } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ViewCsrModal } from '@/components/ca/requests/ViewCsrModal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';


interface Subject {
  common_name: string;
}

interface KeyMetadata {
    type: string;
    bits: number;
}

export interface CACertificateRequest {
    id: string;
    key_id: string;
    metadata: Record<string, any>;
    subject: Subject;
    creation_ts: string;
    engine_id: string;
    key_metadata: KeyMetadata;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    fingerprint: string;
    csr: string; // Base64 encoded PEM
}

type SortableColumn = 'id' | 'subject' | 'status' | 'creation_ts';
type SortDirection = 'asc' | 'desc';
interface SortConfig {
    column: SortableColumn;
    direction: SortDirection;
}

const StatusBadge: React.FC<{ status: CACertificateRequest['status'] }> = ({ status }) => {
  let badgeClass = "";
  switch (status) {
    case 'PENDING':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      break;
    case 'APPROVED':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      break;
    case 'REJECTED':
      badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
      break;
    default:
      badgeClass = "bg-muted text-muted-foreground border-border";
  }
  return <Badge variant="outline" className={cn("text-xs capitalize", badgeClass)}>{status.toLowerCase()}</Badge>;
};

export default function CaRequestsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<CACertificateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering, Sorting, Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'id' | 'subject'>('subject');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [pageSize, setPageSize] = useState('10');
  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ column: 'creation_ts', direction: 'desc' });
  
  const [selectedRequestForCsrView, setSelectedRequestForCsrView] = useState<CACertificateRequest | null>(null);
  const [isCsrModalOpen, setIsCsrModalOpen] = useState(false);
  
  // State for delete dialog
  const [requestToDelete, setRequestToDelete] = useState<CACertificateRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for raw data viewer
  const [requestForRawView, setRequestForRawView] = useState<CACertificateRequest | null>(null);


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

  const fetchRequests = useCallback(async (bookmarkToFetch: string | null) => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) setError("User not authenticated.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      // Sorting
      if (sortConfig) {
          const apiSortColumn = sortConfig.column === 'subject' ? 'subject.common_name' : sortConfig.column;
          params.append('sort_by', apiSortColumn);
          params.append('sort_mode', sortConfig.direction);
      } else {
          params.append('sort_by', 'creation_ts');
          params.append('sort_mode', 'desc');
      }

      // Pagination
      params.append('page_size', pageSize);
      if (bookmarkToFetch) {
        params.append('bookmark', bookmarkToFetch);
      }

      // Filtering
      const filtersToApply: string[] = [];
      if (debouncedSearchTerm.trim() !== '') {
        const field = searchField === 'subject' ? 'subject.common_name' : 'id';
        filtersToApply.push(`${field}[contains]${debouncedSearchTerm.trim()}`);
      }
      if (statusFilter !== 'ALL') {
        filtersToApply.push(`status[equal]${statusFilter}`);
      }
      filtersToApply.forEach(f => params.append('filter', f));
      
      const response = await fetch(`https://lab.lamassu.io/api/ca/v1/cas/requests?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to fetch CA requests. Status: ${response.status}`;
        try {
          errorJson = await response.json();
          errorMessage = `Failed to fetch requests: ${errorJson.err || errorJson.message || 'Unknown error'}`;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setRequests(data.list || []);
      setNextTokenFromApi(data.next || null);

    } catch (err: any) {
      setError(err.message);
      setRequests([]);
      setNextTokenFromApi(null);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading, toast, sortConfig, pageSize, debouncedSearchTerm, searchField, statusFilter]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      fetchRequests(bookmarkStack[currentPageIndex]);
    }
  }, [authLoading, isAuthenticated, bookmarkStack, currentPageIndex, fetchRequests]);


  const requestSort = (column: SortableColumn) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };
  
  const SortableTableHeader: React.FC<{ column: SortableColumn; title: string; className?: string }> = ({ column, title, className }) => {
    const isSorted = sortConfig?.column === column;
    let Icon = ChevronsUpDown;
    if (isSorted) {
      if (column === 'creation_ts') {
        Icon = sortConfig?.direction === 'asc' ? ArrowUp01 : ArrowDown10;
      } else {
        Icon = sortConfig?.direction === 'asc' ? ArrowUpZA : ArrowDownAZ;
      }
    }
    return (
      <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(column)}>
        <div className="flex items-center gap-1">
          {title} <Icon className={cn("h-4 w-4", isSorted ? "text-primary" : "text-muted-foreground/50")} />
        </div>
      </TableHead>
    );
  };

  const handleNextPage = () => {
    if (isLoading || !nextTokenFromApi) return;
    const potentialNextPageIndex = currentPageIndex + 1;
    if (potentialNextPageIndex < bookmarkStack.length) {
      setCurrentPageIndex(potentialNextPageIndex);
    } else {
      setBookmarkStack(prev => [...prev, nextTokenFromApi]);
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (isLoading || currentPageIndex === 0) return;
    setCurrentPageIndex(prev => prev - 1);
  };

  const handleRefresh = () => {
    fetchRequests(bookmarkStack[currentPageIndex]);
  };

  const handleViewCsr = (request: CACertificateRequest) => {
    setSelectedRequestForCsrView(request);
    setIsCsrModalOpen(true);
  };
  
  const handleDeleteRequest = async () => {
    if (!requestToDelete || !user?.access_token) {
      toast({ title: "Error", description: "Request details or authentication missing.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`https://lab.lamassu.io/api/ca/v1/cas/requests/${requestToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
        },
      });

      if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to delete request. Status: ${response.status}`;
        try {
          errorJson = await response.json();
          errorMessage = `Deletion failed: ${errorJson.err || errorJson.message || 'Unknown error'}`;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      toast({
        title: "Request Deleted",
        description: `Request for "${requestToDelete.subject.common_name}" has been deleted.`,
        variant: "default",
      });
      setRequestToDelete(null); // Close dialog by resetting state
      handleRefresh(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  if (authLoading && requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Authenticating...</p>
      </div>
    );
  }
  
  const hasActiveFilters = debouncedSearchTerm || statusFilter !== 'ALL';
  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileSignature className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Certificate Authority Requests</h1>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        View and manage pending and completed requests for new Certificate Authorities.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="relative col-span-1 md:col-span-1">
            <Label htmlFor="reqSearchTermInput">Search Term</Label>
            <Search className="absolute left-3 top-[calc(50%+6px)] -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
                id="reqSearchTermInput"
                type="text"
                placeholder="Filter by ID or Subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 mt-1"
                disabled={isLoading || authLoading}
            />
        </div>
        <div className="col-span-1 md:col-span-1">
            <Label htmlFor="reqSearchFieldSelect">Search In</Label>
            <Select value={searchField} onValueChange={(value: 'id' | 'subject') => setSearchField(value)} disabled={isLoading || authLoading}>
                <SelectTrigger id="reqSearchFieldSelect" className="w-full mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="id">Request ID</SelectItem>
                    <SelectItem value="subject">Subject</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="col-span-1 md:col-span-1">
            <Label htmlFor="reqStatusFilterSelect">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')} disabled={isLoading || authLoading}>
                <SelectTrigger id="reqStatusFilterSelect" className="w-full mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                    {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading requests...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Requests</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : requests.length > 0 ? (
        <>
          <div className={cn("overflow-auto max-h-[60vh]", isLoading && "opacity-50")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHeader column="subject" title="Subject" />
                  <SortableTableHeader column="id" title="Request ID" />
                  <SortableTableHeader column="status" title="Status" />
                  <SortableTableHeader column="creation_ts" title="Created At" className="hidden md:table-cell" />
                  <TableHead className="hidden sm:table-cell"><Cpu className="inline mr-1 h-4 w-4" />Engine</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium truncate max-w-xs">{req.subject.common_name}</TableCell>
                    <TableCell className="font-mono text-xs">{req.id}</TableCell>
                    <TableCell><StatusBadge status={req.status} /></TableCell>
                    <TableCell className="hidden md:table-cell">{format(parseISO(req.creation_ts), 'MMM dd, yyyy HH:mm')}</TableCell>
                    <TableCell className="hidden sm:table-cell">{req.engine_id}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More actions for request {req.id}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCsr(req)}>
                            <FileSignature className="mr-2 h-4 w-4" />
                            View CSR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRequestForRawView(req)}>
                            <Layers className="mr-2 h-4 w-4" />
                            View Raw API Data
                          </DropdownMenuItem>
                          {req.status === 'PENDING' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRequestToDelete(req)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Request
                              </DropdownMenuItem>
                            </>
                          )}
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
                <Label htmlFor="pageSizeSelectReqList" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
                <Select value={pageSize} onValueChange={setPageSize} disabled={isLoading || authLoading}>
                  <SelectTrigger id="pageSizeSelectReqList" className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                  <Button onClick={handlePreviousPage} disabled={isLoading || currentPageIndex === 0} variant="outline">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button onClick={handleNextPage} disabled={isLoading || !nextTokenFromApi} variant="outline">
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
          </div>
        </>
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">{hasActiveFilters ? "No Requests Found" : "No CA Requests Found"}</h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? "Try adjusting your filters." : "There are no pending or historical Certificate Authority requests."}
          </p>
        </div>
      )}

      <ViewCsrModal
        isOpen={isCsrModalOpen}
        onOpenChange={setIsCsrModalOpen}
        request={selectedRequestForCsrView}
      />
      
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the CA request for "<strong>{requestToDelete?.subject.common_name}</strong>".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRequest}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

       <AlertDialog open={!!requestForRawView} onOpenChange={(open) => !open && setRequestForRawView(null)}>
        <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Raw API Data for Request</AlertDialogTitle>
                <AlertDialogDescription>
                    This is the complete, unmodified data object received from the API for debugging purposes.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
                <ScrollArea className="h-80 w-full rounded-md border bg-muted/30">
                    <pre className="p-4 text-xs">
                        {requestForRawView && JSON.stringify(requestForRawView, null, 2)}
                    </pre>
                </ScrollArea>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
