
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, UserManager, WebStorageStateStore, Log } from 'oidc-client-ts';
import { useRouter } from 'next/navigation';

// Optional: Configure oidc-client-ts logging
Log.setLogger(console);
Log.setLevel(Log.DEBUG);

const CANONICAL_ORIGIN = 'https://lab.lamassu.io'; // Define the correct public-facing origin

const createUserManager = (): UserManager | null => {
  if (typeof window !== 'undefined') {
    return new UserManager({
      authority: 'https://lab.lamassu.io/auth/realms/lamassu', // No .well-known needed here
      client_id: 'frontend',
      redirect_uri: `${CANONICAL_ORIGIN}/signin-callback.html`,
      silent_redirect_uri: `${CANONICAL_ORIGIN}/silent-renew-callback.html`,
      post_logout_redirect_uri: `${CANONICAL_ORIGIN}/signout-callback.html`,
      response_type: 'code',
      scope: 'openid profile email', // Standard scopes
      automaticSilentRenew: true,
      loadUserInfo: true, // Attempt to load user info after signin
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!userManagerInstance) {
      setIsLoading(false);
      return;
    }

    const loadUser = async () => {
      try {
        const loadedUser = await userManagerInstance.getUser();
        setUser(loadedUser);
      } catch (error) {
        console.error("AuthContext: Error loading user:", error);
      } finally {
        setIsLoading(false);
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
      // UserManager handles automaticSilentRenew. If it fails, onSilentRenewError is called.
      // If not using automaticSilentRenew, you might trigger a manual renew or logout here.
      // For now, relying on automaticSilentRenew or onSilentRenewError.
    };
    const onSilentRenewError = (error: Error) => {
      console.error("AuthContext: Silent renew error:", error);
      // Potentially force logout or prompt for re-login
      // logout(); // This might be too aggressive, leads to logout loops if IdP session is also gone.
    };
    const onUserSignedOut = () => {
        console.log("AuthContext: User signed out (possibly from another tab/window)");
        setUser(null); // Ensure local state is cleared
        // router.push('/'); // Redirect to a public page
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
  }, [userManagerInstance, router]);

  const login = async () => {
    if (userManagerInstance) {
      try {
        setIsLoading(true);
        await userManagerInstance.signinRedirect();
        // Redirect will happen, no need to setIsLoading(false) here
      } catch (error) {
        console.error("AuthContext: Login redirect error:", error);
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    if (userManagerInstance) {
      try {
        setIsLoading(true);
        // Clear user from state immediately for snappier UI, though UserManager will also clear its storage.
        setUser(null);
        if (await userManagerInstance.getUser()) { // Check if user exists before trying to sign out
            await userManagerInstance.signoutRedirect();
        } else {
             // If no user, perhaps just clean up local state and redirect to home
            router.push('/');
            setIsLoading(false);
        }
        // Redirect will happen
      } catch (error) {
        console.error("AuthContext: Logout redirect error:", error);
        // Fallback: clear user and redirect manually if signoutRedirect fails
        setUser(null);
        await userManagerInstance.removeUser(); // Ensure user is cleared from storage
        router.push('/'); // Fallback redirect
        setIsLoading(false);
      }
    }
  };

  const isAuthenticated = () => {
    return !!user && !user.expired;
  };

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

// Helper for callback pages
export const getClientUserManager = createUserManager;
