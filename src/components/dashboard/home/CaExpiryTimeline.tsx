
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isPast, addMonths, subMonths, differenceInMilliseconds } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react'; // Removed ZoomIn, ZoomOut
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
  Brush, // Added Brush
} from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent as ShadcnChartTooltipContent, // Renamed to avoid conflict
  type ChartConfig
} from "@/components/ui/chart";

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

const chartConfig = {
  active: { label: "Active", color: "hsl(142 71% 45%)", icon: CheckCircle }, // Explicit green
  expired: { label: "Expired", color: "hsl(30 80% 55%)", icon: AlertCircle }, // Orangish
  revoked: { label: "Revoked", color: "hsl(0 72% 51%)", icon: XCircle }, // Reddish
  now: { label: "Now", color: "hsl(var(--accent))", icon: CalendarClock }, // Use accent for "Now" line
  timeline: { label: "CA Expiry", color: "hsl(var(--primary-foreground)/0.7)" }
} satisfies ChartConfig;

const MIN_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const MAX_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 365 * 20; // 20 years

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || !payload.originalCa) return null;

  const { status, date } = payload.originalCa;
  let dotFill = chartConfig.active.color;
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
      stroke="hsl(var(--primary))" // Use card background for stroke for contrast
      strokeWidth={1.5}
    />
  );
};

const CustomTooltipContent = (props: any) => {
  const { active, payload } = props;
  if (active && payload && payload.length) {
    const data = payload[0].payload;
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
  const [viewEndDate, setViewEndDate] = useState<Date>(addMonths(now, 6)); // Default to 6 months view

  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);

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
      yValue: 0.5,
      originalCa: event,
    }));
  }, [events]);

  useEffect(() => {
    if (!cas || cas.length === 0 || lineChartData.length === 0) return;

    const allDates = lineChartData.map(d => new Date(d.timestamp));
    allDates.push(now);

    let minDateOverall = new Date(Math.min(...allDates.map(d => d.getTime())));
    let maxDateOverall = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Ensure the range covers at least a sensible default, e.g., 1 month or includes 'now'
    if (maxDateOverall.getTime() - minDateOverall.getTime() < MIN_TIMELINE_DURATION_MS) {
        if (minDateOverall > now) { // All future dates
            maxDateOverall = addMonths(minDateOverall, 1);
        } else if (maxDateOverall < now) { // All past dates
            minDateOverall = subMonths(maxDateOverall, 1);
        } else { // Range is too small but 'now' is within
             minDateOverall = subMonths(now, 1);
             maxDateOverall = addMonths(now,1);
        }
    }
    
    // Add padding
    const duration = maxDateOverall.getTime() - minDateOverall.getTime();
    const padding = Math.max(duration * 0.1, MIN_TIMELINE_DURATION_MS / 2); // 10% padding or min half week
    
    const paddedStart = new Date(minDateOverall.getTime() - padding);
    const paddedEnd = new Date(maxDateOverall.getTime() + padding);

    setInitialViewConfig({ start: paddedStart, end: paddedEnd });
    setViewStartDate(paddedStart);
    setViewEndDate(paddedEnd);
    setBrushStartIndex(0);
    setBrushEndIndex(lineChartData.length - 1);

  }, [cas, now, lineChartData.length]); // Added lineChartData.length to re-init brush indices

  const handleBrushChange = (newBrushState: { startIndex?: number; endIndex?: number } | undefined) => {
    if (newBrushState && newBrushState.startIndex != null && newBrushState.endIndex != null && lineChartData.length > 0) {
        const { startIndex, endIndex } = newBrushState;
        if (startIndex === endIndex) return; // Avoid zooming into a single point

        const newViewStart = new Date(lineChartData[startIndex].timestamp);
        const newViewEnd = new Date(lineChartData[endIndex].timestamp);

        // Ensure a minimum duration for the view to prevent over-zooming
        if (newViewEnd.getTime() - newViewStart.getTime() < MIN_TIMELINE_DURATION_MS / 10) { // 1/10th of min duration
            const mid = newViewStart.getTime() + (newViewEnd.getTime() - newViewStart.getTime()) / 2;
            setViewStartDate(new Date(mid - MIN_TIMELINE_DURATION_MS / 20));
            setViewEndDate(new Date(mid + MIN_TIMELINE_DURATION_MS / 20));
        } else {
            setViewStartDate(newViewStart);
            setViewEndDate(newViewEnd);
        }
        setBrushStartIndex(startIndex);
        setBrushEndIndex(endIndex);
    }
  };
  
  const handleResetView = () => {
    if (initialViewConfig && lineChartData.length > 0) {
      setViewStartDate(initialViewConfig.start);
      setViewEndDate(initialViewConfig.end);
      setBrushStartIndex(0);
      setBrushEndIndex(lineChartData.length - 1);
    }
  };

  if (!cas || cas.length === 0 || !initialViewConfig || lineChartData.length === 0) {
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
            <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View" className="bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-2 md:px-4 h-[300px] md:h-[350px]"> {/* Increased height for Brush */}
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
            <YAxis type="number" dataKey="yValue" hide domain={[0, 1]} />
            <RechartsTooltip content={<CustomTooltipContent />} cursor={{ stroke: 'hsl(var(--primary-foreground)/0.5)', strokeWidth: 1 }} />
            <ReferenceLine
              x={now.getTime()}
              stroke={chartConfig.now.color}
              strokeWidth={2}
              strokeDasharray="4 4"
            >
              <RechartsTooltip.Label
                value="Now"
                position="insideTopRight"
                fill={chartConfig.now.color}
                fontSize={10}
                dy={-5}
              />
            </ReferenceLine>
            <Line
              type="step" // Using step to make dots distinct
              dataKey="yValue"
              stroke={chartConfig.timeline.color}
              strokeWidth={0.5}
              dot={<CustomDot />}
              activeDot={{ r: 8, strokeWidth: 2, stroke: 'hsl(var(--primary))' }}
              isAnimationActive={false}
            />
            <Brush
              dataKey="timestamp"
              height={30}
              stroke="hsl(var(--accent))" // Brush outline color
              fill="hsl(var(--accent)/0.2)" // Brush selection area color
              travellerWidth={10}
              startIndex={brushStartIndex}
              endIndex={brushEndIndex}
              onChange={handleBrushChange}
              tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
              className="text-primary-foreground/70"
            >
              {/* Customize the Brush chart if needed, e.g., a simpler line */}
              <LineChart>
                 <Line type="monotone" dataKey="yValue" stroke={chartConfig.timeline.color} dot={false} activeDot={false} />
              </LineChart>
            </Brush>
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs pt-3 border-t border-primary-foreground/20">
        <div className="flex items-center"><CheckCircle className="w-3 h-3 mr-1.5" style={{ color: chartConfig.active.color }} /><span className="text-primary-foreground/80">Active</span></div>
        <div className="flex items-center"><AlertCircle className="w-3 h-3 mr-1.5" style={{ color: chartConfig.expired.color }} /><span className="text-primary-foreground/80">Expired</span></div>
        <div className="flex items-center"><XCircle className="w-3 h-3 mr-1.5" style={{ color: chartConfig.revoked.color }} /><span className="text-primary-foreground/80">Revoked</span></div>
        <div className="flex items-center"><CalendarClock className="w-3 h-3 mr-1.5" style={{ color: chartConfig.now.color }} /><span className="text-primary-foreground/80">Current Time</span></div>
      </CardFooter>
    </Card>
  );
};

