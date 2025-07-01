
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertEventItem } from '@/components/alerts/AlertEventItem';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLatestAlerts, type ApiAlertEvent } from '@/lib/alerts-api';

// This is the structure the UI component expects.
export interface AlertEvent {
  id: string; // Will be mapped from event_types
  type: string; // Will be mapped from event_types
  lastSeen: string; // Will be mapped from seen_at
  eventCounter: number; // Will be mapped from counter
  activeSubscriptions: string[]; // Mocked as empty for now
  payload: object; // Will be mapped from event
}

// Data transformation function
const transformApiAlertToUiAlert = (apiAlert: ApiAlertEvent): AlertEvent => {
    return {
        id: apiAlert.event_types,
        type: apiAlert.event_types,
        lastSeen: apiAlert.seen_at,
        eventCounter: apiAlert.counter,
        activeSubscriptions: [], // This field is not in the API response
        payload: apiAlert.event,
    };
};

export default function AlertsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const apiEvents = await fetchLatestAlerts(user.access_token);
      const uiEvents = apiEvents.map(transformApiAlertToUiAlert);
      setEvents(uiEvents);
    } catch (e: any) {
      setError(e.message || "Failed to load alert events.");
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        fetchEvents();
    }
  }, [fetchEvents, authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Info className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Alerts</h1>
        </div>
        <Button onClick={fetchEvents} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Monitor and get notified when operations are requested to the PKI.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading events...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Events</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" onClick={fetchEvents} className="p-0 h-auto ml-1">Try again?</Button>
          </AlertDescription>
        </Alert>
      ) : events.length > 0 ? (
        <Accordion type="single" collapsible className="w-full space-y-2">
          {events.map((event) => (
            <AlertEventItem key={event.id} event={event} />
          ))}
        </Accordion>
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">No Events Found</h3>
          <p className="text-sm text-muted-foreground">
            No system events have been recorded yet.
          </p>
        </div>
      )}
    </div>
  );
}
