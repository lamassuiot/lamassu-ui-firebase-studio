
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
}

const GRAPH_WIDTH = 1200;
const GRAPH_HEIGHT = 800;

const CA_NODE_WIDTH = 280;
const CA_NODE_HEIGHT = 60;

// Manually positioned nodes
const nodes: GraphNode[] = [
  { id: 'ca1', name: 'Lamassu Root CA', subtext: 'ID: c82d689b-3c4f-454f-92e4-23d0d07c00a1', x: 460, y: 50, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'active' },
  { id: 'ca2', name: 'IoT Device CA', subtext: 'ID: a1b2c3d4-e5f6-7890-1234-567890abcdef', x: 150, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'active' },
  { id: 'ca3', name: 'Web Services CA', subtext: 'ID: b2c3d4e5-f6a7-8901-2345-67890abcdef', x: 770, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'expired' },
  { id: 'subca1a', name: 'Firmware Signing Sub-CA', subtext: 'ID: c3d4e5f6-a7b8-9012-3456-7890abcdef', x: 460, y: 170, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'active' },
  { id: 'ca4', name: 'External Partner Root', subtext: 'ID: d4e5f6a7-b8c9-0123-4567-890abcdef0', x: 460, y: 550, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca', status: 'revoked' },
  { id: 'subca4a', name: 'Partner Integration CA', subtext: 'ID: e5f6a7b8-c9d0-1234-5678-90abcdef01', x: 460, y: 670, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'sub-ca', status: 'revoked' },
];

const edges: GraphEdge[] = [
    // CA1 to SubCA1a
    { from: 'ca1', to: 'subca1a', path: `M 600 110 V 170`},
    // CA1 to CA2 and CA3
    { from: 'ca1', to: 'ca2', path: `M 600 110 V 140 H 290 V 300`},
    { from: 'ca1', to: 'ca3', path: `M 600 110 V 140 H 910 V 300`},
    // CA2 to CA3 (cross-cert)
    { from: 'ca2', to: 'ca3', path: `M 430 330 H 770`, hasArrow: true },
    // CA4 to SubCA4a
    { from: 'ca4', to: 'subca4a', path: `M 600 610 V 670`},
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

    const nodeBgColor = node.status === 'revoked' ? 'bg-red-50' : node.status === 'expired' ? 'bg-orange-50' : 'bg-blue-50';
    const iconBgColor = node.status === 'revoked' ? 'bg-red-100' : node.status === 'expired' ? 'bg-orange-100' : 'bg-blue-100';
    const titleColor = node.status === 'revoked' ? 'text-red-800' : node.status === 'expired' ? 'text-orange-800' : 'text-blue-800';
    const subtextColor = node.status === 'revoked' ? 'text-red-600' : node.status === 'expired' ? 'text-orange-600' : 'text-gray-500';

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
