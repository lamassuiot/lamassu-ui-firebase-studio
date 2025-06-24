
'use client';

import type React from 'react';
import { CheckCircle, AlertTriangle, XCircle, FolderTree, KeyRound, ShieldAlert } from 'lucide-react';
import { isPast, parseISO } from 'date-fns';
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

const CaStatusIcon: React.FC<{ status: CA['status'], expires: string }> = ({ status, expires }) => {
    const isExpired = isPast(parseISO(expires));
  
    if (status === 'revoked') {
      return <XCircle className="h-6 w-6 text-red-500" aria-label="Status: Revoked" />;
    }
    if (isExpired) {
      return <AlertTriangle className="h-6 w-6 text-orange-500" aria-label="Status: Expired" />;
    }
    return <CheckCircle className="h-6 w-6 text-green-500" aria-label="Status: Active" />;
};


export const CaVisualizerCard: React.FC<CaVisualizerCardProps> = ({ ca, className, onClick, allCryptoEngines }) => {
  
  const cardBaseClasses = "flex flex-col rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-900/20 text-card-foreground shadow-sm transition-shadow w-full";
  const clickableClasses = onClick ? "hover:shadow-md cursor-pointer" : "";

  const isCritical = ca.status === 'revoked' || isPast(parseISO(ca.expires));
  let IconComponent: React.ReactNode;
  const iconColorClass = "text-blue-600 dark:text-blue-300";

  if (isCritical) {
    IconComponent = <ShieldAlert className={cn("h-6 w-6", "text-destructive")} />;
  } else if (ca.kmsKeyId) {
    const engine = allCryptoEngines?.find(e => e.id === ca.kmsKeyId);
    if (engine) {
      IconComponent = <CryptoEngineViewer engine={engine} iconOnly className="h-6 w-6" />;
    } else {
      IconComponent = <KeyRound className={cn("h-6 w-6", iconColorClass)} />;
    }
  } else {
    IconComponent = <FolderTree className={cn("h-6 w-6", iconColorClass)} />;
  }

  const cardInnerContent = (
    <div className={cn("flex items-center space-x-3 p-3")}>
        <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          {IconComponent}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-blue-800 dark:text-blue-200 truncate" title={ca.name}>{ca.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={`ID: ${ca.id}`}>
            ID: <span className="font-mono">{ca.id}</span>
          </p>
        </div>
        <div className="flex-shrink-0">
          <CaStatusIcon status={ca.status} expires={ca.expires} />
        </div>
    </div>
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
