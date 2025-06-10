
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useTheme } from 'next-themes'; // To get theme for colors if needed, but we'll use HSL vars

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const certificateStatusData: ChartData[] = [
  { name: 'Verified', value: 50, color: 'hsl(var(--chart-2))' }, // Greenish
  { name: 'Expired', value: 10, color: 'hsl(var(--chart-3))' }, // Orange
  { name: 'Revoked', value: 5, color: 'hsl(var(--chart-5))' }, // Pink/Red
  { name: 'Pending', value: 8, color: 'hsl(var(--chart-4))' }, // Changed from yellow-500 to chart-4 (purple-ish)
  { name: 'Unverified', value: 20, color: 'hsl(var(--muted-foreground))' }, // Muted
  { name: 'Error/Invalid', value: 2, color: 'hsl(var(--destructive))' }, // Destructive
];

// Fallback colors for recharts if CSS variables are not directly picked up by SVG elements
const fallbackColors = {
    'hsl(var(--chart-2))': '#84cc16', // lime-500
    'hsl(var(--chart-3))': '#f97316', // orange-500
    'hsl(var(--chart-5))': '#ef4444', // red-500
    'hsl(var(--chart-4))': '#9333ea', // purple-600 (example for chart-4)
    'hsl(var(--muted-foreground))': '#71717a', // zinc-500
    'hsl(var(--destructive))': '#dc2626', // red-600
};


export function CertificateStatusChartCard() {
  const { resolvedTheme } = useTheme();
  
  // Custom legend renderer
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-sm">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <span style={{ backgroundColor: entry.color, width: '10px', height: '10px', marginRight: '5px', borderRadius: '50%', display: 'inline-block' }}></span>
            {entry.value} ({entry.payload.value})
          </li>
        ))}
      </ul>
    );
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render label for very small slices

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Certificate Status Overview</CardTitle>
        <CardDescription>A summary of all managed certificates by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={certificateStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius="80%"
                innerRadius="50%" 
                fill="#8884d8"
                dataKey="value"
                stroke={resolvedTheme === 'dark' ? 'hsl(var(--background))' : '#fff'} // Border for slices
                strokeWidth={2}
              >
                {certificateStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fallbackColors[entry.color as keyof typeof fallbackColors] || entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ 
                    backgroundColor: resolvedTheme === 'dark' ? 'hsl(var(--popover))' : '#ffffff',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)' 
                }}
                itemStyle={{ color: resolvedTheme === 'dark' ? 'hsl(var(--popover-foreground))' : '#000000' }}
              />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
