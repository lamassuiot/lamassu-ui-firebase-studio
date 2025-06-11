
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, PlusCircle, RefreshCw, Trash2, ShieldCheck, History, SlidersHorizontal, Info, Clock, AlertTriangle, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { DeviceIcon, StatusBadge as DeviceStatusBadge, mapApiIconToIconType } from '@/app/dashboard/devices/page'; // Reusing from devices list
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';

interface ApiDeviceIdentity {
  status: string;
  active_version: number;
  type: string;
  versions: Record<string, string>; // version_num: certificate_serial_or_hash
  events: Record<string, { type: string; description: string }>;
}

interface ApiDevice {
  id: string;
  tags: string[];
  status: string; // Device status
  icon: string;
  icon_color: string;
  creation_timestamp: string;
  metadata: Record<string, any>;
  dms_owner: string;
  identity: ApiDeviceIdentity | null; // Can be null if no identity
  slots: Record<string, any>;
  events: Record<string, { type: string; description: string }>;
}

interface CertificateHistoryEntry {
  version: string; // Changed to string to match identity.versions keys
  serialNumber: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED_SOON' ; // Simplified
  commonName: string;
  ca: string;
  validFrom: string;
  validTo: string;
  lifespan: string;
  revocationStatus: string;
}

const mapDeviceStatusToBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'default'; // Green
    case 'INACTIVE': return 'secondary'; // Grey
    case 'NO_IDENTITY': return 'outline'; // Blueish
    case 'PENDING_ACTIVATION': return 'default'; // Orangeish - using default for now
    default: return 'outline';
  }
};
const mapDeviceStatusToBadgeClass = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      case 'INACTIVE': return "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      case 'NO_IDENTITY': return "bg-sky-100 text-sky-700 dark:bg-sky-700/30 dark:text-sky-300 border-sky-300 dark:border-sky-700";
      case 'PENDING_ACTIVATION': return "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };


const CertificateStatusBadge: React.FC<{ status: CertificateHistoryEntry['status'] }> = ({ status }) => {
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = Info;
  switch (status) {
    case 'ACTIVE':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      Icon = CheckCircle;
      break;
    case 'INACTIVE':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      Icon = Clock;
      break;
    case 'REVOKED_SOON': // Example for a future state
      badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      Icon = AlertTriangle;
      break;
  }
  return <Badge variant="outline" className={cn("text-xs capitalize", badgeClass)}><Icon className="mr-1 h-3 w-3" />{status.replace('_', ' ').toLowerCase()}</Badge>;
};


