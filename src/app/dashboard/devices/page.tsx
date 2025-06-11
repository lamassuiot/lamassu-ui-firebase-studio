
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Router as RouterIcon, Globe, HelpCircle, Eye, PlusCircle, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

type DeviceStatus = 'ACTIVE' | 'NO_IDENTITY' | 'INACTIVE' | 'PENDING_ACTIVATION';

interface DeviceData {
  id: string;
  displayId: string;
  iconType: 'router' | 'globe' | 'unknown';
  status: DeviceStatus;
  deviceGroup: string;
  createdAt: string; // ISO Date string
  tags: string[];
  lastSeen?: string; // ISO Date string
  ipAddress?: string;
  firmwareVersion?: string;
}

const mockDevicesData: DeviceData[] = [
  {
    id: 'device-001',
    displayId: 'example.com',
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000).toISOString(), // 2 days 6 hours ago
    tags: ['iot'],
    lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.10',
    firmwareVersion: 'v1.2.3',
  },
  {
    id: 'device-002',
    displayId: 'caf-ikl-2222',
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 60 * 1000 - 22 * 60 * 1000).toISOString(), // 2 days 15h 22m ago
    tags: ['iot'],
    lastSeen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.12',
    firmwareVersion: 'v1.2.3',
  },
   {
    id: 'device-003',
    displayId: 'caf-ikl-222', // As per image (one less '2')
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 14 * 60 * 60 * 1000 - 39 * 60 * 1000).toISOString(),
    tags: ['iot'],
    lastSeen: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    ipAddress: '192.168.1.15',
    firmwareVersion: 'v1.2.0',
  },
  {
    id: 'device-004',
    displayId: 'caf-ikl-11111', // As per image
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 14 * 60 * 60 * 1000 - 42 * 60 * 1000).toISOString(),
    tags: ['iot'],
    firmwareVersion: 'v1.1.0',
  },
  {
    id: 'device-005',
    displayId: 'caf-ikl-1111', // As per image (one less '1')
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 14 * 60 * 60 * 1000 - 55 * 60 * 1000).toISOString(),
    tags: ['iot'],
    ipAddress: '10.0.0.5',
    firmwareVersion: 'v1.1.0',
  },
  {
    id: 'device-006',
    displayId: 'caf-123',
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 13 * 60 * 60 * 1000 - 31 * 60 * 1000).toISOString(),
    tags: ['iot'],
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    firmwareVersion: 'v1.0.0',
  },
  {
    id: 'device-007',
    displayId: 'test1',
    iconType: 'router',
    status: 'ACTIVE',
    deviceGroup: 'project-1',
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 - 13 * 60 * 60 * 1000 - 36 * 60 * 1000).toISOString(),
    tags: ['iot', 'testing'],
    ipAddress: '172.16.0.88',
    firmwareVersion: 'v0.9.0',
  },
  {
    id: 'device-008',
    displayId: 'test-orm-1',
    iconType: 'globe', // Changed to globe to match image style
    status: 'ACTIVE',
    deviceGroup: 'testdmslibest',
    createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000 - 15 * 60 * 60 * 1000 - 14 * 60 * 1000).toISOString(),
    tags: ['iot'],
    firmwareVersion: 'v2.0.1',
  },
  {
    id: 'device-009',
    displayId: '192.168.125.2',
    iconType: 'globe',
    status: 'ACTIVE',
    deviceGroup: 'testdmslibest',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 - 7 * 60 * 60 * 1000 - 37 * 60 * 1000).toISOString(),
    tags: ['iot', 'gateway'],
    ipAddress: '192.168.125.2',
  },
  {
    id: 'device-010',
    displayId: 'd8460445-3a3f-49d9-9eaf-71973cbe7b65',
    iconType: 'unknown', // Using unknown for the yellow icon
    status: 'NO_IDENTITY',
    deviceGroup: 'sand',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 - 14 * 60 * 60 * 1000 - 30 * 60 * 1000).toISOString(),
    tags: ['iot', 'sandgrain'],
  },
];

const StatusBadge: React.FC<{ status: DeviceStatus }> = ({ status }) => {
  let badgeClass = "";
  let Icon = HelpCircle;

  switch (status) {
    case 'ACTIVE':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      // Icon can remain default or be specific like CheckCircle
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

const DeviceIcon: React.FC<{ type: DeviceData['iconType'] }> = ({ type }) => {
  if (type === 'router') return <RouterIcon className="h-5 w-5 text-red-500" />;
  if (type === 'globe') return <Globe className="h-5 w-5 text-teal-500" />;
  return <HelpCircle className="h-5 w-5 text-amber-500" />; // Fallback for 'unknown' or other types
};


export default function DevicesPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<DeviceData[]>(mockDevicesData);

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
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        alert(`Device ${deviceId} deleted (mock).`);
    }
  };


  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RouterIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Managed Devices</h1>
        </div>
        <Button onClick={handleCreateNewDevice}>
          <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Overview of all registered IoT devices, their status, and associated groups.
      </p>

      {devices.length > 0 ? (
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
                    <div className="flex items-center space-x-2">
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
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">No Devices Registered</h3>
          <p className="text-sm text-muted-foreground">
            There are no devices registered in the system yet.
          </p>
          <Button onClick={handleCreateNewDevice} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Register New Device
          </Button>
        </div>
      )}
    </div>
  );
}
