
'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Landmark, FileText, Users, Router } from 'lucide-react';
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
  icon: React.ElementType;
}> = ({ value, label, href, isLoading, icon: Icon }) => {
  const router = useRouter();
  return (
    <div
      className="bg-primary/80 hover:bg-primary/90 dark:bg-primary/40 dark:hover:bg-primary/50 transition-colors cursor-pointer p-3 rounded-lg flex items-center space-x-4"
      onClick={() => router.push(href)}
    >
      <div className="p-3 rounded-full bg-primary/90 dark:bg-primary/50">
        <Icon className="h-6 w-6 text-primary-foreground/80" />
      </div>
      <div>
        {isLoading ? (
          <Skeleton className="h-7 w-12 bg-primary/50 mb-1" />
        ) : (
          <p className="text-2xl font-bold">{value ?? '—'}</p>
        )}
        <p className="text-sm text-primary-foreground/90">{label}</p>
      </div>
    </div>
  );
};


export const SummaryStatsCard: React.FC<SummaryStatsCardProps> = ({ stats, isLoading }) => {

  return (
    <Card className="shadow-lg w-full bg-primary text-primary-foreground p-4 flex flex-col justify-between h-full">
      <StatItem
        value={stats.certificates}
        label="Issued Certificates"
        href="/certificates"
        isLoading={isLoading}
        icon={FileText}
      />
      <StatItem
        value={stats.cas}
        label="Certificate Authorities"
        href="/certificate-authorities"
        isLoading={isLoading}
        icon={Landmark}
      />
      <StatItem
        value={stats.ras}
        label="Registration Authorities"
        href="/registration-authorities"
        isLoading={isLoading}
        icon={Users}
      />
      <StatItem
        value={stats.devices}
        label="Managed Devices"
        href="/devices"
        isLoading={isLoading}
        icon={Router}
      />
    </Card>
  );
};
