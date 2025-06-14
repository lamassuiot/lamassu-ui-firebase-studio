
import CertificateDetailPageClient from './CertificateDetailPageClient';
import type { Metadata } from 'next';

// export const metadata: Metadata = { // Metadata might be problematic with fully dynamic CSR if values depend on params
//   title: 'Certificate Details | LamassuIoT',
//   description: 'Detailed view of an issued X.509 certificate.',
// };

export async function generateStaticParams() {
  // For `output: 'export'`, this function is required for dynamic routes.
  // Returning an empty array means Next.js won't pre-render any specific certificate pages by default.
  // However, if Next.js discovers a static link to a specific ID during build, that ID must be listed here.
  return [
    { certificateId: '41-93-d0-d1-3f-38-5e-f1-e0-04-6d-4f-66-9c-87-22' }, // ID from build error
    // Add any other specific certificate IDs that are statically linked and must be pre-rendered.
  ];
}

// This is a Server Component shell for the dynamic route.
export default function CertificateDetailPageContainer({ params }: { params: { certificateId: string } }) {
  // The client component uses useParams(), so no need to pass params.certificateId here explicitly
  return <CertificateDetailPageClient />;
}
