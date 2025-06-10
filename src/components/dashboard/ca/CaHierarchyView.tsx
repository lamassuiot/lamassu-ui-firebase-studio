
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Tree, TreeNode } from 'react-organizational-chart';
import { CaNodeCard } from './CaNodeCard'; // Updated import

interface CaHierarchyViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

// Recursive function to render tree nodes
const renderTreeNodes = (ca: CA, router: ReturnType<typeof import('next/navigation').useRouter>, allCAs: CA[]): React.ReactNode => {
  return (
    <TreeNode key={ca.id} label={<CaNodeCard ca={ca} router={router} allCAs={allCAs} />}>
      {ca.children && ca.children.map(child => renderTreeNodes(child, router, allCAs))}
    </TreeNode>
  );
};

export const CaHierarchyView: React.FC<CaHierarchyViewProps> = ({ cas, router, allCAs }) => {
  return (
    <div className="w-full overflow-x-auto p-4 space-y-12 text-center"> {/* Added text-center */}
      {cas.map((rootCa) => (
        <Tree
          key={rootCa.id}
          lineWidth={'1px'}
          lineColor={'hsl(var(--border))'} // Using CSS variable for border color
          lineBorderRadius={'5px'}
          label={<CaNodeCard ca={rootCa} router={router} allCAs={allCAs} />}
        >
          {rootCa.children && rootCa.children.map(child => renderTreeNodes(child, router, allCAs))}
        </Tree>
      ))}
      {cas.length === 0 && (
        <p className="text-muted-foreground text-center">No Certificate Authorities to display in hierarchy view.</p>
      )}
    </div>
  );
};
