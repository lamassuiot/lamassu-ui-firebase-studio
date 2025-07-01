
'use client';

import { useState, useEffect, useCallback } from 'react';
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
    if (authLoading || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()) {
            setError("User not authenticated.");
        }
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
            forCaId: caId ?? undefined, // Pass caId if it exists
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
  }, [
    authLoading, isAuthenticated, user?.access_token, 
    sortConfig, pageSize, statusFilter, debouncedSearchTerm, searchField, caId
  ]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
      loadCertificates(bookmarkStack[currentPageIndex]);
    }
  }, [authLoading, isAuthenticated, currentPageIndex, bookmarkStack, loadCertificates]);

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
      if (currentPageIndex < bookmarkStack.length) {
          loadCertificates(bookmarkStack[currentPageIndex]);
      }
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
