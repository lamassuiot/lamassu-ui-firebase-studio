
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered by default.
  // Pages for specific caId values will be client-side rendered.
  return [];
}

// Page component (Server Component shell)
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will fetch its own data using useParams().
  return <CertificateAuthorityDetailsClient />;
}
