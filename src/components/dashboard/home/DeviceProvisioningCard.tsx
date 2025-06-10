
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const data = [{ name: 'Provisioned', value: 100 }];
const COLORS = ['#16a34a']; // Green color

const legendItems = [
  { name: 'No Identity', count: 0, color: 'bg-sky-400' }, // Light blue
  { name: 'Active', count: 4, color: 'bg-green-500' },
  { name: 'Renewal Pending', count: 0, color: 'bg-yellow-400' },
  { name: 'Expiring Soon', count: 0, color: 'bg-orange-400' },
  { name: 'Expired', count: 0, color: 'bg-amber-500' }, // Darker Yellow/Orange
  { name: 'Revoked', count: 0, color: 'bg-red-500' },
  { name: 'Decommissioned', count: 0, color: 'bg-purple-500' },
];

export function DeviceProvisioningCard() {
  return (
    <Card className="bg-primary text-primary-foreground shadow-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
          Device Provisioning Status
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-between">
        <div className="w-full h-48 sm:h-56 md:h-64 relative mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="100%"
                innerRadius="80%"
                fill="#8884d8"
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {/* Tooltip can be added if hover details are needed */}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <p className="text-4xl font-bold text-primary-foreground">100%</p>
            <p className="text-xs text-primary-foreground/80">PROVISIONED</p>
            <p className="text-xs text-primary-foreground/80">DEVICES</p>
          </div>
        </div>
        
        <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {legendItems.map((item) => (
            <div key={item.name} className="flex items-center space-x-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${item.color}`}></span>
              <span className="text-primary-foreground/90">{item.name} [{item.count}]</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
