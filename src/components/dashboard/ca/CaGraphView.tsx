
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
// import { getCaDisplayName } from '@/lib/ca-data'; // Not directly used in node labels here
import * as dagre from '@dagrejs/dagre';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Key, IterationCcw, Loader2, ServerIcon } from 'lucide-react'; // Added ServerIcon
import { cn } from '@/lib/utils';
import { isPast, parseISO, formatDistanceToNowStrict } from 'date-fns';

interface CaGraphViewProps {
  cas: CA[]; // Though we use allCAs primarily for graph construction
  router: ReturnType<typeof import('next/navigation').useRouter>;
  allCAs: CA[];
}

interface BaseDagreNode {
  id: string;
  label: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  isKmsNode: boolean;
}
interface KmsDagreNode extends BaseDagreNode {
  isKmsNode: true;
  kmsId: string;
}
interface CaCertDagreNode extends BaseDagreNode {
  isKmsNode: false;
  caData: CA;
}
type DagreNode = KmsDagreNode | CaCertDagreNode;


interface DagreEdge {
  v: string;
  w: string;
  points?: Array<{ x: number; y: number }>;
  type: 'signs' | 'issues';
  style?: string;
  arrowhead?: string;
  [key: string]: any;
}

const KMS_NODE_WIDTH = 220;
const KMS_NODE_HEIGHT = 55;
const CA_CERT_NODE_WIDTH = 280;
const CA_CERT_NODE_HEIGHT = 110; // Base height for CA cert node
const CA_CERT_KMS_ID_TEXT_HEIGHT = 20; // Extra height if showing KMS ID text inside CA cert node


const getCaCertStatusColors = (ca: CA): { border: string, bg: string, text: string, iconColor: string } => {
  const isExpired = isPast(parseISO(ca.expires));
  if (ca.status === 'revoked') return { border: 'hsl(var(--destructive))', bg: 'hsl(var(--destructive)/0.1)', text: 'hsl(var(--destructive))', iconColor: 'hsl(var(--destructive))' };
  if (isExpired) return { border: 'hsl(30 80% 55%)', bg: 'hsl(30 80% 55% / 0.1)', text: 'hsl(30 80% 55%)', iconColor: 'hsl(30 80% 55%)' };
  return { border: 'hsl(var(--primary))', bg: 'hsl(var(--primary)/0.1)', text: 'hsl(var(--primary))', iconColor: 'hsl(var(--primary))' };
};

const KMS_NODE_COLOR = {
  border: 'hsl(var(--secondary))', // Example: blueish
  bg: 'hsl(var(--secondary)/0.1)',
  text: 'hsl(var(--secondary-foreground))',
  iconColor: 'hsl(var(--secondary))'
};


