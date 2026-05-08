/**
 * Tests for AuthenticatedUser — the post-Phase-1 replacement for
 * CloudflareAuth.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchAuthenticatedUser, logout } from './AuthenticatedUser';

// apiClient is a singleton instance imported by AuthenticatedUser. We mock
// the whole module so we can assert on .get() calls without instantiating
// real fetch traffic.
vi.mock('@/lib/api/client', () => {
  return {
    apiClient: {
      get: vi.fn(),
    },
  };
});

import { apiClient } from '@/lib/api/client';

describe('fetchAuthenticatedUser', () => {
  const getMock = apiClient.get as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMock.mockReset();
  });

  it('returns the user object when /api/v1/me succeeds', async () => {
    const expected = {
      email: 'pedelgadillo@gmail.com',
      name: 'pedro',
      groups: ['mc-admins'],
      isAdmin: true,
    };
    getMock.mockResolvedValueOnce(expected);

    const user = await fetchAuthenticatedUser();

    expect(getMock).toHaveBeenCalledWith('/api/v1/me');
    expect(user).toEqual(expected);
  });

  it('returns null when the backend responds 401 (unauthenticated)', async () => {
    // apiClient.get throws `Error('API error: Unauthorized')` on 401.
    getMock.mockRejectedValueOnce(new Error('API error: Unauthorized'));

    const user = await fetchAuthenticatedUser();

    expect(user).toBeNull();
  });

  it('returns null when the backend responds with a 401-shaped message', async () => {
    // Belt-and-braces: also recognise messages that include the literal "401".
    getMock.mockRejectedValueOnce(new Error('Request failed with status 401'));

    const user = await fetchAuthenticatedUser();

    expect(user).toBeNull();
  });

  it('rethrows non-401 errors so the caller can show a degraded state', async () => {
    getMock.mockRejectedValueOnce(new Error('API error: Internal Server Error'));

    await expect(fetchAuthenticatedUser()).rejects.toThrow(/Internal Server Error/);
  });
});

describe('logout', () => {
  // The test suite must run under both `bun test` (which doesn't expose
  // window) and vitest+jsdom. We synthesise a minimal window stub when
  // running outside a browser-like env.
  type Win = { location: { href: string } };

  function getWin(): Win {
    const g = globalThis as unknown as { window?: Win };
    if (!g.window) {
      g.window = { location: { href: '' } };
    }
    return g.window;
  }

  beforeEach(() => {
    getWin().location = { href: '' };
  });

  it('redirects the browser to /oauth2/sign_out', () => {
    logout();
    expect(getWin().location.href).toBe('/oauth2/sign_out');
  });
});
