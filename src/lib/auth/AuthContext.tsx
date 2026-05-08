import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  fetchAuthenticatedUser,
  logout as oauthLogout,
  type AuthenticatedUser,
} from './AuthenticatedUser';

interface AuthContextType {
  /** Resolved principal — null while loading or if /api/v1/me 401s. */
  user: AuthenticatedUser | null;
  /** True until the first fetch resolves; consumers should render a skeleton. */
  loading: boolean;
  /** Redirects the browser through oauth2-proxy's sign-out flow. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

/**
 * Provider that resolves the current principal once on mount via
 * GET /api/v1/me. The body of the resolved record (email/name/groups/
 * isAdmin) comes from the oauth2-proxy → Authentik chain, replayed by
 * the backend's auth middleware. There is no cookie scraping anymore.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAuthenticatedUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        // Network or 5xx — leave user null and let downstream views render
        // their own degraded state. Don't redirect; that's reserved for
        // the explicit 401 case (handled in AuthenticatedUser).
        // eslint-disable-next-line no-console
        console.warn('AuthContext: failed to load /api/v1/me', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = () => {
    oauthLogout();
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
