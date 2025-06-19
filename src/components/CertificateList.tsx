
"use client";

import React, { useState } from 'react';
import type { CertificateData } from '@/types/certificate';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, XCircle, AlertTriangle, Clock, MoreVertical, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10, ChevronsUpDown, ShieldAlert, FileText } from 'lucide-react';
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
import type { CA } from '@/lib/ca-data';
import { findCaById } from '@/lib/ca-data';
import { cn } from '@/lib/utils';
import { RevocationModal } from '@/components/shared/RevocationModal';
import type { CertSortConfig, SortableCertColumn } from '@/app/dashboard/certificates/page'; // Import shared types

interface CertificateListProps {
  certificates: CertificateData[];
  allCAs: CA[];
  onInspectCertificate: (certificate: CertificateData) => void;
  onCertificateUpdated: (updatedCertificate: CertificateData) => void;
  sortConfig: CertSortConfig | null;
  requestSort: (column: SortableCertColumn) => void;
  isLoading?: boolean; // Optional prop to indicate data loading
}

const ApiStatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  const upperStatus = status.toUpperCase();
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let Icon = AlertTriangle; 

  if (upperStatus.includes('ACTIVE')) {
    badgeClass = "bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300 border-green-300 dark:border-green-700";
    Icon = CheckCircle;
  } else if (upperStatus.includes('REVOKED')) {
    badgeClass = "bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300 border-red-300 dark:border-red-700";
    Icon = XCircle;
  } else if (upperStatus.includes('EXPIRED')) {
    badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-700/30 dark:text-orange-300 border-orange-300 dark:border-orange-700";
    Icon = AlertTriangle;
  } else if (upperStatus.includes('PENDING')) {
    badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700";
    Icon = Clock;
  }

  return <Badge variant="outline" className={cn("text-xs capitalize whitespace-nowrap", badgeClass)}><Icon className="mr-1 h-3 w-3" />{upperStatus.replace('_', ' ')}</Badge>;
};


const getCommonName = (subjectOrIssuer: string): string => {
  const cnMatch = subjectOrIssuer.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subjectOrIssuer; 
};

export function CertificateList({ 
  certificates, 
  allCAs, 
  onInspectCertificate, 
  onCertificateUpdated,
  sortConfig,
  requestSort,
  isLoading 
}: CertificateListProps) {
  const { toast } = useToast();
  const router = useRouter();

  const [isRevocationModalOpen, setIsRevocationModalOpen] = useState(false);
  const [certificateToRevoke, setCertificateToRevoke] = useState<CertificateData | null>(null);

  const SortableHeader: React.FC<{ column: SortableCertColumn; title: string; className?: string }> = ({ column, title, className }) => {
    const isSorted = sortConfig?.column === column;
    let Icon = ChevronsUpDown;
    if (isSorted) {
      if (column === 'expires') { // Numeric/Date sort icon preference
        Icon = sortConfig?.direction === 'asc' ? ArrowUp01 : ArrowDown10;
      } else { // Text-based sort icon preference
        Icon = sortConfig?.direction === 'asc' ? ArrowUpZA : ArrowDownAZ;
      }
    } else if (column === 'expires') {
         Icon = ChevronsUpDown; // Default for non-sorted date
    }
    
    return (
      <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(column)}>
        <div className="flex items-center gap-1">
          {title} <Icon className={cn("h-4 w-4", isSorted ? "text-primary" : "text-muted-foreground/50")} />
        </div>
      </TableHead>
    );
  };

  const handleOpenRevokeCertModal = (certificate: CertificateData) => {
    setCertificateToRevoke(certificate);
    setIsRevocationModalOpen(true);
  };

  const handleConfirmCertificateRevocation = (reason: string) => {
    if (certificateToRevoke) {
      onCertificateUpdated({ ...certificateToRevoke, apiStatus: 'REVOKED' }); // Update local state
      toast({
        title: "Certificate Revocation (Mock)",
        description: `Certificate "${getCommonName(certificateToRevoke.subject)}" marked as revoked with reason: ${reason}.`,
      });
    }
    setIsRevocationModalOpen(false);
    setCertificateToRevoke(null);
  };
  
  if (certificates.length === 0 && !isLoading) {
    return null; // The parent CertificatesPage will show "No certificates" message
  }

  return (
    <div className={cn("w-full space-y-4", isLoading && "opacity-50 pointer-events-none")}>
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="commonName" title="Common Name" />
              <SortableHeader column="serialNumber" title="Serial Number" className="hidden md:table-cell" />
              <TableHead className="hidden lg:table-cell">CA Issuer</TableHead> {/* Changed to regular TableHead */}
              <SortableHeader column="expires" title="Expires" />
              <SortableHeader column="status" title="API Status" />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.map((cert) => {
              const issuerCa = cert.issuerCaId && allCAs ? findCaById(cert.issuerCaId, allCAs) : null;
              const issuerDisplayName = issuerCa ? issuerCa.name : getCommonName(cert.issuer);

              return (
                <TableRow key={cert.id}>
                  <TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs">{getCommonName(cert.subject)}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[120px]">{cert.serialNumber}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-[200px]">
                    {issuerCa ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left whitespace-normal leading-tight"
                        onClick={() => router.push(`/certificate-authorities/${issuerCa.id}/details`)}
                        title={`View details for CA: ${issuerCa.name}`}
                      >
                        {issuerCa.name}
                      </Button>
                    ) : (
                      issuerDisplayName
                    )}
                  </TableCell>
                  <TableCell>{format(parseISO(cert.validTo), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>
                    <ApiStatusBadge status={cert.apiStatus} />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => router.push(`/certificates/${cert.serialNumber}`)} 
                      title="View Certificate Details" 
                      className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2 sm:py-1"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1 hidden sm:inline">Details</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onInspectCertificate(cert)} 
                      title="Quick Inspect (Modal)" 
                      className="h-8 w-8 sm:hidden" // Hide on sm and up, use Details button instead
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Inspect</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" title="More actions" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">More actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onInspectCertificate(cert)}>
                          <Eye className="mr-2 h-4 w-4" /> Quick Inspect (Modal)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleOpenRevokeCertModal(cert)} disabled={cert.apiStatus?.toUpperCase() === 'REVOKED'}>
                          <ShieldAlert className="mr-2 h-4 w-4" /> Revoke Certificate
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
      {certificateToRevoke && (
        <RevocationModal
          isOpen={isRevocationModalOpen}
          onClose={() => {
            setIsRevocationModalOpen(false);
            setCertificateToRevoke(null);
          }}
          onConfirm={handleConfirmCertificateRevocation}
          itemName={getCommonName(certificateToRevoke.subject)}
          itemType="Certificate"
        />
      )}
    </div>
  );
}
