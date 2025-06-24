
'use client';

import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Landmark, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaGraphViewProps {
  router: ReturnType<typeof import('next/navigation').useRouter>;
}

// --- MOCK DATA AND LAYOUT DEFINITION ---

interface GraphNode {
  id: string;
  name: string;
  subtext: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ca' | 'sub-ca';
  status: 'active' | 'expired' | 'revoked';
}

interface GraphEdge {
  from: string;
  to: string;
  path: string; // SVG path data 'd' attribute
  hasArrow?: boolean;
  bidirectional?: boolean;
}

const GRAPH_WIDTH = 1200;
const GRAPH_HEIGHT = 900;

const CA_NODE_WIDTH = 280;
const CA_NODE_HEIGHT = 60;

// Manually positioned nodes
const nodes: GraphNode[] = [
  // Row 1: Roots
  { id: 'ca1', name: 'Lamassu Root CA', subtext: 'ID: c82d689b-3c4f-454f-92e4-23d0d07c00a1', x: 150, y: 50, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'active' },
  { id: 'ca5', name: 'Regional Root CA - EU', subtext: 'ID: 55a6b7c8-11d2-22e3-33f4-44a5b6c7d8e9', x: 460, y: 50, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'active' },
  { id: 'ca9', name: 'Legacy Root CA', subtext: 'ID: 99f8e7d6-55c4-44b3-33a2-22b1a0c9d8e7', x: 770, y: 50, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'expired' },

  // Row 2: Intermediates from Lamassu Root
  { id: 'subca1a', name: 'Firmware Signing Sub-CA', subtext: 'ID: c3d4e5f6-a7b8-9012-3456-7890abcdef', x: 0, y: 170, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'active' },
  { id: 'ca6', name: 'Manufacturing CA', subtext: 'ID: 66b7c8d9-22e3-33f4-44a5-55b6c7d8e9f0', x: 400, y: 170, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'active' },

  // Row 3: Various Intermediates
  { id: 'ca2', name: 'IoT Device CA', subtext: 'ID: a1b2c3d4-e5f6-7890-1234-567890abcdef', x: 0, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'active' },
  { id: 'ca8', name: 'Time-stamping CA', subtext: 'ID: 88d9e0f1-44b5-55c6-66d7-77e8f9a0b1c2', x: 300, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'active' },
  { id: 'ca3', name: 'Web Services CA', subtext: 'ID: b2c3d4e5-f6a7-8901-2345-67890abcdef', x: 600, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'expired' },

  // Row 4: Sub-Intermediates
  { id: 'ca7', name: 'Test/Dev CA', subtext: 'ID: 77c8d9e0-33f4-44a5-55b6-66c7d8e9f0a1', x: 600, y: 420, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'revoked' },
  
  // Row 5: External/Partner CAs
  { id: 'ca4', name: 'External Partner Root', subtext: 'ID: d4e5f6a7-b8c9-0123-4567-890abcdef0', x: 920, y: 550, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'revoked' },
  { id: 'subca4a', name: 'Partner Integration CA', subtext: 'ID: e5f6a7b8-c9d0-1234-5678-90abcdef01', x: 920, y: 670, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'revoked' },
];

const edges: GraphEdge[] = [
    // Lamassu Root CA connections
    { from: 'ca1', to: 'subca1a', path: 'M 290 110 V 140 H 140 V 170', hasArrow: true },
    { from: 'ca1', to: 'ca6', path: 'M 290 110 V 140 H 540 V 170', hasArrow: true },
    { from: 'ca1', to: 'ca2', path: 'M 290 110 V 220 H 140 V 300', hasArrow: true },
    { from: 'ca1', to: 'ca3', path: 'M 290 110 V 220 H 740 V 300', hasArrow: true },
    
    // Sub-CA connections
    { from: 'subca1a', to: 'ca8', path: 'M 140 230 V 260 H 440 V 300', hasArrow: true },
    { from: 'ca3', to: 'ca7', path: 'M 740 360 V 420', hasArrow: true },
    
    // External CA connections
    { from: 'ca4', to: 'subca4a', path: 'M 1060 610 V 670', hasArrow: true },

    // Cross-certification
    { from: 'ca2', to: 'ca3', path: 'M 280 330 H 600', hasArrow: true, bidirectional: true },
    { from: 'subca1a', to: 'ca6', path: 'M 280 200 H 400', hasArrow: true, bidirectional: true },
];


