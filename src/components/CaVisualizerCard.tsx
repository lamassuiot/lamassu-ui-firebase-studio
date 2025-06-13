
'use client';

import type React from 'react';
import { KeyRound, Award } from 'lucide-react'; // Added Award icon for self-signed
import { formatDistanceToNowStrict, isPast, parseISO } from 'date-fns';
import type { CA } from '@/lib/ca-data';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CaVisualizerCardProps {
  ca: CA;
  className?: string;
  onClick?: (ca: CA) => void;
  showKmsKeyId?: boolean; // New prop
  // kmsKeyId prop is now derived from ca.kmsKeyId
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

export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick, showKmsKeyId }) => {
  const { text: statusBadgeText, badgeClass: statusBadgeStyling } = getStatusDisplayInfo(ca);
  const isSelfSigned = ca.issuer === 'Self-signed' || ca.issuer === ca.id;

  const cardBaseClasses = "flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow w-full";
  const clickableClasses = onClick ? "hover:shadow-md cursor-pointer" : "";

  const cardInnerContent = (
    <>
      <div className={cn("flex items-center space-x-3 p-3", isSelfSigned ? "border-b-2 border-amber-400 dark:border-amber-600" : "")}>
        <div className="flex-shrink-0 p-3 bg-primary/10 rounded-lg">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate" title={ca.name}>{ca.name}</p>
          <p className="text-xs text-muted-foreground truncate" title={`ID: ${ca.id}`}>
            ID: <span className="font-mono">{ca.id}</span>
          </p>
          <div className="flex items-center space-x-1.5 mt-1.5">
            <Badge variant="outline" className={cn("text-xs py-1 px-2.5", statusBadgeStyling)}>
              {statusBadgeText}
            </Badge>
            {isSelfSigned && (
              <Badge variant="secondary" className="text-xs py-1 px-2 bg-amber-100 text-amber-700 dark:bg-amber-700/20 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                <Award className="h-3 w-3 mr-1" /> Self-Signed
              </Badge>
            )}
          </div>
        </div>
      </div>
      {showKmsKeyId && ca.kmsKeyId && (
        <div className="p-2.5 border-t bg-blue-50 dark:bg-blue-900/30">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">KMS Key ID:</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate" title={ca.kmsKeyId}>
            {ca.kmsKeyId}
          </p>
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(ca)}
        className={cn(cardBaseClasses, clickableClasses, className)}
        aria-label={`View details for ${ca.name}`}
      >
        {cardInnerContent}
      </button>
    );
  }

  return (
    <div className={cn(cardBaseClasses, className)}>
      {cardInnerContent}
    </div>
  );
};
