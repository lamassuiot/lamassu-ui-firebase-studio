
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
  type DotProps,
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
  expired: { label: "Expired", color: "hsl(30 80% 55%)", icon: AlertCircle }, // Orange/Yellow
  revoked: { label: "Revoked", color: "hsl(0 72% 51%)", icon: XCircle },   // Red
  now: { label: "Now", color: "hsl(250 60% 50%)", icon: CalendarClock }, // Purple
  timeline: { label: "CA Expiry", color: "hsl(var(--foreground))" }
} satisfies ChartConfig;

const MIN_TIMELINE_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const CustomDot: React.FC<DotProps & { payload?: any }> = (props) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || !payload.originalCa) return null;

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
  const padding = 2;
  const dotContainerSize = iconSize + 2 * padding;

  return (
    <g transform={`translate(${cx - dotContainerSize / 2}, ${cy - dotContainerSize / 2})`}>
      <rect
        x="0"
        y="0"
        width={dotContainerSize}
        height={dotContainerSize}
        fill="white"
        rx="4"
        stroke={resolvedColor}
        strokeWidth="0.5"
      />
      <g transform={`translate(${padding}, ${padding})`}>
        <ResolvedIcon color={resolvedColor} size={iconSize} />
      </g>
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
    if (!cas || cas.length === 0 || lineChartData.length === 0) {
        // Set a default view if no data
        const defaultStart = subMonths(now, 1);
        const defaultEnd = addMonths(now, 3);
        setInitialViewConfig({ start: defaultStart, end: defaultEnd });
        setViewStartDate(defaultStart);
        setViewEndDate(defaultEnd);
        setBrushStartIndex(undefined);
        setBrushEndIndex(undefined);
        return;
    }

    const allEventTimestamps = lineChartData.map(d => d.timestamp);
    allEventTimestamps.push(now.getTime()); 

    let minTimestampOverall = Math.min(...allEventTimestamps);
    let maxTimestampOverall = Math.max(...allEventTimestamps);
    
    if (maxTimestampOverall - minTimestampOverall < MIN_TIMELINE_DURATION_MS) {
        if (minTimestampOverall > now.getTime()) { 
            maxTimestampOverall = addMonths(new Date(minTimestampOverall), 1).getTime();
            minTimestampOverall = subMonths(now, 0).getTime();
        } else if (maxTimestampOverall < now.getTime()) { 
            minTimestampOverall = subMonths(new Date(maxTimestampOverall), 1).getTime();
            maxTimestampOverall = addMonths(now, 0).getTime();
        } else { 
             minTimestampOverall = subMonths(now, 1).getTime();
             maxTimestampOverall = addMonths(now,1).getTime();
        }
    }
    
    const duration = maxTimestampOverall - minTimestampOverall;
    const padding = Math.max(duration * 0.1, MIN_TIMELINE_DURATION_MS / 2); 
    
    const paddedStart = new Date(minTimestampOverall - padding);
    const paddedEnd = new Date(maxTimestampOverall + padding);

    setInitialViewConfig({ start: paddedStart, end: paddedEnd });
    setViewStartDate(paddedStart);
    setViewEndDate(paddedEnd);
    setBrushStartIndex(0);
    setBrushEndIndex(lineChartData.length > 0 ? lineChartData.length - 1 : 0);

  }, [cas, now, lineChartData]);

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
        } else if (lineChartData.length > 0) { 
            const singlePointTime = lineChartData.length > 0 ? lineChartData[startIndex].timestamp : now.getTime();
            setViewStartDate(new Date(singlePointTime - MIN_TIMELINE_DURATION_MS / 20));
            setViewEndDate(new Date(singlePointTime + MIN_TIMELINE_DURATION_MS / 20));
        }
        setBrushStartIndex(startIndex);
        setBrushEndIndex(endIndex);
    } else if (lineChartData.length > 0) { 
        handleResetView();
    }
  };
  
  const handleResetView = () => {
    if (initialViewConfig && lineChartData.length > 0) {
      setViewStartDate(initialViewConfig.start);
      setViewEndDate(initialViewConfig.end);
      setBrushStartIndex(0);
      setBrushEndIndex(lineChartData.length - 1);
    } else if (initialViewConfig) { 
      setViewStartDate(initialViewConfig.start);
      setViewEndDate(initialViewConfig.end);
      setBrushStartIndex(undefined);
      setBrushEndIndex(undefined);
    }
  };

  if (!initialViewConfig) { // Handle the case where initial config isn't set yet (e.g., no CAs)
    return (
      <Card className="shadow-lg w-full" style={{ backgroundColor: '#ABDBFF' }}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-800">CA Expiry Timeline</CardTitle>
          <CardDescription className="text-slate-600">Visual overview of Certificate Authority expiry dates.</CardDescription>
        </CardHeader>
        <CardContent className="pt-2 pb-4 px-2 md:px-4 h-[100px] md:h-[120px]">
          <div className="p-4 text-center text-slate-500 h-full flex items-center justify-center">No CA data to display or initial view not configured.</div>
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
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" vertical={false} />
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
                cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1 }} 
            />
            <ReferenceLine
              x={now.getTime()}
              stroke={chartConfig.now.color}
              strokeWidth={2}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            >
              <RechartsTooltip.Label
                value={chartConfig.now.label}
                position="insideTopRight"
                fill={chartConfig.now.color}
                fontSize={10}
                className="font-semibold"
              />
            </ReferenceLine>
            <Line
              type="step" 
              dataKey="yValue"
              stroke="hsl(var(--foreground))" 
              strokeWidth={1.5} 
              dot={<CustomDot />}
              activeDot={{ r: 0 }} 
              isAnimationActive={false}
            />
            {lineChartData.length > 1 && ( 
                <Brush
                    dataKey="timestamp"
                    height={30}
                    stroke="hsl(var(--foreground))" 
                    fill="rgba(255, 255, 255, 0.3)" 
                    travellerWidth={10}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                    onChange={handleBrushChange}
                    tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM yy')}
                    className="text-slate-700" 
                >
                    <LineChart background={{ fill: 'rgba(255, 255, 255, 0.3)' }}>
                        <Line type="monotone" dataKey="yValue" stroke="hsl(var(--foreground))" dot={false} activeDot={false} />
                    </LineChart>
                </Brush>
            )}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs pt-3 border-t border-slate-400/50">
        <div className="flex items-center">
          <div className="p-0.5 bg-white rounded-full mr-1.5 inline-flex items-center justify-center"><chartConfig.active.icon className="w-3 h-3" style={{ color: chartConfig.active.color }} /></div>
          <span className="text-slate-700">{chartConfig.active.label}</span>
        </div>
        <div className="flex items-center">
          <div className="p-0.5 bg-white rounded-full mr-1.5 inline-flex items-center justify-center"><chartConfig.expired.icon className="w-3 h-3" style={{ color: chartConfig.expired.color }} /></div>
          <span className="text-slate-700">{chartConfig.expired.label}</span>
        </div>
        <div className="flex items-center">
          <div className="p-0.5 bg-white rounded-full mr-1.5 inline-flex items-center justify-center"><chartConfig.revoked.icon className="w-3 h-3" style={{ color: chartConfig.revoked.color }} /></div>
          <span className="text-slate-700">{chartConfig.revoked.label}</span>
        </div>
        <div className="flex items-center">
           <div className="p-0.5 bg-white rounded-full mr-1.5 inline-flex items-center justify-center"><chartConfig.now.icon className="w-3 h-3" style={{ color: chartConfig.now.color }} /></div>
          <span className="text-slate-700">{chartConfig.now.label}</span>
        </div>
      </CardFooter>
    </Card>
  );
};
