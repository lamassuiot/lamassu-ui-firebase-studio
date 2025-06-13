
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import { getCaDisplayName } from '@/lib/ca-data';
import * as dagre from '@dagrejs/dagre';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Key, IterationCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, formatDistanceToNowStrict } from 'date-fns';

interface CaGraphViewProps {
  cas: CA[];
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

interface DagreNode {
  id: string;
  label: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  caData: CA;
}

interface DagreEdge {
  v: string;
  w: string;
  points?: Array<{ x: number; y: number }>;
  [key: string]: any; 
}

const NODE_WIDTH = 280;
const NODE_HEIGHT = 110; // Adjusted for potential KMS Key ID line
const KMS_KEY_HEIGHT = 25;


const getStatusColors = (ca: CA): { border: string, bg: string, text: string, iconColor: string } => {
  const isExpired = isPast(parseISO(ca.expires));
  if (ca.status === 'revoked') return { border: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive)/0.1)', text: 'hsl(var(--destructive))', iconColor: 'hsl(var(--destructive))' };
  if (isExpired) return { border: 'hsl(30 80% 55%)', bg: 'hsl(30 80% 55% / 0.1)', text: 'hsl(30 80% 55%)', iconColor: 'hsl(30 80% 55%)' };
  return { border: 'hsl(var(--primary))', bg: 'hsl(var(--primary)/0.1)', text: 'hsl(var(--primary))', iconColor: 'hsl(var(--primary))' };
};


