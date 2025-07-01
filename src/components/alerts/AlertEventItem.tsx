
'use client';

import React from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { format, formatDistanceToNow } from 'date-fns';
import type { AlertEvent } from '@/app/alerts/page';

interface AlertEventItemProps {
  event: AlertEvent;
}

export const AlertEventItem: React.FC<AlertEventItemProps> = ({ event }) => {
    const lastSeenDate = new Date(event.lastSeen);

    return (
        <AccordionItem value={event.id} className="border rounded-lg mb-2 overflow-hidden bg-card">
            <AccordionTrigger className="hover:no-underline p-4 text-left data-[state=open]:bg-muted/30 w-full [&>svg]:ml-4">
                <div className="grid grid-cols-[minmax(0,_1.5fr)_repeat(3,_minmax(0,_1fr))_minmax(0,_0.5fr)] items-center w-full gap-4">
                    <div className="font-mono text-sm font-semibold text-foreground truncate" title={event.type}>
                        {event.type}
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Last Seen</div>
                        <div className="text-sm font-medium text-foreground">{format(lastSeenDate, 'dd/MM/yyyy HH:mm')}</div>
                        <div className="text-xs text-muted-foreground">{formatDistanceToNow(lastSeenDate, { addSuffix: true })}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Event Counter</div>
                        <div className="text-sm font-medium text-foreground">{event.eventCounter}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Subscriptions</div>
                        <div className="text-sm font-medium text-foreground">
                            {event.activeSubscriptions.length > 0 ? event.activeSubscriptions.join(', ') : 'No Subscriptions'}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); alert(`Subscribing to ${event.type}`)}}>
                            Subscribe
                        </Button>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-4 border-t bg-muted/20">
                <CodeBlock content={JSON.stringify(event.payload, null, 2)} title="Event Payload" />
            </AccordionContent>
        </AccordionItem>
    )
}
