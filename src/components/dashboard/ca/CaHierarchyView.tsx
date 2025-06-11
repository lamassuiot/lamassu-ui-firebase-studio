
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { CaVisualizerCard } from '@/components/CaVisualizerCard'; // Updated import
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CaHierarchyViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[]; // allCAs might still be needed if children nodes need context for display later
}

const renderTreeNodes = (ca: CA, router: ReturnType<typeof import('next/navigation').useRouter>, allCAs: CA[]): React.ReactNode => {
  const handleNodeClick = (selectedCa: CA) => {
    router.push(`/dashboard/certificate-authorities/${selectedCa.id}/details`);
  };

  return (
    <TreeNode
      key={ca.id}
      label={
        <CaVisualizerCard
          ca={ca}
          onClick={handleNodeClick}
          className="!inline-block mx-auto w-auto min-w-[230px] max-w-[280px]"
        />
      }
    >
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

  const handleRootNodeClick = (selectedCa: CA) => {
    router.push(`/dashboard/certificate-authorities/${selectedCa.id}/details`);
  };

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
              <div className="flex flex-row items-start space-x-12">
                {cas.map((rootCa) => (
                  <Tree
                    key={rootCa.id}
                    lineWidth={'2px'}
                    lineColor={'hsl(var(--primary))'}
                    lineBorderRadius={'5px'}
                    label={
                      <CaVisualizerCard
                        ca={rootCa}
                        onClick={handleRootNodeClick}
                        className="!inline-block mx-auto w-auto min-w-[230px] max-w-[280px]"
                      />
                    }
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
