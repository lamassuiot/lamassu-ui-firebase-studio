
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// Page component (Server Component shell)
export default function IssueCertificatePage() {
  // The client component uses useSearchParams() to get caId.
  return <IssueCertificateFormClient />;
}
