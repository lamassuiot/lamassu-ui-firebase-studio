
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Changed from useParams
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, PlusCircle, RefreshCw, Trash2, ShieldCheck, History, SlidersHorizontal, Info, Clock, AlertTriangle, CheckCircle, XCircle, ChevronRight, HelpCircle } from 'lucide-react';
import { DeviceIcon, StatusBadge as DeviceStatusBadge, mapApiIconToIconType } from '@/app/devices/page';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNowStrict, parseISO, formatDistanceStrict, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { TimelineEventItem, type TimelineEventDisplayData } from '@/components/devices/TimelineEventItem';


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

interface CertificateHistoryEntry {
  version: string; 
  serialNumber: string;
  status: 'ACTIVE' | 'INACTIVE' | 'REVOKED_SOON' | 'REVOKED' | 'EXPIRED_SUPERCEDED'; 
  commonName: string;
  ca: string;
  validFrom: string;
  validTo: string;
  lifespan: string;
  revocationStatus: string;
  supersededTimestamp?: string; 
}


const CertificateStatusBadge: React.FC<{ status: CertificateHistoryEntry['status'] }> = ({ status }) => {
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = Info;
  let text = status.replace('_', ' ').toLowerCase();

  switch (status) {
    case 'ACTIVE':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      Icon = CheckCircle;
      break;
    case 'INACTIVE':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      Icon = Clock;
      break;
    case 'REVOKED_SOON':
      badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
      Icon = AlertTriangle;
      break;
    case 'REVOKED':
      badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
      Icon = XCircle;
      text = "Revoked";
      break;
    case 'EXPIRED_SUPERCEDED':
      badgeClass = "bg-rose-100 text-rose-700 dark:bg-rose-700/30 dark:text-rose-300 border-rose-300 dark:border-rose-700";
      Icon = XCircle;
      text = "Expired & Superseded";
      break;
  }
  return <Badge variant="outline" className={cn("text-xs capitalize", badgeClass)}><Icon className="mr-1 h-3 w-3" />{text}</Badge>;
};


