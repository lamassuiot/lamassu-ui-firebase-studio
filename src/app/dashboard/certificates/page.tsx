
"use client";

import React, { useState, useEffect } from 'react';
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData } from '@/types/certificate';
import { FileText } from 'lucide-react'; // Added icon import

// Loader2Icon to be defined or imported if needed elsewhere, kept local for now
function Loader2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedCerts = localStorage.getItem('lamassuIoT_certs');
    if (storedCerts) {
      try {
        setCertificates(JSON.parse(storedCerts));
      } catch (e) {
        console.error("Failed to parse stored certificates:", e);
        localStorage.removeItem('lamassuIoT_certs');
      }
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('lamassuIoT_certs', JSON.stringify(certificates));
    }
  }, [certificates, isClient]);

  const handleInspectCertificate = (certificate: CertificateData) => {
    setSelectedCertificate(certificate);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCertificate(null);
  };

  const handleCertificateUpdated = (updatedCertificate: CertificateData) => {
    setCertificates(prevCerts => 
      prevCerts.map(cert => cert.id === updatedCertificate.id ? updatedCertificate : cert)
    );
  };
  
  if (!isClient) {
    return (
        <div className="flex flex-col items-center justify-center flex-1 p-4 sm:p-8">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Loading Certificates...</p>
        </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <FileText className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-semibold">Issued Certificates</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        A list of certificates managed by the system, displaying their Common Name (CN), serial number, issuing CA, and current status.
      </p>
      <CertificateList 
        certificates={certificates} 
        onInspectCertificate={handleInspectCertificate}
        onCertificateUpdated={handleCertificateUpdated}
      />
      <CertificateDetailsModal
        certificate={selectedCertificate}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}

