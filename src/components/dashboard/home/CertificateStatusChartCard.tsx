
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useTheme } from 'next-themes'; 

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const certificateStatusData: ChartData[] = [
  { name: 'Active', value: 70, color: 'hsl(var(--chart-2))' },
  { name: 'About to expire', value: 15, color: 'hsl(var(--chart-3))' },
  { name: 'Expired', value: 10, color: 'hsl(var(--chart-5))' },
  { name: 'Revoked', value: 5, color: 'hsl(var(--destructive))' },
];

// Fallback colors for recharts if CSS variables are not directly picked up by SVG elements
const fallbackColors = {
    'hsl(var(--chart-2))': '#84cc16', // lime-500 for Active
    'hsl(var(--chart-3))': '#f97316', // orange-500 for About to expire
    'hsl(var(--chart-5))': '#f43f5e', // rose-500 for Expired (was chart-5 -> pink/red)
    'hsl(var(--destructive))': '#dc2626', // red-600 for Revoked
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
    <Card className="shadow-lg w-full bg-secondary">
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
                innerRadius="60%" 
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

