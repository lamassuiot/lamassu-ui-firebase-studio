
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CertificateStatusChartCard } from '@/components/dashboard/home/CertificateStatusChartCard';
import { CaExpiryTimeline } from '@/components/dashboard/home/CaExpiryTimeline';
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
  const [allCAs, setAllCAs] = useState<CA[]>([]);
  const [isLoadingCAs, setIsLoadingCAs] = useState(true);
  const [errorCAs, setErrorCAs] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setErrorCAs("User not authenticated. Cannot load CA data for timeline.");
        setIsLoadingCAs(false);
      }
      return;
    }
    setIsLoadingCAs(true);
    setErrorCAs(null);
    try {
      const fetchedCAs = await fetchAndProcessCAs(user.access_token);
      const flattenedCAs = flattenCAs(fetchedCAs); // Keep flattening if CaExpiryTimeline expects flat list
      setAllCAs(flattenedCAs);
    } catch (err: any) {
      setErrorCAs(err.message || 'Failed to load CA data for timeline.');
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
          {(isLoadingCAs || authLoading) && !errorCAs ? (
            <Card className="shadow-lg w-full bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[200px] md:h-[250px] p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
                        <p className="ml-3 text-primary-foreground/80">Loading CA timeline data...</p>
                    </div>
                </CardContent>
            </Card>
          ) : errorCAs ? (
             <Card className="shadow-lg w-full bg-primary text-primary-foreground">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive" className="bg-destructive/80 text-destructive-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error Loading Timeline Data</AlertTitle>
                        <AlertDescription className="text-destructive-foreground/90">
                            {errorCAs}
                            <Button variant="link" onClick={loadInitialData} className="p-0 h-auto ml-1 text-destructive-foreground hover:text-destructive-foreground/80 focus:text-destructive-foreground">Try again?</Button>
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
          ) : (
            <CaExpiryTimeline cas={allCAs} />
          )}
        </div>
      </div>
    </div>
  );
}

