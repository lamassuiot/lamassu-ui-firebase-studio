'use client';

import React from 'react';
import { ResponsiveContainer, RadialBarChart, PolarAngleAxis, RadialBar } from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CaStats {
  ACTIVE: number;
  EXPIRED: number;
  REVOKED: number;
}

const StatCircle = ({ percentage, label, color, value }: { percentage: number; label: string; color: string; value: number }) => {
  const data = [{ name: label, value: percentage, fill: color }];

  return (
    <div className="flex flex-col items-center gap-1 w-28 sm:w-32 text-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="75%"
            outerRadius="100%"
            barSize={8}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'hsl(var(--muted))' }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={4}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-lg sm:text-xl font-bold text-foreground">{`${Math.round(percentage)}%`}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-muted-foreground tracking-wide">{label}</p>
      <p className="text-xs text-muted-foreground">({value})</p>
    </div>
  );
};


interface CaStatsDisplayProps {
  stats: CaStats | null;
  isLoading: boolean;
  error: string | null;
}

export const CaStatsDisplay: React.FC<CaStatsDisplayProps> = ({ stats, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-36 w-full bg-muted/30 rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="h-36">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Stats</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!stats) {
    return null; // Or some placeholder
  }

  const total = stats.ACTIVE + stats.EXPIRED + stats.REVOKED;
  const activePercent = total > 0 ? (stats.ACTIVE / total) * 100 : 0;
  const expiredPercent = total > 0 ? (stats.EXPIRED / total) * 100 : 0;
  const revokedPercent = total > 0 ? (stats.REVOKED / total) * 100 : 0;
  
  return (
    <div className="flex flex-row justify-center items-center p-0 gap-4 w-full">
        <StatCircle percentage={activePercent} label="ACTIVE" color="hsl(var(--chart-2))" value={stats.ACTIVE} />
        <StatCircle percentage={expiredPercent} label="EXPIRED" color="hsl(var(--chart-3))" value={stats.EXPIRED} />
        <StatCircle percentage={revokedPercent} label="REVOKED" color="hsl(var(--chart-4))" value={stats.REVOKED} />
    </div>
  );
}
