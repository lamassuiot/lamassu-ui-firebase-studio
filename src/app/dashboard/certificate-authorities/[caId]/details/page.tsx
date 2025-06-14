
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered.
  // Pages for specific caId values will be client-side rendered.
  return [];
}

// Page component (Server Component)
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will now fetch its own data using useParams().
  return <CertificateAuthorityDetailsClient />;
}
