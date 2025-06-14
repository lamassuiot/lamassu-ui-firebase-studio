
import React from 'react';
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

export async function generateStaticParams() {
  return [];
}

// Page component (Server Component)
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here.
  return <IssueCertificateFormClient />;
}
