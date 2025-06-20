
'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientUserManager } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

// This component contains the actual logic that might cause Suspense.
function SignoutCallbackContent() {
  const router = useRouter();

  useEffect(() => {
    const userManager = getClientUserManager();
    if (!userManager) {
        console.error("SignoutCallback: UserManager not available.");
        router.push('/'); // Fallback redirect
        return;
    }

    const processSignout = async () => {
      try {
        console.log("SignoutCallback: Processing signout callback...");
        // Let oidc-client-ts handle parsing the response from the URL
        await userManager.signoutRedirectCallback();
        console.log("SignoutCallback: Signout callback processed.");
      } catch (error) {
        // Log the error, but proceed with redirection as the user is likely signed out or in an error state.
        console.error('SignoutCallback: Error processing signout callback:', error);
      } finally {
        // Always redirect to the home page after attempting to process the callback.
        console.log("SignoutCallback: Redirecting to /.");
        router.push('/');
      }
    };
    processSignout();
  }, [router]); // router is a dependency for router.push

  // This UI will be shown while the useEffect is processing.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Processing logout, please wait...</p>
    </div>
  );
}

// The default export for the page, wrapping the content in Suspense.
export default function SignoutCallbackPage() {
  return (
    <Suspense fallback={
      // Fallback UI shown if SignoutCallbackContent suspends.
      // It can be the same or a simpler version of the loading UI.
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading logout process...</p>
      </div>
    }>
      <SignoutCallbackContent />
    </Suspense>
  );
}
