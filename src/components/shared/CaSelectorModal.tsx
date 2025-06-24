
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { CA } from '@/lib/ca-data';
import { SelectableCaTreeItem } from './SelectableCaTreeItem';
import type { ApiCryptoEngine } from '@/types/crypto-engine';

interface CaSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
  availableCAs: CA[];
  isLoadingCAs: boolean;
  errorCAs: string | null;
  loadCAsAction: () => void;
  onCaSelected: (ca: CA) => void;
  currentSelectedCaId?: string | null;
  isAuthLoading: boolean;
  children?: React.ReactNode;
  allCryptoEngines?: ApiCryptoEngine[];
}

export const CaSelectorModal: React.FC<CaSelectorModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  description,
  availableCAs,
  isLoadingCAs,
  errorCAs,
  loadCAsAction,
  onCaSelected,
  currentSelectedCaId,
  isAuthLoading,
  children,
  allCryptoEngines,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children ? (
          children
        ) : (
          <>
            {(isLoadingCAs || isAuthLoading) && (
              <div className="flex items-center justify-center h-72">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">{isAuthLoading ? "Authenticating..." : "Loading CAs..."}</p>
              </div>
            )}
            {errorCAs && !isLoadingCAs && !isAuthLoading && (
              <Alert variant="destructive" className="my-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading CAs</AlertTitle>
                <AlertDescription>
                  {errorCAs} <Button variant="link" onClick={loadCAsAction} className="p-0 h-auto">Try again?</Button>
                </AlertDescription>
              </Alert>
            )}
            {!isLoadingCAs && !isAuthLoading && !errorCAs && availableCAs.length > 0 && (
              <ScrollArea className="h-72 my-4 border rounded-md">
                <ul className="space-y-0.5 p-2">
                  {availableCAs.map((ca) => (
                    <SelectableCaTreeItem
                      key={ca.id}
                      ca={ca}
                      level={0}
                      onSelect={onCaSelected}
                      currentSingleSelectedCaId={currentSelectedCaId}
                      allCryptoEngines={allCryptoEngines}
                    />
                  ))}
                </ul>
              </ScrollArea>
            )}
            {!isLoadingCAs && !isAuthLoading && !errorCAs && availableCAs.length === 0 && (
              <p className="text-muted-foreground text-center my-4 p-4 border rounded-md bg-muted/20">
                No CAs available to select.
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
