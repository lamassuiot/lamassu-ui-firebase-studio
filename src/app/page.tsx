'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeviceStatusChartCard } from '@/components/home/DeviceStatusChartCard';
import { CaExpiryTimeline } from '@/components/home/CaExpiryTimeline';
import { SummaryStatsCard } from '@/components/home/SummaryStatsCard';
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, fetchCryptoEngines } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle, RefreshCw, HomeIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { ALERTS_API_BASE_URL, CA_API_BASE_URL, DEV_MANAGER_API_BASE_URL, DMS_MANAGER_API_BASE_URL } from '@/lib/api-domains';
import { cn } from '@/lib/utils';

// Helper function from old page.tsx
function flattenCAs(cas: CA[]): CA[] {
  const flatList: CA[] = [];
  function recurse(items: CA[]) {
    for (const item of items) {
      flatList.push(item);
      if (item.children) {
        recurse(item.children);
      }
    }
  }
  recurse(cas);
  return flatList;
}

// Stats interfaces
interface CaStatsResponse {
  cas: { total: number };
  certificates: { total: number };
}
interface TotalStatResponse {
  total: number;
}
interface SummaryStats {
  certificates: number | null;
  cas: number | null;
  ras: number | null;
  devices: number | null;
}

export default function HomePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  // State for timeline
  const [allCAs, setAllCAs] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  // State for summary stats
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    certificates: null,
    cas: null,
    ras: null,
    devices: null,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  // Engines are needed by both
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoadingEngines, setIsLoadingEngines] = useState(true);
  const [errorEngines, setErrorEngines] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setErrorCAs("User not authenticated.");
        setErrorEngines("User not authenticated.");
        setErrorStats("User not authenticated.");
      }
      setIsLoadingCAs(false);
      setIsLoadingEngines(false);
      setIsLoadingStats(false);
      return;
    }

    setIsLoadingCAs(true);
    setIsLoadingEngines(true);
    setIsLoadingStats(true);
    setErrorCAs(null);
    setErrorEngines(null);
    setErrorStats(null);

    try {
      const [
        fetchedCAs,
        enginesData,
        caStatsResponse,
        dmsStatsResponse,
        devManagerStatsResponse,
      ] = await Promise.all([
        fetchAndProcessCAs(user.access_token),
        fetchCryptoEngines(user.access_token),
        fetch(`${CA_API_BASE_URL}/stats`, { headers: { 'Authorization': `Bearer ${user.access_token}` } }),
        fetch(`${DMS_MANAGER_API_BASE_URL}/stats`, { headers: { 'Authorization': `Bearer ${user.access_token}` } }),
        fetch(`${DEV_MANAGER_API_BASE_URL}/stats`, { headers: { 'Authorization': `Bearer ${user.access_token}` } }),
      ]);

      // Process CAs for timeline
      const flattenedCAs = flattenCAs(fetchedCAs);
      setAllCAs(flattenedCAs);
      setIsLoadingCAs(false);

      // Process engines
      setAllCryptoEngines(enginesData);
      setIsLoadingEngines(false);

      // Process stats for summary card
      if (!caStatsResponse.ok) throw new Error('Failed to fetch CA stats');
      if (!dmsStatsResponse.ok) throw new Error('Failed to fetch RA stats');
      if (!devManagerStatsResponse.ok) throw new Error('Failed to fetch Device stats');

      const caStats: CaStatsResponse = await caStatsResponse.json();
      const dmsStats: TotalStatResponse = await dmsStatsResponse.json();
      const devManagerStats: TotalStatResponse = await devManagerStatsResponse.json();

      setSummaryStats({
        certificates: caStats.certificates.total,
        cas: caStats.cas.total,
        ras: dmsStats.total,
        devices: devManagerStats.total,
      });
      setIsLoadingStats(false);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load dashboard data.';
      setErrorCAs(errorMessage);
      setErrorEngines(errorMessage);
      setErrorStats(errorMessage);
      setAllCAs([]);
      setAllCryptoEngines([]);
      setSummaryStats({ certificates: null, cas: null, ras: null, devices: null });
    } finally {
      setIsLoadingCAs(false);
      setIsLoadingEngines(false);
      setIsLoadingStats(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [loadInitialData, authLoading]);

  const anyTimelineError = errorCAs || errorEngines;
  const anyTimelineLoading = isLoadingCAs || isLoadingEngines || authLoading;
  const isReloading = isLoadingCAs || isLoadingEngines || isLoadingStats || authLoading;

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <HomeIcon className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-headline font-semibold">Dashboard</h1>
        </div>
        <Button onClick={loadInitialData} variant="outline" disabled={isReloading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isReloading && "animate-spin")} /> Refresh All
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="lg:col-span-1">
          <SummaryStatsCard stats={summaryStats} isLoading={isLoadingStats || authLoading} />
        </div>
        <div className="lg:col-span-1">
          <div className="max-w-lg">
            <DeviceStatusChartCard />
          </div>
        </div>
      </div>
      <div>
        {anyTimelineLoading && !anyTimelineError ? (
          <Card className="shadow-lg w-full bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-[200px] md:h-[250px] p-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading CA timeline data...</p>
              </div>
            </CardContent>
          </Card>
        ) : anyTimelineError ? (
          <Card className="shadow-lg w-full bg-card">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Timeline Data</AlertTitle>
                <AlertDescription>
                  {anyTimelineError}
                  <Button variant="link" onClick={loadInitialData} className="p-0 h-auto ml-1 text-destructive hover:text-destructive/80 focus:text-destructive">Try again?</Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <CaExpiryTimeline cas={allCAs} allCryptoEngines={allCryptoEngines} />
        )}
      </div>
    </div>
  );
}
