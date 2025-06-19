
import DeviceDetailsClient from './DeviceDetailsClient'; // Updated import path

// Page component (Server Component shell)
export default function DeviceDetailPageContainer() {
  // The client component uses useSearchParams() to get deviceId
  return <DeviceDetailsClient />;
}
