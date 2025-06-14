
import CertificateDetailPageClient from './CertificateDetailPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificate Details | LamassuIoT',
  description: 'Detailed view of an issued X.509 certificate.',
};

export async function generateStaticParams() {
  return [];
}

// This is a Server Component shell for the dynamic route.
export default function CertificateDetailPageContainer({ params }: { params: { certificateId: string } }) {
  // The client component uses useParams(), so no need to pass params.certificateId here explicitly
  return <CertificateDetailPageClient />;
}
