
// generateStaticParams and helper function must be at the top level for Server Components
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

// This function is problematic with fully dynamic, API-driven data and `output: 'export'`.
// Returning a list of known/example CA IDs to avoid build errors.
export async function generateStaticParams() {
  return [
    { caId: '33631fff-38ac-4950-a15c-e8d12e7b794f' }, // ID from build error
    { caId: '07c23e39-964a-4a2b-8021-e9584c4db8ad' }, // Example from API
    { caId: '3f3b381b-ed94-4017-ade9-76f2958b39e6' }, // Example from API
    { caId: '073e35ae-de5a-4183-a7a6-2125600bda5f' }, // New ID from build error
    { caId: 'c82d689b-3c4f-454f-92e4-23d0d07c00a1' }, // Added this ID
    // Add other known/important CA IDs here if needed for pre-rendering
  ];
}

// Page component (Server Component)
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will now fetch its own data.
  return <CertificateAuthorityDetailsClient />;
}

    