
"use client";

import React, { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { certificateAuthoritiesData, findCaByCommonName } from '@/lib/ca-data';


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

const getCommonName = (subjectOrIssuer: string): string => {
  const cnMatch = subjectOrIssuer.match(/CN=([^,]+)/);
  return cnMatch ? cnMatch[1] : subjectOrIssuer; 
};

export function CertificateList({ certificates, onInspectCertificate, onCertificateUpdated }: CertificateListProps) {
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleVerify = async (certificate: CertificateData) => {
    setVerifyingId(certificate.id);
    onCertificateUpdated({ ...certificate, verificationStatus: 'pending', verificationDetails: 'Verification in progress...' });

    // Simulate verification delay and process (client-side)
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    let resultStatus: VerificationStatus = 'error';
    let resultDetails = 'An unexpected error occurred during verification.';
    let success = false;

    // Mocked verification logic
    const randomOutcome = Math.random();
    if (randomOutcome < 0.05) { // 5% chance of error
      resultStatus = 'error';
      resultDetails = 'An unexpected error occurred during verification.';
    } else if (randomOutcome < 0.15) { // 10% chance of expired
      resultStatus = 'expired';
      resultDetails = 'Certificate is expired.';
    } else if (randomOutcome < 0.25) { // 10% chance of invalid path
      resultStatus = 'invalid_path';
      resultDetails = 'Certificate validation failed: Unable to find a valid certification path to a trusted root CA.';
    } else { // 75% chance of successful verification
      resultStatus = 'verified';
      resultDetails = 'Certificate chain verified successfully against trusted roots. Not Expired. Not Revoked (mocked).';
      success = true;
    }

    onCertificateUpdated({
      ...certificate,
      verificationStatus: resultStatus,
      verificationDetails: resultDetails,
    });
    
    toast({
      title: success ? "Verification Complete" : "Verification Failed",
      description: resultDetails,
      variant: success ? "default" : "destructive",
    });

    setVerifyingId(null);
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
            {certificates.map((cert) => {
              const issuerCN = getCommonName(cert.issuer);
              const issuerCa = findCaByCommonName(issuerCN, certificateAuthoritiesData);

              return (
                <TableRow key={cert.id}>
                  <TableCell className="font-medium truncate max-w-[200px] sm:max-w-xs">{getCommonName(cert.subject)}</TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs truncate max-w-[150px]">{cert.serialNumber}</TableCell>
                  <TableCell className="hidden lg:table-cell truncate max-w-xs">
                    {issuerCa ? (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left"
                        onClick={() => router.push(`/dashboard/certificate-authorities/${issuerCa.id}/details`)}
                      >
                        {issuerCN}
                      </Button>
                    ) : (
                      issuerCN
                    )}
                  </TableCell>
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
                      disabled={verifyingId === cert.id || cert.verificationStatus === 'pending'}
                      title="Verify Certificate"
                    >
                      {verifyingId === cert.id || cert.verificationStatus === 'pending' ? (
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
