'use client';

import React from 'react';
import { CertificateStatusChartCard } from '@/components/dashboard/home/CertificateStatusChartCard';

export default function DashboardHomePage() {
  return (
    <div className="w-full">
      <CertificateStatusChartCard />
    </div>
  );
}
