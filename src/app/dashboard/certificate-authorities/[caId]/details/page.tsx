
// generateStaticParams and helper function must be at the top level for Server Components
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData as allCertificateAuthoritiesData } from '@/lib/ca-data';
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

function getAllCaIds(cas: CA[]): { caId: string }[] {
  const ids: { caId: string }[] = [];
  function recurse(currentCAs: CA[]) {
    for (const ca of currentCAs) {
      ids.push({ caId: ca.id });
      if (ca.children) {
        recurse(ca.children);
      }
    }
  }
  recurse(cas);
  return ids;
}

export async function generateStaticParams() {
  return getAllCaIds(allCertificateAuthoritiesData);
}

// Page component (Server Component)
export default function CertificateAuthorityDetailsPage() {
  // Pass allCertificateAuthoritiesData as a prop to the client component
  // This avoids the client component needing to import it directly if it's only used for lookups passed from server
  return <CertificateAuthorityDetailsClient allCertificateAuthoritiesData={allCertificateAuthoritiesData} />;
}
