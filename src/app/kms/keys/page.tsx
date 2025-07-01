
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { KeyRound, PlusCircle, MoreVertical, Eye, FileSignature, PenTool, ShieldCheck, Trash2, AlertTriangle, Cpu, Loader2, RefreshCw } from "lucide-react";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';


interface ApiKmsKey {
  id: string;
  algorithm: string;
  size: string;
  publicKey: string;
}

interface KmsKey {
  id: string;
  alias: string;
  keyTypeDisplay: string;
  status: 'Enabled' | 'Disabled' | 'PendingDeletion';
  description?: string;
  hasPrivateKey: boolean;
  cryptoEngineId?: string;
}

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
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [keys, setKeys] = useState<KmsKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<KmsKey | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()) {
            setError("User not authenticated. Please log in.");
        }
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://lab.lamassu.io/api/ca/v1/kms/keys', {
        headers: { 'Authorization': `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to fetch KMS keys. HTTP error ${response.status}`;
        try {
          errorJson = await response.json();
          errorMessage = `Failed to fetch keys: ${errorJson.err || errorJson.message || 'Unknown API error'}`;
        } catch(e) { /* ignore */}
        throw new Error(errorMessage);
      }
      
      const data: ApiKmsKey[] = await response.json();
      
      const transformedKeys: KmsKey[] = data.map((apiKey) => {
        const engineIdMatch = apiKey.id.match(/token-id=([^;]+)/);
        const engineId = engineIdMatch ? engineIdMatch[1] : undefined;

        return {
            id: apiKey.id,
            alias: apiKey.id,
            keyTypeDisplay: `${apiKey.algorithm} ${apiKey.size}`,
            status: 'Enabled', // Default status as API doesn't provide it
            description: engineId ? `Key managed by ${engineId} engine.` : 'Key managed by an unspecified engine.',
            hasPrivateKey: apiKey.id.includes('type=private'),
            cryptoEngineId: engineId
        };
      });

      setKeys(transformedKeys);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching keys.");
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.access_token, authLoading, isAuthenticated]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateNewKey = () => {
    router.push('/kms/keys/new');
  };

  const confirmDeleteKey = (key: KmsKey) => {
    setKeyToDelete(key);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteKey = () => {
    if (keyToDelete) {
      setKeys(prevKeys => prevKeys.filter(k => k.id !== keyToDelete.id));
      toast({
        title: "Key Deleted (Mock)",
        description: `Key "${keyToDelete.alias}" has been removed from the list. This is a mock action.`,
      });
    }
    setIsDeleteDialogOpen(false);
    setKeyToDelete(null);
  };

  const handleViewDetails = (keyIdValue: string) => {
    router.push(`/kms/keys/details?keyId=${keyIdValue}`);
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading KMS Keys...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <KeyRound className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Key Management Service - Asymmetric Keys</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchKeys} variant="outline" disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={handleCreateNewKey}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage asymmetric keys stored in the Key Management Service. These keys are used for signing, verification, and other cryptographic operations.
      </p>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Keys</AlertTitle>
          <AlertDescription>{error} <Button variant="link" onClick={fetchKeys} className="p-0 h-auto">Try again?</Button></AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && keys.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alias</TableHead>
                <TableHead className="hidden md:table-cell">Key ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead><div className="flex items-center"><Cpu className="mr-1.5 h-4 w-4 text-muted-foreground"/>Crypto Engine</div></TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">
                    <p className="truncate max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg" title={key.alias}>{key.alias}</p>
                    {key.description && <p className="text-xs text-muted-foreground truncate max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg" title={key.description}>{key.description}</p>}
                  </TableCell>
                  <TableCell className="font-mono text-xs hidden md:table-cell" title={key.id}>{key.id.substring(0, 12)}...</TableCell>
                  <TableCell>{key.keyTypeDisplay}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal bg-muted/40 border-muted-foreground/30">
                        {key.cryptoEngineId || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={key.status} /></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Key Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(key.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/kms/keys/details?keyId=${key.id}&tab=generate-csr`)}
                          disabled={!key.hasPrivateKey}
                        >
                          <FileSignature className="mr-2 h-4 w-4" /> Generate CSR
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/kms/keys/details?keyId=${key.id}&tab=sign`)}
                          disabled={!key.hasPrivateKey}
                        >
                          <PenTool className="mr-2 h-4 w-4" /> Sign
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/kms/keys/details?keyId=${key.id}&tab=verify`)}>
                          <ShieldCheck className="mr-2 h-4 w-4" /> Verify
                        </DropdownMenuItem> 
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => confirmDeleteKey(key)}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Key
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
        !isLoading && !error && <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No KMS Keys Found</h3>
            <p className="text-sm text-muted-foreground">
            There are no asymmetric keys configured in the KMS yet.
            </p>
            <Button onClick={handleCreateNewKey} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
            </Button>
        </div>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the key "<strong>{keyToDelete?.alias}</strong>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setKeyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKey} className={cn(buttonVariants({ variant: "destructive" }))}>
              Delete Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
