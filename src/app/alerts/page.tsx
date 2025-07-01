'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchLatestAlerts, type ApiAlertEvent, fetchSystemSubscriptions, unsubscribeFromAlert } from '@/lib/alerts-api';
import { AlertsTable } from '@/components/alerts/AlertsTable';
import { useToast } from '@/hooks/use-toast';

// This is the structure the UI component expects.
export interface AlertEvent {
  id: string; // Will be mapped from event_types
  type: string; // Will be mapped from event_types
  lastSeen: string; // Will be mapped from seen_at
  eventCounter: number; // Will be mapped from counter
  activeSubscriptions: { id: string, display: string }[]; // Updated to include subscription ID
  payload: object; // Will be mapped from event
}

export default function AlertsPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleUnsubscribe = async (subscriptionId: string, eventType: string) => {
    if (!user?.access_token) {
        toast({ title: 'Authentication Error', description: 'You must be logged in to unsubscribe.', variant: 'destructive' });
        return;
    }

    try {
        await unsubscribeFromAlert(subscriptionId, user.access_token);
        
        // Optimistically update the UI
        setEvents(currentEvents => {
            return currentEvents.map(event => {
                if (event.type === eventType) {
                    return {
                        ...event,
                        activeSubscriptions: event.activeSubscriptions.filter(sub => sub.id !== subscriptionId)
                    };
                }
                return event;
            });
        });

        toast({ title: 'Success', description: 'You have been unsubscribed from the alert.' });
    } catch (e: any) {
        toast({ title: 'Unsubscribe Failed', description: e.message, variant: 'destructive' });
    }
  };


  const loadAlertsData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [apiEvents, apiSubscriptions] = await Promise.all([
        fetchLatestAlerts(user.access_token),
        fetchSystemSubscriptions(user.access_token),
      ]);

      const subscriptionsMap = new Map<string, { id: string, display: string }[]>();
      for (const sub of apiSubscriptions) {
        if (!subscriptionsMap.has(sub.event_type)) {
          subscriptionsMap.set(sub.event_type, []);
        }
        const subscriptionDisplay = {
            id: sub.id,
            display: `${sub.channel.type}: ${sub.channel.config.email}`,
        };
        subscriptionsMap.get(sub.event_type)?.push(subscriptionDisplay);
      }

      const uiEvents = apiEvents.map((apiAlert): AlertEvent => ({
        id: apiAlert.event_types,
        type: apiAlert.event_types,
        lastSeen: apiAlert.seen_at,
        eventCounter: apiAlert.counter,
        activeSubscriptions: subscriptionsMap.get(apiAlert.event_types) || [],
        payload: apiAlert.event,
      }));

      setEvents(uiEvents);
    } catch (e: any) {
      setError(e.message || "Failed to load alert events or subscriptions.");
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
        loadAlertsData();
    }
  }, [loadAlertsData, authLoading]);

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
        <div className="flex items-center space-x-2">
          <Button onClick={loadAlertsData} variant="outline" disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
          </Button>
        </div>
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
            <Button variant="link" onClick={loadAlertsData} className="p-0 h-auto ml-1">Try again?</Button>
          </AlertDescription>
        </Alert>
      ) : events.length > 0 ? (
        <AlertsTable events={events} onUnsubscribe={handleUnsubscribe} />
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
