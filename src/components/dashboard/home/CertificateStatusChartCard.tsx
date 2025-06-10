
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
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
    'hsl(var(--chart-5))': '#f43f5e', // rose-500 for Expired
    'hsl(var(--destructive))': '#dc2626', // red-600 for Revoked
    'hsl(var(--chart-4))': '#3b82f6', // blue-500 (example for a chart-4 if it was used)
};


export function CertificateStatusChartCard() {
  const { resolvedTheme } = useTheme();

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't render label for very small slices

    return (
      <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };


  return (
    <Card className="shadow-lg w-full bg-primary text-primary-foreground max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Certificate Status Overview</CardTitle>
        <CardDescription className="text-primary-foreground/80">A summary of all managed certificates by their current status.</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={certificateStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius="80%"
                innerRadius="70%"
                fill="#8884d8"
                dataKey="value"
                stroke={'hsl(var(--primary))'} 
                strokeWidth={2}
              >
                {certificateStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={fallbackColors[entry.color as keyof typeof fallbackColors] || entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                    backgroundColor: resolvedTheme === 'dark' ? 'hsl(var(--popover))' : 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: 'var(--radius)',
                    color: 'hsl(var(--popover-foreground))'
                }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