export const CaGraphView: React.FC<CaGraphViewProps> = ({ cas, router, allCAs }) => {
  const [showKmsKeyIds, setShowKmsKeyIds] = useState(false);
  const [dagreGraph, setDagreGraph] = useState<dagre.graphlib.Graph | null>(null);
  const [layoutRan, setLayoutRan] = useState(false);

  const processedGraph = useMemo(() => {
    if (!cas || cas.length === 0) return null;

    const g = new dagre.graphlib.Graph({ compound: true });
    g.setGraph({ rankdir: 'TB', ranksep: 70, nodesep: 40, edgesep: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    const addedNodes = new Set<string>();

    function addNodesAndEdges(caList: CA[]) {
      caList.forEach(ca => {
        if (!addedNodes.has(ca.id)) {
          const nodeHeight = NODE_HEIGHT + (showKmsKeyIds && ca.kmsKeyId ? KMS_KEY_HEIGHT : 0);
          g.setNode(ca.id, { label: ca.name, width: NODE_WIDTH, height: nodeHeight, caData: ca });
          addedNodes.add(ca.id);
        }

        if (ca.issuer && ca.issuer !== 'Self-signed' && ca.issuer !== ca.id) {
          // Ensure issuer node exists before setting edge
          if (!g.hasNode(ca.issuer)) {
            const issuerCa = allCAs.find(parentCa => parentCa.id === ca.issuer) 
                          || (ca.issuer === 'root-ca-1' ? allCAs.find(rca => rca.id === 'root-ca-1') : null); // Simplified lookup
            if (issuerCa && !addedNodes.has(issuerCa.id)) {
                const issuerNodeHeight = NODE_HEIGHT + (showKmsKeyIds && issuerCa.kmsKeyId ? KMS_KEY_HEIGHT : 0);
                g.setNode(issuerCa.id, { label: issuerCa.name, width: NODE_WIDTH, height: issuerNodeHeight, caData: issuerCa });
                addedNodes.add(issuerCa.id);
            }
          }
          if (g.hasNode(ca.issuer)) {
             g.setEdge(ca.issuer, ca.id, {labelpos: 'c', arrowhead: 'normal'});
          }
        }
        // For self-signed, a loop can be added if desired, or handled by node style
        // else if (ca.issuer === 'Self-signed' || ca.issuer === ca.id) {
        //   g.setEdge(ca.id, ca.id, {label: "self-signed", arrowhead: 'normal'});
        // }


        if (ca.children) {
          addNodesAndEdges(ca.children);
        }
      });
    }

    addNodesAndEdges(cas);
    dagre.layout(g);
    return g;
  }, [cas, allCAs, showKmsKeyIds]);

  useEffect(() => {
    if (processedGraph) {
      setDagreGraph(processedGraph);
      setLayoutRan(true);
    }
  }, [processedGraph]);


  if (!layoutRan || !dagreGraph) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Calculating graph layout...</p>
      </div>
    );
  }

  const nodes = dagreGraph.nodes().map(idFromDagre => { const nodeLabel = dagreGraph.node(idFromDagre); return { ...nodeLabel, id: idFromDagre }; }) as DagreNode[];
  const edges = dagreGraph.edges().map(edgeObj => dagreGraph.edge(edgeObj) as DagreEdge);


  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-muted/10">
      <div className="p-2 border-b bg-background flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-1">
          {/* Controls are part of TransformWrapper */}
        </div>
        <div className="flex items-center space-x-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="showKmsKeysToggleGraph" className="text-sm font-medium text-muted-foreground">
            Show KMS Key IDs
          </Label>
          <Switch
            id="showKmsKeysToggleGraph"
            checked={showKmsKeyIds}
            onCheckedChange={setShowKmsKeyIds}
            aria-label="Toggle KMS Key ID visibility in graph"
          />
        </div>
      </div>
      <div className="flex-grow relative">
        <TransformWrapper initialScale={0.8} minScale={0.1} maxScale={3} centerOnInit limitToBounds={false}>
          {({ zoomIn, zoomOut, resetTransform, ...rest }) => (
            <>
              <div className="absolute top-2 left-2 z-10 space-x-1">
                <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
              </div>
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '200%', height: '200%' /* Allow larger content area */ }}>
                <svg width="200%" height="200%" className="min-w-full min-h-full"> {/* Ensure SVG takes up space */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
                    </marker>
                  </defs>
                  <g>
                    {edges.map((edge, i) => {
                       if (!edge.points || edge.points.length === 0) return null;
                        const pathData = edge.points.reduce((acc, point, idx) => {
                        return idx === 0 ? `M${point.x},${point.y}` : `${acc}L${point.x},${point.y}`;
                        }, '');
                      return (
                        <path
                          key={`edge-${i}`}
                          d={pathData}
                          stroke="hsl(var(--border))"
                          strokeWidth="1.5"
                          fill="none"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    })}
                    {nodes.map((node) => {
                      if (node.x === undefined || node.y === undefined) return null;
                      const status = getStatusColors(node.caData);
                      const isSelfSigned = node.caData.issuer === 'Self-signed' || node.caData.issuer === node.id;
                      const nodeActualHeight = NODE_HEIGHT + (showKmsKeyIds && node.caData.kmsKeyId ? KMS_KEY_HEIGHT : 0);

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x - node.width / 2}, ${node.y - nodeActualHeight / 2})`}
                          onClick={() => router.push(`/dashboard/certificate-authorities/${node.id}/details`)}
                          className="cursor-pointer group"
                        >
                          <rect
                            width={node.width}
                            height={nodeActualHeight}
                            rx="8"
                            ry="8"
                            fill="hsl(var(--card))"
                            stroke={status.border}
                            strokeWidth="1.5"
                            className="transition-shadow group-hover:shadow-lg"
                          />
                          <foreignObject width={node.width} height={nodeActualHeight} x="0" y="0">
                            <div className={cn("p-2 flex flex-col justify-between h-full text-xs", 'namespace-foreign-object-styles-here')}>
                               <div>
                                <div className="flex items-center mb-1">
                                  <Key size={14} className={cn("mr-1.5", status.iconColor)} />
                                  <p className="font-semibold text-foreground truncate" title={node.label}>{node.label}</p>
                                </div>
                                <p className="text-muted-foreground truncate text-[10px]" title={`ID: ${node.id}`}>
                                    ID: <span className="font-mono">{node.id.substring(0,15)}...</span>
                                </p>
                                {isSelfSigned && (
                                    <div className="flex items-center text-amber-600 dark:text-amber-400 mt-0.5">
                                        <IterationCcw size={10} className="mr-1" />
                                        <span className="text-[10px]">Self-Signed</span>
                                    </div>
                                )}
                                <p className={cn("text-[10px] mt-0.5", status.text)}>{node.caData.status.toUpperCase()} &middot; Exp: {formatDistanceToNowStrict(parseISO(node.caData.expires))} </p>
                               </div>
                                {showKmsKeyIds && node.caData.kmsKeyId && (
                                <div className="mt-auto pt-1 border-t border-dashed" style={{borderColor: status.border}}>
                                    <p className="text-[10px] font-medium" style={{color: status.text}}>KMS Key:</p>
                                    <p className="text-[10px] font-mono truncate" style={{color: status.text}} title={node.caData.kmsKeyId}>
                                    {node.caData.kmsKeyId}
                                    </p>
                                </div>
                                )}
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
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

// It's good practice to ensure foreignObject content doesn't break out.
// Add this to your global CSS or a style tag if needed, though Tailwind should handle most.
// .namespace-foreign-object-styles-here div { box-sizing: border-box; overflow: hidden; }

    
