
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, FileSignature, AlertTriangle, Cpu } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ViewCsrModal } from '@/components/ca/requests/ViewCsrModal';

interface Subject {
  common_name: string;
}

interface KeyMetadata {
    type: string;
    bits: number;
}

interface X509CertificateRequest {
    pem: string;
}

interface CACertificateRequest {
    id: string;
    key_id: string;
    metadata: Record<string, any>;
    subject: Subject;
    creation_ts: string;
    engine_id: string;
    key_metadata: KeyMetadata;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    fingerprint: string;
    csr: X509CertificateRequest;
}

const StatusBadge: React.FC<{ status: CACertificateRequest['status'] }> = ({ status }) => {
  let badgeClass = "";
  switch (status) {
    case 'PENDING':
      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
      break;
    case 'APPROVED':
      badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
      break;
    case 'REJECTED':
      badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
      break;
    default:
      badgeClass = "bg-muted text-muted-foreground border-border";
  }
  return <Badge variant="outline" className={cn("text-xs capitalize", badgeClass)}>{status.toLowerCase()}</Badge>;
};

export default function CaRequestsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<CACertificateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCsr, setSelectedCsr] = useState<string | null>(null);
  const [isCsrModalOpen, setIsCsrModalOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!isAuthenticated() || !user?.access_token) {
      if (!authLoading) setError("User not authenticated.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://lab.lamassu.io/api/ca/v1/cas/requests', {
        headers: { 'Authorization': `Bearer ${user.access_token}` },
      });

      if (!response.ok) {
        let errorJson;
        let errorMessage = `Failed to fetch CA requests. Status: ${response.status}`;
        try {
          errorJson = await response.json();
          errorMessage = `Failed to fetch requests: ${errorJson.err || errorJson.message || 'Unknown error'}`;
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setRequests(data.list || []);

    } catch (err: any) {
      setError(err.message);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authLoading, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleViewCsr = (csrPem: string) => {
    setSelectedCsr(csrPem);
    setIsCsrModalOpen(true);
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileSignature className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-semibold">Certificate Authority Requests</h1>
        </div>
        <Button onClick={fetchRequests} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        View and manage pending and completed requests for new Certificate Authorities.
      </p>

      {isLoading && requests.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading requests...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Requests</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : requests.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created At</TableHead>
                <TableHead className="hidden sm:table-cell"><Cpu className="inline mr-1 h-4 w-4" />Engine</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.id}</TableCell>
                  <TableCell className="font-medium truncate max-w-xs">{req.subject.common_name}</TableCell>
                  <TableCell><StatusBadge status={req.status} /></TableCell>
                  <TableCell className="hidden md:table-cell">{format(parseISO(req.creation_ts), 'MMM dd, yyyy HH:mm')}</TableCell>
                  <TableCell className="hidden sm:table-cell">{req.engine_id}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleViewCsr(req.csr.pem)}>
                      View CSR
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
          <h3 className="text-lg font-semibold text-muted-foreground">No CA Requests Found</h3>
          <p className="text-sm text-muted-foreground">
            There are no pending or historical Certificate Authority requests.
          </p>
        </div>
      )}

      <ViewCsrModal
        isOpen={isCsrModalOpen}
        onOpenChange={setIsCsrModalOpen}
        csrPem={selectedCsr}
      />
    </div>
  );
}
