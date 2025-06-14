
import React from 'react';
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// Page component (Server Component)
// With `generateStaticParams` removed, this page will be client-rendered for any caId
// when using `output: 'export'`.
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here.
  return <IssueCertificateFormClient />;
}