export default function DeviceDetailsClient() { // Renamed component
  const searchParams = useSearchParams(); // Changed from useParams
  const router = useRouter();
  const deviceId = searchParams.get('deviceId'); // Get deviceId from query params
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [device, setDevice] = useState<ApiDevice | null>(null);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);
  const [errorDevice, setErrorDevice] = useState<string | null>(null);
  
  const [certificateHistory, setCertificateHistory] = useState<CertificateHistoryEntry[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventDisplayData[]>([]);


  useEffect(() => {
    const fetchDeviceDetails = async () => {
      if (!deviceId) {
        setErrorDevice("Device ID is missing from URL.");
        setIsLoadingDevice(false);
        return;
      }
      if (authLoading || !isAuthenticated() || !user?.access_token) {
        if (!authLoading && !isAuthenticated()){
             setErrorDevice("User not authenticated.");
        }
        setIsLoadingDevice(false);
        return;
      }
      setIsLoadingDevice(true);
      setErrorDevice(null);
      try {
        const response = await fetch(`https://lab.lamassu.io/api/devmanager/v1/devices/${deviceId}`, {
          headers: { 'Authorization': `Bearer ${user.access_token}` },
        });
        if (!response.ok) {
          let errorJson;
          let errorMessage = `Failed to fetch device details. HTTP error ${response.status}`;
          try {
            errorJson = await response.json();
            if (errorJson && errorJson.err) {
              errorMessage = `Failed to fetch device details: ${errorJson.err}`;
            } else if (errorJson && errorJson.message) {
              errorMessage = `Failed to fetch device details: ${errorJson.message}`;
            }
          } catch (e) {
            // Response was not JSON or JSON parsing failed
            console.error("Failed to parse error response as JSON for device details:", e);
          }
          throw new Error(errorMessage);
        }
        const data: ApiDevice = await response.json();
        setDevice(data);

        const history: CertificateHistoryEntry[] = [];
        if (data.identity && data.identity.versions) {
          const sortedVersions = Object.keys(data.identity.versions).sort((a, b) => parseInt(b) - parseInt(a));
          
          sortedVersions.forEach((versionKey, index) => {
            const serial = data.identity!.versions[versionKey];
            const isActiveVersion = parseInt(versionKey) === data.identity?.active_version;
            const certValidTo = new Date(Date.now() + (Math.random() * 300 + (isActiveVersion ? 60 : -180)) * 24 * 60 * 60 * 1000); // Active certs last longer
            const certValidFrom = new Date(certValidTo.getTime() - (365 + Math.random() * 100) * 24 * 60 * 60 * 1000);
            
            let certStatus: CertificateHistoryEntry['status'] = isActiveVersion ? 'ACTIVE' : 'INACTIVE';
            let revocationStatus = '-';
            let supersededTimestamp;

            if (!isActiveVersion && index > 0) { 
                if (Math.random() < 0.3) {
                    certStatus = 'REVOKED';
                    revocationStatus = 'REVOKED (Superseded)';
                } else if (isPast(certValidTo)) {
                    certStatus = 'EXPIRED_SUPERCEDED';
                    revocationStatus = 'EXPIRED (Superseded)';
                } else {
                    revocationStatus = 'Superseded';
                }
                const nextVersionKey = sortedVersions[index -1];
                const provisioningEvents = Object.entries(data.identity?.events || {})
                    .filter(([ts, event]) => event.description.includes(`New Active Version set to ${nextVersionKey}`));
                if(provisioningEvents.length > 0) {
                     supersededTimestamp = provisioningEvents[0][0]; 
                }
            } else if (isActiveVersion && isPast(certValidTo)) {
                certStatus = 'EXPIRED_SUPERCEDED'; 
                revocationStatus = 'EXPIRED';
            }


            history.push({
              version: versionKey,
              serialNumber: serial,
              status: certStatus,
              commonName: data.id, 
              ca: 'Lamassu IoT Device CA G1 (mock)', 
              validFrom: certValidFrom.toISOString(),
              validTo: certValidTo.toISOString(),
              lifespan: formatDistanceStrict(certValidTo, certValidFrom),
              revocationStatus: revocationStatus,
              supersededTimestamp: supersededTimestamp,
            });
          });
        }
        setCertificateHistory(history);

        const combinedRawEvents: { timestampStr: string; type: string; description: string; source: 'device' | 'identity' }[] = [];
        Object.entries(data.events || {}).forEach(([ts, event]) => {
          combinedRawEvents.push({ timestampStr: ts, ...event, source: 'device' });
        });
        if (data.identity?.events) {
          Object.entries(data.identity.events).forEach(([ts, event]) => {
            combinedRawEvents.push({ timestampStr: ts, ...event, source: 'identity' });
          });
        }

        combinedRawEvents.sort((a, b) => parseISO(b.timestampStr).getTime() - parseISO(a.timestampStr).getTime()); 

        const processedTimelineEvents: TimelineEventDisplayData[] = combinedRawEvents.map((rawEvent, index, arr) => {
          const timestamp = parseISO(rawEvent.timestampStr);
          let title = rawEvent.description || rawEvent.type;
          let detailsNode: React.ReactNode = null;
          
          if (rawEvent.type === 'PROVISIONED' || rawEvent.type === 'RE-PROVISIONED') {
            title = rawEvent.description || `Device ${rawEvent.type.toLowerCase()}`;
            let versionSetMatch = rawEvent.description.match(/New Active Version set to (\d+)/);
            let currentVersion = versionSetMatch ? versionSetMatch[1] : (rawEvent.type === 'PROVISIONED' ? data.identity?.active_version.toString() : null);

            if (rawEvent.type === 'RE-PROVISIONED' && !rawEvent.description && currentVersion) {
                 title = `New Active Version set to ${currentVersion}`;
            }


            if (currentVersion && data.identity?.versions[currentVersion]) {
              const serial = data.identity.versions[currentVersion];
              const certEntry = history.find(h => h.version === currentVersion && h.serialNumber === serial);
              detailsNode = (
                <>
                  <p className="text-xs font-semibold">{data.id}</p>
                  <p className="text-xs text-muted-foreground font-mono">Serial: {serial}</p>
                  {certEntry && (
                    <>
                      {certEntry.status !== 'ACTIVE' && certEntry.revocationStatus.startsWith('REVOKED') && (
                         <Badge variant="destructive" className="text-xs mt-1">
                            REVOKED - Superseded {certEntry.supersededTimestamp ? format(parseISO(certEntry.supersededTimestamp), 'dd/MM/yyyy HH:mm') : ''}
                            ({certEntry.supersededTimestamp ? formatDistanceToNowStrict(parseISO(certEntry.supersededTimestamp)) : ''} ago)
                        </Badge>
                      )}
                       {certEntry.status === 'ACTIVE' && !isPast(parseISO(certEntry.validTo)) && (
                         <p className="text-xs text-green-600 dark:text-green-400">Expires in {formatDistanceToNowStrict(parseISO(certEntry.validTo))}</p>
                       )}
                       {isPast(parseISO(certEntry.validTo)) && certEntry.status !== 'REVOKED' && (
                         <Badge variant="destructive" className="text-xs mt-1 bg-orange-500 hover:bg-orange-600">
                            EXPIRED - {formatDistanceToNowStrict(parseISO(certEntry.validTo))} ago
                        </Badge>
                       )}
                    </>
                  )}
                </>
              );
            }
          } else if (rawEvent.type === 'STATUS-UPDATED' && rawEvent.description) {
             title = rawEvent.description; 
          }


          const prevTimestamp = index < arr.length - 1 ? parseISO(arr[index + 1].timestampStr) : null;
          
          return {
            id: rawEvent.timestampStr,
            timestamp,
            eventType: rawEvent.type,
            title,
            details: detailsNode,
            relativeTime: formatDistanceToNowStrict(timestamp) + ' ago',
            secondaryRelativeTime: prevTimestamp ? formatDistanceStrict(timestamp, prevTimestamp) + ' later' : undefined,
          };
        });
        setTimelineEvents(processedTimelineEvents);


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
         <Button variant="outline" onClick={() => router.push('/devices')} className="mb-4">
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
         <Button variant="outline" onClick={() => router.push('/devices')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
          </Button>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Device Not Found</AlertTitle>
          <AlertDescription>The device with ID "{deviceId || 'Unknown'}" could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const deviceIconType = mapApiIconToIconType(device.icon);
  const creationDate = parseISO(device.creation_timestamp);

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/devices')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Devices
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-center space-x-3">
            <DeviceIcon type={deviceIconType} />
            <div>
              <h1 className="text-2xl font-bold">{device.id}</h1>
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
                            <Button variant="ghost" size="icon" title="View Certificate Details" onClick={() => router.push(`/certificates/details?certificateId=${cert.serialNumber}`)}>
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
            <CardHeader>
                <CardTitle>Device Event Timeline</CardTitle>
                <CardDescription>Chronological record of significant events for this device and its identity.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-2 md:px-4 lg:px-6">
              {timelineEvents.length > 0 ? (
                <div className="relative pl-4"> 
                  <div className="absolute left-[calc(0.75rem-1px)] top-2 bottom-2 w-0.5 bg-border -translate-x-1/2 z-0"></div>
                  
                  <ul className="space-y-0">
                    {timelineEvents.map((event, index) => (
                      <TimelineEventItem 
                        key={event.id} 
                        event={event} 
                        isLastItem={index === timelineEvents.length -1} 
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No events recorded for this device.</p>
              )}
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
