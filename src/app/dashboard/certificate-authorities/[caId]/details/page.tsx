
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

// Page component (Server Component)
// With `generateStaticParams` removed, this page will be client-rendered for any caId
// when using `output: 'export'`.
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will now fetch its own data.
  return <CertificateAuthorityDetailsClient />;
}
