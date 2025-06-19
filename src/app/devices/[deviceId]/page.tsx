
import DeviceDetailPageClient from './DeviceDetailPageClient';

// Page component (Server Component shell)
export default function DeviceDetailPageContainer() {
  // The client component uses useParams() to get deviceId
  return <DeviceDetailPageClient />;
}
