
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { revocationReasons, type RevocationReason } from '@/lib/revocation-reasons';
import { ScrollArea } from '../ui/scroll-area';

interface RevocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reasonValue: string) => void;
  itemName: string;
  itemType: 'CA' | 'Certificate';
  isConfirming?: boolean;
}

export const RevocationModal: React.FC<RevocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isConfirming = false,
}) => {
  const [selectedReasonValue, setSelectedReasonValue] = useState<string>(revocationReasons[0].value);
  const [selectedReasonDetails, setSelectedReasonDetails] = useState<RevocationReason | undefined>(revocationReasons[0]);

  useEffect(() => {
    if (isOpen) {
      // Reset to default reason when modal opens
      setSelectedReasonValue(revocationReasons[0].value);
      setSelectedReasonDetails(revocationReasons[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    const reason = revocationReasons.find(r => r.value === selectedReasonValue);
    setSelectedReasonDetails(reason);
  }, [selectedReasonValue]);

  const handleConfirm = () => {
    if (selectedReasonValue) {
      onConfirm(selectedReasonValue);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
            Confirm Revocation: {itemType}
          </DialogTitle>
          <DialogDescription>
            You are about to revoke the {itemType.toLowerCase()} "<strong>{itemName}</strong>". This action cannot be easily undone. Please select a reason for revocation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div>
            <Label htmlFor="revocationReasonSelect" className="text-base">Revocation Reason</Label>
            <Select value={selectedReasonValue} onValueChange={setSelectedReasonValue} disabled={isConfirming}>
              <SelectTrigger id="revocationReasonSelect" className="w-full mt-1">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-60">
                {revocationReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          {selectedReasonDetails && (
            <div className="mt-2 p-3 bg-muted/50 border rounded-md">
              <p className="text-sm font-medium text-foreground">{selectedReasonDetails.label}</p>
              <p className="text-xs text-muted-foreground">{selectedReasonDetails.description}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isConfirming}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="destructive" onClick={handleConfirm} disabled={!selectedReasonValue || isConfirming}>
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isConfirming ? 'Revoking...' : 'Confirm Revocation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
