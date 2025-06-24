
'use client';

import type React from 'react';
import { FolderTree, KeyRound, ShieldAlert } from 'lucide-react';
import { isPast, parseISO, formatDistanceToNowStrict } from 'date-fns';
import type { CA } from '@/lib/ca-data';
import { cn } from '@/lib/utils';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { CryptoEngineViewer } from '@/components/shared/CryptoEngineViewer';

interface CaVisualizerCardProps {
  ca: CA;
  className?: string;
  onClick?: (ca: CA) => void;
  allCryptoEngines?: ApiCryptoEngine[];
}

const getExpiryTextAndSimplifiedStatus = (expires: string, status: CA['status']): { text: string; isCritical: boolean } => {
  const expiryDate = parseISO(expires);
  let text = '';
  let isCritical = false;

  if (status === 'revoked') {
    text = `Revoked`;
    isCritical = true;
  } else if (isPast(expiryDate)) {
    text = `Expired ${formatDistanceToNowStrict(expiryDate)} ago`;
    isCritical = true;
  } else {
    text = `Expires in ${formatDistanceToNowStrict(expiryDate)}`;
  }
  
  return { text: `${status.toUpperCase()} \u00B7 ${text}`, isCritical };
};


export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick, allCryptoEngines }) => {
  
  const cardBaseClasses = "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow w-full";
  const clickableClasses = onClick ? "hover:shadow-md hover:bg-muted/50 cursor-pointer" : "";

  const { text: statusText, isCritical } = getExpiryTextAndSimplifiedStatus(ca.expires, ca.status);

  let IconComponent: React.ReactNode;

  if (isCritical) {
    IconComponent = <ShieldAlert className={cn("h-6 w-6 flex-shrink-0", "text-destructive")} />;
  } else if (ca.kmsKeyId) {
    const engine = allCryptoEngines?.find(e => e.id === ca.kmsKeyId);
    if (engine) {
      IconComponent = <CryptoEngineViewer engine={engine} iconOnly className="h-6 w-6 flex-shrink-0" />;
    } else {
      IconComponent = <KeyRound className={cn("h-6 w-6 flex-shrink-0", "text-primary")} />;
    }
  } else {
    IconComponent = <FolderTree className={cn("h-6 w-6 flex-shrink-0", "text-primary")} />;
  }

  const cardInnerContent = (
    <div className={cn("flex items-center space-x-3 p-3")}>
        <div className="flex-shrink-0">
          {IconComponent}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate" title={ca.name}>
            {ca.name}
          </p>
          <p className={cn("text-xs truncate", isCritical ? "text-destructive" : "text-muted-foreground")} title={statusText}>
            {statusText}
          </p>
        </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(ca)}
        className={cn(cardBaseClasses, clickableClasses, className, "text-left")}
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
