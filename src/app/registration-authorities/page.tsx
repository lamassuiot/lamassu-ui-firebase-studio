
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Settings2,
  Tag,
  ShieldCheck,
  Edit,
  RefreshCw,
  MoreVertical,
  TerminalSquare,
  Router as RouterIcon,
  BookText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  ListChecks,
  Server,
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { findCaById, fetchAndProcessCAs } from '@/lib/ca-data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { getLucideIconByName } from '@/components/shared/DeviceIconSelectorModal';
import { EstEnrollModal } from '@/components/shared/EstEnrollModal';
import { EstReEnrollModal } from '@/components/shared/EstReEnrollModal';
import { fetchRegistrationAuthorities, updateRaMetadata, type ApiRaItem } from '@/lib/dms-api';
import { MetadataViewerModal } from '@/components/shared/MetadataViewerModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start space-x-2 py-1">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
);

export default function RegistrationAuthoritiesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [ras, setRas] = useState<ApiRaItem[]>([]);
  const [allCAs, setAllCAs] = useState<CA[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [pageSize, setPageSize] = useState('6');
  const [bookmarkStack, setBookmarkStack] = useState<(string | null)[]>([null]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [nextTokenFromApi, setNextTokenFromApi] = useState<string | null>(null);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedRaForEnroll, setSelectedRaForEnroll] = useState<ApiRaItem | null>(null);
  
  const [isReEnrollModalOpen, setIsReEnrollModalOpen] = useState(false);
  const [selectedRaForReEnroll, setSelectedRaForReEnroll] = useState<ApiRaItem | null>(null);

  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [selectedRaForMetadata, setSelectedRaForMetadata] = useState<ApiRaItem | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);


  // Reset pagination when page size changes
  useEffect(() => {
    setCurrentPageIndex(0);
    setBookmarkStack([null]);
  }, [pageSize]);

  useEffect(() => {
    // Gate fetching until the component is mounted and auth is resolved
    if (!isClientMounted || authLoading || !isAuthenticated() || !user?.access_token) {
      if (!authLoading && !isAuthenticated() && isClientMounted) {
        setError("User not authenticated.");
      }
      if(!authLoading) setIsLoading(false);
      return;
    }

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const params = new URLSearchParams();
          params.append('sort_by', 'name');
          params.append('sort_mode', 'asc');
          params.append('page_size', pageSize);
          
          const bookmarkToFetch = bookmarkStack[currentPageIndex];
          if (bookmarkToFetch) {
            params.append('bookmark', bookmarkToFetch);
          }
          
          // Fetch RAs and CAs in parallel, but only fetch CAs if the list is empty to optimize pagination.
          const promises: [Promise<any>, Promise<CA[]>?] = [
            fetchRegistrationAuthorities(user.access_token!, params)
          ];
          
          if (allCAs.length === 0) {
            promises.push(fetchAndProcessCAs(user.access_token!));
          }

          const [raData, caData] = await Promise.all(promises);

          setRas(raData.list || []);
          setNextTokenFromApi(raData.next || null);
          if (caData) { // Only update CAs if they were fetched
            setAllCAs(caData);
          }

        } catch (err: any) {
          setError(err.message || 'An unknown error occurred while fetching data.');
          setRas([]);
          setNextTokenFromApi(null);
          // Don't clear CAs on RA fetch failure if we already have them
          // setAllCAs([]); 
        } finally {
          setIsLoading(false);
        }
    };
    
    fetchData();
  }, [isClientMounted, authLoading, isAuthenticated, user?.access_token, pageSize, currentPageIndex]);


  const getCaNameById = (caId: string) => {
    const ca = findCaById(caId, allCAs);
    return ca ? ca.name : caId;
  };

  useEffect(() => {
    if (isClientMounted && !authLoading && isAuthenticated()) {
      fetchData(bookmarkStack[currentPageIndex]);
    }
  }, [isClientMounted, authLoading, isAuthenticated, bookmarkStack, currentPageIndex, fetchData]);

  const handleNextPage = () => {
    if (isLoading || !nextTokenFromApi) return;
    const potentialNextPageIndex = currentPageIndex + 1;
    if (potentialNextPageIndex < bookmarkStack.length) {
      setCurrentPageIndex(potentialNextPageIndex);
    } else {
      setBookmarkStack(prev => [...prev, nextTokenFromApi]);
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (isLoading || currentPageIndex === 0) return;
    setCurrentPageIndex(prev => prev - 1);
  };
  
  const handleRefresh = () => {
    // This will trigger the useEffect to refetch
    setBookmarkStack(prev => [...prev]);
  };

  const handleCreateNewRAClick = () => {
    router.push('/registration-authorities/new');
  };
  
  const handleOpenEnrollModal = (ra: ApiRaItem) => {
    setSelectedRaForEnroll(ra);
    setIsEnrollModalOpen(true);
  };
  
  const handleOpenReEnrollModal = (ra: ApiRaItem) => {
    setSelectedRaForReEnroll(ra);
    setIsReEnrollModalOpen(true);
  };

  const handleShowMetadata = (ra: ApiRaItem) => {
    setSelectedRaForMetadata(ra);
    setIsMetadataModalOpen(true);
  };

  const handleUpdateRaMetadata = async (raId: string, metadata: object) => {
    if (!user?.access_token) {
        throw new Error("User not authenticated.");
    }
    await updateRaMetadata(raId, metadata, user.access_token);
  };

  if (!isClientMounted || authLoading || (isLoading && ras.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">
          {authLoading ? "Authenticating..." : "Loading Registration Authorities..."}
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 w-full pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Registration Authorities</h1>
        </div>
        <div className="flex items-center space-x-2">
           <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button variant="default" onClick={handleCreateNewRAClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create New RA
            </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage policies for device enrollment and certificate issuance.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription>{error} <Button variant="link" onClick={handleRefresh} className="p-0 h-auto ml-1">Try again?</Button></AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && ras.length === 0 && (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No Registration Authorities Found</h3>
            <p className="text-sm text-muted-foreground">Get started by creating a new RA to define an enrollment policy.</p>
            <Button onClick={handleCreateNewRAClick} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New RA
            </Button>
        </div>
      )}

      {!error && ras.length > 0 && (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isLoading && "opacity-50")}>
            {ras.map(ra => {
                const profile = ra.settings.enrollment_settings.device_provisioning_profile;
                const IconComponent = getLucideIconByName(profile.icon);
                const [iconColor, bgColor] = (profile.icon_color || '#888888-#e0e0e0').split('-');
                const authMode = ra.settings.enrollment_settings.est_rfc7030_settings?.auth_mode;

                return (
                <Card key={ra.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <div className="flex justify-between items-start space-x-4">
                            <div className="flex items-center space-x-4 flex-grow min-w-0">
                                <div className="p-2 rounded-md flex-shrink-0" style={{ backgroundColor: bgColor }}>
                                    {IconComponent ? (
                                        <IconComponent className="h-6 w-6" style={{ color: iconColor }} />
                                    ) : (
                                        <Settings2 className="h-6 w-6 text-primary" />
                                    )}
                                </div>
                                <div>
                                    <CardTitle className="text-lg truncate" title={ra.name}>{ra.name}</CardTitle>
                                    <CardDescription className="text-xs pt-1 truncate">
                                       ID: <span className="font-mono">{ra.id}</span>
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex-shrink-0">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">More actions for {ra.name}</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => router.push(`/registration-authorities/new?raId=${ra.id}`)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/devices?dms_owner=${ra.id}`)}>
                                            <RouterIcon className="mr-2 h-4 w-4" />
                                            <span>Go to DMS owned devices</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleShowMetadata(ra)}>
                                            <BookText className="mr-2 h-4 w-4" />
                                            <span>Show/Edit Metadata</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>
                                                <TerminalSquare className="mr-2 h-4 w-4" />
                                                <span>EST (RFC-7030)</span>
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                                <DropdownMenuSubContent>
                                                    <DropdownMenuItem onClick={() => handleOpenEnrollModal(ra)}>
                                                        <span>Enroll...</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleOpenReEnrollModal(ra)}>
                                                        <span>Re-Enroll...</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/registration-authorities/cacerts?raId=${ra.id}`)}>
                                                        <span>Get CA Certs</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                        </DropdownMenuSub>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => alert(`Delete RA ${ra.name} (placeholder)`)}
                                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3 pt-0">
                        <DetailRow 
                            icon={PlusCircle} 
                            label="Registration Mode" 
                            value={<Badge variant="outline">{ra.settings.enrollment_settings.registration_mode}</Badge>} 
                        />
                         <DetailRow 
                            icon={ShieldCheck} 
                            label="Enrollment CA" 
                            value={
                                <span className="font-medium text-primary/90 truncate" title={getCaNameById(ra.settings.enrollment_settings.enrollment_ca)}>
                                    {getCaNameById(ra.settings.enrollment_settings.enrollment_ca)}
                                </span>
                            } 
                        />
                        <DetailRow 
                            icon={Tag} 
                            label="Device Tags" 
                            value={
                                <div className="flex flex-wrap gap-1">
                                    {ra.settings.enrollment_settings.device_provisioning_profile.tags.map(tag => (
                                        <Badge key={tag} variant="secondary">{tag}</Badge>
                                    ))}
                                </div>
                            } 
                        />
                        <DetailRow
                            icon={Shield}
                            label="Authentication Mode"
                            value={
                                <Badge variant="outline">
                                    {authMode?.replace('_', ' ') || 'N/A'}
                                </Badge>
                            }
                        />
                        {authMode === 'CLIENT_CERTIFICATE' && (
                            <>
                                <DetailRow
                                    icon={ListChecks}
                                    label="Validation CAs"
                                    value={
                                        ra.settings.enrollment_settings.est_rfc7030_settings?.client_certificate_settings?.validation_cas?.length > 0 ? (
                                            <span className="font-normal text-foreground/90 truncate">
                                                {ra.settings.enrollment_settings.est_rfc7030_settings.client_certificate_settings.validation_cas.map(id => getCaNameById(id)).join(', ')}
                                            </span>
                                        ) : (<span className="text-xs text-muted-foreground">None</span>)
                                    }
                                />
                                {ra.settings.reenrollment_settings?.additional_validation_cas?.length > 0 && (
                                    <DetailRow
                                        icon={ListChecks}
                                        label="Re-enrollment Validation CAs"
                                        value={
                                            <span className="font-normal text-foreground/90 truncate">
                                                {ra.settings.reenrollment_settings.additional_validation_cas.map(id => getCaNameById(id)).join(', ')}
                                            </span>
                                        }
                                    />
                                )}
                            </>
                        )}
                        <DetailRow
                            icon={Server}
                            label="Server-Side Key Generation"
                            value={
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant={ra.settings.server_keygen_settings?.enabled ? "default" : "secondary"} className={ra.settings.server_keygen_settings?.enabled ? 'bg-green-100 text-green-700' : ''}>
                                        {ra.settings.server_keygen_settings?.enabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                    {ra.settings.server_keygen_settings?.enabled && ra.settings.server_keygen_settings.key && (
                                        <span className="text-xs text-muted-foreground">
                                            ({ra.settings.server_keygen_settings.key.type}
                                            {' - '}
                                            {ra.settings.server_keygen_settings.key.type === 'RSA' 
                                                ? `${ra.settings.server_keygen_settings.key.bits} bit` 
                                                : { 256: 'P-256', 384: 'P-384', 521: 'P-521' }[ra.settings.server_keygen_settings.key.bits] || `${ra.settings.server_keygen_settings.key.bits} bit`
                                            })
                                        </span>
                                    )}
                                </div>
                            }
                        />
                    </CardContent>
                    <CardFooter className="border-t pt-3 pb-3 text-xs text-muted-foreground">
                        <span>Created: {format(parseISO(ra.creation_ts), 'MMM dd, yyyy')}</span>
                    </CardFooter>
                </Card>
            )})}
        </div>
      )}

      {(!isLoading && !error && (ras.length > 0 || currentPageIndex > 0)) && (
          <div className="flex justify-between items-center mt-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="pageSizeSelectRaList" className="text-sm text-muted-foreground whitespace-nowrap">Page Size:</Label>
                <Select value={pageSize} onValueChange={setPageSize} disabled={isLoading || authLoading}>
                  <SelectTrigger id="pageSizeSelectRaList" className="w-[80px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                  <Button onClick={handlePreviousPage} disabled={isLoading || currentPageIndex === 0} variant="outline">
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </Button>
                  <Button onClick={handleNextPage} disabled={isLoading || !nextTokenFromApi} variant="outline">
                      Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </div>
          </div>
      )}

    </div>

      <EstEnrollModal
          isOpen={isEnrollModalOpen}
          onOpenChange={setIsEnrollModalOpen}
          ra={selectedRaForEnroll}
      />
      <EstReEnrollModal
        isOpen={isReEnrollModalOpen}
        onOpenChange={setIsReEnrollModalOpen}
        ra={selectedRaForReEnroll}
      />
      <MetadataViewerModal
        isOpen={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        title={`Metadata for ${selectedRaForMetadata?.name}`}
        description={`Raw metadata object associated with the Registration Authority.`}
        data={selectedRaForMetadata?.metadata || null}
        isEditable={true}
        itemId={selectedRaForMetadata?.id}
        onSave={handleUpdateRaMetadata}
        onUpdateSuccess={handleRefresh}
      />
    </>
  );
}

