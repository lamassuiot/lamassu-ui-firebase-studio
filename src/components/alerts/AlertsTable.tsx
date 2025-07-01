'use client';

import React, { useState } from 'react';
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
import { Layers, ChevronDown } from 'lucide-react';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { cn } from '@/lib/utils';

interface AlertsTableProps {
  events: AlertEvent[];
}

export const AlertsTable: React.FC<AlertsTableProps> = ({ events }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSubscribeClick = (e: React.MouseEvent, eventType: string) => {
    e.stopPropagation();
    alert(`Subscribing to ${eventType}`);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(current => (current === id ? null : id));
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[10px]"></TableHead> {/* For expand icon */}
            <TableHead className="w-[40%]">Event Type</TableHead>
            <TableHead>Last Seen</TableHead>
            <TableHead>Counter</TableHead>
            <TableHead>Subscriptions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <React.Fragment key={event.id}>
              <TableRow onClick={() => toggleRow(event.id)} className="cursor-pointer">
                <TableCell className="p-2">
                   <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        expandedRow === event.id && "rotate-180"
                      )}
                    />
                </TableCell>
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
              {expandedRow === event.id && (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <div className="p-4 bg-muted/50">
                        <CodeBlock content={JSON.stringify(event.payload, null, 2)} title="Latest Event Payload" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
