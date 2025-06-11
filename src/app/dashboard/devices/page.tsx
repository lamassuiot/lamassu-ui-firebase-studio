
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Router as RouterIconLucide, Globe, HelpCircle, Eye, PlusCircle, MoreVertical, Edit, Trash2, Loader2, RefreshCw, ChevronRight, AlertCircle as AlertCircleIcon, ChevronLeft, Search } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type DeviceStatus = 'ACTIVE' | 'NO_IDENTITY' | 'INACTIVE' | 'PENDING_ACTIVATION';

interface DeviceData {
  id: string;
  displayId: string;
  iconType: 'router' | 'globe' | 'unknown';
  status: DeviceStatus;
  deviceGroup: string;
  createdAt: string;
  tags: string[];
  lastSeen?: string;
  ipAddress?: string;
  firmwareVersion?: string;
}

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
  status: string;
  icon: string;
  icon_color: string;
  creation_timestamp: string;
  metadata: Record<string, any>;
  dms_owner: string;
  identity: ApiDeviceIdentity | null;
  slots: Record<string, any>;
  events: Record<string, { type: string; description: string }>;
}

interface ApiResponse {
  next: string | null;
  list: ApiDevice[];
}

export const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
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

export const mapApiIconToIconType = (apiIcon: string): DeviceData['iconType'] => {
  if (apiIcon === 'CgSmartphoneChip') {
    return 'router';
  }
  // Add more mappings if other icons are introduced
  // if (apiIcon === 'someOtherApiIcon') return 'globe';
  return 'unknown';
};

