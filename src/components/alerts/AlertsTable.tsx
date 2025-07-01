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
import { Layers, ChevronDown, X } from 'lucide-react';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { cn } from '@/lib/utils';

interface AlertsTableProps {
  events: AlertEvent[];
  onUnsubscribe: (subscriptionId: string, eventType: string) => void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({ events, onUnsubscribe }) => {
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
                    <div className="flex flex-wrap gap-1">
                      {event.activeSubscriptions.map((sub) => (
                        <Badge key={sub.id} variant="secondary" className="font-normal pr-1.5">
                          {sub.display}
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUnsubscribe(sub.id, event.type);
                            }}
                            className="ml-1.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                            aria-label={`Unsubscribe from ${sub.display}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
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
