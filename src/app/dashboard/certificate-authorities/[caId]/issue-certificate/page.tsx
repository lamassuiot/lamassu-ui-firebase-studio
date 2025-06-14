
import React from 'react';
// import type { CA } from '@/lib/ca-data'; // CA type can still be imported
// import { certificateAuthoritiesData } from '@/lib/ca-data'; // Removed static import
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// This function is problematic with fully dynamic, API-driven data and `output: 'export'`.
// Returning an empty array to avoid build errors.
export async function generateStaticParams() {
  // Example: return [{ caId: 'known-ca-1' }, { caId: 'known-ca-2' }];
  return []; // No CAs will be pre-rendered at build time.
}

// Page component (Server Component)
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here
  // regarding the CA list itself unless the form needed to display parent CA info etc.
  return <IssueCertificateFormClient />;
}
