

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollTextIcon, PlusCircle, Loader2, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSigningProfiles, deleteSigningProfile, type ApiSigningProfile } from '@/lib/ca-data';
import { IssuanceProfileCard } from '@/components/shared/IssuanceProfileCard';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function SigningProfilesPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [profiles, setProfiles] = useState<ApiSigningProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for deletion
  const [profileToDelete, setProfileToDelete] = useState<ApiSigningProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProfiles = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
        if (!authLoading) setError("User not authenticated.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSigningProfiles(user.access_token);
      setProfiles(data);
    } catch (err: any) {
      setError(err.message || "An unknown error occurred while fetching profiles.");
      setProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    if (!authLoading && isAuthenticated()) {
        fetchProfiles();
    }
  }, [fetchProfiles, authLoading, isAuthenticated]);

  const handleCreateNewProfile = () => {
    router.push('/signing-profiles/new');
  };

  const handleEditProfile = (profileId: string) => {
    router.push(`/signing-profiles/edit?id=${profileId}`);
  };

  const handleDeleteProfileClick = (profile: ApiSigningProfile) => {
    setProfileToDelete(profile);
  };
  
  const handleConfirmDelete = async () => {
    if (!profileToDelete || !user?.access_token) {
      toast({ title: "Error", description: "No profile selected or user not authenticated.", variant: "destructive" });
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteSigningProfile(profileToDelete.id, user.access_token);
      toast({ title: "Success", description: `Profile "${profileToDelete.name}" has been deleted.` });
      setProfileToDelete(null); // Close the dialog
      fetchProfiles(); // Refresh the list
    } catch (err: any) {
      toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">{authLoading ? "Authenticating..." : "Loading Issuance Profiles..."}</p>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ScrollTextIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Issuance Profiles</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={fetchProfiles} variant="outline" disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
            </Button>
            <Button onClick={handleCreateNewProfile}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage templates that define how certificates are signed, including duration, subject attributes, and extensions.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Profiles</AlertTitle>
          <AlertDescription>{error} <Button variant="link" onClick={fetchProfiles} className="p-0 h-auto">Try again?</Button></AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <IssuanceProfileCard
              key={profile.id}
              profile={profile}
              onEdit={() => handleEditProfile(profile.id)}
              onDelete={() => handleDeleteProfileClick(profile)}
            />
          ))}
        </div>
      ) : (
         !isLoading && !error && <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No Issuance Profiles Defined</h3>
            <p className="text-sm text-muted-foreground">
            Get started by creating a new issuance profile.
            </p>
            <Button onClick={handleCreateNewProfile} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Profile
            </Button>
        </div>
      )}
    </div>

    <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the issuance profile "<strong>{profileToDelete?.name}</strong>".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleConfirmDelete}
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    disabled={isDeleting}
                >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isDeleting ? "Deleting..." : "Delete Profile"}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
