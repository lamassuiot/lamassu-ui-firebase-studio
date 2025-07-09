
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { User, UserManager, WebStorageStateStore, Log } from 'oidc-client-ts';
import { useRouter } from 'next/navigation';

// Optional: Configure oidc-client-ts logging
Log.setLogger(console);
Log.setLevel(Log.DEBUG);

const createUserManager = (): UserManager | null => {
  if (typeof window !== 'undefined') {
    // Get config from window object with fallbacks to default values
    const authority = (window as any).lamassuConfig?.LAMASSU_AUTH_AUTHORITY || 'https://lab.lamassu.io/auth/realms/lamassu';
    const clientId = (window as any).lamassuConfig?.LAMASSU_AUTH_CLIENT_ID || 'frontend';

    return new UserManager({
      authority: authority,
      client_id: clientId,
      redirect_uri: `${window.location.origin}/signin-callback`,
      silent_redirect_uri: `${window.location.origin}/silent-renew-callback`,
      post_logout_redirect_uri: `${window.location.origin}/signout-callback`,
      response_type: 'code',
      scope: 'openid profile email', // Standard scopes
      userStore: new WebStorageStateStore({ store: window.localStorage }), // Persist user session
      // monitorSession: true, // Optional: for session management features like checkSessionChanged
    });
  }
  return null;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  userManager: UserManager | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const userManagerInstance = useMemo(() => createUserManager(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initialize isLoading to true for server and client
  const router = useRouter();

  useEffect(() => {
    if (!userManagerInstance) {
      // This case implies we are on the server OR userManager failed to initialize on client.
      // If on client and userManager failed, we should stop loading.
      if (typeof window !== 'undefined') {
        setIsLoading(false);
      }
      return;
    }

    // Client-side logic since userManagerInstance exists.
    const loadUser = async () => {
      try {
        const loadedUser = await userManagerInstance.getUser();
        setUser(loadedUser);
      } catch (error) {
        console.error("AuthContext: Error loading user:", error);
      } finally {
        setIsLoading(false); // Set to false after attempt on client
      }
    };

    loadUser();

    const onUserLoaded = (loadedUser: User) => {
      console.log("AuthContext: User loaded", loadedUser);
      setUser(loadedUser);
    };
    const onUserUnloaded = () => {
      console.log("AuthContext: User unloaded");
      setUser(null);
    };
    const onAccessTokenExpired = () => {
      console.log("AuthContext: Access token expired, attempting silent renew or logout.");
      // userManagerInstance.signinSilent().catch(() => logout()); // Example handling
    };
    const onSilentRenewError = (error: Error) => {
      console.error("AuthContext: Silent renew error:", error);
      // Potentially trigger logout if silent renew fails critically
      // logout();
    };
    const onUserSignedOut = () => {
      console.log("AuthContext: User signed out (possibly from another tab/window)");
      setUser(null);
      // router.push('/'); // Optionally redirect to home/login
    };

    userManagerInstance.events.addUserLoaded(onUserLoaded);
    userManagerInstance.events.addUserUnloaded(onUserUnloaded);
    userManagerInstance.events.addAccessTokenExpired(onAccessTokenExpired);
    userManagerInstance.events.addSilentRenewError(onSilentRenewError);
    userManagerInstance.events.addUserSignedOut(onUserSignedOut);

    return () => {
      userManagerInstance.events.removeUserLoaded(onUserLoaded);
      userManagerInstance.events.removeUserUnloaded(onUserUnloaded);
      userManagerInstance.events.removeAccessTokenExpired(onAccessTokenExpired);
      userManagerInstance.events.removeSilentRenewError(onSilentRenewError);
      userManagerInstance.events.removeUserSignedOut(onUserSignedOut);
    };
  }, [userManagerInstance, router]); // Removed logout from deps as it's stable

  useEffect(() => {
    if (typeof window === 'undefined' || !userManagerInstance) {
      return;
    }

    if (window.location.pathname === '/signin-callback') {
      const handleCallback = async () => {
        try {
          console.log('AuthContext: Processing signin callback...');
          await userManagerInstance.signinRedirectCallback();
        } catch (error) {
          console.error('AuthContext: Error processing signin callback:', error);
        } finally {
          router.push('/');
        }
      };
      handleCallback();
    }
  }, [userManagerInstance, router]);

  const login = async () => {
    if (userManagerInstance) {
      try {
        // setIsLoading(true); // isLoading is already true or managed by page navigation
        console.log("AuthContext: Initiating login redirect");
        await userManagerInstance.signinRedirect();
      } catch (error) {
        console.error("AuthContext: Login redirect error:", error);
        setIsLoading(false); // Ensure loading stops on error
      }
    }
  };

  const logout = async () => {
    if (userManagerInstance) {
      try {
        // setIsLoading(true); // Handled by navigation or page state
        setUser(null); // Clear user immediately
        if (await userManagerInstance.getUser()) {
          await userManagerInstance.signoutRedirect();
        } else {
          // Already logged out or no user session
          router.push('/');
          setIsLoading(false); // Ensure loading state is false if no redirect happens
        }
      } catch (error) {
        console.error("AuthContext: Logout redirect error:", error);
        setUser(null); // Ensure user is cleared
        await userManagerInstance.removeUser(); // Clean up OIDC storage
        router.push('/');
        setIsLoading(false); // Ensure loading state is false
      }
    }
  };

  const isAuthenticated = useCallback(() => {
    return !!user && !user.expired;
  }, [user]);

  // This check is mostly for client-side robustness, server won't hit this for rendering page content.
  if (!userManagerInstance && typeof window !== 'undefined') {
    return <div>Error: Authentication system could not initialize. Please refresh.</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated, userManager: userManagerInstance }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const getClientUserManager = createUserManager;
