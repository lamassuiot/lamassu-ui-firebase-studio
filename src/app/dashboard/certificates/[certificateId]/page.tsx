
import CertificateDetailPageClient from './CertificateDetailPageClient';
import type { Metadata } from 'next';

// Required for static export with dynamic routes.
// Add example serial numbers here that you want pre-rendered or to avoid build errors.
export async function generateStaticParams() {
  return [
    { certificateId: '9e-55-c6-0f-12-87-d0-fb-55-94-11-d0-df-79-75-02' },
    { certificateId: '43-af-a8-27-39-07-ba-cf-99-8f-81-37-87-e1-6a-76' },
    // Add other known/important certificate serial numbers if needed
  ];
}

export const metadata: Metadata = {
  title: 'Certificate Details | LamassuIoT',
  description: 'Detailed view of an issued X.509 certificate.',
};

// This is a Server Component shell for the dynamic route.
// It delegates the actual rendering to a Client Component.
export default function CertificateDetailPageContainer({ params }: { params: { certificateId: string } }) {
  // The client component uses useParams(), so no need to pass params.certificateId here explicitly
  return <CertificateDetailPageClient />;
}
