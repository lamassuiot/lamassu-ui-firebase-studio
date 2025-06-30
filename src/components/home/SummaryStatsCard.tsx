
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Landmark, FileText, Users, Router, BarChartHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface SummaryStats {
  certificates: number | null;
  cas: number | null;
  ras: number | null;
  devices: number | null;
}

interface SummaryStatsCardProps {
  stats: SummaryStats;
  isLoading: boolean;
}

const StatItem: React.FC<{
  value: number | null;
  label: string;
  href: string;
  isLoading: boolean;
}> = ({ value, label, href, isLoading }) => {
  const router = useRouter();
  return (
    <div
      className="bg-primary/80 hover:bg-primary/90 dark:bg-primary/40 dark:hover:bg-primary/50 transition-colors cursor-pointer p-4 rounded-lg flex justify-between items-center"
      onClick={() => router.push(href)}
    >
      <div>
        {isLoading ? (
          <Skeleton className="h-8 w-12 bg-primary/50" />
        ) : (
          <p className="text-3xl font-bold">{value ?? '-'}</p>
        )}
        <p className="text-sm text-primary-foreground/90">{label}</p>
      </div>
      <div className="p-3 rounded-full bg-primary/90 dark:bg-primary/50">
          <BarChartHorizontal className="h-5 w-5 text-primary-foreground/80" />
      </div>
    </div>
  );
};

export const SummaryStatsCard: React.FC<SummaryStatsCardProps> = ({ stats, isLoading }) => {
  const router = useRouter();

  return (
    <Card className="shadow-lg w-full bg-primary text-primary-foreground p-6 flex flex-col gap-6">
      <div
        className="text-center flex-grow flex flex-col items-center justify-center cursor-pointer group"
        onClick={() => router.push('/certificates')}
      >
        <div className="p-4 rounded-full bg-primary/80 dark:bg-primary/40 mb-4 group-hover:bg-primary/90 transition-colors">
          <FileText className="h-8 w-8 text-primary-foreground" />
        </div>
        {isLoading ? (
          <Skeleton className="h-12 w-24 bg-primary/50 mb-2" />
        ) : (
          <p className="text-6xl font-bold">{stats.certificates ?? '-'}</p>
        )}
        <p className="text-lg">Issued Certificates</p>
      </div>

      <div className="space-y-3">
        <StatItem
          value={stats.cas}
          label="Certificate Authorities"
          href="/certificate-authorities"
          isLoading={isLoading}
        />
        <StatItem
          value={stats.ras}
          label="Registration Authorities"
          href="/registration-authorities"
          isLoading={isLoading}
        />
        <StatItem
          value={stats.devices}
          label="Managed Devices"
          href="/devices"
          isLoading={isLoading}
        />
      </div>
    </Card>
  );
};
