
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import { User, UserManager, WebStorageStateStore, Log, UserProfile } from 'oidc-client-ts';
import { useRouter } from 'next/navigation';

// Optional: Configure oidc-client-ts logging
Log.setLogger(console);
Log.setLevel(Log.DEBUG);

let authEnabled: boolean | undefined;
if (typeof window !== 'undefined') {
    authEnabled = (window as any).lamassuConfig?.LAMASSU_AUTH_ENABLED !== false; // default to true
}

const createUserManager = (): UserManager | null => {
  if (typeof window !== 'undefined' && authEnabled) {
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
  const router = useRouter();
  
  // If auth is disabled, provide a mock context and return early.
  if (authEnabled === false) {
    const mockUser = new User({
        id_token: 'mock_id_token',
        access_token: 'mock_access_token',
        scope: 'openid profile email',
        token_type: 'Bearer',
        profile: {
            sub: 'mock-user-id',
            name: 'Dev User',
            email: 'dev@lamassu.io',
            iss: 'mock-issuer',
            aud: 'mock-client',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
        } as UserProfile,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        session_state: 'mock-session-state',
    });

    const value: AuthContextType = {
        user: mockUser,
        isLoading: false,
        login: async () => console.warn('Auth disabled: login action suppressed.'),
        logout: async () => console.warn('Auth disabled: logout action suppressed.'),
        isAuthenticated: () => true,
        userManager: null,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }
  
  // --- Original OIDC logic for when auth is enabled ---
  const userManagerInstance = useMemo(() => createUserManager(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userManagerInstance) {
      if (typeof window !== 'undefined') setIsLoading(false);
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

    const onUserLoaded = (loadedUser: User) => setUser(loadedUser);
    const onUserUnloaded = () => setUser(null);
    const onAccessTokenExpired = () => userManagerInstance.signinSilent().catch(() => logout());
    const onSilentRenewError = (error: Error) => { console.error("AuthContext: Silent renew error:", error); logout(); };
    const onUserSignedOut = () => setUser(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userManagerInstance]);


  const login = async () => {
    if (userManagerInstance) {
      try {
        await userManagerInstance.signinRedirect();
      } catch (error) {
        console.error("AuthContext: Login redirect error:", error);
      }
    }
  };

  const logout = async () => {
    if (userManagerInstance) {
      try {
        setUser(null);
        if (await userManagerInstance.getUser()) {
          await userManagerInstance.signoutRedirect();
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error("AuthContext: Logout redirect error:", error);
        setUser(null);
        await userManagerInstance.removeUser();
        router.push('/');
      }
    }
  };

  const isAuthenticated = useCallback(() => {
    return !!user && !user.expired;
  }, [user]);

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
