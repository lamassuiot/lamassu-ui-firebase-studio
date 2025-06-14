
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { CertificateData, VerificationStatus } from '@/types/certificate';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, CheckCircle, XCircle, AlertTriangle, Clock, Loader2, ShieldQuestion, MoreVertical, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10, Search, ChevronsUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
// Removed: import { certificateAuthoritiesData, findCaByCommonName } from '@/lib/ca-data';
import { findCaByCommonName } from '@/lib/ca-data'; // Keep findCaByCommonName if used, but it needs allCAs
import { cn } from '@/lib/utils';

interface CertificateListProps {
  certificates: CertificateData[];
  onInspectCertificate: (certificate: CertificateData) => void;
  onCertificateUpdated: (updatedCertificate: CertificateData) => void;
  // allCAs: CA[]; // If we want to restore linking, pass allCAs as a prop
}

type SortableColumn = 'commonName' | 'serialNumber' | 'issuerCN' | 'expires' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortableColumn;
  direction: SortDirection;
}

const StatusBadge: React.FC<{ status: VerificationStatus }> = ({ status }) => {
  switch (status) {
    case 'verified':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Verified</Badge>;
    case 'invalid_path':
    case 'revoked':
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Invalid</Badge>;
    case 'expired':
      return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><AlertTriangle className="mr-1 h-3 w-3" />Expired</Badge>;
    case 'pending':
      return <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Pending</Badge>;
    case 'error':
      return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Error</Badge>;
    case 'unverified':
    default:
      return <Badge variant="outline"><ShieldQuestion className="mr-1 h-3 w-3" />Unverified</Badge>;
  }
};

const getCommonName = (subjectOrIssuer: string): string => {
  const cnMatch = subjectOrIssuer.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subjectOrIssuer; 
};

const statusSortOrder: Record<VerificationStatus, number> = {
  verified: 0,
  pending: 1,
  unverified: 2,
  error: 3,
  invalid_path: 4,
  revoked: 5,
  expired: 6,
};


