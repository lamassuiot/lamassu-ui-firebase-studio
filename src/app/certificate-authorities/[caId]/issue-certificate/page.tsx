
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

// Page component (Server Component shell)
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here.
  return <IssueCertificateFormClient />;
}
