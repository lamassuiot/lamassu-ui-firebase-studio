
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Landmark, Cog, HardDrive, BarChart3 } from 'lucide-react';

interface StatItemProps {
  count: number;
  label: string;
  icon: React.ElementType;
}

const StatItem: React.FC<StatItemProps> = ({ count, label, icon: Icon }) => (
  <Card className="bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-2xl font-bold text-primary-foreground">{count}</p>
        <p className="text-sm text-primary-foreground/80">{label}</p>
      </div>
      <BarChart3 className="h-8 w-8 text-primary-foreground/60" />
    </CardContent>
  </Card>
);

export function StatsOverviewCard() {
  const stats = [
    { count: 4, label: 'Certificate Authorities', icon: Landmark },
    { count: 1, label: 'Device Manufacturing Systems', icon: Cog },
    { count: 4, label: 'Devices', icon: HardDrive },
  ];

  return (
    <Card className="bg-primary text-primary-foreground shadow-xl h-full flex flex-col">
      <CardHeader className="pt-6 pb-4">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-primary-foreground/10 rounded-full mb-3">
            <ListChecks className="h-10 w-10 text-primary-foreground" />
          </div>
          <p className="text-5xl font-bold">17</p>
          <p className="text-lg text-primary-foreground/90">Issued Certificates</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow flex flex-col justify-end pb-6">
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} />
        ))}
      </CardContent>
    </Card>
  );
}
