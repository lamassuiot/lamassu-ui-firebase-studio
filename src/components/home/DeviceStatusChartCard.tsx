
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface DeviceStats {
    total: number;
    status_distribution: {
        ACTIVE: number;
        DECOMMISSIONED: number;
        EXPIRED: number;
        EXPIRING_SOON: number;
        NO_IDENTITY: number;
        RENEWAL_PENDING: number;
        REVOKED: number;
    };
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const statusConfig: { [key: string]: { label: string; color: string } } = {
  ACTIVE: { label: 'Active', color: 'hsl(var(--chart-2))' }, // Green
  NO_IDENTITY: { label: 'No Identity', color: 'hsl(var(--chart-1))' }, // Blue
  DECOMMISSIONED: { label: 'Decommissioned', color: 'hsl(220 10% 70%)' }, // Gray
  EXPIRING_SOON: { label: 'Expiring Soon', color: 'hsl(var(--chart-3))' }, // Orange
  RENEWAL_PENDING: { label: 'Renewal Pending', color: 'hsl(48 96% 51%)' }, // Yellow
  REVOKED: { label: 'Revoked', color: 'hsl(var(--chart-4))' }, // Red
  EXPIRED: { label: 'Expired', color: 'hsl(var(--chart-5))' }, // Purple/Pink
};


export function DeviceStatusChartCard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [chartData, setChartData] = useState<ChartData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeviceStats = async () => {
      if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://lab.lamassu.io/api/devmanager/v1/stats', {
          headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch device stats. Status: ${response.status}`);
        }
        const data: DeviceStats = await response.json();
        
        const transformedData = Object.entries(data.status_distribution)
          .map(([statusKey, value]) => {
              const config = statusConfig[statusKey] || { label: statusKey, color: '#8884d8' };
              return {
                  name: config.label,
                  value: value,
                  color: config.color,
              };
          })
          .filter(item => item.value > 0); // Only show statuses with devices

        setChartData(transformedData);

      } catch (err: any) {
        setError(err.message || 'Failed to load device status data.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if(!authLoading) {
      fetchDeviceStats();
    }
  }, [user, isAuthenticated, authLoading]);


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, fill, payload, percent, value } = props;
    
    if (percent < 0.05) return null; // Don't render labels for tiny slices

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 0) * cos;
    const sy = cy + (outerRadius + 0) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const labelColor = 'hsl(var(--primary-foreground))';
    const lineColor = 'hsl(var(--primary-foreground))';

    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={lineColor} fill="none" />
        <circle cx={sx} cy={sy} r={2} fill={fill} stroke={lineColor} strokeWidth={1}/>
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} textAnchor={textAnchor} fill={labelColor} dy={'.35em'} className="text-xs font-medium">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
         <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} dy="1.2em" textAnchor={textAnchor} fill={labelColor} className="text-xs opacity-80">
          {`(${value})`}
        </text>
      </g>
    );
  };
  
   const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-popover p-2.5 text-sm text-popover-foreground shadow-md">
          <p className="font-bold">{`${data.name}: ${data.value}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-lg w-full bg-primary text-primary-foreground max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Device Status Overview</CardTitle>
        <CardDescription className="text-primary-foreground/80">A summary of all managed devices by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || authLoading ? (
          <div className="h-[300px] flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-foreground/80" />
            <p className="mt-2 text-sm text-primary-foreground/70">Loading chart data...</p>
          </div>
        ) : error ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <p className="text-destructive-foreground/80 bg-destructive/30 p-3 rounded-md">Error: {error}</p>
          </div>
        ) : chartData && chartData.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius="75%"
                  innerRadius="60%"
                  fill="#8884d8"
                  dataKey="value"
                  stroke={'hsl(var(--primary))'}
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: '20px', color: 'hsl(var(--primary-foreground))' }}
                  formatter={(value, entry) => (
                    <span style={{ color: 'hsl(var(--primary-foreground))' }} className="text-xs">
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-center">
                <p className="text-primary-foreground/80">No device data available to display.</p>
             </div>
        )}
      </CardContent>
    </Card>
  );
}
