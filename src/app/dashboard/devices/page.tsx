
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Router as RouterIconLucide, Globe, HelpCircle, Eye, PlusCircle, MoreVertical, Edit, Trash2, Loader2 } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle as AlertCircleIcon } from "lucide-react";


type DeviceStatus = 'ACTIVE' | 'NO_IDENTITY' | 'INACTIVE' | 'PENDING_ACTIVATION';

interface DeviceData {
  id: string; // Will use API's id
  displayId: string; // Will use API's id
  iconType: 'router' | 'globe' | 'unknown';
  status: DeviceStatus;
  deviceGroup: string;
  createdAt: string; // ISO Date string
  tags: string[];
  // These fields are not directly available in the provided API root, keeping structure for now
  lastSeen?: string; 
  ipAddress?: string;
  firmwareVersion?: string;
}

// API Response Structures (based on provided example)
interface ApiDeviceIdentity {
  status: string;
  active_version: number;
  type: string;
  versions: Record<string, string>;
  events: Record<string, { type: string; description: string }>;
}

interface ApiDevice {
  id: string;
  tags: string[];
  status: string; // e.g., "ACTIVE"
  icon: string; // e.g., "CgSmartphoneChip"
  icon_color: string;
  creation_timestamp: string; // ISO Date string
  metadata: Record<string, any>;
  dms_owner: string; // Maps to deviceGroup
  identity: ApiDeviceIdentity;
  slots: Record<string, any>;
  events: Record<string, { type: string; description: string }>;
}

interface ApiResponse {
  next: string | null;
  list: ApiDevice[];
}

const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  let badgeClass = "";
  switch (status) {
    case 'ACTIVE':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      break;
    case 'NO_IDENTITY':
      badgeClass = "bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-300 border-sky-300 dark:border-sky-700";
      break;
    case 'INACTIVE':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      break;
    case 'PENDING_ACTIVATION':
      badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      break;
    default:
      badgeClass = "bg-muted text-muted-foreground border-border";
  }
  return <Badge variant="outline" className={cn("text-xs capitalize", badgeClass)}>{status.replace('_', ' ').toLowerCase()}</Badge>;
};

const mapApiIconToIconType = (apiIcon: string): DeviceData['iconType'] => {
  if (apiIcon === 'CgSmartphoneChip') {
    return 'router';
  }
  // Add more mappings if other icons are expected from the API
  // e.g. if (apiIcon === 'SomeOtherIconFromApi') return 'globe';
  return 'unknown';
};

const DeviceIcon: React.FC<{ type: DeviceData['iconType'] }> = ({ type }) => {
  let IconComponent = HelpCircle;
  let iconColorClass = "text-amber-500";
  let bgColorClass = "bg-amber-100 dark:bg-amber-900/30";

  if (type === 'router') {
    IconComponent = RouterIconLucide;
    iconColorClass = "text-red-500";
    bgColorClass = "bg-red-100 dark:bg-red-900/30";
  } else if (type === 'globe') {
    IconComponent = Globe;
    iconColorClass = "text-teal-500";
    bgColorClass = "bg-teal-100 dark:bg-teal-900/30";
  }
  
  return (
    <div className={cn("p-1.5 rounded-md inline-flex items-center justify-center", bgColorClass)}>
      <IconComponent className={cn("h-5 w-5", iconColorClass)} />
    </div>
  );
};


export default function DevicesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // Pagination state (for future use)
  // const [nextPageToken, setNextPageToken] = useState<string | null>(null);


  useEffect(() => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
      // If auth is still loading, or user not authenticated, or no token, don't fetch.
      // If not authenticated and auth is done loading, AuthContext in layout should handle UI.
      if (!authLoading && !isAuthenticated()) {
          setDevices([]); // Clear devices if user logs out
      }
      return;
    }

    const fetchDevices = async () => {
      setIsLoadingApi(true);
      setApiError(null);
      try {
        const response = await fetch('https://lab.lamassu.io/api/devmanager/v1/devices?sort_by=creation_timestamp&sort_mode=desc&page_size=10', {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch devices. Invalid response from server."}));
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }

        const data: ApiResponse = await response.json();
        
        const transformedDevices: DeviceData[] = data.list.map(apiDevice => ({
          id: apiDevice.id, // Using API ID for React key and internal ID
          displayId: apiDevice.id, // Displaying API ID
          iconType: mapApiIconToIconType(apiDevice.icon),
          status: apiDevice.status as DeviceStatus, // Assuming API status matches type
          deviceGroup: apiDevice.dms_owner,
          createdAt: apiDevice.creation_timestamp,
          tags: apiDevice.tags || [],
          // lastSeen, ipAddress, firmwareVersion are not directly available in the provided API root
        }));

        setDevices(transformedDevices);
        // setNextPageToken(data.next); // For future pagination
      } catch (error: any) {
        console.error("Failed to fetch devices:", error);
        setApiError(error.message || "An unknown error occurred while fetching devices.");
        setDevices([]); // Clear devices on error
      } finally {
        setIsLoadingApi(false);
      }
    };

    fetchDevices();
  }, [user?.access_token, authLoading, isAuthenticated]);


  const handleCreateNewDevice = () => {
    alert('Navigate to Create New Device form (placeholder)');
    // router.push('/dashboard/devices/new');
  };

  const handleViewDetails = (deviceId: string) => {
    alert(`View details for device ID: ${deviceId} (placeholder)`);
    // router.push(`/dashboard/devices/${deviceId}/details`);
  };
  
  const handleEditDevice = (deviceId: string) => {
    alert(`Edit device ID: ${deviceId} (placeholder)`);
    // router.push(`/dashboard/devices/${deviceId}/edit`);
  };

  const handleDeleteDevice = (deviceId: string) => {
    if(confirm(`Are you sure you want to delete device ${deviceId}? This action cannot be undone.`)){
        // Future: API call to delete device
        setDevices(prev => prev.filter(d => d.id !== deviceId)); // Optimistic UI update
        alert(`Device ${deviceId} deleted (mock - API call not implemented).`);
    }
  };

  if (authLoading || isLoadingApi) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{authLoading ? "Authenticating..." : "Loading devices..."}</p>
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RouterIconLucide className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Managed Devices</h1>
        </div>
        <Button onClick={handleCreateNewDevice}>
          <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Overview of all registered IoT devices, their status, and associated groups.
      </p>

      {apiError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error Fetching Devices</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {!apiError && devices.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">ID</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px]">Device Group</TableHead>
                <TableHead className="w-[180px]">Created At</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <DeviceIcon type={device.iconType} />
                      <span className="font-medium truncate" title={device.displayId}>{device.displayId}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={device.status} /></TableCell>
                  <TableCell><Badge variant="secondary" className="truncate" title={device.deviceGroup}>{device.deviceGroup}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="text-xs">{format(parseISO(device.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(parseISO(device.createdAt))} ago</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {device.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Device Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(device.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditDevice(device.id)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Device
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onClick={() => handleDeleteDevice(device.id)}
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Device
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {!apiError && !isLoadingApi && devices.length === 0 && (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">No Devices Registered</h3>
          <p className="text-sm text-muted-foreground">
            There are no devices registered in the system yet, or none matched your current filters.
          </p>
          <Button onClick={handleCreateNewDevice} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
          </Button>
        </div>
      )}
    </div>
  );
}
