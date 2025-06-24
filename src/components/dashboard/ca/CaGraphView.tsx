
'use client';

import React from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CaGraphViewProps {
  router: ReturnType<typeof import('next/navigation').useRouter>;
}

// --- MOCK DATA AND LAYOUT DEFINITION ---

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ca' | 'ee';
}

interface GraphEdge {
  from: string;
  to: string;
  path: string; // SVG path data 'd' attribute
  hasArrow?: boolean;
}

const GRAPH_WIDTH = 1000;
const GRAPH_HEIGHT = 600;

const CA_NODE_WIDTH = 80;
const CA_NODE_HEIGHT = 40;
const EE_NODE_WIDTH = 50;
const EE_NODE_HEIGHT = 30;

// Manually positioned nodes to match the ASCII art structure
const nodes: GraphNode[] = [
  // CAs
  { id: 'ca1', name: 'CA1', x: 460, y: 50, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca' },
  { id: 'ca2', name: 'CA2', x: 180, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca' },
  { id: 'ca3', name: 'CA3', x: 740, y: 300, width: CA_NODE_WIDTH, height: CA_NODE_HEIGHT, type: 'ca' },

  // EEs for CA1
  { id: 'ee1a', name: 'EE', x: 415, y: 170, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
  { id: 'ee1b', name: 'EE', x: 535, y: 170, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },

  // EEs for CA2
  { id: 'ee2a', name: 'EE', x: 135, y: 420, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
  { id: 'ee2b', name: 'EE', x: 255, y: 420, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
  
  // EEs for CA3
  { id: 'ee3a', name: 'EE', x: 635, y: 420, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
  { id: 'ee3b', name: 'EE', x: 755, y: 420, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
  { id: 'ee3c', name: 'EE', x: 875, y: 420, width: EE_NODE_WIDTH, height: EE_NODE_HEIGHT, type: 'ee' },
];

const edges: GraphEdge[] = [
    // CA1 to its EEs
    { from: 'ca1', to: 'ee1a', path: `M 500 90 V 140 H 440 V 170`},
    { from: 'ca1', to: 'ee1b', path: `M 500 90 V 140 H 560 V 170`},
    
    // CA1 to CA2 and CA3
    { from: 'ca1', to: 'ca2', path: `M 460 70 H 350 V 250 H 220 V 300`},
    { from: 'ca1', to: 'ca3', path: `M 540 70 H 650 V 250 H 780 V 300`},

    // CA2 to its EEs
    { from: 'ca2', to: 'ee2a', path: `M 220 340 V 390 H 160 V 420`},
    { from: 'ca2', to: 'ee2b', path: `M 220 340 V 390 H 280 V 420`},
    
    // CA3 to its EEs
    { from: 'ca3', to: 'ee3a', path: `M 780 340 V 390 H 660 V 420`},
    { from: 'ca3', to: 'ee3b', path: `M 780 340 V 390 H 780 V 420`},
    { from: 'ca3', to: 'ee3c', path: `M 780 340 V 390 H 900 V 420`},

    // CA2 to CA3 (cross-cert)
    { from: 'ca2', to: 'ca3', path: `M 260 320 H 740`, hasArrow: true },
];

export const CaGraphView: React.FC<CaGraphViewProps> = ({ router }) => {

  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-background">
      <div className="flex-grow relative">
        <TransformWrapper initialScale={1} minScale={0.2} maxScale={3} centerOnInit limitToBounds={false}>
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
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>
                  
                  {/* Edges */}
                  <g>
                    {edges.map((edge, i) => (
                      <path
                        key={`edge-${i}`}
                        d={edge.path}
                        stroke="currentColor"
                        strokeWidth="1"
                        fill="none"
                        strokeDasharray="4 2"
                        markerEnd={edge.hasArrow ? "url(#arrowhead)" : undefined}
                      />
                    ))}
                  </g>
                  
                  {/* Nodes */}
                  <g>
                     {nodes.map((node) => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            <rect
                                x="0"
                                y="0"
                                width={node.width}
                                height={node.height}
                                fill="hsl(var(--background))"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                            />
                            <text
                                x={node.width / 2}
                                y={node.height / 2}
                                textAnchor="middle"
                                dy=".3em"
                                fill="currentColor"
                                className="text-sm font-mono"
                            >
                                {node.name}
                            </text>
                        </g>
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
