
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

export async function generateStaticParams() {
  return [];
}

// Page component (Server Component)
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will now fetch its own data.
  return <CertificateAuthorityDetailsClient />;
}