export const CaGraphView: React.FC<CaGraphViewProps> = ({ router, allCAs }) => {
  const [showKmsKeyIdTextInCaNode, setShowKmsKeyIdTextInCaNode] = useState(false);
  const [dagreGraph, setDagreGraph] = useState<dagre.graphlib.Graph | null>(null);
  const [layoutRan, setLayoutRan] = useState(false);

  const processedGraph = useMemo(() => {
    if (!allCAs || allCAs.length === 0) return null;
    setLayoutRan(false); // Reset layout status on data change

    const g = new dagre.graphlib.Graph({ compound: false }); // compound: false might be better for this structure
    g.setGraph({ rankdir: 'TB', ranksep: 60, nodesep: 30, edgesep: 15 });
    g.setDefaultEdgeLabel(() => ({}));

    const uniqueKmsKeyIds = new Set<string>();
    allCAs.forEach(ca => {
      if (ca.kmsKeyId) {
        uniqueKmsKeyIds.add(ca.kmsKeyId);
      }
    });

    // Add KMS Key Nodes
    uniqueKmsKeyIds.forEach(kmsId => {
      g.setNode(`kms-${kmsId}`, {
        label: `KMS Key: ${kmsId.substring(0,20)}${kmsId.length > 20 ? '...' : ''}`,
        width: KMS_NODE_WIDTH,
        height: KMS_NODE_HEIGHT,
        isKmsNode: true,
        kmsId: kmsId
      } as KmsDagreNode);
    });

    // Add CA Certificate Nodes
    allCAs.forEach(ca => {
      const nodeHeight = CA_CERT_NODE_HEIGHT + (showKmsKeyIdTextInCaNode && ca.kmsKeyId ? CA_CERT_KMS_ID_TEXT_HEIGHT : 0);
      g.setNode(ca.id, {
        label: ca.name,
        width: CA_CERT_NODE_WIDTH,
        height: nodeHeight,
        caData: ca,
        isKmsNode: false
      } as CaCertDagreNode);
    });

    // Add Edges
    allCAs.forEach(ca => {
      // Edge: KMS Key SIGNS CA Certificate
      if (ca.kmsKeyId && g.hasNode(`kms-${ca.kmsKeyId}`) && g.hasNode(ca.id)) {
         if (!g.outEdges(`kms-${ca.kmsKeyId}`)?.some(edge => edge.w === ca.id)) {
            g.setEdge(`kms-${ca.kmsKeyId}`, ca.id, { type: 'signs', style: `stroke: ${KMS_NODE_COLOR.border}; stroke-dasharray: 4,4;`, arrowhead: 'normal' } as DagreEdge);
         }
      }

      // Edge: Issuer CA Certificate ISSUES this CA Certificate
      if (ca.issuer && ca.issuer !== 'Self-signed' && ca.issuer !== ca.id && g.hasNode(ca.issuer) && g.hasNode(ca.id)) {
        if (!g.outEdges(ca.issuer)?.some(edge => edge.w === ca.id)) {
           g.setEdge(ca.issuer, ca.id, { type: 'issues', style: `stroke: hsl(var(--border));`, arrowhead: 'vee' } as DagreEdge);
        }
      }
    });

    dagre.layout(g);
    return g;
  }, [allCAs, showKmsKeyIdTextInCaNode]);

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
  const edges = dagreGraph.edges().map(edgeObj => {
    const edge = dagreGraph.edge(edgeObj);
    return { ...edge, v: edgeObj.v, w: edgeObj.w } as DagreEdge; // ensure v and w are included
  });


  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-muted/10">
      <div className="p-2 border-b bg-background flex items-center justify-between sticky top-0 z-20">
        <div>{/* Placeholder for future controls */}</div>
        <div className="flex items-center space-x-2">
          <ServerIcon className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="showKmsIdTextToggleGraph" className="text-sm font-medium text-muted-foreground">
            Show Key ID in Cert Node
          </Label>
          <Switch
            id="showKmsIdTextToggleGraph"
            checked={showKmsKeyIdTextInCaNode}
            onCheckedChange={setShowKmsKeyIdTextInCaNode}
            aria-label="Toggle KMS Key ID text visibility in CA certificate nodes"
          />
        </div>
      </div>
      <div className="flex-grow relative">
        <TransformWrapper initialScale={0.7} minScale={0.1} maxScale={3} centerOnInit limitToBounds={false}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className="absolute top-2 left-2 z-10 space-x-1">
                <Button variant="outline" size="icon" onClick={() => zoomIn()} title="Zoom In"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => zoomOut()} title="Zoom Out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => resetTransform()} title="Reset View"><RotateCcw className="h-4 w-4" /></Button>
              </div>
              <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '200%', height: '200%' }}>
                <svg width="200%" height="200%" className="min-w-full min-h-full">
                  <defs>
                    <marker id="arrowhead-normal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" />
                    </marker>
                     <marker id="arrowhead-vee" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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
                          key={`edge-${i}-${edge.v}-${edge.w}`}
                          d={pathData}
                          strokeWidth="1.5"
                          fill="none"
                          style={{ stroke: edge.type === 'signs' ? KMS_NODE_COLOR.border : 'hsl(var(--border))', strokeDasharray: edge.type === 'signs' ? '4,4' : 'none' }}
                          markerEnd={edge.arrowhead === 'vee' ? "url(#arrowhead-vee)" : "url(#arrowhead-normal)"}
                        />
                      );
                    })}
                    {nodes.map((node) => {
                      if (node.x === undefined || node.y === undefined) return null;
                      const nodeActualHeight = node.height; // height already considers showKmsKeyIdTextInCaNode

                      if (node.isKmsNode) {
                        const kmsNode = node as KmsDagreNode;
                        return (
                          <g
                            key={kmsNode.id}
                            transform={`translate(${kmsNode.x - kmsNode.width / 2}, ${kmsNode.y - kmsNode.height / 2})`}
                            className="cursor-default group"
                          >
                            <rect
                              width={kmsNode.width}
                              height={kmsNode.height}
                              rx="6"
                              ry="6"
                              fill={KMS_NODE_COLOR.bg}
                              stroke={KMS_NODE_COLOR.border}
                              strokeWidth="1.5"
                              className="transition-shadow group-hover:shadow-md"
                            />
                            <foreignObject width={kmsNode.width} height={kmsNode.height} x="0" y="0">
                                <div className={cn("p-2 flex flex-col justify-center items-center h-full text-xs", 'namespace-kms-node')}>
                                    <div className="flex items-center mb-0.5">
                                      <ServerIcon size={14} className="mr-1.5" style={{color: KMS_NODE_COLOR.iconColor}} />
                                      <p className="font-semibold truncate" style={{color: KMS_NODE_COLOR.text}} title={kmsNode.kmsId}>KMS Key</p>
                                    </div>
                                    <p className="font-mono truncate text-[10px]" style={{color: KMS_NODE_COLOR.text}} title={kmsNode.kmsId}>
                                      {kmsNode.kmsId}
                                    </p>
                                </div>
                            </foreignObject>
                          </g>
                        );
                      } else {
                        const caNode = node as CaCertDagreNode;
                        const status = getCaCertStatusColors(caNode.caData);
                        const isSelfSignedByCertDef = caNode.caData.issuer === 'Self-signed' || caNode.caData.issuer === caNode.id;

                        return (
                          <g
                            key={caNode.id}
                            transform={`translate(${caNode.x - caNode.width / 2}, ${caNode.y - nodeActualHeight / 2})`}
                            onClick={() => router.push(`/dashboard/certificate-authorities/${caNode.id}/details`)}
                            className="cursor-pointer group"
                          >
                            <rect
                              width={caNode.width}
                              height={nodeActualHeight}
                              rx="8"
                              ry="8"
                              fill="hsl(var(--card))"
                              stroke={status.border}
                              strokeWidth="1.5"
                              className="transition-shadow group-hover:shadow-lg"
                            />
                            <foreignObject width={caNode.width} height={nodeActualHeight} x="0" y="0">
                              <div className={cn("p-2 flex flex-col justify-between h-full text-xs", 'namespace-ca-cert-node')}>
                                 <div>
                                  <div className="flex items-center mb-1">
                                    <Key size={14} className={cn("mr-1.5", status.iconColor)} />
                                    <p className="font-semibold text-foreground truncate" title={caNode.label}>{caNode.label}</p>
                                  </div>
                                  <p className="text-muted-foreground truncate text-[10px]" title={`ID: ${caNode.id}`}>
                                      ID: <span className="font-mono">{caNode.id.substring(0,15)}...</span>
                                  </p>
                                  {isSelfSignedByCertDef && (
                                      <div className="flex items-center text-amber-600 dark:text-amber-400 mt-0.5">
                                          <IterationCcw size={10} className="mr-1" />
                                          <span className="text-[10px]">Self-Signed Cert</span>
                                      </div>
                                  )}
                                  <p className={cn("text-[10px] mt-0.5", status.text)}>{caNode.caData.status.toUpperCase()} &middot; Exp: {formatDistanceToNowStrict(parseISO(caNode.caData.expires))} </p>
                                 </div>
                                  {showKmsKeyIdTextInCaNode && caNode.caData.kmsKeyId && (
                                  <div className="mt-auto pt-1 border-t border-dashed" style={{borderColor: status.border}}>
                                      <p className="text-[10px] font-medium" style={{color: status.text}}>Uses KMS Key:</p>
                                      <p className="text-[10px] font-mono truncate" style={{color: status.text}} title={caNode.caData.kmsKeyId}>
                                      {caNode.caData.kmsKeyId}
                                      </p>
                                  </div>
                                  )}
                              </div>
                            </foreignObject>
                          </g>
                        );
                      }
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

    