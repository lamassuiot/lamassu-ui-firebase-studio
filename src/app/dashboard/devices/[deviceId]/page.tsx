
import DeviceDetailPageClient from './DeviceDetailPageClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered.
  // Pages for specific deviceId values will be client-side rendered.
  return [];
}

// This is a Server Component shell for the dynamic route.
export default function DeviceDetailPageContainer({ params }: { params: { deviceId: string } }) {
  // The client component uses useParams(), so no need to pass params.deviceId here explicitly
  // unless there's a specific reason or pre-fetching logic done in this server component in the future.
  return <DeviceDetailPageClient />;
}
