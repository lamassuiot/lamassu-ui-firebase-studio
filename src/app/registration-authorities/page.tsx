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
  Calendar,
  ShieldCheck,
  Edit,
  RefreshCw,
  MoreVertical,
  TerminalSquare,
  Landmark,
  Router as RouterIcon,
  BookText,
  Trash2
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CA } from '@/lib/ca-data';
import { fetchAndProcessCAs, fetchCryptoEngines } from '@/lib/ca-data';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getLucideIconByName } from '@/components/shared/DeviceIconSelectorModal';
import { EstEnrollModal } from '@/components/shared/EstEnrollModal';
import type { ApiCryptoEngine } from '@/types/crypto-engine';
import { fetchRegistrationAuthorities, type ApiRaItem } from '@/lib/dms-api';
import { MetadataViewerModal } from '@/components/shared/MetadataViewerModal';


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
  const [allCryptoEngines, setAllCryptoEngines] = useState<ApiCryptoEngine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedRaForEnroll, setSelectedRaForEnroll] = useState<ApiRaItem | null>(null);
  
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);
  const [selectedRaForMetadata, setSelectedRaForMetadata] = useState<ApiRaItem | null>(null);

  const loadData = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) {
        setError("User not authenticated. Please log in.");
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [raData, casData, enginesData] = await Promise.all([
        fetchRegistrationAuthorities(user.access_token),
        fetchAndProcessCAs(user.access_token),
        fetchCryptoEngines(user.access_token),
      ]);

      setRas(raData.list || []);
      setAllCAs(casData);
      setAllCryptoEngines(enginesData);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setRas([]);
      setAllCAs([]);
      setAllCryptoEngines([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.access_token, isAuthenticated, authLoading]);

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [loadData, authLoading]);

  const handleCreateNewRAClick = () => {
    router.push('/registration-authorities/new');
  };
  
  const getCaNameById = (caId: string) => {
    const findCa = (id: string, cas: CA[]): CA | undefined => {
        for (const ca of cas) {
            if (ca.id === id) return ca;
            if (ca.children) {
                const found = findCa(id, ca.children);
                if (found) return found;
            }
        }
        return undefined;
    }
    const ca = findCa(caId, allCAs);
    return ca ? ca.name : caId;
  };
  
  const handleOpenEnrollModal = (ra: ApiRaItem) => {
    setSelectedRaForEnroll(ra);
    setIsEnrollModalOpen(true);
  };

  const handleShowMetadata = (ra: ApiRaItem) => {
    setSelectedRaForMetadata(ra);
    setIsMetadataModalOpen(true);
  };

  if (authLoading || (isLoading && ras.length === 0)) {
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
           <Button onClick={loadData} variant="outline" disabled={isLoading}>
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
          <AlertDescription>{error} <Button variant="link" onClick={loadData} className="p-0 h-auto ml-1">Try again?</Button></AlertDescription>
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

      {!isLoading && !error && ras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ras.map(ra => {
                const profile = ra.settings.enrollment_settings.device_provisioning_profile;
                const IconComponent = getLucideIconByName(profile.icon);
                const [iconColor, bgColor] = (profile.icon_color || '#888888-#e0e0e0').split('-');

                return (
                <Card key={ra.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <div className="p-1.5 rounded-md inline-flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                                {IconComponent ? (
                                    <IconComponent className="h-5 w-5" style={{ color: iconColor }} />
                                ) : (
                                    <Settings2 className="h-5 w-5 text-primary" />
                                )}
                            </div>
                            <CardTitle className="text-lg truncate" title={ra.name}>{ra.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs pt-1 truncate">
                           ID: <span className="font-mono">{ra.id}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <DetailRow 
                            icon={Calendar} 
                            label="Created On" 
                            value={format(parseISO(ra.creation_ts), 'MMM dd, yyyy')} 
                        />
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
                    </CardContent>
                    <CardFooter className="border-t pt-4">
                      <div className="flex w-full justify-end items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/registration-authorities/new?raId=${ra.id}`)}>
                              <Edit className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                          </Button>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">More actions for {ra.name}</span>
                                  </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleOpenEnrollModal(ra)}>
                                      <TerminalSquare className="mr-2 h-4 w-4" />
                                      <span>EST - Enroll: cURL Commands</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/registration-authorities/cacerts?raId=${ra.id}`)}>
                                      <Landmark className="mr-2 h-4 w-4" />
                                      <span>EST - CACerts</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => alert(`Go to DMS owned devices for RA ${ra.name} (placeholder)`)}>
                                      <RouterIcon className="mr-2 h-4 w-4" />
                                      <span>Go to DMS owned devices</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShowMetadata(ra)}>
                                      <BookText className="mr-2 h-4 w-4" />
                                      <span>Show Metadata</span>
                                  </DropdownMenuItem>
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
                    </CardFooter>
                </Card>
            )})}
        </div>
      )}
    </div>

      <EstEnrollModal
          isOpen={isEnrollModalOpen}
          onOpenChange={setIsEnrollModalOpen}
          ra={selectedRaForEnroll}
          availableCAs={allCAs}
          allCryptoEngines={allCryptoEngines}
          isLoadingCAs={isLoading}
          errorCAs={error}
          loadCAsAction={loadData}
      />
      <MetadataViewerModal
        isOpen={isMetadataModalOpen}
        onOpenChange={setIsMetadataModalOpen}
        title={`Metadata for ${selectedRaForMetadata?.name}`}
        description={`Raw metadata object associated with the Registration Authority.`}
        data={selectedRaForMetadata?.metadata || null}
      />
    </>
  );
}
