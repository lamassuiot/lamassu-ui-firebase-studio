
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import * as dagre from '@dagrejs/dagre';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Key, IterationCcw, Loader2, ServerIcon } from 'lucide-react';
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
  type: 'signs' | 'issues'; // 'signs' for KMS->CA, 'issues' for CA->CA
  style?: string;
  arrowhead?: string;
  [key: string]: any;
}

const KMS_NODE_WIDTH = 220;
const KMS_NODE_HEIGHT = 60; // Slightly increased height for better text fit
const CA_CERT_NODE_WIDTH = 280;
const CA_CERT_NODE_HEIGHT = 110; // Base height for CA cert node
const CA_CERT_KMS_ID_TEXT_HEIGHT = 20;

// New color scheme for KMS Nodes (Green)
const KMS_NODE_THEME = {
  border: 'hsl(120 50% 40%)', // Darker Green
  bg: 'hsl(120 60% 88%)',     // Lighter Green
  text: 'hsl(120 50% 25%)',   // Dark Green for text
  iconColor: 'hsl(120 50% 45%)'// Medium Green for icon
};

// Updated function for CA Certificate Node colors (Blue for active)
const getCaCertStatusColors = (ca: CA): { border: string, bg: string, text: string, iconColor: string } => {
  const isExpired = isPast(parseISO(ca.expires));
  if (ca.status === 'revoked') return { border: 'hsl(0 72% 51%)', bg: 'hsl(0 72% 51% / 0.1)', text: 'hsl(0 72% 51%)', iconColor: 'hsl(0 72% 51%)' };
  if (isExpired) return { border: 'hsl(30 80% 55%)', bg: 'hsl(30 80% 55% / 0.1)', text: 'hsl(30 80% 55%)', iconColor: 'hsl(30 80% 55%)' };
  // Active CA Certs are Blue
  return { border: 'hsl(210 70% 45%)', bg: 'hsl(210 70% 90%)', text: 'hsl(210 70% 30%)', iconColor: 'hsl(210 70% 50%)' };
};


