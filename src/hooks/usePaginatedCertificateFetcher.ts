
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import type { CertificateData } from '@/types/certificate';
import type { CertSortConfig, SortDirection, SortableCertColumn } from '@/app/certificates/page';

const API_STATUS_VALUES_FOR_FILTER = {
  ALL: 'ALL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type ApiStatusFilterValue = typeof API_STATUS_VALUES_FOR_FILTER[keyof typeof API_STATUS_VALUES_FOR_FILTER];

interface UsePaginatedCertificateFetcherParams {
  caId?: string | null;
  initialPageSize?: string;
}

export function usePaginatedCertificateFetcher({ caId = null, initialPageSize = '10' }: UsePaginatedCertificateFetcherParams = {}) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [isClientMounted, setIsClientMounted] = useState(false);
  useEffect(() => { setIsClientMounted(true); }, []);

  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);

  // Filtering & Sorting State
  const [pageSize, setPageSize] = useState<string>(initialPageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'commonName' | 'serialNumber'>('commonName');
  const [statusFilter, setStatusFilter] = useState<ApiStatusFilterValue>('ALL');
  const [sortConfig, setSortConfig] = useState<CertSortConfig | null>({ column: 'validFrom', direction: 'desc' });
  
  // Ref to track if this is the very first load to prevent extra renders
  const isInitialLoad = useRef(true);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      // Don't cause a re-render on the initial mount with an empty search term
      if (isInitialLoad.current && searchTerm === '') {
        return;
      }
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  
  // This is now the ONLY data fetching effect.
  // It handles both initial load, pagination changes, and filter changes.
  useEffect(() => {
    if (!isClientMounted || authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && isAuthenticated() && isClientMounted) {
        setError("User not authenticated.");
      }
      if (!authLoading) setIsLoading(false);
      return;
    }
    
    // The very first call to this hook should proceed to fetch data.
    // Subsequent calls will be handled by dependency changes.
    if (isInitialLoad.current) {
        isInitialLoad.current = false;
    }

    const loadCertificates = async () => {
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
            
            // The bookmark is always taken from the current page index.
            const bookmarkToFetch = bookmarkStack[currentPageIndex];
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
                forCaId: caId ?? undefined,
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
    };
    
    loadCertificates();

  // This hook now only re-runs when auth is ready, or when pagination state changes.
  // Filter changes are handled by the effect below, which updates the pagination state,
  // which in turn triggers this effect to run exactly once with the correct state.
  }, [
    isClientMounted, authLoading, isAuthenticated, user?.access_token,
    currentPageIndex, bookmarkStack,
  ]);

  // This separate effect *only* resets pagination when filters change.
  // This is the key to preventing the double fetch.
  useEffect(() => {
    // We use the `isInitialLoad` ref to prevent this from running on the very first mount.
    if (!isInitialLoad.current) {
        setCurrentPageIndex(0);
        setBookmarkStack([null]);
    }
  }, [pageSize, debouncedSearchTerm, searchField, statusFilter, sortConfig]);


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
  
  const refresh = () => {
      // Re-trigger the main data fetch effect by creating a new but identical bookmarkStack
      // This works because the object identity changes, triggering the useEffect.
      setBookmarkStack(prev => [...prev]);
  };

  const onCertificateUpdated = (updatedCertificate: CertificateData) => {
    setCertificates(prevCerts =>
      prevCerts.map(cert => (cert.id === updatedCertificate.id ? updatedCertificate : cert))
    );
  };

  return {
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
    bookmarkStack,
    handleNextPage,
    handlePreviousPage,
    refresh,
    onCertificateUpdated
  };
}
