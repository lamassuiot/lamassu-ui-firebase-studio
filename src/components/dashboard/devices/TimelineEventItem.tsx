
'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertTriangle, History, Edit, Activity, Info, Eye, HelpCircle } from 'lucide-react';

export interface TimelineEventDisplayData {
  id: string;
  timestamp: Date;
  eventType: string; // Raw API event type
  title: string; // Formatted description or type
  details?: React.ReactNode; // For serial, device ID, cert status etc.
  relativeTime: string; // e.g., "2 days ago"
  secondaryRelativeTime?: string; // e.g., "2 minutes later"
}

const eventTypeVisuals: Record<string, { display: string; colorClass: string; Icon: React.ElementType }> = {
  'CREATED': { display: 'Created', colorClass: 'bg-green-500', Icon: CheckCircle },
  'STATUS-UPDATED': { display: 'Status Update', colorClass: 'bg-blue-500', Icon: Edit },
  'PROVISIONED': { display: 'Provisioned', colorClass: 'bg-emerald-500', Icon: CheckCircle },
  'RE-PROVISIONED': { display: 'Re-Provisioned', colorClass: 'bg-purple-500', Icon: History },
  'DELETED': { display: 'Deleted', colorClass: 'bg-red-500', Icon: XCircle },
  'ERROR': { display: 'Error', colorClass: 'bg-orange-500', Icon: AlertTriangle },
  'DEFAULT': { display: 'Event', colorClass: 'bg-gray-400', Icon: Info },
};


export const TimelineEventItem: React.FC<{ event: TimelineEventDisplayData; isLastItem: boolean }> = ({ event, isLastItem }) => {
  const visuals = eventTypeVisuals[event.eventType] || eventTypeVisuals['DEFAULT'];

  return (
    <li className="flex gap-4 py-3 relative">
      {/* Timestamps and Vertical Connector Line */}
      <div className="flex-shrink-0 w-32 md:w-36 text-right space-y-0.5">
        <p className="text-xs font-medium text-foreground">{format(event.timestamp, 'dd-MM-yyyy HH:mm')}</p>
        <p className="text-xs text-muted-foreground">{event.relativeTime}</p>
        {event.secondaryRelativeTime && (
          <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight font-normal text-muted-foreground">
            {event.secondaryRelativeTime}
          </Badge>
        )}
      </div>

      {/* Dot and Vertical Line (visual) */}
      <div className="relative flex-shrink-0">
        <div className={cn("h-3.5 w-3.5 rounded-full ring-4 ring-background dark:ring-background z-10 relative mt-0.5", visuals.colorClass)} />
        {!isLastItem && <div className="absolute left-1/2 top-3.5 bottom-[-0.875rem] w-0.5 bg-border -translate-x-1/2 z-0"></div>}
      </div>

      {/* Event Content */}
      <div className="flex-grow pb-3 min-w-0">
        <div className="flex items-center justify-between">
            <div className='flex items-center gap-1.5'>
                <Badge variant="secondary" className={cn("text-xs font-semibold", visuals.colorClass, "text-white dark:text-white")}>
                    {visuals.display.toUpperCase()}
                </Badge>
                {event.eventType === 'RE-PROVISIONED' && (
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" title="Device identity was updated with a new certificate version."/>
                )}
            </div>
             {/* Placeholder for actions like viewing cert, if applicable */}
             {(event.eventType === 'PROVISIONED' || event.eventType === 'RE-PROVISIONED') && event.details && (
                <button title="View Associated Certificate (placeholder)" className="text-muted-foreground hover:text-primary transition-colors">
                    <Eye className="h-4 w-4" />
                </button>
            )}
        </div>
        <p className="text-sm font-medium text-foreground mt-1 break-words">{event.title}</p>
        {event.details && (
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            {event.details}
          </div>
        )}
      </div>
    </li>
  );
};

