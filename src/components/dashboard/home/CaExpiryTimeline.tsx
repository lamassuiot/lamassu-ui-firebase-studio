
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isPast, addMonths, addYears, subMonths, differenceInMilliseconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"; // Shadcn chart components

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

// Chart configuration for colors and labels
const chartConfig = {
  active: { label: "Active", color: "hsl(var(--chart-1))", icon: CheckCircle }, // Greenish
  expired: { label: "Expired", color: "hsl(var(--chart-3))", icon: AlertCircle }, // Orangish/Yellowish
  revoked: { label: "Revoked", color: "hsl(var(--destructive))", icon: XCircle }, // Reddish
  now: { label: "Now", color: "hsl(var(--primary-foreground))", icon: CalendarClock},
  timeline: { label: "CA Expiry", color: "hsl(var(--primary-foreground))" } // For the line itself, if visible
} satisfies ChartConfig;


const MIN_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 20; // 20 years

// Custom Dot for the Line Chart
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || !payload.originalCa) return null;

  const { status, date } = payload.originalCa; // Accessing through originalCa
  
  let dotFill = chartConfig.active.color; // Default to active
  const isEventExpired = isPast(date);

  if (status === 'revoked') {
    dotFill = chartConfig.revoked.color;
  } else if (isEventExpired) {
    dotFill = chartConfig.expired.color;
  }

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={6}
      fill={dotFill}
      stroke="hsl(var(--background))" 
      strokeWidth={1.5}
    />
  );
};


// Custom Tooltip for the Line Chart
const CustomTooltipContent = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload; // The original data point
    if (!data || !data.originalCa) return null;

    const { name, date, status } = data.originalCa;
    const isEventExpired = isPast(date);
    let statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
    if (status !== 'revoked' && isEventExpired) {
      statusDisplay = "Expired";
    }
    
    return (
      <div className="rounded-lg border bg-popover p-2.5 text-popover-foreground shadow-md">
        <p className="font-semibold text-sm">{name}</p>
        <p className="text-xs">
          Status: <span className="capitalize">{statusDisplay}</span>
        </p>
        <p className="text-xs">
          {(status !== 'revoked' && isEventExpired) ? 'Expired: ' : 'Expires: '}
          {format(date, 'PPpp')}
        </p>
      </div>
    );
  }
  return null;
};


export const CaExpiryTimeline: React.FC<CaExpiryTimelineProps> = ({ cas }) => {
  const [now] = useState(new Date()); 
  const [initialViewConfig, setInitialViewConfig] = useState<{ start: Date, end: Date } | null>(null);
  const [viewStartDate, setViewStartDate] = useState<Date>(now);
  const [viewEndDate, setViewEndDate] = useState<Date>(addYears(now, 1));

  useEffect(() => {
    if (!cas || cas.length === 0) return;

    const allDates = cas.map(ca => parseISO(ca.expires));
    allDates.push(now); 

    let minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    let maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    if (maxDate < now && cas.every(ca => isPast(parseISO(ca.expires)))) {
        minDate = new Date(Math.min(...cas.map(ca => parseISO(ca.expires).getTime())));
        maxDate = new Date(Math.max(...cas.map(ca => parseISO(ca.expires).getTime())));
    } else {
        minDate = minDate < now ? minDate : now;
        maxDate = maxDate > now ? maxDate : now;
    }

    const paddedStart = subMonths(minDate, Math.max(1, Math.floor(differenceInMilliseconds(maxDate, minDate) / (MIN_TIMELINE_DURATION_MS * 4) )) ); // Pad based on duration
    const paddedEnd = addMonths(maxDate, Math.max(1, Math.floor(differenceInMilliseconds(maxDate, minDate) / (MIN_TIMELINE_DURATION_MS * 4) )) );


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

  const lineChartData = useMemo(() => {
    return events.map(event => ({
        timestamp: event.date.getTime(),
        yValue: 0.5, // Constant Y value for a flat line of dots
        originalCa: event, // Pass full event data for dot/tooltip
    }));
  }, [events]);


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
  
  if (!cas || cas.length === 0 || !initialViewConfig) {
    return (
        <Card className="shadow-lg w-full bg-primary text-primary-foreground">
            <CardHeader>
                <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                <CardDescription className="text-primary-foreground/80">Visual overview of Certificate Authority expiry dates.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="p-4 text-center text-primary-foreground/70 h-[200px] flex items-center justify-center">No CA data or initial view not configured.</div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="shadow-lg w-full bg-primary text-primary-foreground">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle className="text-xl font-semibold">CA Expiry Timeline</CardTitle>
                <CardDescription className="text-primary-foreground/80">Visual overview of Certificate Authority expiry dates.</CardDescription>
            </div>
            <div className="flex space-x-1">
                <Button variant="outline" size="icon" onClick={() => handleZoom(1.5)} title="Zoom Out" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => handleZoom(0.66)} title="Zoom In" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"><RotateCcw className="h-4 w-4" /></Button>
            </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-2 md:px-4 h-[250px] md:h-[300px]">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <LineChart
            data={lineChartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary-foreground)/0.2)" vertical={false} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={[viewStartDate.getTime(), viewEndDate.getTime()]}
              tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
              stroke="hsl(var(--primary-foreground)/0.7)"
              tickLine={{ stroke: "hsl(var(--primary-foreground)/0.7)" }}
              axisLine={{ stroke: "hsl(var(--primary-foreground)/0.7)" }}
              padding={{ left: 10, right: 10 }}
              scale="time"
            />
            <YAxis type="number" dataKey="yValue" hide domain={[0,1]} />
            <RechartsTooltip content={<CustomTooltipContent />} cursor={{ stroke: 'hsl(var(--primary-foreground)/0.5)', strokeWidth: 1 }} />
            <ReferenceLine
              x={now.getTime()}
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              strokeDasharray="4 4"
            >
              <RechartsTooltip.Label
                value="Now"
                position="insideTopRight"
                fill="hsl(var(--accent))"
                fontSize={10}
                dy={-5} 
              />
            </ReferenceLine>
            <Line
              type="monotone" // or step, linear etc.
              dataKey="yValue" // This line itself is not the primary info carrier
              stroke={chartConfig.timeline.color} // Barely visible or transparent line
              strokeWidth={0.5} // Make it very thin or 0
              dot={<CustomDot />}
              activeDot={{ r: 8, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs pt-3 border-t border-primary-foreground/20">
        <div className="flex items-center"><CheckCircle className="w-3 h-3 mr-1.5" style={{color: chartConfig.active.color}}/><span className="text-primary-foreground/80">Active</span></div>
        <div className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5" style={{color: chartConfig.expired.color}}/><span className="text-primary-foreground/80">Expired</span></div>
        <div className="flex items-center"><XCircle className="w-3 h-3 mr-1.5" style={{color: chartConfig.revoked.color}}/><span className="text-primary-foreground/80">Revoked</span></div>
        <div className="flex items-center"><CalendarClock className="w-3 h-3 mr-1.5" style={{color: chartConfig.now.color}}/><span className="text-primary-foreground/80">Current Time</span></div>
      </CardFooter>
    </Card>
  );
};

