
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Sector } from 'recharts';
import { useTheme } from 'next-themes';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

const certificateStatusData: ChartData[] = [
  { name: 'Active', value: 70, color: 'rgb(34, 197, 94)' }, 
  { name: 'About to expire', value: 15, color: 'hsl(var(--chart-3))' }, 
  { name: 'Expired', value: 10, color: 'hsl(var(--chart-5))' }, 
  { name: 'Revoked', value: 5, color: 'hsl(var(--destructive))' }, 
];

const fallbackColors = {
    'hsl(var(--chart-3))': 'hsl(30 80% 55%)', 
    'hsl(var(--chart-5))': 'hsl(340 75% 55%)', 
    'hsl(var(--destructive))': 'hsl(0 72% 51%)', 
};


export function CertificateStatusChartCard() {
  const { resolvedTheme } = useTheme();

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, startAngle, endAngle, fill, payload, percent, value, name } = props;
    
    if (percent < 0.03) return null; // Don't render label for very small slices

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 0) * cos; // Start line slightly inside the outer edge
    const sy = cy + (outerRadius + 0) * sin;
    const mx = cx + (outerRadius + 20) * cos; // Mid-point for the first line segment
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22; // End-point for the horizontal line
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const labelColor = 'hsl(var(--primary-foreground))';
    const lineColor = 'hsl(var(--primary-foreground))';


    return (
      <g>
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={lineColor} fill="none" />
        <circle cx={sx} cy={sy} r={2} fill={fill} stroke={lineColor} strokeWidth={1}/>
        <text x={ex + (cos >= 0 ? 1 : -1) * 6} y={ey} textAnchor={textAnchor} fill={labelColor} dy={'.35em'} className="text-xs font-medium">
          {`${(percent * 100).toFixed(0)}% (${value})`}
        </text>
      </g>
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
                outerRadius="75%" 
                innerRadius="60%" 
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

