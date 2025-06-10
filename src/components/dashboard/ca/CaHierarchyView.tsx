
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { CaNodeCard } from './CaNodeCard';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CaHierarchyViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

const renderTreeNodes = (ca: CA, router: ReturnType<typeof import('next/navigation').useRouter>, allCAs: CA[]): React.ReactNode => {
  return (
    <TreeNode key={ca.id} label={<CaNodeCard ca={ca} router={router} allCAs={allCAs} />}>
      {ca.children && ca.children.map(child => renderTreeNodes(child, router, allCAs))}
    </TreeNode>
  );
};

export const CaHierarchyView: React.FC<CaHierarchyViewProps> = ({ cas, router, allCAs }) => {
  if (cas.length === 0) {
    return (
      <p className="text-muted-foreground text-center p-4">No Certificate Authorities to display in hierarchy view.</p>
    );
  }
  return (
    <div className="w-full h-[calc(100vh-200px)] border rounded-md relative overflow-hidden">
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={3}
        centerOnInit
        limitToBounds={false}
      >
        {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
          <>
            <div className="absolute top-2 left-2 z-10 space-x-1">
              <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset View">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            <TransformComponent
              wrapperStyle={{ width: '100%', height: '100%' }}
              contentStyle={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            >
              <div className="space-y-12">
                {cas.map((rootCa) => (
                  <Tree
                    key={rootCa.id}
                    lineWidth={'2px'}
                    lineColor={'hsl(var(--primary))'}
                    lineBorderRadius={'5px'}
                    label={<CaNodeCard ca={rootCa} router={router} allCAs={allCAs} />}
                  >
                    {rootCa.children && rootCa.children.map(child => renderTreeNodes(child, router, allCAs))}
                  </Tree>
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
};
