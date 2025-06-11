
'use client';

import type React from 'react';
import { KeyRound } from 'lucide-react';
import { formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import type { CA } from '@/lib/ca-data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CaVisualizerCardProps {
  ca: CA;
  className?: string;
  onClick?: (ca: CA) => void;
}

interface StatusDisplayInfo {
  text: string;
  badgeClass: string;
}

const getStatusDisplayInfo = (ca: CA): StatusDisplayInfo => {
  const expiryDate = parseISO(ca.expires);
  let statusLabel = ca.status.toUpperCase();
  let detailText = '';
  let badgeClass = '';

  if (ca.status === 'revoked') {
    detailText = 'Revoked';
    badgeClass = "bg-red-500 text-white hover:bg-red-500/90 border-transparent";
  } else if (isPast(expiryDate)) {
    statusLabel = 'EXPIRED';
    detailText = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    badgeClass = "bg-orange-100 text-orange-700 hover:bg-orange-100/90 border-orange-300 dark:bg-orange-700/30 dark:text-orange-300 dark:border-orange-700";
  } else {
    statusLabel = 'ACTIVE';
    detailText = `in ${formatDistanceToNowStrict(expiryDate)}`;
    badgeClass = "bg-green-500 text-white hover:bg-green-500/90 border-transparent";
  }
  
  return { text: `${statusLabel} - ${detailText}`, badgeClass };
};

export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick }) => {
  const { text: statusBadgeText, badgeClass: statusBadgeStyling } = getStatusDisplayInfo(ca);

  const cardInnerContent = (
    <>
      <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-sky-700/40 rounded-lg">
        <KeyRound className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate" title={ca.name}>{ca.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`ID: ${ca.id}`}>
          ID: <span className="font-mono">{ca.id}</span>
        </p>
        <Badge variant="default" className={cn("mt-1.5 text-xs py-1 px-2.5", statusBadgeStyling)}>
          {statusBadgeText}
        </Badge>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(ca)}
        className={cn(
          "flex items-center space-x-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow w-full text-left",
          className
        )}
        aria-label={`View details for ${ca.name}`}
      >
        {cardInnerContent}
      </button>
    );
  }

  return (
    <div className={cn("flex items-center space-x-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {cardInnerContent}
    </div>
  );
};
