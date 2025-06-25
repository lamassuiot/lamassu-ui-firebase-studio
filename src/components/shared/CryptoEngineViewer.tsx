
'use client';

import React from 'react';
import { ShieldQuestion, FolderKey } from 'lucide-react';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import AWSKMSLogo from "./CryptoEngineIcons/AWS-KMS.png"
import AWSSMLogo from "./CryptoEngineIcons/AWS-SM.png"
import PKCS11Logo from "./CryptoEngineIcons/PKCS11.png"
import VaultLogo from "./CryptoEngineIcons/HASHICORP-VAULT.png"

interface CryptoEngineViewerProps {
  engine: ApiCryptoEngine;
  className?: string;
  iconOnly?: boolean;
}

export const CryptoEngineViewer: React.FC<CryptoEngineViewerProps> = ({ engine, className, iconOnly = false }) => {
  let IconComponent: React.ElementType | null = null;
  let iconColorClass = "text-muted-foreground";
  let iconBGClass = "bg-transparent";
  let imageSrc: any = null;

  const engineTypeUpper = engine.type?.toUpperCase();

  switch (engineTypeUpper) {
    case "GOLANG":
      IconComponent = FolderKey;
      iconBGClass = "bg-gray-800";
      iconColorClass = "text-white";
      break;
    case "PKCS11":
      imageSrc = PKCS11Logo;
      break;
    case "AWS_SECRETS_MANAGER":
      imageSrc = AWSSMLogo;
      break;
    case "AWS_KMS":
      imageSrc = AWSKMSLogo;
      break;
    case "HASHICORP_VAULT":
      imageSrc = VaultLogo;
      break;
    default:
      IconComponent = ShieldQuestion;
      break;
  }
  
  let iconNode: React.ReactNode;
  if(imageSrc) {
    iconNode = <Image src={imageSrc} alt={`${engine.name} Icon`} className="h-full w-full object-contain" layout="fill" />;
  } else if (IconComponent) {
    iconNode = <IconComponent className={cn("h-full w-full p-0.5", iconColorClass, iconBGClass)} />
  } else {
    iconNode = <ShieldQuestion className="h-full w-full p-0.5 text-muted-foreground" />
  }

  if (iconOnly) {
    return <div className={cn("relative h-5 w-5", className)}>
      {iconNode}
    </div>
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative h-7 w-7 flex-shrink-0">
        {iconNode}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate" title={engine.name}>{engine.name}</span>
        <span className="text-xs text-muted-foreground truncate" title={`${engine.provider} - ID: ${engine.id}`}>
          {engine.provider} - ID: <span className="font-mono">{engine.id}</span>
        </span>
      </div>
    </div>
  );
};
