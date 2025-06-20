
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientUserManager } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function SignoutCallbackPage() {
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
        // This function from oidc-client-ts reads from window.location itself
        await userManager.signoutRedirectCallback();
        console.log("SignoutCallback: Signout callback processed.");
      } catch (error) {
        console.error('SignoutCallback: Error processing signout callback:', error);
      } finally {
        // Always redirect to the home page after attempting to process the callback.
        console.log("SignoutCallback: Redirecting to /.");
        router.push('/');
      }
    };
    processSignout();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Processing logout, please wait...</p>
    </div>
  );
}
