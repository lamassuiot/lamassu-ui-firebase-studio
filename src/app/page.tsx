"use client";

import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { CertificateImportForm } from '@/components/CertificateImportForm';
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData } from '@/types/certificate';
import { ThemeToggle } from '@/components/ThemeToggle'; // Assuming this might be useful

export default function DashboardPage() {
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load certificates from localStorage if needed
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

  const handleCertificateImported = (newCertificate: CertificateData) => {
    setCertificates((prevCerts) => {
      // Avoid duplicates based on fingerprint if available, or pemData for simplicity
      if (prevCerts.some(c => c.fingerprintSha256 === newCertificate.fingerprintSha256 || c.pemData === newCertificate.pemData)) {
        return prevCerts;
      }
      return [newCertificate, ...prevCerts];
    });
  };

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
    // Render a loading state or null during server-side rendering / pre-hydration
    // to avoid hydration mismatch with localStorage access
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 bg-background text-foreground">
            <Loader2Icon className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg">Loading LamassuIoT...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 transition-colors duration-300">
      <header className="w-full max-w-5xl mb-12 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-10 w-10 text-primary" />
          <h1 className="font-headline text-4xl font-bold text-primary">LamassuIoT</h1>
        </div>
        {/* <ThemeToggle /> You can add this if ThemeToggle component is created */}
      </header>

      <main className="w-full max-w-5xl space-y-10">
        <CertificateImportForm onCertificateImported={handleCertificateImported} />
        <CertificateList 
          certificates={certificates} 
          onInspectCertificate={handleInspectCertificate}
          onCertificateUpdated={handleCertificateUpdated}
        />
      </main>

      <CertificateDetailsModal
        certificate={selectedCertificate}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      <footer className="w-full max-w-5xl mt-16 pt-8 border-t border-border/50 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} LamassuIoT. Secure your IoT landscape.
        </p>
      </footer>
    </div>
  );
}

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
  )
}
