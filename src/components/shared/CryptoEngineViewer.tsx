
'use client';

import React from 'react';
import { Cpu, Cloud, HardDrive, ShieldQuestion, Database } from 'lucide-react';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { cn } from '@/lib/utils';

interface CryptoEngineViewerProps {
  engine: ApiCryptoEngine;
  className?: string;
  iconOnly?: boolean;
}

export const CryptoEngineViewer: React.FC<CryptoEngineViewerProps> = ({ engine, className, iconOnly = false }) => {
  let Icon = ShieldQuestion; // Default icon

  // Determine icon based on engine type or name
  const engineTypeUpper = engine.type?.toUpperCase();
  const engineNameUpper = engine.name?.toUpperCase();

  if (engineTypeUpper?.includes('AWS') || engineNameUpper?.includes('KMS') || engineNameUpper?.includes('AZURE') || engineNameUpper?.includes('VAULT')) {
    Icon = Cloud;
  } else if (engineTypeUpper?.includes('GOLANG') || engineNameUpper?.includes('SOFTWARE') || engineTypeUpper?.includes('LOCAL')) {
    Icon = Cpu;
  } else if (engineTypeUpper?.includes('PKCS11') || engineNameUpper?.includes('HSM')) {
    Icon = HardDrive;
  } else if (engineTypeUpper?.includes('DATABASE') || engineNameUpper?.includes('DB')) {
    Icon = Database;
  }


  if (iconOnly) {
    return <Icon className={cn("h-5 w-5 text-muted-foreground", className)} />;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate" title={engine.name}>{engine.name}</span>
        <span className="text-xs text-muted-foreground truncate" title={`${engine.provider} - ID: ${engine.id}`}>
          {engine.provider} - ID: <span className="font-mono">{engine.id}</span>
        </span>
      </div>
    </div>
  );
};
