
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, ServerCog } from 'lucide-react';

// Dynamically import the client component
const DeviceGroupsClient = dynamic(
  () => import('./DeviceGroupsClient'),
  {
    // ssr: false, // Not allowed in Server Components
    loading: () => (
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Device Groups...</p>
      </div>
    ),
  }
);

// Page component (Server Component shell)
export default function DeviceGroupsPageContainer() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center flex-1 p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Page...</p>
      </div>
    }>
      <DeviceGroupsClient />
    </Suspense>
  );
}
