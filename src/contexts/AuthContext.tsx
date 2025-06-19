
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, UserManager, WebStorageStateStore, Log } from 'oidc-client-ts';
import { useRouter } from 'next/navigation';

// Optional: Configure oidc-client-ts logging
Log.setLogger(console);
Log.setLevel(Log.DEBUG);

const createUserManager = (): UserManager | null => {
  if (typeof window !== 'undefined') {
    return new UserManager({
      authority: 'https://lab.lamassu.io/auth/realms/lamassu', // No .well-known needed here
      client_id: 'frontend',
      redirect_uri: `${window.location.origin}/signin-callback`,
      silent_redirect_uri: `${window.location.origin}/silent-renew-callback`,
      post_logout_redirect_uri: `${window.location.origin}/signout-callback.html`,
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
  // Initialize isLoading:
  // - false on server (userManagerInstance is null, so !!userManagerInstance is false)
  // - true on client (userManagerInstance exists, so !!userManagerInstance is true), until user is loaded.
  const [isLoading, setIsLoading] = useState(!!userManagerInstance);
  const router = useRouter();

  useEffect(() => {
    if (!userManagerInstance) {
      // This handles the case where userManagerInstance might not be available (e.g. SSR or failed init on client)
      // For SSR, isLoading is already false from initial state.
      // If this happens on client post-init, ensure isLoading is false.
      if (typeof window !== 'undefined') {
        setIsLoading(false);
      }
      return;
    }

    // Client-side logic since userManagerInstance exists.
    // isLoading is true here due to initial useState(!!userManagerInstance).
    const loadUser = async () => {
      try {
        const loadedUser = await userManagerInstance.getUser();
        setUser(loadedUser);
      } catch (error) {
        console.error("AuthContext: Error loading user:", error);
      } finally {
        setIsLoading(false); // Set to false after attempt
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
    };
    const onSilentRenewError = (error: Error) => {
      console.error("AuthContext: Silent renew error:", error);
    };
    const onUserSignedOut = () => {
        console.log("AuthContext: User signed out (possibly from another tab/window)");
        setUser(null); 
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
        console.log("AuthContext: Initiating login redirect");
        await userManagerInstance.signinRedirect();
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
        setUser(null);
        if (await userManagerInstance.getUser()) { 
            await userManagerInstance.signoutRedirect();
        } else {
            router.push('/');
            setIsLoading(false);
        }
      } catch (error) {
        console.error("AuthContext: Logout redirect error:", error);
        setUser(null);
        await userManagerInstance.removeUser(); 
        router.push('/'); 
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

export const getClientUserManager = createUserManager;
