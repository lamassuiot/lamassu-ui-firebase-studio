
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { KeyRound, PlusCircle, MoreVertical, Eye, FilePlus2, PenTool, ShieldCheck } from "lucide-react"; // Added new icons
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface KmsKey {
  id: string;
  alias: string;
  keyTypeDisplay: string;
  status: 'Enabled' | 'Disabled' | 'PendingDeletion';
  creationDate: string; // ISO Date string
  description?: string;
}

const mockKmsKeysData: KmsKey[] = [
  {
    id: 'key-1234abcd-12ab-34cd-56ef-1234567890ab',
    alias: 'pkcs11:token-id=filesystem-1;id=414b4944;type=private',
    keyTypeDisplay: 'RSA 4096',
    status: 'Enabled',
    creationDate: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Primary signing key for the LamassuIoT Global Root CA G1, referenced via PKCS11 URI.',
  },
  {
    id: 'key-5678efgh-56ef-78gh-90ij-5678901234cd',
    alias: 'lamassu/dev/intermediate-ca-key',
    keyTypeDisplay: 'ECC P-384',
    status: 'Enabled',
    creationDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Signing key for the Development Intermediate CA.',
  },
  {
    id: 'key-9012ijkl-90ij-12kl-34mn-9012345678ef',
    alias: 'lamassu/archive/old-codesigning-key',
    keyTypeDisplay: 'RSA 2048',
    status: 'Disabled',
    creationDate: new Date(Date.now() - 700 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Archived code signing key, no longer in active use.',
  },
  {
    id: 'key-3456mnop-34mn-56op-78qr-3456789012gh',
    alias: 'lamassu/staging/service-encryption-key',
    keyTypeDisplay: 'RSA 3072',
    status: 'PendingDeletion',
    creationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Encryption key for staging services, scheduled for deletion.',
  },
];

const StatusBadge: React.FC<{ status: KmsKey['status'] }> = ({ status }) => {
  let badgeClass = "";
  switch (status) {
    case 'Enabled':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      break;
    case 'Disabled':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      break;
    case 'PendingDeletion':
      badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      break;
    default:
      badgeClass = "bg-muted text-muted-foreground border-border";
  }
  return <Badge variant="outline" className={cn("text-xs", badgeClass)}>{status}</Badge>;
};


export default function KmsKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<KmsKey[]>(mockKmsKeysData);

  const handleCreateNewKey = () => {
    // router.push('/dashboard/kms/keys/new');
    alert('Navigate to Create New KMS Key form (placeholder)');
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <KeyRound className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Key Management Service - Asymmetric Keys</h1>
        </div>
        <Button onClick={handleCreateNewKey}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage asymmetric keys stored in the Key Management Service. These keys are used for signing, verification, encryption, and decryption.
      </p>

      {keys.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias</TableHead>
                <TableHead className="hidden md:table-cell">Key ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Creation Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">
                    <p className="truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl" title={key.alias}>{key.alias}</p>
                    {key.description && <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl" title={key.description}>{key.description}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs hidden md:table-cell" title={key.id}>{key.id.substring(0, 12)}...</TableCell>
                  <TableCell>{key.keyTypeDisplay}</TableCell>
                  <TableCell><StatusBadge status={key.status} /></TableCell>
                  <TableCell className="hidden sm:table-cell">{format(new Date(key.creationDate), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Key Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => alert(`View details for key: ${key.alias}`)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Generate CSR for key: ${key.alias} (placeholder)`)}>
                          <FilePlus2 className="mr-2 h-4 w-4" /> Generate CSR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Sign with key: ${key.alias} (placeholder)`)}>
                          <PenTool className="mr-2 h-4 w-4" /> Sign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Verify with key: ${key.alias} (placeholder)`)}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Verify
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">No KMS Keys Found</h3>
          <p className="text-sm text-muted-foreground">
            There are no asymmetric keys configured in the KMS yet.
          </p>
          <Button onClick={handleCreateNewKey} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
          </Button>
        </div>
      )}
    </div>
  );
}