export function CertificateList({ certificates, onInspectCertificate, onCertificateUpdated }: CertificateListProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchField, setSearchField] = useState<'commonName' | 'serialNumber'>('commonName');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  const handleVerify = async (certificate: CertificateData) => {
    setVerifyingId(certificate.id);
    onCertificateUpdated({ ...certificate, verificationStatus: 'pending', verificationDetails: 'Verification in progress...' });
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    let resultStatus: VerificationStatus = 'error';
    let resultDetails = 'An unexpected error occurred during verification.';
    let success = false;
    const randomOutcome = Math.random();
    if (randomOutcome < 0.05) {
      resultStatus = 'error';
      resultDetails = 'An unexpected error occurred during verification.';
    } else if (randomOutcome < 0.15) {
      resultStatus = 'expired';
      resultDetails = 'Certificate is expired.';
    } else if (randomOutcome < 0.25) {
      resultStatus = 'invalid_path';
      resultDetails = 'Certificate validation failed: Unable to find a valid certification path to a trusted root CA.';
    } else {
      resultStatus = 'verified';
      resultDetails = 'Certificate chain verified successfully against trusted roots. Not Expired. Not Revoked (mocked).';
      success = true;
    }
    onCertificateUpdated({ ...certificate, verificationStatus: resultStatus, verificationDetails: resultDetails });
    toast({ title: success ? "Verification Complete" : "Verification Failed", description: resultDetails, variant: success ? "default" : "destructive" });
    setVerifyingId(null);
  };

  const processedCertificates = useMemo(() => {
    let filtered = [...certificates];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(cert => {
        if (searchField === 'commonName') {
          return getCommonName(cert.subject).toLowerCase().includes(lowerSearchTerm);
        }
        if (searchField === 'serialNumber') {
          return cert.serialNumber.toLowerCase().includes(lowerSearchTerm);
        }
        return true;
      });
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.column) {
          case 'commonName':
            aValue = getCommonName(a.subject).toLowerCase();
            bValue = getCommonName(b.subject).toLowerCase();
            break;
          case 'serialNumber':
            aValue = a.serialNumber.toLowerCase();
            bValue = b.serialNumber.toLowerCase();
            break;
          case 'issuerCN':
            aValue = getCommonName(a.issuer).toLowerCase();
            bValue = getCommonName(b.issuer).toLowerCase();
            break;
          case 'expires':
            aValue = parseISO(a.validTo).getTime();
            bValue = parseISO(b.validTo).getTime();
            break;
          case 'status':
            aValue = statusSortOrder[a.verificationStatus];
            bValue = statusSortOrder[b.verificationStatus];
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return filtered;
  }, [certificates, searchTerm, searchField, sortConfig]);

  const requestSort = (column: SortableColumn) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.column === column && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ column, direction });
  };

  const SortableHeader: React.FC<{ column: SortableColumn; title: string; className?: string }> = ({ column, title, className }) => {
    const isSorted = sortConfig?.column === column;
    const Icon = isSorted ? (sortConfig?.direction === 'asc' ? ArrowUpZA : ArrowDownAZ) : ChevronsUpDown;
    if (column === 'expires') {
         const DateIcon = isSorted ? (sortConfig?.direction === 'asc' ? ArrowUp01 : ArrowDown10) : ChevronsUpDown;
         return (
            <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(column)}>
                <div className="flex items-center gap-1">
                {title} <DateIcon className={cn("h-4 w-4", isSorted ? "text-primary" : "text-muted-foreground/50")} />
                </div>
            </TableHead>
        );
    }
    return (
      <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(column)}>
        <div className="flex items-center gap-1">
          {title} <Icon className={cn("h-4 w-4", isSorted ? "text-primary" : "text-muted-foreground/50")} />
        </div>
      </TableHead>
    );
  };
  
  if (certificates.length === 0 && searchTerm === '') { // Show "No Certificates" only if initial list is empty AND no search term
    return (
      <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
        <h3 className="text-lg font-semibold text-muted-foreground">No Certificates Listed</h3>
        <p className="text-sm text-muted-foreground">
          There are no certificates to display. You can import certificates using the form typically found on this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-grow flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground ml-2 absolute pointer-events-none" />
            <Input
                type="text"
                placeholder={`Search by ${searchField === 'commonName' ? 'Common Name' : 'Serial Number'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full sm:w-auto flex-grow"
            />
        </div>
        <Select value={searchField} onValueChange={(value: 'commonName' | 'serialNumber') => setSearchField(value)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="commonName">Common Name</SelectItem>
            <SelectItem value="serialNumber">Serial Number</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {processedCertificates.length === 0 && searchTerm !== '' && (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
            <h3 className="text-lg font-semibold text-muted-foreground">No Matching Certificates</h3>
            <p className="text-sm text-muted-foreground">
            Your search for "{searchTerm}" in "{searchField === 'commonName' ? 'Common Name' : 'Serial Number'}" did not return any results. Try adjusting your search.
            </p>
        </div>
      )}

      { (processedCertificates.length > 0 || (certificates.length > 0 && searchTerm === '')) && (
        <div className="overflow-x-auto">
            <Table>
            <TableHeader>
                <TableRow>
                <SortableHeader column="commonName" title="Common Name" />
                <SortableHeader column="serialNumber" title="Serial Number" className="hidden md:table-cell" />
                <SortableHeader column="issuerCN" title="CA Issuer" className="hidden lg:table-cell" />
                <SortableHeader column="expires" title="Expires" />
                <SortableHeader column="status" title="Status" />
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {processedCertificates.map((cert) => {
                const issuerCN = getCommonName(cert.issuer);
                // const issuerCa = findCaByCommonName(issuerCN, allCAs); // Needs allCAs passed in

                return (
                    <TableRow key={cert.id}>
                    <TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs">{getCommonName(cert.subject)}</TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[120px]">{cert.serialNumber}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[200px]">
                        {/* {issuerCa ? (
                        <Button
                            variant="link"
                            className="p-0 h-auto text-left whitespace-normal leading-tight"
                            onClick={() => router.push(`/dashboard/certificate-authorities/${issuerCa.id}/details`)}
                        >
                            {issuerCN}
                        </Button>
                        ) : ( */}
                        {issuerCN}
                        {/* )} */}
                    </TableCell>
                    <TableCell>{format(parseISO(cert.validTo), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                        <StatusBadge status={cert.verificationStatus} />
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" onClick={() => onInspectCertificate(cert)} title="Inspect Certificate" className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only sm:not-sr-only sm:ml-1 hidden sm:inline">Inspect</span>
                        </Button>
                        <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleVerify(cert)}
                        disabled={verifyingId === cert.id || cert.verificationStatus === 'pending'}
                        title="Verify Certificate"
                        className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                        >
                        {verifyingId === cert.id || cert.verificationStatus === 'pending' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="sr-only sm:not-sr-only sm:ml-1 hidden sm:inline">Verify</span>
                        </Button>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" title="More actions" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => alert(`Revoke certificate: ${cert.fileName} (placeholder)`)}>
                            Revoke Certificate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => alert(`Download PEM for: ${cert.fileName} (placeholder)`)}>
                            Download PEM
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => alert(`View audit log for: ${cert.fileName} (placeholder)`)}>
                            View Audit Log
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}

