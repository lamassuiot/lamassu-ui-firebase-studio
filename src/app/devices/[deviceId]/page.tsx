
import DeviceDetailPageClient from './DeviceDetailPageClient';

export async function generateStaticParams() {
  // Return an empty array to indicate that no specific paths should be pre-rendered by default.
  // Pages for specific deviceId values will be client-side rendered.
  return [];
}

// Page component (Server Component shell)
export default function DeviceDetailPageContainer() {
  // The client component uses useParams() to get deviceId
  return <DeviceDetailPageClient />;
}
