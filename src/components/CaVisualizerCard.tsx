
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
  let statusText = '';
  let badgeClass = '';

  if (ca.status === 'revoked') {
    statusText = `Revoked`;
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
  } else if (isPast(expiryDate)) {
    statusText = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
  } else {
    statusText = `Expires in ${formatDistanceToNowStrict(expiryDate)}`;
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
  }
  
  return { text: `${ca.status.toUpperCase()} \u00B7 ${statusText}`, badgeClass };
};

export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick }) => {
  const { text: statusBadgeText, badgeClass: statusBadgeStyling } = getStatusDisplayInfo(ca);

  const cardInnerContent = (
    <>
      <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
        <KeyRound className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate" title={ca.name}>{ca.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`ID: ${ca.id}`}>
          ID: <span className="font-mono">{ca.id}</span>
        </p>
        <Badge variant="outline" className={cn("mt-1.5 text-xs py-1 px-2.5", statusBadgeStyling)}>
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