export const DeviceIcon: React.FC<{ type: DeviceData['iconType'] }> = ({ type }) => {
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

  const [deviceIdFilter, setDeviceIdFilter] = useState<string>('');
  const [debouncedDeviceIdFilter, setDebouncedDeviceIdFilter] = useState<string>('');
  const [pageSize, setPageSize] = useState<string>('10');

  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDeviceIdFilter(deviceIdFilter);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [deviceIdFilter]);

  useEffect(() => {
    setBookmarkStack([null]);
    setCurrentPageIndex(0);
  }, [debouncedDeviceIdFilter, pageSize]);


  const fetchDevices = useCallback(async (bookmarkToFetch: string | null, currentFilter: string, currentPageSize: string) => {
    if (authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated()) {
        setDevices([]);
        setNextTokenFromApi(null);
      }
      return;
    }

    setIsLoadingApi(true);
    setApiError(null);
    try {
      const baseUrl = 'https://lab.lamassu.io/api/devmanager/v1/devices';
      const params = new URLSearchParams({
        sort_by: 'creation_timestamp',
        sort_mode: 'desc',
        page_size: currentPageSize,
      });
      if (bookmarkToFetch) {
        params.append('bookmark', bookmarkToFetch);
      }
      if (currentFilter.trim() !== '') {
        params.append('filter', `id[contains]${currentFilter.trim()}`);
      }
      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
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
        id: apiDevice.id,
        displayId: apiDevice.id,
        iconType: mapApiIconToIconType(apiDevice.icon),
        status: apiDevice.status as DeviceStatus, // Assuming API status matches DeviceStatus
        deviceGroup: apiDevice.dms_owner,
        createdAt: apiDevice.creation_timestamp,
        tags: apiDevice.tags || [],
        // lastSeen, ipAddress, firmwareVersion are not in the provided API response for the list
      }));

      setDevices(transformedDevices);
      setNextTokenFromApi(data.next);
      setApiError(null);
    } catch (error: any) {
      console.error("Failed to fetch devices:", error);
      setApiError(error.message || "An unknown error occurred while fetching devices.");
      setDevices([]);
      setNextTokenFromApi(null);
    } finally {
      setIsLoadingApi(false);
    }
  }, [user?.access_token, authLoading, isAuthenticated]);

  useEffect(() => {
    if (bookmarkStack.length > 0 && currentPageIndex < bookmarkStack.length) {
        fetchDevices(bookmarkStack[currentPageIndex], debouncedDeviceIdFilter, pageSize);
    }
  }, [fetchDevices, currentPageIndex, bookmarkStack, debouncedDeviceIdFilter, pageSize]);


  const handleCreateNewDevice = () => {
    alert('Navigate to Create New Device form (placeholder)');
  };

  const handleViewDetails = (deviceId: string) => {
    router.push(`/dashboard/devices/${deviceId}`);
  };

  const handleEditDevice = (deviceId: string) => {
    alert(`Edit device ID: ${deviceId} (placeholder)`);
  };

  const handleDeleteDevice = (deviceId: string) => {
    if(confirm(`Are you sure you want to delete device ${deviceId}? This action cannot be undone.`)){
        // Mock deletion - In a real app, call an API then update state or re-fetch.
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        alert(`Device ${deviceId} deleted (mock - API call not implemented).`);
        // If API supports deletion and you want to ensure the current page reflects it accurately,
        // you might re-fetch the current page:
        // fetchDevices(bookmarkStack[currentPageIndex], debouncedDeviceIdFilter, pageSize);
    }
  };

  const handleRefresh = () => {
    if (currentPageIndex < bookmarkStack.length) {
        fetchDevices(bookmarkStack[currentPageIndex], debouncedDeviceIdFilter, pageSize);
    }
  };

  const handleNextPage = () => {
    if (isLoadingApi) return;

    const potentialNextPageIndex = currentPageIndex + 1;
    if (potentialNextPageIndex < bookmarkStack.length) {
        // We have a stored "next" bookmark (user went back, now going forward again)
        setCurrentPageIndex(potentialNextPageIndex);
    }
    // Else, if there's a next token from the API for the current page, fetch a new page
    else if (nextTokenFromApi) {
        const newPageBookmark = nextTokenFromApi;
        // Trim any "future" bookmarks if we are creating a new path forward
        const newStack = bookmarkStack.slice(0, currentPageIndex + 1);
        setBookmarkStack([...newStack, newPageBookmark]);
        setCurrentPageIndex(newStack.length); // This will be newStack.length since index is 0-based
    }
  };

  const handlePreviousPage = () => {
    if (isLoadingApi || currentPageIndex === 0) return;
    const prevIndex = currentPageIndex - 1;
    setCurrentPageIndex(prevIndex);
  };


  if (authLoading && !devices.length) { // Only show auth loading if no devices are loaded yet
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Authenticating...</p>
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <RouterIconLucide className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Managed Devices</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleRefresh} variant="outline" disabled={isLoadingApi}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoadingApi && "animate-spin")} /> Refresh
          </Button>
          <Button onClick={handleCreateNewDevice} disabled={isLoadingApi}>
            <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Overview of all registered IoT devices, their status, and associated groups.
      </p>

      {/* Filter and Page Size */}
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <div className="relative flex-grow w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Filter by Device ID..."
            value={deviceIdFilter}
            onChange={(e) => setDeviceIdFilter(e.target.value)}
            className="w-full pl-10" // Padding left for the icon
            disabled={isLoadingApi || authLoading}
          />
        </div>
      </div>


      {/* Loading state for API call when no devices are yet shown */}
      {isLoadingApi && !devices.length && (
         <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading devices...</p>
        </div>
      )}

      {/* API Error Message */}
      {apiError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertTitle>Error Fetching Devices</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {/* Table Section - only render if no API error and (devices exist OR we are loading with existing devices) */}
      {!apiError && devices.length > 0 && (
        <>
          <div className={cn("overflow-x-auto overflow-y-auto max-h-[60vh] transition-opacity duration-300", isLoadingApi && devices.length > 0 && "opacity-50 pointer-events-none")}>
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
                        <Button
                          variant="link"
                          className="font-medium truncate p-0 h-auto text-left"
                          onClick={() => handleViewDetails(device.id)}
                          title={`View details for ${device.displayId}`}
                        >
                          {device.displayId}
                        </Button>
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
        </>
      )}

      {/* Pagination and Page Size Controls - Render if no error AND (devices exist OR loading with devices OR filter is active OR page size changed) */}
      {!apiError && (devices.length > 0 || isLoadingApi || debouncedDeviceIdFilter !== '' || pageSize !== '10') && (
        <div className="flex justify-between items-center mt-4">
            {/* Page Size Selector - Bottom Left */}
            <div className="flex items-center space-x-2">
              <Label htmlFor="pageSizeSelectBottom" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
              <Select
                value={pageSize}
                onValueChange={(value) => setPageSize(value)}
                disabled={isLoadingApi || authLoading}
              >
                <SelectTrigger id="pageSizeSelectBottom" className="w-[80px]">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pagination Buttons - Bottom Right */}
            <div className="flex items-center space-x-2">
                <Button
                    onClick={handlePreviousPage}
                    disabled={isLoadingApi || currentPageIndex === 0}
                    variant="outline"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button
                    onClick={handleNextPage}
                    disabled={isLoadingApi || !(currentPageIndex < bookmarkStack.length - 1 || nextTokenFromApi)}
                    variant="outline"
                >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
      )}


      {/* No Devices Message (if applicable) */}
      {!apiError && !isLoadingApi && devices.length === 0 && (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">
            {debouncedDeviceIdFilter ? `No Devices Found Matching "${debouncedDeviceIdFilter}"` : "No Devices Registered"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {debouncedDeviceIdFilter
              ? "Try adjusting your filter or clear it to see all devices."
              : "There are no devices registered in the system yet."
            }
          </p>
          <Button onClick={handleCreateNewDevice} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
          </Button>
        </div>
      )}
    </div>
  );
}

