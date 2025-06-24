
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Key, Fingerprint, IterationCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, formatDistanceToNowStrict, addDays, subDays } from 'date-fns';

interface CaGraphViewProps {
  router: ReturnType<typeof import('next/navigation').useRouter>;
}

// --- MOCK DATA AND LAYOUT DEFINITION ---

interface MockKmsKey {
  id: string;
  name: string;
  x: number;
  y: number;
}

// We extend the base CA type for our mock data
interface MockCaNode extends CA {
  x: number;
  y: number;
}

interface MockEdge {
  from: string; // ID of source node
  to: string;   // ID of target node
  type: 'uses' | 'signs'; // 'uses' is dashed, 'signs' is solid
  path: string; // SVG path data 'd' attribute
}

const KMS_NODE_WIDTH = 180;
const KMS_NODE_HEIGHT = 50;
const CA_NODE_WIDTH = 240;
const CA_NODE_HEIGHT = 80;

// Manually positioned nodes to match the image
const mockKmsKeys: MockKmsKey[] = [
  { id: 'kms-root-key-2', name: 'kms-root-key-2', x: 120, y: 50 },
  { id: 'kms-intermediate-key-A', name: 'kms-intermediate-key-A', x: 400, y: 50 },
  { id: 'kms-leaf-key-eu', name: 'kms-leaf-key-eu', x: 680, y: 50 },
  { id: 'kms-root-key-1', name: 'kms-root-key-1', x: 960, y: 50 },
  // Adding a conceptual key for the LamassuIoT Root for logical consistency, though not in the original image.
  { id: 'kms-lamassu-root-key', name: 'kms-lamassu-root-key', x: 1240, y: 50 },
];

const mockCas: MockCaNode[] = [
  {
    id: 'mock-root-ca-2', name: 'Partner Trust Root CA', issuer: 'Self-signed',
    expires: subDays(new Date(), 10).toISOString(), serialNumber: '04', status: 'active', // Status is active, but expiry is in the past
    keyAlgorithm: 'RSA 2048', signatureAlgorithm: 'SHA256withRSA', kmsKeyId: 'kms-root-key-2',
    x: 120, y: 250,
  },
  {
    id: 'mock-intermediate-ca-2', name: 'Partner API Issuing CA', issuer: 'mock-root-ca-2',
    expires: addDays(new Date(), 365).toISOString(), serialNumber: '05', status: 'revoked',
    keyAlgorithm: 'ECDSA P-256', signatureAlgorithm: 'SHA256withECDSA', kmsKeyId: 'kms-intermediate-key-A',
    x: 400, y: 250,
  },
  {
    id: 'mock-leaf-ca-1', name: 'Device Signing CA (Region EU)', issuer: 'mock-intermediate-ca-2',
    expires: addDays(new Date(), 365).toISOString(), serialNumber: '03', status: 'active',
    keyAlgorithm: 'ECDSA P-256', signatureAlgorithm: 'SHA256withECDSA', kmsKeyId: 'kms-leaf-key-eu',
    x: 680, y: 250,
  },
  {
    id: 'mock-intermediate-ca-1', name: 'Services Intermediate CA', issuer: 'mock-root-ca-1',
    expires: addDays(new Date(), 1825).toISOString(), serialNumber: '02', status: 'active',
    keyAlgorithm: 'ECDSA P-384', signatureAlgorithm: 'SHA384withECDSA', kmsKeyId: 'kms-root-key-1', // Note: This CA is signed by root-key-1 but USES its own key logically, here simplified for vis.
    x: 960, y: 250,
  },
  {
    id: 'mock-root-ca-1', name: 'LamassuIoT Global Root CA', issuer: 'Self-signed',
    expires: addDays(new Date(), 3650).toISOString(), serialNumber: '01', status: 'active',
    keyAlgorithm: 'RSA 4096', signatureAlgorithm: 'SHA512withRSA', kmsKeyId: 'kms-lamassu-root-key',
    x: 1240, y: 250,
  },
];

