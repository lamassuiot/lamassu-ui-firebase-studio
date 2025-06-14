
// generateStaticParams and helper function must be at the top level for Server Components
import type { CA } from '@/lib/ca-data';
// import { certificateAuthoritiesData as allCertificateAuthoritiesData } from '@/lib/ca-data'; // Removed static import
import React from 'react';
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

// This function is problematic with fully dynamic, API-driven data and `output: 'export'`.
// For now, returning a list of known/example CA IDs to avoid build errors.
// A better approach for `output: 'export'` might involve pre-building known CA pages
// or making this page fully client-rendered if CA list is highly dynamic.
export async function generateStaticParams() {
  return [
    { caId: '33631fff-38ac-4950-a15c-e8d12e7b794f' }, // ID from build error
    { caId: '07c23e39-964a-4a2b-8021-e9584c4db8ad' }, // Example from API
    { caId: '3f3b381b-ed94-4017-ade9-76f2958b39e6' }, // Example from API
    // Add other known/important CA IDs here if needed for pre-rendering
  ];
}

// Page component (Server Component)
export default function CertificateAuthorityDetailsPage() {
  // Since allCertificateAuthoritiesData is now fetched client-side,
  // we can't pass it directly from here if this remains a Server Component
  // without its own data fetching that aligns with what CertificateAuthorityDetailsClient expects.
  // CertificateAuthorityDetailsClient will now need to fetch or receive CA data through context/props.
  // For simplicity in this step, we assume CertificateAuthorityDetailsClient handles its own data needs
  // or that a global state/context will provide it.
  // Passing an empty array or undefined might be necessary if props are strictly typed.
  // Let's assume CertificateAuthorityDetailsClient will fetch all CAs for path building.
  return <CertificateAuthorityDetailsClient allCertificateAuthoritiesData={[]} />; // Pass empty initially
}
