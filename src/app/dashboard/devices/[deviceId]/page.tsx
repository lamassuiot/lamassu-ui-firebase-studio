
import DeviceDetailPageClient from './DeviceDetailPageClient';

// Required for static export with dynamic routes when the page itself isn't pre-rendering specific params
export async function generateStaticParams() {
  // Returning an empty array means Next.js won't pre-render any specific /devices/[id] pages at build time.
  // These pages will be client-rendered.
  // For `output: 'export'`, this essentially marks the route as dynamic and handled client-side.
  return [];
}

// This is a Server Component shell for the dynamic route.
// It delegates the actual rendering to a Client Component.
export default function DeviceDetailPageContainer({ params }: { params: { deviceId: string } }) {
  // The client component uses useParams(), so no need to pass params.deviceId here explicitly
  // unless there's a specific reason or pre-fetching logic done in this server component in the future.
  return <DeviceDetailPageClient />;
}
