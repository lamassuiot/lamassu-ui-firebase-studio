
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

const getExpiryText = (expires: string, status: CA['status']): string => {
  if (status === 'revoked') {
    return 'Revoked';
  }
  const expiryDate = parseISO(expires);
  if (isPast(expiryDate)) {
    return `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
  }
  return `in ${formatDistanceToNowStrict(expiryDate)}`;
};

export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick }) => {
  const expiryText = getExpiryText(ca.expires, ca.status);

  let statusBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let statusBadgeClass = "";

  if (ca.status === 'active' && !isPast(parseISO(ca.expires))) {
    statusBadgeVariant = "secondary";
    statusBadgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
  } else if (ca.status === 'expired' || isPast(parseISO(ca.expires))) {
    statusBadgeVariant = "destructive";
     statusBadgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
  } else if (ca.status === 'revoked') {
    statusBadgeVariant = "destructive";
    statusBadgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
  }

  const cardInnerContent = (
    <>
      <div className="flex-shrink-0 p-3 bg-primary/10 rounded-md">
        <KeyRound className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold text-foreground truncate" title={ca.name}>{ca.name}</p>
        <p className="text-xs text-muted-foreground truncate" title={`ID: ${ca.id}`}>
          ID: <span className="font-mono">{ca.id}</span>
        </p>
        <Badge variant={statusBadgeVariant} className={cn("mt-1 text-xs", statusBadgeClass)}>
          {ca.status.toUpperCase()} &middot; {expiryText}
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
