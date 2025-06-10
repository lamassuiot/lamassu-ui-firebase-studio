
import React from 'react';
import type { CA } from '@/lib/ca-data';
import { certificateAuthoritiesData } from '@/lib/ca-data';
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// Helper function to get all CA IDs (can be moved to a shared utils if used elsewhere)
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
  return getAllCaIds(certificateAuthoritiesData);
}

// Page component (Server Component)
export default function IssueCertificatePage() {
  return <IssueCertificateFormClient />;
}
