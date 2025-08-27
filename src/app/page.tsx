

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DeviceStatusChartCard } from '@/components/home/DeviceStatusChartCard';
import { CaExpiryTimeline } from '@/components/home/CaExpiryTimeline';
import { SummaryStatsCard } from '@/components/home/SummaryStatsCard';
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, fetchCryptoEngines, fetchCaStatsSummary } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { cn } from '@/lib/utils';
import { fetchDmsStats } from '@/lib/dms-api';
import { fetchDeviceStats } from '@/lib/devices-api';

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
        caStats,
        dmsStats,
        devManagerStats,
      ] = await Promise.all([
        fetchAndProcessCAs(user.access_token),
        fetchCryptoEngines(user.access_token),
        fetchCaStatsSummary(user.access_token),
        fetchDmsStats(user.access_token),
        fetchDeviceStats(user.access_token),
      ]);

      // Process CAs for timeline
      const flattenedCAs = flattenCAs(fetchedCAs);
      setAllCAs(flattenedCAs);
      setIsLoadingCAs(false);

      // Process engines
      setAllCryptoEngines(enginesData);
      setIsLoadingEngines(false);

      // Process stats for summary card
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
   
    </div>
  );
}
