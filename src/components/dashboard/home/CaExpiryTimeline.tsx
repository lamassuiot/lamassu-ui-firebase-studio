
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInMilliseconds, isPast, addMonths, addYears, subMonths, differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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

const MIN_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 20; // 20 years

export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas }) => {
  const [now] = useState(new Date()); // 'now' should be stable for the component's lifecycle

  const [initialViewConfig, setInitialViewConfig] = useState<{ start: Date, end: Date } | null>(null);
  const [viewStartDate, setViewStartDate] = useState<Date>(now);
  const [viewEndDate, setViewEndDate] = useState<Date>(addYears(now, 1));

  useEffect(() => {
    if (!cas || cas.length === 0) return;

    const allDates = cas.map(ca => parseISO(ca.expires));
    allDates.push(now); // Ensure 'now' is within consideration

    let minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    let maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // If all events are in the past, center view around them
    if (maxDate < now && cas.every(ca => isPast(parseISO(ca.expires)))) {
        minDate = new Date(Math.min(...cas.map(ca => parseISO(ca.expires).getTime())));
        maxDate = new Date(Math.max(...cas.map(ca => parseISO(ca.expires).getTime())));
    } else {
        minDate = minDate < now ? minDate : now;
        maxDate = maxDate > now ? maxDate : now;
    }

    const paddedStart = subMonths(minDate, 1);
    const paddedEnd = addMonths(maxDate, 1);

    setInitialViewConfig({ start: paddedStart, end: paddedEnd });
    setViewStartDate(paddedStart);
    setViewEndDate(paddedEnd);
  }, [cas, now]);


  const events: TimelineEvent[] = useMemo(() => 
    cas.map(ca => ({
      id: ca.id,
      name: ca.name,
      date: parseISO(ca.expires),
      status: ca.status,
      originalCa: ca,
    })).sort((a, b) => a.date.getTime() - b.date.getTime()), 
  [cas]);

  const calculatePosition = useCallback((date: Date, currentViewStart: Date, currentViewEnd: Date): number => {
    const totalViewDuration = currentViewEnd.getTime() - currentViewStart.getTime();
    if (totalViewDuration <= 0) return date.getTime() < currentViewStart.getTime() ? 0 : 100;

    const eventOffsetFromViewStart = date.getTime() - currentViewStart.getTime();
    const position = (eventOffsetFromViewStart / totalViewDuration) * 100;
    return Math.max(0, Math.min(100, position)); // Clamp to keep within bounds
  }, []);


  const handleZoom = (factor: number) => {
    const currentDuration = viewEndDate.getTime() - viewStartDate.getTime();
    let newDuration = currentDuration * factor;

    newDuration = Math.max(MIN_TIMELINE_DURATION_MS, Math.min(newDuration, MAX_TIMELINE_DURATION_MS));
    
    const midPointTime = viewStartDate.getTime() + currentDuration / 2;
    
    setViewStartDate(new Date(midPointTime - newDuration / 2));
    setViewEndDate(new Date(midPointTime + newDuration / 2));
  };

  const handleResetView = () => {
    if (initialViewConfig) {
      setViewStartDate(initialViewConfig.start);
      setViewEndDate(initialViewConfig.end);
    }
  };
  
  const currentViewDurationMs = viewEndDate.getTime() - viewStartDate.getTime();

  const ticks = useMemo(() => {
    if (currentViewDurationMs <= 0) return [];
    const result = [];
    const durationDays = differenceInDays(viewEndDate, viewStartDate);
    
    let numTicks = 5; // Default
    let tickLabelFormat = 'MMM dd';

    if (durationDays <= 14) { // Up to 2 weeks
        numTicks = Math.min(durationDays +1, 7);
        tickLabelFormat = 'MMM dd';
    } else if (durationDays <= 90) { // Up to ~3 months
        numTicks = Math.floor(durationDays / 10) +1;
        tickLabelFormat = 'MMM dd';
    } else if (durationDays <= 365 * 2) { // Up to 2 years
        numTicks = Math.floor(durationDays / 60) +1;
        tickLabelFormat = 'MMM yyyy';
    } else { // More than 2 years
        numTicks = Math.floor(durationDays / (365 / 2)) + 1; // Roughly 2 ticks per year
        tickLabelFormat = 'yyyy';
    }
    numTicks = Math.min(Math.max(numTicks, 2), 8); // Clamp numTicks

    for (let i = 0; i <= numTicks; i++) {
      const tickDate = new Date(viewStartDate.getTime() + (currentViewDurationMs / numTicks) * i);
      result.push({
        date: tickDate,
        position: calculatePosition(tickDate, viewStartDate, viewEndDate),
        label: format(tickDate, tickLabelFormat),
      });
    }
    return result;
  }, [viewStartDate, viewEndDate, currentViewDurationMs, calculatePosition]);


  if (!cas || cas.length === 0 || !initialViewConfig) {
    return (
        <Card className="shadow-lg w-full bg-primary text-primary-foreground">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                <CardDescription className="text-primary-foreground/80">Visual overview of Certificate Authority expiry dates.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 text-center text-primary-foreground/70">No CA data or initial view not configured.</div>
            </CardContent>
        </Card>
    );
  }

  const nowPosition = calculatePosition(now, viewStartDate, viewEndDate);
  const getStatusStyles = (event: TimelineEvent): { dotClass: string; Icon: React.ElementType } => {
    const expired = isPast(event.date);
    if (event.status === 'revoked') return { dotClass: 'bg-destructive', Icon: XCircle };
    if (expired) return { dotClass: 'bg-orange-500', Icon: AlertCircle };
    return { dotClass: 'bg-green-500', Icon: CheckCircle };
  };

  return (
    <TooltipProvider>
      <Card className="shadow-lg w-full bg-primary text-primary-foreground">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            <CardDescription className="text-primary-foreground/80">Visual overview of Certificate Authority expiry dates. Use buttons to zoom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2 pb-4 px-2 md:px-4">
            <div className="flex justify-end space-x-1 mb-2">
                <Button variant="outline" size="icon" onClick={() => handleZoom(1.5)} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleZoom(0.66)} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
            </div>
            <div className="relative w-full h-[150px] md:h-[200px] overflow-hidden border border-primary-foreground/20 rounded-md bg-primary/80 dark:bg-primary/70 p-4">
                <div className="relative w-full h-12 my-auto"> {/* Timeline centered vertically */}
                    <div className="absolute top-1/2 left-0 w-full h-1.5 bg-primary-foreground/30 rounded-full transform -translate-y-1/2"></div>
                    {nowPosition >= 0 && nowPosition <= 100 && (
                        <div
                            className="absolute top-0 h-full flex flex-col items-center z-10"
                            style={{ left: `${nowPosition}%`, transform: 'translateX(-50%)' }}
                            title={`Now: ${format(now, 'PPpp')}`}
                        >
                            <div className="w-1 h-3 bg-primary-foreground rounded-t-sm"></div>
                            <CalendarClock className="h-5 w-5 text-primary-foreground my-0.5" />
                            <div className="text-xs font-semibold text-primary-foreground whitespace-nowrap mt-0.5">Now</div>
                        </div>
                    )}
                    
                    {ticks.map((tick, index) => (
                        <div
                        key={`tick-${index}`}
                        className="absolute top-1/2 h-full flex flex-col items-center"
                        style={{ left: `${tick.position}%`, transform: 'translateX(-50%)' }}
                        >
                        <div className="w-px h-2.5 bg-primary-foreground/50 -mt-2.5"></div>
                        <div className="text-[10px] text-primary-foreground/80 whitespace-nowrap mt-5 pt-1">{tick.label}</div>
                        </div>
                    ))}

                    {events.map((event) => {
                        const position = calculatePosition(event.date, viewStartDate, viewEndDate);
                        // Render only if within the current view or clamped at edges
                        if (position < 0 || position > 100) { 
                           // Optionally render markers for off-screen items differently or not at all
                           // For now, clamped items will appear at 0% or 100%
                        }
                        const { dotClass, Icon } = getStatusStyles(event);
                        
                        // Basic vertical staggering for overlapping points - could be more sophisticated
                        let yOffset = '-50%'; 
                        const nearbyEvents = events.filter(e => e.id !== event.id && Math.abs(calculatePosition(e.date, viewStartDate, viewEndDate) - position) < 1.5);
                        if (nearbyEvents.length > 0) {
                            const eventIndexAmongNearby = [event, ...nearbyEvents].sort((a,b) => a.date.getTime() - b.date.getTime()).findIndex(e => e.id === event.id);
                            if (eventIndexAmongNearby % 3 === 1) yOffset = '50%';
                            else if (eventIndexAmongNearby % 3 === 2) yOffset = '-150%';
                        }


                        return (
                        <Tooltip key={event.id} delayDuration={100}>
                            <TooltipTrigger asChild>
                            <div
                                className={cn(
                                "absolute top-1/2 w-4 h-4 rounded-full cursor-pointer transform -translate-x-1/2 border-2 border-primary-foreground/50 flex items-center justify-center shadow z-20",
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
                                {(isPast(event.date) && event.status !== 'revoked') ? 'Expired: ' : 'Expires: '} 
                                {format(event.date, 'PPpp')} 
                            </p>
                             <p className="text-xs text-muted-foreground">{formatDistanceToNowStrict(event.date, { addSuffix: true })}</p>
                            </TooltipContent>
                        </Tooltip>
                        );
                    })}
                    </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs mt-2 border-t border-primary-foreground/20 pt-3">
                <div className="flex items-center"><CheckCircle className="w-3 h-3 mr-1.5 text-green-400"/><span className="text-primary-foreground/80">Active</span></div>
                <div className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5 text-orange-400"/><span className="text-primary-foreground/80">Expired</span></div>
                <div className="flex items-center"><XCircle className="w-3 h-3 mr-1.5 text-red-400"/><span className="text-primary-foreground/80">Revoked</span></div>
                <div className="flex items-center"><CalendarClock className="w-3 h-3 mr-1.5 text-primary-foreground"/><span className="text-primary-foreground/80">Current Time</span></div>
            </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

