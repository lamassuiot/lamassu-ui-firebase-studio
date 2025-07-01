
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Landmark, List, Network, Loader2, GitFork, AlertCircle as AlertCircleIcon, PlusCircle, FileSignature } from "lucide-react";
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, fetchCryptoEngines } from '@/lib/ca-data';
import dynamic from 'next/dynamic';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ApiCryptoEngine } from '@/types/crypto-engine';

const CaFilesystemView = dynamic(() => 
  import('@/components/ca/CaFilesystemView').then(mod => mod.CaFilesystemView), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading List View...</p>
      </div>
    )
  }
);

const CaHierarchyView = dynamic(() => 
  import('@/components/ca/CaHierarchyView').then(mod => mod.CaHierarchyView), 
  { 
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading Hierarchy View...</p>
      </div>
    )
  }
);

const CaGraphView = dynamic(() =>
  import('@/components/ca/CaGraphView').then(mod => mod.CaGraphView),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading Graph View...</p>
      </div>
    )
  }
);

type ViewMode = 'list' | 'hierarchy' | 'graph';


export default function CertificateAuthoritiesPage() {
  const router = useRouter(); 
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [cas, setCas] = useState<CA[]>([]);
  const [isLoadingCas, setIsLoadingCas] = useState(true);
  const [errorCas, setErrorCas] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoadingCryptoEngines, setIsLoadingCryptoEngines] = useState(true);
  const [errorCryptoEngines, setErrorCryptoEngines] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()){
           setErrorCas("User not authenticated. Please log in.");
           setErrorCryptoEngines("User not authenticated. Please log in.");
           setIsLoadingCas(false);
           setIsLoadingCryptoEngines(false);
      }
      return;
    }
    setIsLoadingCas(true);
    setErrorCas(null);
    setIsLoadingCryptoEngines(true);
    setErrorCryptoEngines(null);

    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      setCas(fetchedCAs);
    } catch (err: any) {
      setErrorCas(err.message || 'Failed to load Certificate Authorities.');
      setCas([]); 
    } finally {
      setIsLoadingCas(false);
    }

    try {
      const enginesData = await fetchCryptoEngines(user.access_token);
      setAllCryptoEngines(enginesData);
    } catch (err: any) {
      setErrorCryptoEngines(err.message || 'Failed to load Crypto Engines.');
      setAllCryptoEngines([]);
    } finally {
      setIsLoadingCryptoEngines(false);
    }

  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) { 
        loadData();
    }
  }, [loadData, authLoading]);


  const handleCreateNewCAClick = () => {
    router.push('/certificate-authorities/new');
  };

  const handleViewModeChange = (newMode: string) => {
    if (newMode && (newMode === 'list' || newMode === 'hierarchy' || newMode === 'graph')) {
      setViewMode(newMode as ViewMode);
    }
  };
  
  let currentViewTitle = "List View";
  if (viewMode === 'hierarchy') {
    currentViewTitle = "Hierarchy View";
  } else if (viewMode === 'graph') {
    currentViewTitle = "Graph View";
  }

  if (authLoading || (isLoadingCas && cas.length === 0) || (isLoadingCryptoEngines && viewMode === 'list')) {
    let loadingText = "Authenticating...";
    if (!authLoading && isLoadingCas) loadingText = "Loading Certificate Authorities...";
    else if (!authLoading && isLoadingCryptoEngines && viewMode === 'list') loadingText = "Loading Crypto Engines for List View...";
    
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{loadingText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="p-0"> 
        <div className="p-0"> 
          <div className="flex items-center justify-between mb-4"> 
            <div className="flex items-center space-x-3">
              <Landmark className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-headline font-semibold">Certificate Authorities</h1> 
            </div>
            <div className="flex items-center space-x-2">
              <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} variant="outline" aria-label="View mode">
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">List</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="hierarchy" aria-label="Hierarchy view">
                  <Network className="h-4 w-4 mr-0 sm:mr-2" />
                   <span className="hidden sm:inline">Hierarchy</span>
                </ToggleGroupItem>
                 <ToggleGroupItem value="graph" aria-label="Graph view">
                  <GitFork className="h-4 w-4 mr-0 sm:mr-2" />
                   <span className="hidden sm:inline">Graph</span>
                </ToggleGroupItem>
              </ToggleGroup>
              <Button variant="outline" onClick={() => router.push('/certificate-authorities/requests')}>
                <FileSignature className="mr-2 h-4 w-4" /> Manage CA Requests
              </Button>
              <Button variant="default" onClick={handleCreateNewCAClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New CA
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Currently viewing CAs in: <span className="font-semibold">{currentViewTitle}</span>. Manage your Certificate Authority configurations and trust stores.</p> 
        </div>
        <div className="pt-6"> 
          {(errorCas || (viewMode === 'list' && errorCryptoEngines)) && (
            <Alert variant="destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <AlertTitle>Error Loading Data</AlertTitle>
              {errorCas && <AlertDescription>CAs: {errorCas}</AlertDescription>}
              {viewMode === 'list' && errorCryptoEngines && <AlertDescription>Crypto Engines: {errorCryptoEngines}</AlertDescription>}
              <Button variant="link" onClick={loadData} className="p-0 h-auto">Try again?</Button>
            </Alert>
          )}
          
          {!(errorCas || (viewMode === 'list' && errorCryptoEngines)) && cas.length > 0 ? (
            <>
              {viewMode === 'list' && (
                <CaFilesystemView cas={cas} router={router} allCAs={cas} allCryptoEngines={allCryptoEngines} />
              )}
              {viewMode === 'hierarchy' && (
                <CaHierarchyView cas={cas} router={router} allCAs={cas} allCryptoEngines={allCryptoEngines} />
              )}
              {viewMode === 'graph' && (
                <CaGraphView cas={cas} allCryptoEngines={allCryptoEngines} router={router} />
              )}
            </>
          ) : (
            !errorCas && !(viewMode === 'list' && errorCryptoEngines) && <p className="text-muted-foreground">No Certificate Authorities configured or found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
