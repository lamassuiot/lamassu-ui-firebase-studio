
import DeviceDetailPageClient from './DeviceDetailPageClient';

// Required for static export with dynamic routes when the page itself isn't pre-rendering specific params
export async function generateStaticParams() {
  // To resolve the error "Page ... is missing param ... in generateStaticParams()",
  // we need to include any specific params that the build process might encounter or
  // that you want to be pre-rendered.
  // Returning an empty array for `output: 'export'` means Next.js won't pre-render
  // any specific /devices/[id] pages at build time. If a link to a specific ID
  // is processed during build or routing with `output: 'export'`, this error occurs.
  // Adding specific IDs here addresses these errors individually.
  // For a truly dynamic list from an API, pre-rendering all possible device IDs
  // might be impractical with `output: 'export'`. Client-side rendering handles
  // navigation to other IDs not listed here.
  return [
    { deviceId: 'example.com' },
    { deviceId: 'd716e00d-0285-4798-b06b-f8c0d68cdbca' },
    { deviceId: 'caf-ikl-2222' } // Added this new deviceId
  ];
}

// This is a Server Component shell for the dynamic route.
// It delegates the actual rendering to a Client Component.
export default function DeviceDetailPageContainer({ params }: { params: { deviceId: string } }) {
  // The client component uses useParams(), so no need to pass params.deviceId here explicitly
  // unless there's a specific reason or pre-fetching logic done in this server component in the future.
  return <DeviceDetailPageClient />;
}
