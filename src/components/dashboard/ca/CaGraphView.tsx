
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { CA } from '@/lib/ca-data';
import * as dagre from '@dagrejs/dagre';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RotateCcw, Key, IterationCcw, Loader2, ServerIcon, Link as LinkIcon, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, formatDistanceToNowStrict, addDays, subDays } from 'date-fns';

interface CaGraphViewProps {
  router: ReturnType<typeof import('next/navigation').useRouter>;
}

// Local helper, as we are not using the one from ca-data which requires the full tree
function findCaById(id: string, cas: CA[]): CA | null {
  if (!id) return null;
  for (const ca of cas) {
    if (ca.id === id) return ca;
    if (ca.children) {
      const found = findCaById(id, ca.children);
      if (found) return found;
    }
  }
  return null;
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
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
  type: 'signs' | 'uses'; 
  [key: string]: any;
}

const KMS_NODE_WIDTH = 220;
const KMS_NODE_HEIGHT = 60;
const CA_CERT_NODE_WIDTH = 280;
const CA_CERT_NODE_HEIGHT = 110;
const CA_CERT_KMS_ID_TEXT_HEIGHT = 20;

const KMS_NODE_THEME = {
  border: 'hsl(260 50% 55%)', // Purple
  bg: 'hsl(260 60% 92%)',     
  text: 'hsl(260 50% 25%)',   
  iconColor: 'hsl(260 50% 50%)'
};

const getCaCertStatusColors = (ca: CA): { border: string, bg: string, text: string, iconColor: string } => {
  const isExpired = isPast(parseISO(ca.expires));
  if (ca.status === 'revoked') return { border: 'hsl(0 72% 51%)', bg: 'hsl(0 72% 92%)', text: 'hsl(0 72% 40%)', iconColor: 'hsl(0 72% 51%)' };
  if (isExpired) return { border: 'hsl(30 80% 55%)', bg: 'hsl(30 80% 92%)', text: 'hsl(30 80% 40%)', iconColor: 'hsl(30 80% 55%)' };
  return { border: 'hsl(210 70% 50%)', bg: 'hsl(210 70% 92%)', text: 'hsl(210 70% 30%)', iconColor: 'hsl(210 70% 50%)' };
};


