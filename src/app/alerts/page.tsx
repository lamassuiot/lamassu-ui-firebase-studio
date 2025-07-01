
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertEventItem } from '@/components/alerts/AlertEventItem';
import { cn } from '@/lib/utils';

export interface AlertEvent {
  id: string;
  type: string;
  lastSeen: string;
  eventCounter: number;
  activeSubscriptions: string[];
  payload: object;
}

const mockApiData: AlertEvent[] = [
  {
    id: 'evt_ca.create',
    type: 'ca.create',
    lastSeen: '2025-06-28T18:21:00Z',
    eventCounter: 12,
    activeSubscriptions: [],
    payload: {
      specversion: '1.0',
      id: '9c0e7e28-5606-4f79-bica-944c6a5e9735',
      source: 'lrn://ca',
      type: 'ca.create',
      datacontenttype: 'application/json',
      time: '2025-06-28T16:21:10.645784863Z',
      data: {
        id: '5d2f9894-5e3a-4aaa-a12a-551b39e32786',
        certificate: {
          serial_number: 'c9-9c-13-66-de-83-a9-9d-4d-a9-f0-03-5f-27-c1-9c',
          subject_key_id: '35:61:38:65:36:35:31:38:35:37:37:35:34:63:66:38:39:33:34:37:63:33:38:62:31:38:30:35:33:30:33:64:61',
          authority_key_id: '35:61:38:65:36:35:31:38:35:37:37:35:34:63:66:38:39:33:34:37:63:33:38:62:31:38:30:35:33:30:33:64:61',
          metadata: {},
          status: 'ACTIVE',
          key_metadata: { type: 'ECDSA', bits: 256 },
        },
      },
    },
  },
  {
    id: 'evt_ca.delete',
    type: 'ca.delete',
    lastSeen: '2025-06-28T18:29:00Z',
    eventCounter: 4,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.delete' },
  },
  {
    id: 'evt_ca.import',
    type: 'ca.import',
    lastSeen: '2025-06-30T18:34:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.import' },
  },
  {
    id: 'evt_ca.issuance-expiration.update',
    type: 'ca.issuance-expiration.update',
    lastSeen: '2025-06-29T11:50:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.issuance-expiration.update' },
  },
  {
    id: 'evt_ca.sign.certificate',
    type: 'ca.sign.certificate',
    lastSeen: '2025-06-30T09:26:00Z',
    eventCounter: 16,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.sign.certificate' },
  },
  {
    id: 'evt_ca.sign.signature',
    type: 'ca.sign.signature',
    lastSeen: '2025-07-01T12:45:00Z',
    eventCounter: 2,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.sign.signature' },
  },
  {
    id: 'evt_ca.status.update',
    type: 'ca.status.update',
    lastSeen: '2025-06-28T18:21:00Z',
    eventCounter: 3,
    activeSubscriptions: [],
    payload: { message: 'Event payload for ca.status.update' },
  },
  {
    id: 'evt_certificate.metadata.update',
    type: 'certificate.metadata.update',
    lastSeen: '2025-06-27T16:25:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for certificate.metadata.update' },
  },
  {
    id: 'evt_certificate.status.update',
    type: 'certificate.status.update',
    lastSeen: '2025-06-27T18:10:00Z',
    eventCounter: 13,
    activeSubscriptions: [],
    payload: { message: 'Event payload for certificate.status.update' },
  },
  {
    id: 'evt_device.create',
    type: 'device.create',
    lastSeen: '2025-06-27T17:22:00Z',
    eventCounter: 22,
    activeSubscriptions: [],
    payload: { message: 'Event payload for device.create' },
  },
  {
    id: 'evt_device.identity.update',
    type: 'device.identity.update',
    lastSeen: '2025-06-27T16:25:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for device.identity.update' },
  },
  {
    id: 'evt_device.status.update',
    type: 'device.status.update',
    lastSeen: '2025-06-27T18:10:00Z',
    eventCounter: 2,
    activeSubscriptions: [],
    payload: { message: 'Event payload for device.status.update' },
  },
  {
    id: 'evt_dms.bind-device-id',
    type: 'dms.bind-device-id',
    lastSeen: '2025-06-27T16:25:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for dms.bind-device-id' },
  },
  {
    id: 'evt_dms.create',
    type: 'dms.create',
    lastSeen: '2025-06-30T08:02:00Z',
    eventCounter: 2,
    activeSubscriptions: [],
    payload: { message: 'Event payload for dms.create' },
  },
  {
    id: 'evt_dms.update',
    type: 'dms.update',
    lastSeen: '2025-06-18T22:05:00Z',
    eventCounter: 1,
    activeSubscriptions: [],
    payload: { message: 'Event payload for dms.update' },
  },
];

export default function AlertsPage() {
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setEvents(mockApiData);
    } catch (e) {
      setError("Failed to load alert events.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
