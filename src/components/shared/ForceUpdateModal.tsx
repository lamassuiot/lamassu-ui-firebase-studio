
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { ApiDevice } from '@/lib/devices-api';
import type { ApiRaItem } from '@/lib/dms-api';
import type { DiscoveredIntegration } from '@/lib/integrations-api';
import { DetailItem } from './DetailItem';
import { IntegrationIcon } from '@/app/integrations/page';

interface ForceUpdateModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (actions: string[]) => void;
  device: ApiDevice | null;
  ra: ApiRaItem | null;
  integration: DiscoveredIntegration | null;
  isUpdating: boolean;
}

export const ForceUpdateModal: React.FC<ForceUpdateModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  device,
  ra,
  integration,
  isUpdating,
}) => {
  const [updateTrustAnchor, setUpdateTrustAnchor] = useState(true);
  const [updateCertificate, setUpdateCertificate] = useState(true);

  const handleConfirm = () => {
    const actions: string[] = [];
    if (updateTrustAnchor) actions.push('UPDATE_TRUST_ANCHOR_LIST');
    if (updateCertificate) actions.push('UPDATE_CERTIFICATE');
    onConfirm(actions);
  };

  if (!device || !ra || !integration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-primary" />
            Force Device Update
          </DialogTitle>
          <DialogDescription>
            Trigger a manual update for the device's identity on the integrated platform.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="p-3 border rounded-md bg-muted/50 space-y-2">
            <DetailItem label="Device ID" value={device.id} className="py-1" isMono/>
            <DetailItem label="Registration Authority" value={ra.name} className="py-1" />
            <DetailItem 
                label="Platform Integration" 
                value={
                    <div className="flex items-center gap-2">
                        <IntegrationIcon type={integration.type} />
                        <span className="font-semibold">{integration.typeName}</span>
                    </div>
                } 
                className="py-1"
            />
          </div>

          <div className="space-y-3">
             <div className="flex items-center space-x-4 rounded-md border p-3">
                <Switch 
                    id="update-trust-anchor" 
                    checked={updateTrustAnchor} 
                    onCheckedChange={setUpdateTrustAnchor}
                />
                <Label htmlFor="update-trust-anchor" className="flex flex-col gap-0.5">
                    <span className="font-semibold">Update Trust Anchor List</span>
                    <span className="text-xs text-muted-foreground">Synchronizes the CA certificates on the platform with those configured in the RA.</span>
                </Label>
             </div>
             <div className="flex items-center space-x-4 rounded-md border p-3">
                <Switch 
                    id="update-certificate" 
                    checked={updateCertificate} 
                    onCheckedChange={setUpdateCertificate}
                />
                <Label htmlFor="update-certificate" className="flex flex-col gap-0.5">
                    <span className="font-semibold">Update Certificate</span>
                     <span className="text-xs text-muted-foreground">Pushes the device's current active certificate to the platform.</span>
                </Label>
             </div>
          </div>
          
           <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Note</AlertTitle>
              <AlertDescription>
                This action sends an update request to the platform. The time to completion depends on the platform's processing queue.
              </AlertDescription>
            </Alert>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating || (!updateCertificate && !updateTrustAnchor)}
          >
            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
