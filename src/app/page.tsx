
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CertificateStatusChartCard } from '@/components/dashboard/home/CertificateStatusChartCard';
// import { CaExpiryTimelineJS } from '@/components/dashboard/home/CaExpiryTimelineJS'; // Removed due to install issue
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs } from '@/lib/ca-data';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function HomePage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [allCAs, setAllCAs] = useState<CA[]>([]); // Still fetching for other potential uses or future re-integration
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setErrorCAs("User not authenticated. Cannot load CA data.");
        setIsLoadingCAs(false);
      }
      return;
    }
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      const flattenedCAs = flattenCAs(fetchedCAs); 
      setAllCAs(flattenedCAs);
    } catch (err: any) {
      setErrorCAs(err.message || 'Failed to load CA data.');
      setAllCAs([]);
    } finally {
      setIsLoadingCAs(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [loadInitialData, authLoading]);

  return (
    <div className="w-full space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <CertificateStatusChartCard />
        </div>
        <div className="lg:col-span-2">
          {/* Placeholder or alternative component for CA Expiry Timeline */}
          <Card className="shadow-lg w-full bg-muted/30 text-muted-foreground">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">CA Expiry Information</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[400px] p-6 flex flex-col items-center justify-center">
              {(isLoadingCAs || authLoading) && !errorCAs ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-3 mt-2">Loading CA data...</p>
                </>
              ) : errorCAs ? (
                <Alert variant="destructive" className="w-full">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Loading CA Data</AlertTitle>
                  <AlertDescription>
                    {errorCAs}
                    <Button variant="link" onClick={loadInitialData} className="p-0 h-auto ml-1">Try again?</Button>
                  </AlertDescription>
                </Alert>
              ) : allCAs.length > 0 ? (
                <p className="text-center">
                  CA Expiry Timeline component is temporarily unavailable due to an installation issue with its charting library.
                  <br />
                  ({allCAs.length} CAs loaded).
                </p>
              ) : (
                 <p className="text-center">No CA data available to display expiry information.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
