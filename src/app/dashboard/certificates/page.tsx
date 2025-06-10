
"use client";

import React, { useState, useEffect } from 'react';
import { CertificateList } from '@/components/CertificateList';
import { CertificateDetailsModal } from '@/components/CertificateDetailsModal';
import type { CertificateData, VerificationStatus } from '@/types/certificate';
import { FileText } from 'lucide-react';
import crypto from 'crypto'; // For generating UUIDs for mock data

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

const generateMockPemData = (cn: string, issuer: string): string => {
  return `-----BEGIN CERTIFICATE-----
MII... (Mock PEM data for ${cn})
Subject: CN=${cn}, O=LamassuIoT Devices
Issuer: CN=${issuer}, O=LamassuIoT CAs
...MII
-----END CERTIFICATE-----`;
};

const mockCertificates: CertificateData[] = [
  {
    id: globalThis.crypto.randomUUID(),
    fileName: 'device-alpha-001.pem',
    subject: 'CN=device-alpha-001.lamassu.internal, O=LamassuIoT Devices',
    issuer: 'CN=Device Authentication CA EU West, O=LamassuIoT CAs',
    serialNumber: '1A:2B:3C:4D:5E:6F:01',
    validFrom: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(), // 100 days ago
    validTo: new Date(Date.now() + 265 * 24 * 60 * 60 * 1000).toISOString(),   // 265 days from now
    sans: ['dns:device-alpha-001.lamassu.internal', 'ip:192.168.1.101'],
    pemData: generateMockPemData('device-alpha-001.lamassu.internal', 'Device Authentication CA EU West'),
    verificationStatus: 'verified',
    verificationDetails: 'Certificate chain verified successfully.',
    publicKeyAlgorithm: 'RSA (2048 bits)',
    signatureAlgorithm: 'SHA256withRSA',
    fingerprintSha256: crypto.createHash('sha256').update(generateMockPemData('device-alpha-001.lamassu.internal', 'Device Authentication CA EU West')).digest('hex'),
  },
  {
    id: globalThis.crypto.randomUUID(),
    fileName: 'sensor-beta-007.crt',
    subject: 'CN=sensor-beta-007.lamassu.internal, O=LamassuIoT Sensors',
    issuer: 'CN=Staging Environment CA, O=LamassuIoT Test CAs',
    serialNumber: '7A:8B:9C:0D:1E:2F:02',
    validFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    validTo: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),     // 5 days from now (about to expire)
    sans: ['dns:sensor-beta-007.lamassu.internal'],
    pemData: generateMockPemData('sensor-beta-007.lamassu.internal', 'Staging Environment CA'),
    verificationStatus: 'unverified',
    verificationDetails: 'Certificate has not been verified yet.',
    publicKeyAlgorithm: 'ECDSA (P-256)',
    signatureAlgorithm: 'SHA256withECDSA',
    fingerprintSha256: crypto.createHash('sha256').update(generateMockPemData('sensor-beta-007.lamassu.internal', 'Staging Environment CA')).digest('hex'),
  },
  {
    id: globalThis.crypto.randomUUID(),
    fileName: 'legacy-device.pem',
    subject: 'CN=legacy-device.old-infra, O=Old Systems',
    issuer: 'CN=Old Partner Root CA (Revoked), O=Old CAs',
    serialNumber: 'F1:E2:D3:C4:B5:A6:03',
    validFrom: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(), // 500 days ago
    validTo: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),   // Expired 100 days ago
    sans: [],
    pemData: generateMockPemData('legacy-device.old-infra', 'Old Partner Root CA (Revoked)'),
    verificationStatus: 'expired',
    verificationDetails: 'Certificate is expired.',
    publicKeyAlgorithm: 'RSA (1024 bits)',
    signatureAlgorithm: 'SHA1withRSA',
    fingerprintSha256: crypto.createHash('sha256').update(generateMockPemData('legacy-device.old-infra', 'Old Partner Root CA (Revoked)')).digest('hex'),
  },
];


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
        const parsedCerts = JSON.parse(storedCerts);
        if (Array.isArray(parsedCerts) && parsedCerts.length > 0) {
          setCertificates(parsedCerts);
        } else {
          setCertificates(mockCertificates); // Populate with mock if stored is empty array
        }
      } catch (e) {
        console.error("Failed to parse stored certificates:", e);
        localStorage.removeItem('lamassuIoT_certs');
        setCertificates(mockCertificates); // Populate with mock on error
      }
    } else {
      setCertificates(mockCertificates); // Populate with mock if nothing in storage
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

