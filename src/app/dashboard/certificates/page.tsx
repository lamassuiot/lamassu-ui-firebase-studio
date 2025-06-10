
"use client";

import React, { useState, useEffect } from 'react';
// CertificateImportForm is no longer needed here
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData } from '@/types/certificate';

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

  // handleCertificateImported is no longer needed as the form is removed
  // const handleCertificateImported = (newCertificate: CertificateData) => {
  //   setCertificates((prevCerts) => {
  //     if (prevCerts.some(c => c.fingerprintSha256 === newCertificate.fingerprintSha256 || c.pemData === newCertificate.pemData)) {
  //       return prevCerts;
  //     }
  //     return [newCertificate, ...prevCerts];
  //   });
  // };

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
      {/* CertificateImportForm removed from here */}
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
