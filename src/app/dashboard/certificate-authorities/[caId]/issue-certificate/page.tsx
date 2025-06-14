
import React from 'react';
// import type { CA } from '@/lib/ca-data'; // CA type can still be imported
// import { certificateAuthoritiesData } from '@/lib/ca-data'; // Removed static import
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// This function is problematic with fully dynamic, API-driven data and `output: 'export'`.
// Returning a list of known/example CA IDs to avoid build errors.
export async function generateStaticParams() {
  return [
    { caId: '33631fff-38ac-4950-a15c-e8d12e7b794f' }, // ID from build error (assuming same logic applies)
    { caId: '07c23e39-964a-4a2b-8021-e9584c4db8ad' }, // Example from API
    { caId: '3f3b381b-ed94-4017-ade9-76f2958b39e6' }, // Example from API
    { caId: '073e35ae-de5a-4183-a7a6-2125600bda5f' }, // New ID from build error
    // Add other known/important CA IDs here if needed for pre-rendering
  ];
}

// Page component (Server Component)
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here
  // regarding the CA list itself unless the form needed to display parent CA info etc.
  return <IssueCertificateFormClient />;
}

    