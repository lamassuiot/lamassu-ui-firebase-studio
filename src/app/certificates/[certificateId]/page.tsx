
import CertificateDetailPageClient from './CertificateDetailPageClient';

// Page component (Server Component shell)
export default function CertificateDetailPageContainer() {
  // The client component uses useParams() to get certificateId
  return <CertificateDetailPageClient />;
}