const NodeComponent = ({ node }: { node: GraphNode }) => {
    let statusIcon: React.ReactNode;
    let statusColorClass = '';

    switch (node.status) {
        case 'active':
            statusIcon = <CheckCircle className="h-5 w-5 text-green-500" />;
            statusColorClass = 'border-blue-300';
            break;
        case 'expired':
            statusIcon = <AlertTriangle className="h-5 w-5 text-orange-500" />;
            statusColorClass = 'border-orange-300';
            break;
        case 'revoked':
            statusIcon = <XCircle className="h-5 w-5 text-red-500" />;
            statusColorClass = 'border-red-300';
            break;
    }

    const nodeBgColor = node.status === 'revoked' ? 'bg-red-50 dark:bg-red-900/40' : node.status === 'expired' ? 'bg-orange-50 dark:bg-orange-900/40' : 'bg-blue-50 dark:bg-blue-900/40';
    const iconBgColor = node.status === 'revoked' ? 'bg-red-100 dark:bg-red-800/50' : node.status === 'expired' ? 'bg-orange-100 dark:bg-orange-800/50' : 'bg-blue-100 dark:bg-blue-800/50';
    const titleColor = node.status === 'revoked' ? 'text-red-800 dark:text-red-200' : node.status === 'expired' ? 'text-orange-800 dark:text-orange-200' : 'text-blue-800 dark:text-blue-200';
    const subtextColor = node.status === 'revoked' ? 'text-red-600 dark:text-red-300' : node.status === 'expired' ? 'text-orange-600 dark:text-orange-300' : 'text-gray-500 dark:text-gray-400';

    return (
        <div
            className={cn(
                'rounded-lg p-2 flex items-center gap-3 w-full h-full shadow-md',
                nodeBgColor,
                statusColorClass,
                'border'
            )}
        >
            <div className={cn('p-2 rounded-full flex-shrink-0', iconBgColor)}>
                <Landmark className={cn('h-6 w-6', titleColor)} />
            </div>
            <div className="flex-grow min-w-0">
                <p className={cn('font-semibold truncate', titleColor)}>{node.name}</p>
                <p className={cn('text-xs font-mono truncate', subtextColor)}>{node.subtext}</p>
            </div>
            <div className="flex-shrink-0">
                {statusIcon}
            </div>
        </div>
    );
};


export const CaGraphView: React.FC<CaGraphViewProps> = ({ router }) => {

  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-background">
      <div className="flex-grow relative">
        <TransformWrapper initialScale={0.8} minScale={0.2} maxScale={3} centerOnInit limitToBounds={false}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-2 left-2 z-10 space-x-1">
                <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
              </div>
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT }}
              >
                <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT} className="bg-background text-foreground">
                  <defs>
                    <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="6" markerHeight="6"
                        orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
                    </marker>
                    <marker id="arrowhead_start" viewBox="0 0 10 10" refX="2" refY="5"
                        markerWidth="6" markerHeight="6"
                        orient="auto">
                      <path d="M 10 0 L 0 5 L 10 10 z" className="fill-muted-foreground" />
                    </marker>
                  </defs>
                  
                  {/* Edges */}
                  <g>
                    {edges.map((edge, i) => (
                      <path
                        key={`edge-${i}`}
                        d={edge.path}
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth="1.5"
                        fill="none"
                        markerEnd={edge.hasArrow ? "url(#arrowhead)" : undefined}
                        markerStart={edge.bidirectional ? "url(#arrowhead_start)" : undefined}
                      />
                    ))}
                  </g>
                  
                  {/* Nodes */}
                  <g>
                     {nodes.map((node) => (
                        <foreignObject
                            key={node.id}
                            x={node.x}
                            y={node.y}
                            width={node.width}
                            height={node.height}
                        >
                            <NodeComponent node={node} />
                        </foreignObject>
                     ))}
                  </g>
                </svg>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>
    </div>
  );
};