export const CaGraphView: React.FC<CaGraphViewProps> = ({ router, allCAs }) => {
  const [showKmsKeyIdTextInCaNode, setShowKmsKeyIdTextInCaNode] = useState(false);
  const [dagreGraph, setDagreGraph] = useState<dagre.graphlib.Graph | null>(null);
  const [layoutRan, setLayoutRan] = useState(false);

  const processedGraph = useMemo(() => {
    if (!allCAs || allCAs.length === 0) return null;
    setLayoutRan(false); 

    const g = new dagre.graphlib.Graph({ compound: false }); 
    g.setGraph({ rankdir: 'TB', ranksep: 70, nodesep: 40, edgesep: 20 }); // Adjusted spacing slightly
    g.setDefaultEdgeLabel(() => ({}));

    const uniqueKmsKeyIds = new Set<string>();
    allCAs.forEach(ca => {
      if (ca.kmsKeyId) {
        uniqueKmsKeyIds.add(ca.kmsKeyId);
      }
    });

    uniqueKmsKeyIds.forEach(kmsId => {
      g.setNode(`kms-${kmsId}`, {
        label: `KMS Key: ${kmsId.substring(0,15)}${kmsId.length > 15 ? '...' : ''}`, // Shortened display
        width: KMS_NODE_WIDTH,
        height: KMS_NODE_HEIGHT,
        isKmsNode: true,
        kmsId: kmsId
      } as KmsDagreNode);
    });

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

    allCAs.forEach(ca => {
      if (ca.kmsKeyId && g.hasNode(`kms-${ca.kmsKeyId}`) && g.hasNode(ca.id)) {
         if (!g.outEdges(`kms-${ca.kmsKeyId}`)?.some(edge => edge.w === ca.id)) {
            g.setEdge(`kms-${ca.kmsKeyId}`, ca.id, { 
              type: 'signs', 
              style: `stroke: ${KMS_NODE_THEME.border}; stroke-dasharray: 5,5;`, // Dashed line for KMS signing
              arrowhead: 'kms_signs' 
            } as DagreEdge);
         }
      }

      if (ca.issuer && ca.issuer !== 'Self-signed' && ca.issuer !== ca.id && g.hasNode(ca.issuer) && g.hasNode(ca.id)) {
        if (!g.outEdges(ca.issuer)?.some(edge => edge.w === ca.id)) {
           g.setEdge(ca.issuer, ca.id, { 
             type: 'issues', 
             style: `stroke: hsl(var(--border));`, 
             arrowhead: 'ca_issues' 
            } as DagreEdge);
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
    return { ...edge, v: edgeObj.v, w: edgeObj.w } as DagreEdge; 
  });


  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-muted/10">
      <div className="p-2 border-b bg-background flex items-center justify-between sticky top-0 z-20">
        <div></div>
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
                    <marker id="arrowhead-kms-signs" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={KMS_NODE_THEME.border} />
                    </marker>
                     <marker id="arrowhead-ca-issues" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
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
                          style={{ 
                            stroke: edge.type === 'signs' ? KMS_NODE_THEME.border : 'hsl(var(--border))', 
                            strokeDasharray: edge.type === 'signs' ? '5,5' : 'none' 
                          }}
                          markerEnd={edge.arrowhead === 'ca_issues' ? "url(#arrowhead-ca-issues)" : "url(#arrowhead-kms-signs)"}
                        />
                      );
                    })}
                    {nodes.map((node) => {
                      if (node.x === undefined || node.y === undefined) return null;
                      const nodeActualHeight = node.height;

                      if (node.isKmsNode) {
                        const kmsNode = node as KmsDagreNode;
                        return (
                          <g
                            key={kmsNode.id}
                            transform={`translate(${kmsNode.x - kmsNode.width / 2}, ${kmsNode.y - kmsNode.height / 2})`}
                            className="cursor-default group"
                             onClick={() => router.push(`/dashboard/kms/keys/${kmsNode.kmsId}`)}
                          >
                            <rect
                              width={kmsNode.width}
                              height={kmsNode.height}
                              rx="6"
                              ry="6"
                              fill={KMS_NODE_THEME.bg}
                              stroke={KMS_NODE_THEME.border}
                              strokeWidth="2" // Make border slightly thicker
                              className="transition-shadow group-hover:shadow-md"
                            />
                            <foreignObject width={kmsNode.width} height={kmsNode.height} x="0" y="0">
                                <div className={cn("p-2 flex flex-col justify-center items-center h-full text-xs", 'namespace-kms-node')}>
                                    <div className="flex items-center mb-0.5">
                                      <ServerIcon size={16} className="mr-1.5" style={{color: KMS_NODE_THEME.iconColor}} />
                                      <p className="font-semibold truncate text-base" style={{color: KMS_NODE_THEME.text}} title={kmsNode.kmsId}>
                                        {/* Heuristic for display name - replace with actual alias if available */}
                                        {kmsNode.kmsId.includes('prod') ? 'Key-PROD' : kmsNode.kmsId.includes('iot') ? 'Key-IoT' : 'KMS Key'}
                                      </p>
                                    </div>
                                    <p className="font-mono truncate text-[10px]" style={{color: KMS_NODE_THEME.text}} title={kmsNode.kmsId}>
                                      {kmsNode.kmsId}
                                    </p>
                                </div>
                            </foreignObject>
                          </g>
                        );
                      } else {
                        const caNode = node as CaCertDagreNode;
                        const statusColors = getCaCertStatusColors(caNode.caData);
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
                              fill={statusColors.bg}
                              stroke={statusColors.border}
                              strokeWidth="2" // Make border slightly thicker
                              className="transition-shadow group-hover:shadow-lg"
                            />
                            <foreignObject width={caNode.width} height={nodeActualHeight} x="0" y="0">
                              <div className={cn("p-2.5 flex flex-col justify-between h-full text-xs", 'namespace-ca-cert-node')}>
                                 <div>
                                  <div className="flex items-center mb-1">
                                    <Key size={16} className="mr-1.5" style={{color: statusColors.iconColor}} />
                                    <p className="font-semibold text-base truncate" style={{color: statusColors.text}} title={caNode.label}>{caNode.label}</p>
                                  </div>
                                  <p className="truncate text-[10px]" style={{color: cn(statusColors.text, 'opacity-80')}} title={`ID: ${caNode.id}`}>
                                      ID: <span className="font-mono">{caNode.id.substring(0,15)}...</span>
                                  </p>
                                  {isSelfSignedByCertDef && (
                                      <div className="flex items-center mt-0.5" style={{color: statusColors.iconColor, opacity: 0.9}}>
                                          <IterationCcw size={11} className="mr-1" />
                                          <span className="text-[10px]">Self-Signed Cert</span>
                                      </div>
                                  )}
                                  <p className={cn("text-[10px] mt-0.5 font-medium")} style={{color: statusColors.text}}>{caNode.caData.status.toUpperCase()} &middot; Exp: {formatDistanceToNowStrict(parseISO(caNode.caData.expires))} </p>
                                 </div>
                                  {showKmsKeyIdTextInCaNode && caNode.caData.kmsKeyId && (
                                  <div className="mt-auto pt-1 border-t border-dashed" style={{borderColor: cn(statusColors.border, 'opacity-50')}}>
                                      <p className="text-[10px] font-medium" style={{color: statusColors.text}}>Uses KMS Key:</p>
                                      <p className="text-[10px] font-mono truncate" style={{color: statusColors.text, opacity: 0.8}} title={caNode.caData.kmsKeyId}>
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

    
