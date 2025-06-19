
'use client';

import React from 'react';
import { CertificateStatusChartCard } from '@/components/dashboard/home/CertificateStatusChartCard';

export default function HomePage() { // Renamed from DashboardHomePage
  return (
    <div className="w-full flex justify-start">
      <CertificateStatusChartCard />
    </div>
  );
}
