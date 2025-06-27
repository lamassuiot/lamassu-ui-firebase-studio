
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Re-defining RA types here to avoid complex imports, but ideally these would be shared
interface ApiRaDeviceProfile {
  icon: string;
  icon_color: string;
  tags: string[];
}
interface ApiRaEnrollmentSettings {
  registration_mode: string;
  enrollment_ca: string;
  device_provisioning_profile: ApiRaDeviceProfile;
}
interface ApiRaSettings {
  enrollment_settings: ApiRaEnrollmentSettings;
}
interface ApiRaItem {
  id: string;
  name: string;
  creation_ts: string;
  settings: ApiRaSettings;
}
interface ApiRaListResponse {
  next: string | null;
  list: ApiRaItem[];
}

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeviceRegistered: () => void;
}

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onOpenChange,
  onDeviceRegistered,
}) => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [deviceId, setDeviceId] = useState('');
  const [selectedRa, setSelectedRa] = useState<ApiRaItem | null>(null);

  const [ras, setRas] = useState<ApiRaItem[]>([]);
  const [isLoadingRas, setIsLoadingRas] = useState(true);
  const [errorRas, setErrorRas] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate new UUID when modal opens
  useEffect(() => {
    if (isOpen) {
      setDeviceId(crypto.randomUUID());
      setSelectedRa(null); // Reset selection
    }
  }, [isOpen]);

  const fetchRAs = useCallback(async () => {
    if (!isOpen || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()) {
        setErrorRas("User not authenticated.");
      }
      setIsLoadingRas(false);
      return;
    }

    setIsLoadingRas(true);
    setErrorRas(null);
    try {
      const response = await fetch('https://lab.lamassu.io/api/dmsmanager/v1/dms?page_size=100', { // Fetch a decent number for the selector
        headers: { 'Authorization': `Bearer ${user.access_token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch Registration Authorities.');
      }
      const data: ApiRaListResponse = await response.json();
      setRas(data.list || []);
    } catch (err: any) {
      setErrorRas(err.message);
    } finally {
      setIsLoadingRas(false);
    }
  }, [isOpen, user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (isOpen) {
      fetchRAs();
    }
  }, [isOpen, fetchRAs]);

  const handleRegister = async () => {
    if (!deviceId.trim() || !selectedRa) {
      toast({
        title: "Validation Error",
        description: "Please provide a Device ID and select a Registration Authority.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: deviceId.trim(),
        dms_id: selectedRa.id,
        tags: selectedRa.settings.enrollment_settings.device_provisioning_profile.tags || [],
        icon: selectedRa.settings.enrollment_settings.device_provisioning_profile.icon || 'HelpCircle',
        icon_color: selectedRa.settings.enrollment_settings.device_provisioning_profile.icon_color || '#888888',
        metadata: {},
      };

      const response = await fetch('https://lab.lamassu.io/api/devmanager/v1/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to register device. Status: ${response.status}`;
        try {
          errorJson = await response.json();
          errorMessage = `Failed to register device: ${errorJson.err || errorJson.message || 'Unknown API error'}`;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      toast({
        title: "Device Registered",
        description: `Device with ID "${deviceId}" has been successfully registered.`,
      });
      onDeviceRegistered(); // This will close modal and refresh list
      onOpenChange(false);

    } catch (err: any) {
      toast({
        title: "Registration Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRaSelectionChange = (raId: string) => {
    const ra = ras.find(r => r.id === raId);
    if (ra) {
      setSelectedRa(ra);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register New Device</DialogTitle>
          <DialogDescription>
            Provide a unique ID for the new device and assign it to a Registration Authority.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID (GUID)</Label>
            <Input
              id="deviceId"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Enter a unique device ID"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ra-select">Registration Authority</Label>
            {isLoadingRas ? (
              <div className="flex items-center space-x-2 p-2 h-10 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading RAs...</span>
              </div>
            ) : errorRas ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error loading RAs</AlertTitle>
                <AlertDescription>
                  {errorRas}
                  <Button variant="link" size="sm" onClick={fetchRAs} className="p-0 h-auto">Try again?</Button>
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedRa?.id}
                onValueChange={handleRaSelectionChange}
                disabled={isSubmitting}
              >
                <SelectTrigger id="ra-select">
                  <SelectValue placeholder="Select an RA..." />
                </SelectTrigger>
                <SelectContent>
                  {ras.map(ra => (
                    <SelectItem key={ra.id} value={ra.id}>
                      {ra.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleRegister} disabled={isSubmitting || isLoadingRas || !deviceId || !selectedRa}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register Device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