// Manually defined paths for edges to match the image
const mockEdges: MockEdge[] = [
  // --- Dashed lines ("uses" own key) ---
  { from: 'kms-root-key-2', to: 'mock-root-ca-2', type: 'uses', path: `M 120,${50 + KMS_NODE_HEIGHT / 2} V ${250 - CA_NODE_HEIGHT / 2}` },
  { from: 'kms-intermediate-key-A', to: 'mock-intermediate-ca-2', type: 'uses', path: `M 400,${50 + KMS_NODE_HEIGHT / 2} V ${250 - CA_NODE_HEIGHT / 2}` },
  { from: 'kms-leaf-key-eu', to: 'mock-leaf-ca-1', type: 'uses', path: `M 680,${50 + KMS_NODE_HEIGHT / 2} V ${250 - CA_NODE_HEIGHT / 2}` },
  { from: 'kms-root-key-1', to: 'mock-intermediate-ca-1', type: 'uses', path: `M 960,${50 + KMS_NODE_HEIGHT / 2} V ${250 - CA_NODE_HEIGHT / 2}` },
  { from: 'kms-lamassu-root-key', to: 'mock-root-ca-1', type: 'uses', path: `M 1240,${50 + KMS_NODE_HEIGHT / 2} V ${250 - CA_NODE_HEIGHT / 2}` },
  
  // --- Solid lines ("signed by" issuer's key) ---
  { from: 'kms-root-key-2', to: 'mock-intermediate-ca-2', type: 'signs', path: `M ${120 + KMS_NODE_WIDTH / 2}, 75 H 260 V 170 H ${400 - CA_NODE_WIDTH / 2}` },
  { from: 'kms-intermediate-key-A', to: 'mock-leaf-ca-1', type: 'signs', path: `M ${400 + KMS_NODE_WIDTH / 2}, 75 H 540 V 170 H ${680 - CA_NODE_WIDTH / 2}` },
  // This edge represents Lamassu Root's key signing the Services Intermediate
  { from: 'kms-lamassu-root-key', to: 'mock-intermediate-ca-1', type: 'signs', path: `M ${1240 - KMS_NODE_WIDTH/2}, 75 H 1100 V 170 H ${960 + CA_NODE_WIDTH / 2}` },
];


const getCaCertStatusColors = (ca: CA): { border: string, bg: string, text: string, iconColor: string } => {
  const isEventExpired = isPast(parseISO(ca.expires));
  if (ca.status === 'revoked') return { border: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 84%, 97%)', text: 'hsl(0, 72%, 40%)', iconColor: 'hsl(0, 72%, 51%)' };
  if (isEventExpired) return { border: 'hsl(38, 92%, 50%)', bg: 'hsl(48, 94%, 97%)', text: 'hsl(25, 80%, 40%)', iconColor: 'hsl(38, 92%, 50%)' };
  return { border: 'hsl(217, 91%, 60%)', bg: 'hsl(220, 89%, 97%)', text: 'hsl(217, 91%, 30%)', iconColor: 'hsl(217, 91%, 60%)' };
};

const KMS_NODE_THEME = {
  border: 'hsl(262, 52%, 52%)', bg: 'hsl(262, 85%, 97%)', text: 'hsl(262, 52%, 25%)', iconColor: 'hsl(262, 52%, 52%)'
};

const GRAPH_WIDTH = 1480;
const GRAPH_HEIGHT = 400;

