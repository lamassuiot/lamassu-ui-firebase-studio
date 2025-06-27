
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Changed from useParams
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, PlusCircle, RefreshCw, History, SlidersHorizontal, Info, Clock, AlertTriangle, CheckCircle, XCircle, ChevronRight, Eye, Layers } from 'lucide-react';
import { DeviceIcon, StatusBadge as DeviceStatusBadge, mapApiIconToIconType } from '@/app/devices/page';
import { useAuth } from '@/contexts/AuthContext';
import { format, formatDistanceToNowStrict, parseISO, formatDistanceStrict, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { TimelineEventItem, type TimelineEventDisplayData } from '@/components/devices/TimelineEventItem';
import type { CertificateData } from '@/types/certificate';
import { fetchIssuedCertificates } from '@/lib/issued-certificate-data';
import { ApiStatusBadge } from '@/components/shared/ApiStatusBadge';


interface ApiDeviceIdentity {
  status: string;
  active_version: number;
  type: string;
  versions: Record<string, string>; 
  events?: Record<string, { type: string; description: string }>;
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
  events?: Record<string, { type: string; description: string }>;
}

interface CertificateHistoryEntry {
  version: string;
  serialNumber: string;
  apiStatus?: string;
  revocationReason?: string;
  revocationTimestamp?: string;
  isSuperseded: boolean;
  commonName: string;
  ca: string;
  issuerCaId?: string;
  validFrom: string;
  validTo: string;
  lifespan: string;
}

const getCertSubjectCommonName = (subject: string): string => {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subject;
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [errorHistory, setErrorHistory] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventDisplayData[]>([]);

  const fetchCertificateHistory = useCallback(async (identity: ApiDeviceIdentity, accessToken: string) => {
    setIsLoadingHistory(true);
    setErrorHistory(null);
    try {
        const serialsByVersion = Object.entries(identity.versions);
        if (serialsByVersion.length === 0) {
            setCertificateHistory([]);
            return;
        }

        const certPromises = serialsByVersion.map(async ([version, serialNumber]) => {
            const { certificates } = await fetchIssuedCertificates({
                accessToken: accessToken,
                apiQueryString: `filter=serial_number[equal]${serialNumber}&page_size=1`
            });
            const certData = certificates[0];
            if (!certData) return null;

            const isSuperseded = parseInt(version, 10) < identity.active_version;
            
            return {
                version: version,
                serialNumber: certData.serialNumber,
                apiStatus: certData.apiStatus,
                revocationReason: certData.revocationReason,
                revocationTimestamp: certData.revocationTimestamp,
                isSuperseded: isSuperseded,
                commonName: getCertSubjectCommonName(certData.subject),
                ca: getCertSubjectCommonName(certData.issuer),
                issuerCaId: certData.issuerCaId,
                validFrom: certData.validFrom,
                validTo: certData.validTo,
                lifespan: formatDistanceStrict(parseISO(certData.validTo), parseISO(certData.validFrom)),
            };
        });

        const historyEntries = (await Promise.all(certPromises)).filter((e): e is CertificateHistoryEntry => e !== null);
        historyEntries.sort((a, b) => parseInt(b.version, 10) - parseInt(a.version, 10));

        setCertificateHistory(historyEntries);

    } catch (err: any) {
        setErrorHistory(err.message || 'Failed to load certificate history.');
    } finally {
        setIsLoadingHistory(false);
    }
  }, []);

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
            console.error("Failed to parse error response as JSON for device details:", e);
          }
          throw new Error(errorMessage);
        }
        const data: ApiDevice = await response.json();
        setDevice(data);
        
        if (data.identity?.versions) {
            fetchCertificateHistory(data.identity, user.access_token);
        } else {
            setCertificateHistory([]);
            setIsLoadingHistory(false);
        }

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
          let linkableSerial: string | undefined = undefined;
          
          if (rawEvent.type === 'PROVISIONED' || rawEvent.type === 'RE-PROVISIONED') {
            title = rawEvent.description || `Device ${rawEvent.type.toLowerCase()}`;
            const versionSetMatch = rawEvent.description.match(/New Active Version set to (\d+)/);
            const currentVersion = versionSetMatch ? versionSetMatch[1] : (rawEvent.type === 'PROVISIONED' ? data.identity?.active_version.toString() : null);

            if (rawEvent.type === 'RE-PROVISIONED' && !rawEvent.description && currentVersion) {
                 title = `New Active Version set to ${currentVersion}`;
            }
            
            if (currentVersion && data.identity?.versions[currentVersion]) {
              const serial = data.identity.versions[currentVersion];
              linkableSerial = serial;
              detailsNode = (
                <p className="text-xs text-muted-foreground font-mono">
                  Cert Serial: {serial}
                </p>
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
            linkableSerial: linkableSerial,
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
  }, [deviceId, user?.access_token, authLoading, isAuthenticated, fetchCertificateHistory]);


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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="certificatesHistory"><History className="mr-2 h-4 w-4" />Certificates History</TabsTrigger>
          <TabsTrigger value="timeline"><Clock className="mr-2 h-4 w-4" />Timeline</TabsTrigger>
          <TabsTrigger value="metadata"><SlidersHorizontal className="mr-2 h-4 w-4" />Metadata</TabsTrigger>
          <TabsTrigger value="rawApiData"><Layers className="mr-2 h-4 w-4" />Raw API Data</TabsTrigger>
        </TabsList>

        <TabsContent value="certificatesHistory">
          <Card>
            <CardHeader>
              <CardTitle>Certificates History</CardTitle>
              <CardDescription>History of X.509 certificates associated with this device identity.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                  <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-2 text-muted-foreground">Loading certificate history...</p>
                  </div>
              ) : errorHistory ? (
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error Loading History</AlertTitle>
                      <AlertDescription>{errorHistory}</AlertDescription>
                  </Alert>
              ) : certificateHistory.length > 0 ? (
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
                        <TableRow key={cert.version} className={cn(cert.isSuperseded && "opacity-60")}>
                          <TableCell>{cert.version}</TableCell>
                          <TableCell className="font-mono text-xs">
                            <Button
                                variant="link"
                                className="p-0 h-auto font-mono text-xs"
                                onClick={() => router.push(`/certificates/details?certificateId=${cert.serialNumber}`)}
                                title={`View details for certificate ${cert.serialNumber}`}
                            >
                                {cert.serialNumber}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                                <ApiStatusBadge status={cert.apiStatus} />
                                {cert.apiStatus === 'REVOKED' && (
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {cert.revocationReason && (
                                    <p className="truncate max-w-[120px]" title={cert.revocationReason}>
                                        {cert.revocationReason}
                                    </p>
                                    )}
                                    {cert.revocationTimestamp && (
                                    <p className="truncate max-w-[120px]">
                                        {format(parseISO(cert.revocationTimestamp), 'dd/MM/yy HH:mm')}
                                    </p>
                                    )}
                                </div>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{cert.commonName}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                             {cert.issuerCaId ? (
                                <Button
                                    variant="link"
                                    className="p-0 h-auto font-normal text-left whitespace-normal leading-tight"
                                    onClick={() => router.push(`/certificate-authorities/details?caId=${cert.issuerCaId}`)}
                                    title={`View details for CA ${cert.ca}`}
                                >
                                    {cert.ca}
                                </Button>
                                ) : (
                                cert.ca
                                )}
                          </TableCell>
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
                <p className="text-sm text-muted-foreground text-center py-4">This device does not have an identity with a certificate history.</p>
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
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="rawApiData">
            <Card>
                <CardHeader><CardTitle>Raw API Data (Debug)</CardTitle></CardHeader>
                <CardContent>
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
