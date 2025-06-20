
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the client component that contains the OIDC logic
const SilentRenewCallbackClient = dynamic(
  () => import('./SilentRenewCallbackClient'),
  {
    // ssr: false, // Not allowed in Server Components
    loading: () => null, // Silent renew should be invisible
  }
);

// Page component (Server Component shell)
export default function SilentRenewCallbackPageContainer() {
  return (
    <Suspense fallback={null}> {/* Fallback should also be minimal/null for silent renew */}
      <SilentRenewCallbackClient />
    </Suspense>
  );
}
