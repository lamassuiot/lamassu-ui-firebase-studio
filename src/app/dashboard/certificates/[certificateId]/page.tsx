
import CertificateDetailPageClient from './CertificateDetailPageClient';
import type { Metadata } from 'next';

// export const metadata: Metadata = { // Metadata might be problematic with fully dynamic CSR if values depend on params
//   title: 'Certificate Details | LamassuIoT',
//   description: 'Detailed view of an issued X.509 certificate.',
// };

export async function generateStaticParams() {
  // For `output: 'export'`, this function is required for dynamic routes.
  // Returning an empty array means Next.js won't pre-render any specific certificate pages by default.
  // Pages for specific IDs will be client-side rendered when navigated to.
  return [];
}

// This is a Server Component shell for the dynamic route.
export default function CertificateDetailPageContainer({ params }: { params: { certificateId: string } }) {
  // The client component uses useParams(), so no need to pass params.certificateId here explicitly
  return <CertificateDetailPageClient />;
}

