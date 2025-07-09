
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function SilentRenewCallbackPage() {
  const { userManager } = useAuth();

  useEffect(() => {
    if (!userManager) {
      console.error("SilentRenewCallbackPage: UserManager not available on mount.");
      return;
    }
    
    console.log("SilentRenewCallbackPage: Attempting to process silent renew...");
    userManager.signinSilentCallback()
      .then(() => {
        console.log("SilentRenewCallbackPage: Silent renew successful.");
      })
      .catch(error => {
        console.error('SilentRenewCallbackPage: Silent renew callback error:', error);
      });
  }, [userManager]);

  // This page typically runs in an iframe and should not render any significant UI
  return null; 
}
