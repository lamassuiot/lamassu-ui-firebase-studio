
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
  { name: 'Active', value: 70, color: 'rgb(34, 197, 94)' }, // Updated color
  { name: 'About to expire', value: 15, color: 'hsl(var(--chart-3))' }, // Orange/Amber
  { name: 'Expired', value: 10, color: 'hsl(var(--chart-5))' }, // Reddish/Pinkish
  { name: 'Revoked', value: 5, color: 'hsl(var(--destructive))' }, // Destructive Red
];

// Fallback colors for recharts if CSS variables are not directly picked up by SVG elements
const fallbackColors = {
    // Note: 'rgb(34, 197, 94)' for Active will be used directly as it's not a CSS var key.
    'hsl(var(--chart-3))': 'hsl(30 80% 55%)', // orange
    'hsl(var(--chart-5))': 'hsl(340 75% 55%)', // pinkish-red
    'hsl(var(--destructive))': 'hsl(0 72% 51%)', // destructive red
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
        {`${(percent * 100).toFixed(0)}%`}
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
              <Legend 
                verticalAlign="bottom" 
                wrapperStyle={{ paddingTop: '20px', color: 'hsl(var(--primary-foreground))' }}
                formatter={(value, entry) => <span style={{ color: 'hsl(var(--primary-foreground))' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
