
'use client';

import React from 'react';
import { Cpu, Cloud, HardDrive, ShieldQuestion, Database, FolderKey } from 'lucide-react';
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
  let Icon = ShieldQuestion; // Default icon
  let iconColorClass = "text-muted-foreground"; // Default color
  let iconBGClass = "bg-transparent"; // Default color

  // Determine icon based on engine type or name
  const engineTypeUpper = engine.type?.toUpperCase();
  const engineNameUpper = engine.name?.toUpperCase();

  var icon = <></>

  switch (engineTypeUpper) {
    case "GOLANG":
      Icon = FolderKey;
      iconBGClass = "bg-black";
      iconColorClass = "text-white";
      icon = <Icon className={cn("h-7 w-7 flex-shrink-0 p-1", iconColorClass, iconBGClass)} />
      break;
    case "PKCS11":
      icon = <Image
        src={PKCS11Logo}
        alt="PKCS11 Icon"
        width={30}
        height={30}
      />
      break;
    case "AWS_SECRETS_MANAGER":
      icon = <Image
        src={AWSSMLogo}
        alt="PKCS11 Icon"
        width={30}
        height={30}
      />
      break;
    case "AWS_KMS":
      icon = <Image
        src={AWSKMSLogo}
        alt="PKCS11 Icon"
        width={30}
        height={30}
      />
      break;
    case "HASHICORP_VAULT":
      icon = <Image
        src={VaultLogo}
        alt="PKCS11 Icon"
        width={30}
        height={30}
      />
      break;
    default:
      break;
  }

  if (engineTypeUpper?.includes('AWS') || engineNameUpper?.includes('KMS') || engineNameUpper?.includes('AZURE') || engineNameUpper?.includes('VAULT')) {
    Icon = Cloud;
    iconColorClass = "text-blue-500";
  } else if (engineTypeUpper?.includes('GOLANG') || engineNameUpper?.includes('SOFTWARE') || engineTypeUpper?.includes('LOCAL')) {
  } else if (engineTypeUpper?.includes('PKCS11') || engineNameUpper?.includes('HSM')) {
    Icon = HardDrive;
    iconColorClass = "text-gray-600";
  } else if (engineTypeUpper?.includes('DATABASE') || engineNameUpper?.includes('DB')) {
    Icon = Database;
    iconColorClass = "text-purple-500";
  }


  if (iconOnly) {
    return <Icon className={cn("h-5 w-5", iconColorClass, className)} />;
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {icon}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate" title={engine.name}>{engine.name}</span>
        <span className="text-xs text-muted-foreground truncate" title={`${engine.provider} - ID: ${engine.id}`}>
          {engine.provider} - ID: <span className="font-mono">{engine.id}</span>
        </span>
      </div>
    </div>
  );
};

