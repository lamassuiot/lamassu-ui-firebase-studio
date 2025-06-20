
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { useTheme } from 'next-themes';
import { Loader2, CheckCircle, AlertTriangle as AlertTriangleIcon, XCircle, Clock, Circle } from 'lucide-react'; // Added Clock and Circle for legend

interface ChartData {
  name: string;
  value: number;
  color: string;
}

// Initial static data, will be "fetched"
const initialCertificateStatusData: ChartData[] = [
  { name: 'Active', value: 70, color: 'rgb(34, 197, 94)' }, // Green
  { name: 'About to expire', value: 15, color: 'hsl(30 80% 55%)' }, // Orange/Yellow (from resolved theme chart-3)
  { name: 'Expired', value: 10, color: 'hsl(340 75% 55%)' }, // Purple/Pink (from resolved theme chart-5)
  { name: 'Revoked', value: 5, color: 'hsl(0 72% 51%)' },  // Red (from resolved theme destructive)
];


export function CertificateStatusChartCard() {
  const { resolvedTheme } = useTheme();
  const [chartData, setChartData] = useState<ChartData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Resolve CSS variables to actual HSL/RGB strings if they were used
        const resolvedData = initialCertificateStatusData.map(item => {
            let resolvedColor = item.color;
            if (item.color.startsWith('hsl(var(--')) {
                // Basic resolver for demo. A more robust one would parse the CSS var from the theme.
                if (item.name === 'About to expire') resolvedColor = 'hsl(30 80% 55%)'; // chart-3
                else if (item.name === 'Expired') resolvedColor = 'hsl(340 75% 55%)'; // chart-5
                else if (item.name === 'Revoked') resolvedColor = 'hsl(0 72% 51%)'; // destructive
            }
            return { ...item, color: resolvedColor };
        });
        setChartData(resolvedData);

      } catch (err) {
        console.error("Failed to fetch chart data:", err);
        setError('Failed to load certificate status data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);


  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, fill, payload, percent, value } = props;
    
    if (percent < 0.03) return null;

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
        {isLoading && (
          <div className="h-[300px] flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-foreground/80" />
            <p className="mt-2 text-sm text-primary-foreground/70">Loading chart data...</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <p className="text-destructive-foreground/80 bg-destructive/30 p-3 rounded-md">Error: {error}</p>
          </div>
        )}
        {!isLoading && !error && chartData && (
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
                  formatter={(value, entry, index) => {
                    let IconComponent: React.ElementType = Circle;
                    let iconColorStyle = entry.color; 

                    if (value === 'Active') {
                        IconComponent = CheckCircle;
                        iconColorStyle = 'rgb(34, 197, 94)';
                    } else if (value === 'About to expire') {
                        IconComponent = Clock;
                        iconColorStyle = 'hsl(30 80% 55%)';
                    } else if (value === 'Expired') {
                        IconComponent = AlertTriangleIcon;
                        iconColorStyle = 'hsl(340 75% 55%)';
                    } else if (value === 'Revoked') {
                        IconComponent = XCircle;
                        iconColorStyle = 'hsl(0 72% 51%)';
                    }
                
                    return (
                      <span style={{ color: 'hsl(var(--primary-foreground))' }} className="flex items-center text-xs">
                        <div className="p-0.5 bg-white rounded-full mr-1.5 inline-flex items-center justify-center">
                          <IconComponent className="w-3 h-3" style={{ color: iconColorStyle }} />
                        </div>
                        {value}
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
