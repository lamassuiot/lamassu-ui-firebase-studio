
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClientUserManager } from '@/contexts/AuthContext'; // Helper to get UserManager instance
import { Loader2 } from 'lucide-react';

export default function SigninCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const userManager = getClientUserManager();
    if (!userManager) {
        // This case should ideally not happen if getClientUserManager is robust
        console.error("SigninCallback: UserManager not available.");
        router.push('/'); // Fallback redirect
        return;
    }

    const processCallback = async () => {
      try {
        console.log("SigninCallback: Processing callback...");
        await userManager.signinRedirectCallback();
        console.log("SigninCallback: Callback processed, redirecting to dashboard.");
        router.push('/dashboard');
      } catch (error) {
        console.error('SigninCallback: Error processing signin callback:', error);
        // Handle error, e.g., redirect to an error page or login
        router.push('/'); // Fallback to home/login
      }
    };
    processCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Processing login, please wait...</p>
    </div>
  );
}

