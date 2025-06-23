
'use client';

import React from 'react';
import type { CA } from '@/lib/ca-data';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, ChevronDown, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, parseISO, formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CaHierarchyPathNodeProps {
  ca: CA;
  isCurrentCa: boolean;
  hasNext: boolean;
  isFirst: boolean; // Though not directly used for arrow logic within this component anymore, kept for context
  isDimmed?: boolean; 
}

const getStatusVisuals = (ca: CA, isCurrentCa: boolean): { icon: React.ElementType, colorClass: string, text: string } => {
  const expiryDate = parseISO(ca.expires);
  let statusText = '';
  let icon: React.ElementType = Clock;
  let colorClass = 'text-muted-foreground';

  if (ca.status === 'revoked') {
    statusText = 'Revoked';
    icon = XCircle;
    colorClass = 'text-destructive';
  } else if (isPast(expiryDate)) {
    statusText = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    icon = XCircle;
    colorClass = 'text-orange-500';
  } else {
    statusText = `Active, expires in ${formatDistanceToNowStrict(expiryDate)}`;
    icon = isCurrentCa ? CheckCircle : Clock; 
    colorClass = isCurrentCa ? 'text-green-500' : 'text-primary';
  }
  return { icon, colorClass, text: statusText };
};

export const CaHierarchyPathNode: React.FC<CaHierarchyPathNodeProps> = ({ ca, isCurrentCa, hasNext, isFirst, isDimmed }) => {
  const router = useRouter();
  const { icon: StatusIcon, colorClass: statusColorClass, text: statusText } = getStatusVisuals(ca, isCurrentCa);

  const handleNodeClick = () => {
    if (!isCurrentCa) { 
      router.push(`/certificate-authorities/details?caId=${ca.id}`);
    }
  };

  const effectiveDim = isDimmed && !isCurrentCa;

  return (
    <div className="relative flex flex-col items-center group w-full">
      {/* Arrow before node has been removed */}
      <div
        className={cn(
          "w-full max-w-sm border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow",
          isCurrentCa ? "bg-primary/10 border-primary shadow-lg" : "bg-card",
          !isCurrentCa && "cursor-pointer",
          effectiveDim && "opacity-60 hover:opacity-80"
        )}
        onClick={handleNodeClick}
        role={!isCurrentCa ? "button" : undefined}
        tabIndex={!isCurrentCa ? 0 : undefined}
        onKeyDown={(e) => { if (!isCurrentCa && (e.key === 'Enter' || e.key === ' ')) handleNodeClick();}}
      >
        <div className={cn("flex items-center space-x-3")}>
          <div className={cn("p-2 rounded-full", isCurrentCa ? "bg-primary/20" : "bg-muted")}>
            <Landmark className={cn("h-5 w-5", isCurrentCa ? "text-primary" : "text-muted-foreground", effectiveDim && !isCurrentCa && "text-muted-foreground/70" )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold truncate", isCurrentCa ? "text-primary" : "text-foreground", effectiveDim && !isCurrentCa && "text-muted-foreground" )}>
              {ca.name}
            </p>
            <p className={cn("text-xs text-muted-foreground truncate", effectiveDim && !isCurrentCa && "text-muted-foreground/70")}>ID: {ca.id}</p>
          </div>
          <StatusIcon className={cn("h-5 w-5 flex-shrink-0", effectiveDim && !isCurrentCa ? "text-muted-foreground/70" : statusColorClass)} title={statusText} />
        </div>
      </div>
      {hasNext && (
        <ChevronDown className={cn("h-5 w-5 text-border my-1", effectiveDim && "opacity-60")} />
      )}
      {!hasNext && <div className="h-2"></div>} {/* Add a small spacer if it's the last item */}
    </div>
  );
};
