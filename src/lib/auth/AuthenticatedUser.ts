/**
 * Authenticated user resolver.
 *
 * After Phase 1 of the homelab upgrade, oauth2-proxy fronts every request
 * to mc.pdlab.dev. The proxy authenticates via Authentik and forwards the
 * principal's email/name/groups to the backend, which replays them on
 * GET /api/v1/me. This module wraps that fetch.
 *
 * Why a one-shot fetch (not a React hook): we need the user available to
 * the AuthContext before any feature code runs, so the simplest path is a
 * promise resolved during AuthProvider mount. Callers should treat
 * `fetchAuthenticatedUser()` as the single source of truth — there's no
 * cookie sniffing, no localStorage cache, no fallback identity.
 */

import { apiClient } from '@/lib/api/client';

/** Shape returned by GET /api/v1/me — mirrors the backend's AuthenticatedUser. */
export interface AuthenticatedUser {
  email: string;
  name: string;
  groups: string[];
  isAdmin: boolean;
}

/**
 * Fetch the authenticated principal from the backend.
 *
 * - 200 → resolves to the user
 * - 401 → resolves to null (caller should redirect to /oauth2/sign_in)
 * - other / network error → throws (caller should show a degraded state)
 */
export async function fetchAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const user = await apiClient.get<AuthenticatedUser>('/api/v1/me');
    return user;
  } catch (error) {
    // apiClient.get throws on non-2xx with the statusText embedded. We
    // distinguish 401 (legitimate "you're not signed in") from everything
    // else so callers can tell sign-in flows apart from infrastructure
    // failures.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('401') || /Unauthorized/i.test(message)) {
      return null;
    }
    throw error;
  }
}

/**
 * Redirect to the oauth2-proxy sign-out endpoint. oauth2-proxy clears its
 * cookie, then bounces the browser to Authentik's session-end flow, which
 * lands the user back on the public sign-in page.
 */
export function logout(): void {
  window.location.href = '/oauth2/sign_out';
}
