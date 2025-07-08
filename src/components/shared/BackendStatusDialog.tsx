
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import {
  CA_API_BASE_URL,
  DEV_MANAGER_API_BASE_URL,
  DMS_MANAGER_API_BASE_URL,
  ALERTS_API_BASE_URL,
  VA_API_BASE_URL
} from '@/lib/api-domains';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface BackendStatusDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface ServiceStatus {
    name: string;
    url: string;
    status: 'ok' | 'error' | 'loading';
    version?: string;
    errorDetails?: string;
}

const servicesToCheck = [
    { name: 'CA Service', url: CA_API_BASE_URL },
    { name: 'Device Manager', url: DEV_MANAGER_API_BASE_URL },
    { name: 'DMS Manager', url: DMS_MANAGER_API_BASE_URL },
    { name: 'Alerts Service', url: ALERTS_API_BASE_URL },
    { name: 'Validation Authority', url: VA_API_BASE_URL }
];

export const BackendStatusDialog: React.FC<BackendStatusDialogProps> = ({ isOpen, onOpenChange }) => {
    const { user } = useAuth();
    const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const fetchStatuses = useCallback(async () => {
        if (!user?.access_token) return;

        setIsLoading(true);
        setStatuses(servicesToCheck.map(s => ({ ...s, status: 'loading' })));

        const statusPromises = servicesToCheck.map(async (service): Promise<ServiceStatus> => {
            try {
                const healthCheckUrl = `${service.url.substring(0, service.url.lastIndexOf('/'))}/health`;
                
                const response = await fetch(healthCheckUrl, {
                    headers: { 'Authorization': `Bearer ${user.access_token}` },
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();
                return {
                    ...service,
                    status: 'ok',
                    version: data.version || 'N/A'
                };
            } catch (error: any) {
                return {
                    ...service,
                    status: 'error',
                    errorDetails: error.message || 'Unknown fetch error',
                };
            }
        });

        const results = await Promise.all(statusPromises);
        setStatuses(results);
        setIsLoading(false);
    }, [user?.access_token]);
    
    useEffect(() => {
        if(isOpen) {
            fetchStatuses();
        }
    }, [isOpen, fetchStatuses]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg md:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Backend Services Status</DialogTitle>
                    <DialogDescription>
                        Health and version information for core backend services.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]">Status</TableHead>
                                <TableHead>Service</TableHead>
                                <TableHead>Version</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {statuses.map(service => (
                                <TableRow key={service.name}>
                                    <TableCell>
                                        {service.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        {service.status === 'ok' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                        {service.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{service.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{service.url}</p>
                                    </TableCell>
                                    <TableCell>
                                        {service.status === 'ok' && <Badge variant="secondary">{service.version}</Badge>}
                                        {service.status === 'error' && <Badge variant="destructive">Error</Badge>}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                <DialogFooter>
                    <div className="w-full flex justify-between">
                        <Button variant="outline" onClick={fetchStatuses} disabled={isLoading}>
                            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                            Refresh
                        </Button>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Close</Button>
                        </DialogClose>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
