
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO, isPast, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarClock, AlertCircle, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import {
  ChartContainer,
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
  active: { label: "Active", color: "hsl(142 71% 45%)", icon: CheckCircle }, // Green
  expired: { label: "Expired", color: "hsl(30 80% 55%)", icon: AlertCircle }, // Orange
  revoked: { label: "Revoked", color: "hsl(0 72% 51%)", icon: XCircle },    // Red
  now: { label: "Now", color: "hsl(250 60% 50%)", icon: CalendarClock },      // A distinct purple for "Now"
  timeline: { label: "CA Expiry", color: "hsl(var(--primary))" }
} satisfies ChartConfig;

const MIN_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || !payload.originalCa) return null;

  const { status, date } = payload.originalCa;
  const isEventExpired = isPast(date);

  let ResolvedIcon = chartConfig.active.icon;
  let resolvedColor = chartConfig.active.color;

  if (status === 'revoked') {
    ResolvedIcon = chartConfig.revoked.icon;
    resolvedColor = chartConfig.revoked.color;
  } else if (isEventExpired) {
    ResolvedIcon = chartConfig.expired.icon;
    resolvedColor = chartConfig.expired.color;
  }

  const iconSize = 14;
  return (
    <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
      <ResolvedIcon color={resolvedColor} size={iconSize} />
    </g>
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
  const [viewEndDate, setViewEndDate] = useState<Date>(addMonths(now, 6));

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
    
    if (maxDateOverall.getTime() - minDateOverall.getTime() < MIN_TIMELINE_DURATION_MS) {
        if (minDateOverall > now) {
            maxDateOverall = addMonths(minDateOverall, 1);
        } else if (maxDateOverall < now) {
            minDateOverall = subMonths(maxDateOverall, 1);
        } else {
             minDateOverall = subMonths(now, 1);
             maxDateOverall = addMonths(now,1);
        }
    }
    
    const duration = maxDateOverall.getTime() - minDateOverall.getTime();
    const padding = Math.max(duration * 0.1, MIN_TIMELINE_DURATION_MS / 2); 
    
    const paddedStart = new Date(minDateOverall.getTime() - padding);
    const paddedEnd = new Date(maxDateOverall.getTime() + padding);

    setInitialViewConfig({ start: paddedStart, end: paddedEnd });
    setViewStartDate(paddedStart);
    setViewEndDate(paddedEnd);
    setBrushStartIndex(0);
    setBrushEndIndex(lineChartData.length - 1);

  }, [cas, now, lineChartData]); // Ensure lineChartData itself is a dependency

  const handleBrushChange = (newBrushState: { startIndex?: number; endIndex?: number } | undefined) => {
    if (newBrushState && newBrushState.startIndex != null && newBrushState.endIndex != null && lineChartData.length > 0) {
        const { startIndex, endIndex } = newBrushState;
        if (startIndex === endIndex && lineChartData.length > 1) { 
             const singlePointTime = lineChartData[startIndex].timestamp;
             setViewStartDate(new Date(singlePointTime - MIN_TIMELINE_DURATION_MS / 20));
             setViewEndDate(new Date(singlePointTime + MIN_TIMELINE_DURATION_MS / 20));
        } else if (startIndex < endIndex) {
            const newViewStart = new Date(lineChartData[startIndex].timestamp);
            const newViewEnd = new Date(lineChartData[endIndex].timestamp);

            if (newViewEnd.getTime() - newViewStart.getTime() < MIN_TIMELINE_DURATION_MS / 20) { 
                const mid = newViewStart.getTime() + (newViewEnd.getTime() - newViewStart.getTime()) / 2;
                setViewStartDate(new Date(mid - MIN_TIMELINE_DURATION_MS / 40));
                setViewEndDate(new Date(mid + MIN_TIMELINE_DURATION_MS / 40));
            } else {
                setViewStartDate(newViewStart);
                setViewEndDate(newViewEnd);
            }
        } else { // Handles case where startIndex might be > endIndex or only one point exists
            const singlePointTime = lineChartData[startIndex].timestamp;
            setViewStartDate(new Date(singlePointTime - MIN_TIMELINE_DURATION_MS / 20));
            setViewEndDate(new Date(singlePointTime + MIN_TIMELINE_DURATION_MS / 20));
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
      <Card className="shadow-lg w-full" style={{ backgroundColor: '#ABDBFF' }}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-card-foreground">CA Expiry Timeline</CardTitle>
          <CardDescription className="text-card-foreground/80">Visual overview of Certificate Authority expiry dates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-muted-foreground h-[100px] md:h-[120px] flex items-center justify-center">No CA data or initial view not configured.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg w-full" style={{ backgroundColor: '#ABDBFF' }}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold text-slate-800">CA Expiry Timeline</CardTitle>
            <CardDescription className="text-slate-600">Visual overview of Certificate Authority expiry dates.</CardDescription>
          </div>
          <div className="flex space-x-1">
            <Button variant="outline" size="icon" onClick={handleResetView} title="Reset View" className="bg-white/50 hover:bg-white/70 border-slate-400 text-slate-700">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4 px-2 md:px-4 h-[100px] md:h-[120px]">
        <ChartContainer config={chartConfig} className="w-full h-full">
          <LineChart
            data={lineChartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.2)" vertical={false} />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={[viewStartDate.getTime(), viewEndDate.getTime()]}
              tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
              stroke="hsl(var(--foreground))" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              tickLine={{ stroke: "hsl(var(--foreground))" }}
              axisLine={{ stroke: "hsl(var(--foreground))" }}
              padding={{ left: 10, right: 10 }}
              scale="time"
            />
            <YAxis type="number" dataKey="yValue" hide domain={[0, 1]} />
            <RechartsTooltip 
                content={<CustomTooltipContent />} 
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }} 
            />
            <ReferenceLine
              x={now.getTime()}
              stroke={chartConfig.now.color}
              strokeWidth={2}
              strokeDasharray="4 4"
            >
              <RechartsTooltip.Label
                value={chartConfig.now.label}
                position="insideTopRight"
                fill={chartConfig.now.color}
                fontSize={10}
                dy={-5}
                className="font-semibold"
              />
            </ReferenceLine>
            <Line
              type="step" 
              dataKey="yValue"
              stroke="hsl(var(--primary))" 
              strokeWidth={1.5} 
              dot={<CustomDot />}
              activeDot={{ r: 0 }} 
              isAnimationActive={false}
            />
            {lineChartData.length > 1 && ( 
                <Brush
                dataKey="timestamp"
                height={30}
                stroke="hsl(var(--primary))"
                fill="hsla(var(--primary-hsl), 0.1)"
                travellerWidth={10}
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
                onChange={handleBrushChange}
                tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
                className="text-muted-foreground" 
                >
                <LineChart>
                    <Line type="monotone" dataKey="yValue" stroke="hsl(var(--primary))" dot={false} activeDot={false} />
                </LineChart>
                </Brush>
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs pt-3 border-t border-slate-400/50">
        <div className="flex items-center">
          <chartConfig.active.icon className="w-3 h-3 mr-1.5" style={{ color: chartConfig.active.color }} />
          <span className="text-slate-700">{chartConfig.active.label}</span>
        </div>
        <div className="flex items-center">
          <chartConfig.expired.icon className="w-3 h-3 mr-1.5" style={{ color: chartConfig.expired.color }} />
          <span className="text-slate-700">{chartConfig.expired.label}</span>
        </div>
        <div className="flex items-center">
          <chartConfig.revoked.icon className="w-3 h-3 mr-1.5" style={{ color: chartConfig.revoked.color }} />
          <span className="text-slate-700">{chartConfig.revoked.label}</span>
        </div>
        <div className="flex items-center">
          <chartConfig.now.icon className="w-3 h-3 mr-1.5" style={{ color: chartConfig.now.color }} />
          <span className="text-slate-700">{chartConfig.now.label}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

