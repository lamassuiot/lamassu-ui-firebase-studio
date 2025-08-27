
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function SigninCallbackPage() {
  const router = useRouter();
  const { userManager } = useAuth();

  useEffect(() => {
    if (!userManager) {
        console.log("SigninCallback: Waiting for UserManager...");
        return;
    }

    const processCallback = async () => {
      try {
        console.log("SigninCallback: Processing callback...");
        await userManager.signinRedirectCallback();
        console.log("SigninCallback: Callback processed, redirecting to /.");
        // Defer the redirect to allow React to finish hydration first.
        setTimeout(() => router.push('/'), 0);
      } catch (error) {
        console.error('SigninCallback: Error processing signin callback:', error);
        // Also defer the error redirect.
        setTimeout(() => router.push('/'), 0); // Fallback to home/login
      }
    };
    processCallback();
  }, [userManager, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Processing login, please wait...</p>
    </div>
  );
}