export const CaGraphView: React.FC<CaGraphViewProps> = ({ router }) => {
  const [showKmsKeyIdTextInCaNode, setShowKmsKeyIdTextInCaNode] = useState(false);
  const [dagreGraph, setDagreGraph] = useState<dagre.graphlib.Graph | null>(null);
  const [layoutRan, setLayoutRan] = useState(false);

  const processedGraph = useMemo(() => {
    // ---- MOCK DATA GENERATION ----
    const mockRootCA1: CA = {
      id: 'mock-root-ca-1',
      name: 'LamassuIoT Global Root CA G1',
      issuer: 'Self-signed',
      expires: addDays(new Date(), 3650).toISOString(),
      serialNumber: '01', status: 'active', keyAlgorithm: 'RSA 4096', signatureAlgorithm: 'SHA512withRSA',
      kmsKeyId: 'kms-root-key-1',
      children: [],
    };
    
    const mockIntermediateCA1: CA = {
      id: 'mock-intermediate-ca-1',
      name: 'Services Intermediate CA',
      issuer: mockRootCA1.id,
      expires: addDays(new Date(), 1825).toISOString(),
      serialNumber: '02', status: 'active', keyAlgorithm: 'ECDSA P-384', signatureAlgorithm: 'SHA384withECDSA',
      kmsKeyId: 'kms-intermediate-key-A',
      children: [],
    };

    const mockLeafCA1: CA = {
      id: 'mock-leaf-ca-1',
      name: 'Device Signing CA (Region EU)',
      issuer: mockIntermediateCA1.id,
      expires: addDays(new Date(), 365).toISOString(),
      serialNumber: '03', status: 'active', keyAlgorithm: 'ECDSA P-256', signatureAlgorithm: 'SHA256withECDSA',
      kmsKeyId: 'kms-leaf-key-eu',
      children: [],
    };
    
    // A second hierarchy
    const mockRootCA2: CA = {
      id: 'mock-root-ca-2',
      name: 'Partner Trust Root CA',
      issuer: 'Self-signed',
      expires: subDays(new Date(), 10).toISOString(), // Expired
      serialNumber: '04', status: 'active', keyAlgorithm: 'RSA 2048', signatureAlgorithm: 'SHA256withRSA',
      kmsKeyId: 'kms-root-key-2',
      children: [],
    };
    
    const mockIntermediateCA2: CA = {
      id: 'mock-intermediate-ca-2',
      name: 'Partner API Issuing CA',
      issuer: mockRootCA2.id,
      expires: addDays(new Date(), 500).toISOString(),
      serialNumber: '05', status: 'revoked', keyAlgorithm: 'ECDSA P-256', signatureAlgorithm: 'SHA256withECDSA',
      kmsKeyId: 'kms-intermediate-key-A', // RE-USED KEY
      children: [],
    };
    
    // Build hierarchy
    mockIntermediateCA1.children?.push(mockLeafCA1);
    mockRootCA1.children?.push(mockIntermediateCA1);
    mockRootCA2.children?.push(mockIntermediateCA2);
    
    const mockCAs = [mockRootCA1, mockRootCA2];
    // ---- END MOCK DATA ----

    setLayoutRan(false); 

    const g = new dagre.graphlib.Graph({ compound: false }); 
    g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50, edgesep: 25 }); 
    g.setDefaultEdgeLabel(() => ({}));

    const flatAllCAs: CA[] = [];
    const stack: CA[] = [...mockCAs];
    while (stack.length > 0) {
      const ca = stack.pop()!;
      flatAllCAs.push(ca);
      if (ca.children) {
        stack.push(...ca.children);
      }
    }

    const uniqueKmsKeyIds = new Set<string>();
    flatAllCAs.forEach(ca => {
      if (ca.kmsKeyId) {
        uniqueKmsKeyIds.add(ca.kmsKeyId);
      }
    });

    uniqueKmsKeyIds.forEach(kmsId => {
      g.setNode(`kms-${kmsId}`, {
        label: `KMS: ${kmsId.substring(0,12)}...`,
        width: KMS_NODE_WIDTH,
        height: KMS_NODE_HEIGHT,
        isKmsNode: true,
        kmsId: kmsId
      } as KmsDagreNode);
    });

    flatAllCAs.forEach(ca => {
      const nodeHeight = CA_CERT_NODE_HEIGHT + (showKmsKeyIdTextInCaNode && ca.kmsKeyId ? CA_CERT_KMS_ID_TEXT_HEIGHT : 0);
      g.setNode(ca.id, {
        label: ca.name,
        width: CA_CERT_NODE_WIDTH,
        height: nodeHeight,
        caData: ca,
        isKmsNode: false
      } as CaCertDagreNode);
    });

    flatAllCAs.forEach(ca => {
      if (ca.kmsKeyId && g.hasNode(`kms-${ca.kmsKeyId}`) && g.hasNode(ca.id)) {
        g.setEdge(`kms-${ca.kmsKeyId}`, ca.id, { 
          label: 'certified',
          type: 'uses',
        });
      }
      
      if (ca.issuer && ca.issuer !== 'Self-signed' && ca.issuer !== ca.id) {
        const issuerCa = findCaById(ca.issuer, mockCAs);
        if (issuerCa && issuerCa.kmsKeyId && g.hasNode(`kms-${issuerCa.kmsKeyId}`) && g.hasNode(ca.id)) {
          g.setEdge(`kms-${issuerCa.kmsKeyId}`, ca.id, { 
            label: 'signed by',
            type: 'signs', 
          });
        }
      }
    });

    dagre.layout(g);
    return g;
  }, [showKmsKeyIdTextInCaNode]);

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

  const graphWidth = dagreGraph.graph().width || 800;
  const graphHeight = dagreGraph.graph().height || 600;

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
          <Key className="h-4 w-4 text-muted-foreground" />
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
              <TransformComponent
                wrapperStyle={{ width: '100%', height: '100%' }}
                contentStyle={{ width: graphWidth, height: graphHeight }}
              >
                <svg width={graphWidth} height={graphHeight}>
                  <defs>
                    <marker id="arrowhead-uses-key" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={KMS_NODE_THEME.border} />
                    </marker>
                     <marker id="arrowhead-signs-cert" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(210 70% 50%)" />
                    </marker>
                  </defs>
                  <g>
                    {edges.map((edge, i) => {
                       if (!edge.points || edge.points.length < 2) return null;
                       
                        let pathData = `M ${edge.points[0].x},${edge.points[0].y}`;
                        for (let j = 0; j < edge.points.length - 1; j++) {
                            const p1 = edge.points[j];
                            const p2 = edge.points[j + 1];
                            // Vertical-Horizontal routing for 90-degree angles
                            pathData += ` L ${p1.x},${p2.y} L ${p2.x},${p2.y}`;
                        }

                      return (
                        <g key={`edge-group-${i}-${edge.v}-${edge.w}`}>
                           <path
                              d={pathData}
                              strokeWidth="2"
                              fill="none"
                              stroke={edge.type === 'uses' ? KMS_NODE_THEME.border : 'hsl(210 70% 50%)'}
                              strokeDasharray={edge.type === 'uses' ? '6,4' : 'none'}
                              markerEnd={edge.type === 'uses' ? "url(#arrowhead-uses-key)" : "url(#arrowhead-signs-cert)"}
                           />
                           {edge.label && edge.x && edge.y && (
                            <g transform={`translate(${edge.x}, ${edge.y})`}>
                              <rect
                                x={-((edge.width || 0) / 2) - 4}
                                y={-((edge.height || 0) / 2) - 2}
                                width={(edge.width || 0) + 8}
                                height={(edge.height || 0) + 4}
                                fill="hsl(var(--background))"
                                opacity="0.8"
                              />
                               <text
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fill="hsl(var(--foreground))"
                                  fontSize="10px"
                                  fontWeight="500"
                              >
                                  {edge.label}
                              </text>
                            </g>
                           )}
                        </g>
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
                            className="cursor-pointer group" 
                             onClick={() => router.push(`/kms/keys/details?keyId=${kmsNode.kmsId}`)}
                          >
                            <rect
                              width={kmsNode.width}
                              height={kmsNode.height}
                              rx="6"
                              ry="6"
                              fill={KMS_NODE_THEME.bg}
                              stroke={KMS_NODE_THEME.border}
                              strokeWidth="1.5"
                              className="transition-shadow group-hover:shadow-md"
                            />
                            <foreignObject width={kmsNode.width} height={kmsNode.height} x="0" y="0">
                                <div className={cn("p-2 flex flex-col justify-center items-center h-full text-xs", 'namespace-kms-node')}>
                                    <div className="flex items-center mb-0.5">
                                      <Key size={18} className="mr-1.5 flex-shrink-0" style={{color: KMS_NODE_THEME.iconColor}} />
                                      <p className="font-semibold truncate text-sm" style={{color: KMS_NODE_THEME.text}} title={kmsNode.kmsId}>
                                        KMS Key
                                      </p>
                                    </div>
                                    <p className="font-mono truncate text-[10px]" style={{color: KMS_NODE_THEME.text, opacity: 0.8}} title={kmsNode.kmsId}>
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
                            onClick={() => router.push(`/certificate-authorities/details?caId=${caNode.id}`)}
                            className="cursor-pointer group"
                          >
                            <rect
                              width={caNode.width}
                              height={nodeActualHeight}
                              rx="8"
                              ry="8"
                              fill={statusColors.bg}
                              stroke={statusColors.border}
                              strokeWidth="1.5"
                              className="transition-shadow group-hover:shadow-lg"
                            />
                            <foreignObject width={caNode.width} height={nodeActualHeight} x="0" y="0">
                              <div className={cn("p-2.5 flex flex-col justify-between h-full text-xs", 'namespace-ca-cert-node')}>
                                 <div>
                                  <div className="flex items-center mb-1">
                                    <Fingerprint size={16} className="mr-1.5 flex-shrink-0" style={{color: statusColors.iconColor}} />
                                    <p className="font-semibold text-sm truncate" style={{color: statusColors.text}} title={caNode.label}>{caNode.label}</p>
                                  </div>
                                  <p className="truncate text-[10px]" style={{color: cn(statusColors.text, 'opacity-70')}} title={`ID: ${caNode.id}`}>
                                      ID: <span className="font-mono">{caNode.id}</span>
                                  </p>
                                  {isSelfSignedByCertDef && (
                                      <div className="flex items-center mt-0.5" style={{color: statusColors.iconColor, opacity: 0.8}}>
                                          <IterationCcw size={11} className="mr-1 flex-shrink-0" />
                                          <span className="text-[10px] font-medium">Self-Signed Cert</span>
                                      </div>
                                  )}
                                  <p className={cn("text-[10px] mt-0.5 font-medium")} style={{color: statusColors.text}}>{caNode.caData.status.toUpperCase()} &middot; Exp: {formatDistanceToNowStrict(parseISO(caNode.caData.expires))} </p>
                                 </div>
                                  {showKmsKeyIdTextInCaNode && caNode.caData.kmsKeyId && (
                                  <div className="mt-auto pt-1 border-t border-dashed" style={{borderColor: cn(statusColors.border, 'opacity-40')}}>
                                      <p className="text-[10px] font-medium" style={{color: statusColors.text, opacity: 0.9}}>Uses KMS Key:</p>
                                      <p className="text-[10px] font-mono truncate" style={{color: statusColors.text, opacity: 0.7}} title={caNode.caData.kmsKeyId}>
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
