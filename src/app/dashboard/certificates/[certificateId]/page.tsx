
import CertificateDetailPageClient from './CertificateDetailPageClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered.
  // Pages for specific certificateId values will be client-side rendered.
  return [];
}

// Page component (now a Server Component shell)
export default function CertificateDetailPageContainer() {
  // The client component uses useParams() to get certificateId
  return <CertificateDetailPageClient />;
}
