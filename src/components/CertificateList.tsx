
"use client";

import React, { useState } from 'react';
import type { CertificateData } from '@/types/certificate';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, CheckCircle, XCircle, AlertTriangle, Clock, MoreVertical, ArrowUpZA, ArrowDownAZ, ArrowUp01, ArrowDown10, ChevronsUpDown, ShieldAlert, FileText, ShieldCheck } from 'lucide-react';
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
import type { CertSortConfig, SortableCertColumn } from '@/app/certificates/page'; // Import shared types
import { OcspCheckModal } from '@/components/shared/OcspCheckModal';
import { ApiStatusBadge } from '@/components/shared/ApiStatusBadge';

interface CertificateListProps {
  certificates: CertificateData[];
  allCAs: CA[];
  onInspectCertificate: (certificate: CertificateData) => void;
  onCertificateUpdated: (updatedCertificate: CertificateData) => void;
  sortConfig: CertSortConfig | null;
  requestSort: (column: SortableCertColumn) => void;
  isLoading?: boolean; // Optional prop to indicate data loading
}

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
  
  const [isOcspModalOpen, setIsOcspModalOpen] = useState(false);
  const [certForOcsp, setCertForOcsp] = useState<CertificateData | null>(null);
  const [issuerForOcsp, setIssuerForOcsp] = useState<CA | null>(null);


  const SortableHeader: React.FC<{ column: SortableCertColumn; title: string; className?: string }> = ({ column, title, className }) => {
    const isSorted = sortConfig?.column === column;
    let Icon = ChevronsUpDown;
    if (isSorted) {
      if (column === 'expires' || column === 'validFrom') { // Numeric/Date sort icon preference
        Icon = sortConfig?.direction === 'asc' ? ArrowUp01 : ArrowDown10;
      } else { // Text-based sort icon preference
        Icon = sortConfig?.direction === 'asc' ? ArrowUpZA : ArrowDownAZ;
      }
    } else if (column === 'expires' || column === 'validFrom') {
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

  const handleOpenOcspModal = (certificate: CertificateData, issuer: CA | null) => {
    if (!issuer) {
        toast({ title: "Error", description: "Issuer CA details are not available for this certificate. Cannot perform OCSP check.", variant: "destructive" });
        return;
    }
    setCertForOcsp(certificate);
    setIssuerForOcsp(issuer);
    setIsOcspModalOpen(true);
  };
  
  if (certificates.length === 0 && !isLoading) {
    return null; // The parent CertificatesPage will show "No certificates" message
  }

  return (
    <div className={cn("w-full space-y-4", isLoading && "opacity-50 pointer-events-none")}>
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>{/*
          */}<SortableHeader column="commonName" title="Common Name" />{/*
          */}<SortableHeader column="serialNumber" title="Serial Number" className="hidden md:table-cell" />{/*
          */}<TableHead className="hidden lg:table-cell">CA Issuer</TableHead>{/*
          */}<SortableHeader column="validFrom" title="Valid From" />{/*
          */}<SortableHeader column="expires" title="Expires" />{/*
          */}<SortableHeader column="status" title="API Status" />{/*
          */}<TableHead className="text-right">Actions</TableHead>{/*
        */}</TableRow>
          </TableHeader>
          <TableBody>
            {certificates.map((cert) => {
              const issuerCa = cert.issuerCaId && allCAs ? findCaById(cert.issuerCaId, allCAs) : null;
              const issuerDisplayName = issuerCa ? issuerCa.name : getCommonName(cert.issuer);

              return (
                <TableRow key={cert.id}>{/*
                  */}<TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs">{getCommonName(cert.subject)}</TableCell>{/*
                  */}<TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[120px]">{cert.serialNumber}</TableCell>{/*
                  */}<TableCell className="hidden lg:table-cell truncate max-w-[200px]">
                    {issuerCa ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left whitespace-normal leading-tight"
                        onClick={() => router.push(`/certificate-authorities/details?caId=${issuerCa.id}`)} // Updated navigation
                        title={`View details for CA: ${issuerCa.name}`}
                      >
                        {issuerCa.name}
                      </Button>
                    ) : (
                      issuerDisplayName
                    )}
                  </TableCell>{/*
                  */}<TableCell>{format(parseISO(cert.validFrom), 'MMM dd, yyyy')}</TableCell>{/*
                  */}<TableCell>{format(parseISO(cert.validTo), 'MMM dd, yyyy')}</TableCell>{/*
                  */}<TableCell>
                    <ApiStatusBadge status={cert.apiStatus} />
                  </TableCell>{/*
                  */}<TableCell className="text-right space-x-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => router.push(`/certificates/details?certificateId=${cert.serialNumber}`)} // Updated navigation
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
                        <DropdownMenuItem onClick={() => handleOpenOcspModal(cert, issuerCa)} disabled={!cert.ocspUrls || cert.ocspUrls.length === 0}>
                           <ShieldCheck className="mr-2 h-4 w-4" /> OCSP Check
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
                  </TableCell>{/*
                */}</TableRow>
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
      {certForOcsp && issuerForOcsp && (
        <OcspCheckModal
            isOpen={isOcspModalOpen}
            onClose={() => setIsOcspModalOpen(false)}
            certificate={certForOcsp}
            issuerCertificate={issuerForOcsp}
        />
      )}
    </div>
  );
}
