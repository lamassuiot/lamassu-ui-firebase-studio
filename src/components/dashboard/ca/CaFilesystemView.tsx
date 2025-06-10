
'use client';

import type React from 'react';
import type { CA } from '@/lib/ca-data';
import { CaFilesystemViewItem } from './CaFilesystemViewItem';
import type { NextRouter } from 'next/router'; // Using a generic type as router type can vary

interface CaFilesystemViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>; // More specific type
  allCAs: CA[];
}

export const CaFilesystemView: React.FC<CaFilesystemViewProps> = ({ cas, router, allCAs }) => {
  return (
    <ul className="space-y-1">
      {cas.map((ca) => (
        <CaFilesystemViewItem
          key={ca.id}
          ca={ca}
          level={0}
          router={router}
          allCAs={allCAs}
        />
      ))}
    </ul>
  );
};
