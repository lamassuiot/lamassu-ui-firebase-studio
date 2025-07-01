
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { formatDistanceToNow } from 'date-fns';
import { Layers, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { AlertEvent } from '@/app/alerts/page';
import { DetailItem } from '@/components/shared/DetailItem';

interface AlertEventCardProps {
  event: AlertEvent;
}

export const AlertEventCard: React.FC<AlertEventCardProps> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lastSeenDate = new Date(event.lastSeen);

  const handleSubscribeClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    alert(`Subscribing to ${event.type}`);
  };

  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary/10 rounded-md">
                    <Layers className="h-6 w-6 text-primary" />
                 </div>
                 <div>
                    <CardTitle className="text-lg truncate" title={event.type}>{event.type}</CardTitle>
                    <CardDescription className="flex items-center text-xs mt-1">
                        <Clock className="mr-1.5 h-3 w-3" />
                        Last seen {formatDistanceToNow(lastSeenDate, { addSuffix: true })}
                    </CardDescription>
                 </div>
            </div>
             <Button size="sm" onClick={handleSubscribeClick}>
                Subscribe
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-2">
         <DetailItem 
            label="Event Counter"
            value={event.eventCounter.toLocaleString()}
            className="py-1"
         />
         <DetailItem
            label="Active Subscriptions"
            value={event.activeSubscriptions.length > 0 ? event.activeSubscriptions.join(', ') : 'None'}
            className="py-1"
         />
      </CardContent>
      <CardFooter className="border-t pt-3 flex-col items-stretch">
        <Button
            variant="ghost"
            className="w-full justify-center text-sm"
            onClick={() => setIsExpanded(!isExpanded)}
        >
            {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {isExpanded ? 'Hide Payload' : 'Show Payload'}
        </Button>
        {isExpanded && (
            <div className="mt-2 pt-3 border-t">
                <CodeBlock content={JSON.stringify(event.payload, null, 2)} title="Event Payload" />
            </div>
        )}
      </CardFooter>
    </Card>
  );
};
