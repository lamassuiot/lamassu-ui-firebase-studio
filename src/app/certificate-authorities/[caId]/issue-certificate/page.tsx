
import IssueCertificateFormClient from '@/components/dashboard/ca/issue-certificate/IssueCertificateFormClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered by default.
  // Pages for specific caId values will be client-side rendered.
  return [];
}

// Page component (Server Component shell)
export default function IssueCertificatePage() {
  // The client component uses useParams() to get caId, so no specific data needs to be passed here.
  return <IssueCertificateFormClient />;
}

