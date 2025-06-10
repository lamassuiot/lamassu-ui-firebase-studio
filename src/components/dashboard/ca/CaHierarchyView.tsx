
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { CaHierarchyNode } from './CaHierarchyNode';

interface CaHierarchyViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

export const CaHierarchyView: React.FC<CaHierarchyViewProps> = ({ cas, router, allCAs }) => {
  return (
    <div className="w-full overflow-x-auto p-4 space-y-12"> {/* Allow horizontal scrolling */}
      {cas.map((rootCa) => (
        <div key={rootCa.id} className="flex justify-center"> {/* Center each root CA's tree */}
          <CaHierarchyNode ca={rootCa} router={router} allCAs={allCAs} />
        </div>
      ))}
      {cas.length === 0 && (
        <p className="text-muted-foreground text-center">No Certificate Authorities to display in hierarchy view.</p>
      )}
    </div>
  );
};
