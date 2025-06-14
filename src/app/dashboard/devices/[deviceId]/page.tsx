
import DeviceDetailPageClient from './DeviceDetailPageClient';

// This is a Server Component shell for the dynamic route.
// With `generateStaticParams` removed, this page will be client-rendered for any deviceId
// when using `output: 'export'`.
export default function DeviceDetailPageContainer({ params }: { params: { deviceId: string } }) {
  // The client component uses useParams(), so no need to pass params.deviceId here explicitly
  // unless there's a specific reason or pre-fetching logic done in this server component in the future.
  return <DeviceDetailPageClient />;
}
