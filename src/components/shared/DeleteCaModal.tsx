
'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeleteCaModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void;
  caName: string;
  isDeleting: boolean;
}

export const DeleteCaModal: React.FC<DeleteCaModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  caName,
  isDeleting,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-xl">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Permanently Delete CA
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action is permanent and cannot be undone. Please read the warning carefully.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning: Irreversible Action</AlertTitle>
            <AlertDescription>
                You are about to permanently delete the Certificate Authority "<strong>{caName}</strong>". This will remove it from the system entirely. This action is only available for already revoked CAs and cannot be reversed.
            </AlertDescription>
        </Alert>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {isDeleting ? 'Deleting...' : 'Permanently Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
