
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO, differenceInMilliseconds, isPast, addMonths, addYears, formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface CaExpiryTimelineProps {
  cas: CA[];
}

interface TimelineEvent {
  id: string;
  name: string;
  date: Date;
  status: CA['status'];
  originalCa: CA;
}

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas }) => {
  if (!cas || cas.length === 0) {
    return <div className="p-4 text-center text-muted-foreground bg-card rounded-lg shadow">No CA data to display.</div>;
  }

  const now = new Date();
  const events: TimelineEvent[] = cas.map(ca => {
    const expiryDate = parseISO(ca.expires);
    return {
      id: ca.id,
      name: ca.name,
      date: expiryDate,
      status: ca.status,
      originalCa: ca,
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  const earliestEventDate = events[0]?.date || now;
  const latestEventDate = events[events.length - 1]?.date || addYears(now, 1);

  let timelineStart = now < earliestEventDate ? now : earliestEventDate;
  if (events.every(e => isPast(e.date) && e.status !== 'revoked')) { // All are expired (but not necessarily revoked)
    timelineStart = earliestEventDate; // Start from the earliest expiry
  }
  timelineStart = addMonths(timelineStart, -1); // Add a bit of buffer before the first relevant date or now

  let timelineEnd = latestEventDate > now ? latestEventDate : addMonths(now, 6);
  timelineEnd = addMonths(timelineEnd, 1); // Add a bit of buffer after the last relevant date


  const totalDuration = differenceInMilliseconds(timelineEnd, timelineStart);

  const calculatePosition = (date: Date) => {
    if (totalDuration <= 0) return date < timelineStart ? 0 : 100;
    const eventOffset = differenceInMilliseconds(date, timelineStart);
    return Math.max(0, Math.min(100, (eventOffset / totalDuration) * 100));
  };

  const nowPosition = calculatePosition(now);

  const getStatusStyles = (event: TimelineEvent): { dotClass: string; Icon: React.ElementType } => {
    const expired = isPast(event.date);
    if (event.status === 'revoked') {
      return { dotClass: 'bg-destructive', Icon: XCircle };
    }
    if (expired) {
      return { dotClass: 'bg-orange-500', Icon: AlertCircle };
    }
    // Consider "active" but expiring soon logic here if needed
    return { dotClass: 'bg-green-500', Icon: CheckCircle };
  };

  // Create ticks for the timeline
  const ticks = [];
  const numTicks = Math.min(Math.max(Math.floor(differenceInMilliseconds(timelineEnd, timelineStart) / (1000 * 60 * 60 * 24 * 30 * 2)), 3), 7); // Dynamic ticks, min 3, max 7

  for (let i = 0; i <= numTicks; i++) {
    const tickDate = new Date(timelineStart.getTime() + (totalDuration / numTicks) * i);
    ticks.push({
      date: tickDate,
      position: calculatePosition(tickDate),
      label: format(tickDate, Math.abs(differenceInMilliseconds(timelineEnd, timelineStart)) > (1000 * 60 * 60 * 24 * 365 * 2) ? 'MMM yyyy' : 'MMM dd'), // Show year if span > 2 years
    });
  }


  return (
    <TooltipProvider>
      <div className="w-full p-4 md:p-6 bg-card rounded-lg shadow space-y-6">
        <div className="relative w-full h-12 mt-8 mb-6"> {/* Increased height for better spacing */}
          {/* Timeline Bar */}
          <div className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full transform -translate-y-1/2"></div>

          {/* "Now" Marker */}
          <div
            className="absolute top-0 h-full flex flex-col items-center z-10"
            style={{ left: `${nowPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-1 h-3 bg-primary rounded-t-sm"></div>
            <CalendarClock className="h-5 w-5 text-primary my-0.5" />
            <div className="text-xs font-semibold text-primary whitespace-nowrap mt-0.5">Now</div>
          </div>
          
          {/* Ticks */}
          {ticks.map((tick, index) => (
            <div
              key={`tick-${index}`}
              className="absolute top-1/2 h-full flex flex-col items-center"
              style={{ left: `${tick.position}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-2.5 bg-border -mt-2.5"></div>
              <div className="text-[10px] text-muted-foreground whitespace-nowrap mt-5 pt-1">{tick.label}</div>
            </div>
          ))}


          {/* CA Expiry Markers */}
          {events.map((event) => {
            const position = calculatePosition(event.date);
            const { dotClass, Icon } = getStatusStyles(event);
            // Stagger markers slightly if they are too close to "Now" or other markers
            // This is a very basic stagger, more complex logic would be needed for many overlaps
            let yOffset = '-50%';
            if (Math.abs(position - nowPosition) < 2 && event.date.getTime() !== now.getTime()) {
                yOffset = event.date > now ? '-150%' : '50%'; // Push above if after now, below if before
            }

            return (
              <Tooltip key={event.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute top-1/2 w-4 h-4 rounded-full cursor-pointer transform -translate-x-1/2 border-2 border-background flex items-center justify-center shadow z-20",
                      dotClass
                    )}
                    style={{ left: `${position}%`, transform: `translateX(-50%) translateY(${yOffset})` }}
                    aria-label={`CA: ${event.name}`}
                  >
                    <Icon className="w-2.5 h-2.5 text-white" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-popover text-popover-foreground shadow-lg rounded-md">
                  <p className="font-semibold">{event.name}</p>
                  <p className="text-xs">
                    Status: <span className="capitalize">{event.status}</span>
                  </p>
                  <p className="text-xs">
                    {isPast(event.date) && event.status !== 'revoked' ? 'Expired: ' : 'Expires: '} 
                    {format(event.date, 'PPpp')} 
                    {' ('}
                    {formatDistanceToNowStrict(event.date, { addSuffix: true })}
                    {')'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs mt-6 border-t border-border pt-4">
            <div className="flex items-center"><CheckCircle className="w-3 h-3 mr-1.5 text-green-500"/><span className="text-muted-foreground">Active</span></div>
            <div className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5 text-orange-500"/><span className="text-muted-foreground">Expired</span></div>
            <div className="flex items-center"><XCircle className="w-3 h-3 mr-1.5 text-destructive"/><span className="text-muted-foreground">Revoked</span></div>
            <div className="flex items-center"><CalendarClock className="w-3 h-3 mr-1.5 text-primary"/><span className="text-muted-foreground">Current Time</span></div>
        </div>

      </div>
    </TooltipProvider>
  );
};
