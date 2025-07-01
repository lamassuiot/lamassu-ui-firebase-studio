
'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { AlertEvent } from '@/app/alerts/page';
import { Layers } from 'lucide-react';

interface AlertsTableProps {
  events: AlertEvent[];
}

export const AlertsTable: React.FC<AlertsTableProps> = ({ events }) => {
  const handleSubscribeClick = (e: React.MouseEvent, eventType: string) => {
    e.stopPropagation();
    alert(`Subscribing to ${eventType}`);
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Event Type</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead>Counter</TableHead>
            <TableHead>Subscriptions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="truncate">{event.type}</span>
                </div>
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(event.lastSeen), { addSuffix: true })}
              </TableCell>
              <TableCell>{event.eventCounter.toLocaleString()}</TableCell>
              <TableCell>
                {event.activeSubscriptions.length > 0 ? (
                  <Badge variant="secondary">{event.activeSubscriptions.join(', ')}</Badge>
                ) : (
                  <span className="text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => handleSubscribeClick(e, event.type)}
                >
                  Subscribe
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
