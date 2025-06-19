
import CertificateAuthorityDetailsClient from '@/components/dashboard/ca/details/CertificateAuthorityDetailsClient';

// Page component (Server Component shell)
export default function CertificateAuthorityDetailsPage() {
  // CertificateAuthorityDetailsClient will fetch its own data using useSearchParams().
  return <CertificateAuthorityDetailsClient />;
}