export default function DeviceDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const { deviceId } = params as { deviceId: string };
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [device, setDevice] = useState<ApiDevice | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [errorDevice, setErrorDevice] = useState<string | null>(null);
  
  const [certificateHistory, setCertificateHistory] = useState<CertificateHistoryEntry[]>([]);


  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!deviceId || authLoading || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()){
             setErrorDevice("User not authenticated.");
        }
        return;
      }
      setIsLoadingDevice(true);
      setErrorDevice(null);
      try {
        const response = await fetch(`https://lab.lamassu.io/api/devmanager/v1/devices/${deviceId}`, {
          headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch device details."}));
          throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        const data: ApiDevice = await response.json();
        setDevice(data);

        // Mock certificate history based on identity versions
        const history: CertificateHistoryEntry[] = [];
        if (data.identity && data.identity.versions) {
          Object.entries(data.identity.versions).forEach(([versionKey, serial]) => {
            const isActiveVersion = parseInt(versionKey) === data.identity?.active_version;
            history.push({
              version: versionKey,
              serialNumber: serial,
              status: isActiveVersion ? 'ACTIVE' : 'INACTIVE',
              commonName: data.id, // Or derive from cert if possible
              ca: 'Lamassu IoT Device CA G1 (mock)', // Placeholder
              validFrom: new Date(Date.now() - (Math.random() * 30 + 30) * 24 * 60 * 60 * 1000).toISOString(),
              validTo: new Date(Date.now() + (Math.random() * 300 + 60) * 24 * 60 * 60 * 1000).toISOString(),
              lifespan: `${Math.floor(Math.random()*10)+2} months`,
              revocationStatus: '-',
            });
          });
          // Sort by version descending for display
           history.sort((a, b) => parseInt(b.version) - parseInt(a.version));
        }
        setCertificateHistory(history);

      } catch (err: any) {
        setErrorDevice(err.message || 'Failed to load device details.');
        setDevice(null);
      } finally {
        setIsLoadingDevice(false);
      }
    };

    fetchDeviceDetails();
  }, [deviceId, user?.access_token, authLoading, isAuthenticated]);


  if (isLoadingDevice || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading device details...</p>
      </div>
    );
  }

  if (errorDevice) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => router.push('/dashboard/devices')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
          </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Device</AlertTitle>
          <AlertDescription>{errorDevice}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="w-full space-y-4 p-4">
         <Button variant="outline" onClick={() => router.push('/dashboard/devices')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
          </Button>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Device Not Found</AlertTitle>
          <AlertDescription>The device with ID "{deviceId}" could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const deviceIconType = mapApiIconToIconType(device.icon);
  const creationDate = parseISO(device.creation_timestamp);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard/devices')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
        </Button>
      </div>

      {/* Header Section without Card */}
      <div className="mb-6"> {/* Added margin-bottom for spacing */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
            <DeviceIcon type={deviceIconType} />
            <div>
              <h1 className="text-2xl font-bold">{device.id}</h1> {/* Changed CardTitle to h1 for semantic clarity */}
              <div className="flex items-center space-x-2 mt-1">
                <DeviceStatusBadge status={device.status as any} />
                <span className="text-xs text-muted-foreground">
                  Created: {format(creationDate, 'dd MMM yyyy, HH:mm')} ({formatDistanceToNowStrict(creationDate)} ago)
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Assign Identity</Button>
          </div>
        </div>
        {device.tags && device.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {device.tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
          </div>
        )}
      </div>

      {/* Identity Summary Section */}
      {device.identity && (
         <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <p className="text-sm text-muted-foreground">Slot Active Version: <span className="font-semibold text-foreground">{device.identity.active_version}</span></p>
                            <p className="text-sm text-muted-foreground">Status: <Badge variant={mapDeviceStatusToBadgeVariant(device.identity.status)} className={cn("capitalize", mapDeviceStatusToBadgeClass(device.identity.status))}>{device.identity.status.toLowerCase()}</Badge></p>
                        </div>
                    </div>
                     <p className="text-sm text-muted-foreground">Serial Number: <span className="font-mono text-xs text-foreground">{device.identity.versions[device.identity.active_version.toString()] || 'N/A'}</span></p>
                </div>
            </CardContent>
         </Card>
      )}
       {!device.identity && (
         <Card>
            <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">No identity assigned to this device.</p>
            </CardContent>
         </Card>
      )}


      {/* Tabs Section */}
      <Tabs defaultValue="certificatesHistory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="certificatesHistory"><History className="mr-2 h-4 w-4" />Certificates History</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="mr-2 h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="metadata"><SlidersHorizontal className="mr-2 h-4 w-4" />Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="certificatesHistory">
          <Card>
            <CardHeader>
              <CardTitle>Certificates History</CardTitle>
              <CardDescription>History of X.509 certificates associated with this device identity.</CardDescription>
            </CardHeader>
            <CardContent>
              {certificateHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Serial Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Common Name</TableHead>
                        <TableHead className="hidden lg:table-cell">CA</TableHead>
                        <TableHead className="hidden lg:table-cell">Valid From</TableHead>
                        <TableHead className="hidden lg:table-cell">Valid To</TableHead>
                        <TableHead className="hidden md:table-cell">Lifespan</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {certificateHistory.map((cert) => (
                        <TableRow key={cert.version}>
                          <TableCell>{cert.version}</TableCell>
                          <TableCell className="font-mono text-xs">{cert.serialNumber}</TableCell>
                          <TableCell><CertificateStatusBadge status={cert.status} /></TableCell>
                          <TableCell className="hidden md:table-cell">{cert.commonName}</TableCell>
                          <TableCell className="hidden lg:table-cell">{cert.ca}</TableCell>
                          <TableCell className="hidden lg:table-cell">{format(parseISO(cert.validFrom), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell className="hidden lg:table-cell">{format(parseISO(cert.validTo), 'dd/MM/yy HH:mm')}</TableCell>
                          <TableCell className="hidden md:table-cell">{cert.lifespan}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" title="View Certificate Details">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No certificate history available for this device identity.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle>Device Event Timeline</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Device event timeline will be displayed here. (Under Construction)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata">
          <Card>
            <CardHeader><CardTitle>Device Metadata</CardTitle></CardHeader>
            <CardContent>
              {device.metadata && Object.keys(device.metadata).length > 0 ? (
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(device.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground">No custom metadata available for this device.</p>
              )}
               <h4 className="font-semibold mt-4 mb-2 text-sm">Raw Device Data (Debug)</h4>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(device, null, 2)}
                </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

