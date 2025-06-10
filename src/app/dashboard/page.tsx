
'use client';

import React from 'react';
import { StatsOverviewCard } from '@/components/dashboard/home/StatsOverviewCard';
import { CryptoEngineCard } from '@/components/dashboard/home/CryptoEngineCard';
import { DeviceProvisioningCard } from '@/components/dashboard/home/DeviceProvisioningCard';

export default function DashboardHomePage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 md:col-span-2">
        <StatsOverviewCard />
      </div>
      <div className="lg:col-span-1 md:col-span-1">
        <CryptoEngineCard />
      </div>
      <div className="lg:col-span-1 md:col-span-1">
        <DeviceProvisioningCard />
      </div>
    </div>
  );
}
