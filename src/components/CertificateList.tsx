
"use client";

import React, { useState, useTransition } from 'react';
import type { CertificateData, VerificationStatus } from '@/types/certificate';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, CheckCircle, XCircle, AlertTriangle, Clock, Loader2, ShieldQuestion, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { verifyCertificateAction } from '@/lib/actions/certificateActions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface CertificateListProps {
  certificates: CertificateData[];
  onInspectCertificate: (certificate: CertificateData) => void;
  onCertificateUpdated: (updatedCertificate: CertificateData) => void;
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

const getCommonName = (subject: string): string => {
  const cnMatch = subject.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subject; // Fallback to full subject if CN not found
};

export function CertificateList({ certificates, onInspectCertificate, onCertificateUpdated }: CertificateListProps) {
  const [isVerifying, startVerifyingTransition] = useTransition();
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVerify = async (certificate: CertificateData) => {
    setVerifyingId(certificate.id);
    onCertificateUpdated({ ...certificate, verificationStatus: 'pending', verificationDetails: 'Verification in progress...' });

    startVerifyingTransition(async () => {
      try {
        const result = await verifyCertificateAction(certificate.id, certificate.pemData);
        onCertificateUpdated({
          ...certificate,
          verificationStatus: result.status,
          verificationDetails: result.details,
        });
        toast({
          title: result.success ? "Verification Complete" : "Verification Failed",
          description: result.details,
          variant: result.success ? "default" : "destructive",
        });
      } catch (error) {
        console.error("Verification error:", error);
        onCertificateUpdated({
          ...certificate,
          verificationStatus: 'error',
          verificationDetails: 'An unexpected error occurred during verification client-side.',
        });
        toast({
          title: "Verification Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setVerifyingId(null);
      }
    });
  };

  if (certificates.length === 0) {
    return (
      <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center bg-muted/20">
        <h3 className="text-lg font-semibold text-muted-foreground">No Certificates Listed</h3>
        <p className="text-sm text-muted-foreground">
          There are no certificates to display. Mock data is available on the main certificates page if local storage is empty.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full">
      <div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Common Name</TableHead>
              <TableHead className="hidden md:table-cell">Serial Number</TableHead>
              <TableHead className="hidden lg:table-cell">CA Issuer</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certificates.map((cert) => (
              <TableRow key={cert.id}>
                <TableCell className="font-medium truncate max-w-[200px] sm:max-w-xs">{getCommonName(cert.subject)}</TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[150px]">{cert.serialNumber}</TableCell>
                <TableCell className="hidden lg:table-cell truncate max-w-xs">{cert.issuer}</TableCell>
                <TableCell>{format(new Date(cert.validTo), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  <StatusBadge status={cert.verificationStatus} />
                </TableCell>
                <TableCell className="text-right space-x-1 sm:space-x-2">
                  <Button variant="outline" size="sm" onClick={() => onInspectCertificate(cert)} title="Inspect Certificate">
                    <Eye className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Inspect</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(cert)}
                    disabled={(isVerifying && verifyingId === cert.id) || cert.verificationStatus === 'pending'}
                    title="Verify Certificate"
                  >
                    {(isVerifying && verifyingId === cert.id) || cert.verificationStatus === 'pending' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="sr-only sm:not-sr-only sm:ml-1">Verify</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" title="More actions">
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