export const CaGraphView: React.FC<CaGraphViewProps> = ({ router }) => {

  return (
    <div className="w-full h-[calc(100vh-250px)] border rounded-md relative overflow-hidden flex flex-col bg-muted/10">
      <div className="flex-grow relative">
        <TransformWrapper initialScale={0.8} minScale={0.1} maxScale={3} centerOnInit limitToBounds={false}>
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
                <svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
                  <defs>
                    <marker id="arrowhead-solid" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="hsl(217, 91%, 60%)" />
                    </marker>
                     <marker id="arrowhead-dashed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill={KMS_NODE_THEME.border} />
                    </marker>
                  </defs>
                  <g>
                    {mockEdges.map((edge, i) => (
                      <path
                        key={`edge-${i}`}
                        d={edge.path}
                        stroke={edge.type === 'uses' ? KMS_NODE_THEME.border : 'hsl(217, 91%, 60%)'}
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray={edge.type === 'uses' ? "5,5" : "none"}
                        markerEnd={edge.type === 'uses' ? "url(#arrowhead-dashed)" : "url(#arrowhead-solid)"}
                      />
                    ))}

                    {mockKmsKeys.map((node) => (
                      <g
                        key={node.id}
                        transform={`translate(${node.x - KMS_NODE_WIDTH / 2}, ${node.y - KMS_NODE_HEIGHT / 2})`}
                        className="cursor-pointer group"
                        onClick={() => router.push(`/kms/keys/details?keyId=${node.name}`)}
                      >
                        <rect
                          width={KMS_NODE_WIDTH}
                          height={KMS_NODE_HEIGHT}
                          rx="6"
                          ry="6"
                          fill={KMS_NODE_THEME.bg}
                          stroke={KMS_NODE_THEME.border}
                          strokeWidth="1.5"
                          className="transition-shadow group-hover:shadow-md"
                        />
                        <foreignObject width={KMS_NODE_WIDTH} height={KMS_NODE_HEIGHT} x="0" y="0">
                          <div className="p-2 flex items-center h-full text-xs">
                            <Key size={20} className="mr-2 flex-shrink-0" style={{ color: KMS_NODE_THEME.iconColor }} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm" style={{ color: KMS_NODE_THEME.text }}>KMS Key</p>
                                <p className="font-mono truncate" style={{ color: KMS_NODE_THEME.text, opacity: 0.8 }} title={node.name}>{node.name}</p>
                            </div>
                          </div>
                        </foreignObject>
                      </g>
                    ))}

                    {mockCas.map((node) => {
                      const statusColors = getCaCertStatusColors(node);
                      const isSelfSigned = node.issuer === 'Self-signed';
                       const isExpired = isPast(parseISO(node.expires));

                      let expiryText = '';
                      let statusDisplay = node.status.toUpperCase();

                      if (node.status === 'revoked') {
                          expiryText = `Exp: ${formatDistanceToNowStrict(parseISO(node.expires))}`;
                      } else if (isExpired) {
                          statusDisplay = 'ACTIVE'; // As per image, status can be active but expired
                          expiryText = `Expired ${formatDistanceToNowStrict(parseISO(node.expires))} ago`;
                      } else {
                          expiryText = `Exp: ${formatDistanceToNowStrict(parseISO(node.expires))}`;
                      }

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x - CA_NODE_WIDTH / 2}, ${node.y - CA_NODE_HEIGHT / 2})`}
                          className="cursor-pointer group"
                          onClick={() => router.push(`/certificate-authorities/details?caId=${node.id}`)}
                        >
                          <rect
                            width={CA_NODE_WIDTH}
                            height={CA_NODE_HEIGHT}
                            rx="8"
                            ry="8"
                            fill={statusColors.bg}
                            stroke={statusColors.border}
                            strokeWidth="2"
                            className="transition-shadow group-hover:shadow-lg"
                          />
                          <foreignObject width={CA_NODE_WIDTH} height={CA_NODE_HEIGHT} x="0" y="0">
                            <div className="p-2.5 flex flex-col justify-center h-full text-xs">
                                <div className="flex items-center mb-1">
                                  <Fingerprint size={16} className="mr-1.5 flex-shrink-0" style={{ color: statusColors.iconColor }} />
                                  <p className="font-semibold text-sm truncate" style={{ color: statusColors.text }} title={node.name}>{node.name}</p>
                                </div>
                                
                                {isSelfSigned ? (
                                    <div className="flex items-center text-[11px] font-medium" style={{ color: cn(statusColors.text, 'opacity-80') }}>
                                        <IterationCcw size={11} className="mr-1 flex-shrink-0" />
                                        Self-Signed Cert
                                    </div>
                                ) : (
                                    <p className="text-[11px] truncate" style={{ color: cn(statusColors.text, 'opacity-70') }} title={`ID: ${node.id}`}>
                                        ID: <span className="font-mono">{node.id}</span>
                                    </p>
                                )}

                                <p className="text-[11px] font-medium" style={{ color: statusColors.text, opacity: 0.9 }}>
                                    {statusDisplay} &middot; {expiryText}
                                </p>
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
