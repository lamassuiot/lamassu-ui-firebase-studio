
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInMilliseconds, isPast, addMonths, addYears, formatDistanceToNowStrict } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

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
    return (
        <Card className="shadow-lg w-full bg-sky-50 dark:bg-sky-900/30">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                <CardDescription>Visual overview of Certificate Authority expiry dates.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 text-center text-muted-foreground">No CA data to display.</div>
            </CardContent>
        </Card>
    );
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
  if (events.every(e => isPast(e.date) && e.status !== 'revoked')) { 
    timelineStart = earliestEventDate;
  }
  timelineStart = addMonths(timelineStart, -1); 

  let timelineEnd = latestEventDate > now ? latestEventDate : addMonths(now, 6);
  timelineEnd = addMonths(timelineEnd, 1); 


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
    return { dotClass: 'bg-green-500', Icon: CheckCircle };
  };

  const ticks = [];
  const numTicks = Math.min(Math.max(Math.floor(differenceInMilliseconds(timelineEnd, timelineStart) / (1000 * 60 * 60 * 24 * 30 * 2)), 3), 7);

  for (let i = 0; i <= numTicks; i++) {
    const tickDate = new Date(timelineStart.getTime() + (totalDuration / numTicks) * i);
    ticks.push({
      date: tickDate,
      position: calculatePosition(tickDate),
      label: format(tickDate, Math.abs(differenceInMilliseconds(timelineEnd, timelineStart)) > (1000 * 60 * 60 * 24 * 365 * 2) ? 'MMM yyyy' : 'MMM dd'),
    });
  }


  return (
    <TooltipProvider>
      <Card className="shadow-lg w-full bg-sky-50 dark:bg-sky-900/30">
        <CardHeader>
            <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
            <CardDescription>Visual overview of Certificate Authority expiry dates. You can pan and zoom.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 pb-4 px-2 md:px-4">
            <div className="relative w-full h-[200px] md:h-[250px] overflow-hidden border rounded-md bg-background dark:bg-muted/30">
                <TransformWrapper 
                    initialScale={1} 
                    minScale={0.3} 
                    maxScale={5}
                    centerOnInit
                    limitToBounds={false}
                >
                    {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                    <>
                        <div className="absolute top-2 right-2 z-20 space-x-1">
                            <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
                        </div>
                        <TransformComponent
                            wrapperStyle={{ width: '100%', height: '100%' }}
                            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
                        >
                            <div className="relative w-full h-12 my-auto"> {/* Timeline centered vertically */}
                                <div className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full transform -translate-y-1/2"></div>
                                <div
                                    className="absolute top-0 h-full flex flex-col items-center z-10"
                                    style={{ left: `${nowPosition}%`, transform: 'translateX(-50%)' }}
                                >
                                    <div className="w-1 h-3 bg-primary rounded-t-sm"></div>
                                    <CalendarClock className="h-5 w-5 text-primary my-0.5" />
                                    <div className="text-xs font-semibold text-primary whitespace-nowrap mt-0.5">Now</div>
                                </div>
                                
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

                                {events.map((event) => {
                                    const position = calculatePosition(event.date);
                                    const { dotClass, Icon } = getStatusStyles(event);
                                    let yOffset = '-50%';
                                    if (Math.abs(position - nowPosition) < 2 && event.date.getTime() !== now.getTime()) {
                                        yOffset = event.date > now ? '-150%' : '50%';
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
                        </TransformComponent>
                    </>
                    )}
                </TransformWrapper>
            </div>
            
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs mt-2 border-t border-border pt-3">
                <div className="flex items-center"><CheckCircle className="w-3 h-3 mr-1.5 text-green-500"/><span className="text-muted-foreground">Active</span></div>
                <div className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5 text-orange-500"/><span className="text-muted-foreground">Expired</span></div>
                <div className="flex items-center"><XCircle className="w-3 h-3 mr-1.5 text-destructive"/><span className="text-muted-foreground">Revoked</span></div>
                <div className="flex items-center"><CalendarClock className="w-3 h-3 mr-1.5 text-primary"/><span className="text-muted-foreground">Current Time</span></div>
            </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

