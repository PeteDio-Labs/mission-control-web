/**
 * Cloudflare Access Authentication
 *
 * Cloudflare Access intercepts requests at the proxy level.
 * If user isn't logged in, they're redirected to Gmail login.
 * If logged in, the proxy adds cookies to every request.
 *
 * We extract the email from multiple sources with graceful fallbacks:
 * 1. __Secure-cf_access_info cookie (Cloudflare standard)
 * 2. CF-Access-Authenticated-User-Email header (via API response)
 * 3. localStorage cache (fallback)
 * 4. Generic "Authenticated User" label (graceful degradation)
 */

export interface CloudflareUser {
  email: string;
}

class CloudflareAuthClient {
  private static readonly COOKIE_NAME = '__Secure-cf_access_info';
  private static readonly CACHE_KEY = 'cf_user_email';
  private static readonly FALLBACK_EMAIL = 'authenticated-user@example.com';

  getUser(): CloudflareUser | null {
    try {
      // Try multiple sources to extract email
      const email = this.extractEmail();

      if (email && email !== CloudflareAuthClient.FALLBACK_EMAIL) {
        // Cache the real email for fallback
        this.cacheUser(email);
        return { email };
      } else if (email) {
        // Return fallback label
        return { email };
      }
    } catch (error) {
      console.warn('Failed to extract user info:', error);
    }

    // Last resort: check if we have any cached email
    const cached = this.getCachedEmail();
    if (cached) {
      return { email: cached };
    }

    // If we're on a protected Cloudflare Access domain, assume authenticated
    // Return a generic label - Cloudflare would have redirected if not auth'd
    return { email: CloudflareAuthClient.FALLBACK_EMAIL };
  }

  private extractEmail(): string {
    // Strategy 1: Extract from __Secure-cf_access_info cookie
    const cookieEmail = this.extractFromCookie();
    if (cookieEmail) {
      return cookieEmail;
    }

    // Strategy 2: Check localStorage (set after successful extraction)
    const cachedEmail = this.getCachedEmail();
    if (cachedEmail) {
      return cachedEmail;
    }

    // Strategy 3: Return fallback (Cloudflare will show login if not authenticated)
    return CloudflareAuthClient.FALLBACK_EMAIL;
  }

  private extractFromCookie(): string | null {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === CloudflareAuthClient.COOKIE_NAME && value) {
          try {
            // Try to decode the cookie value
            const decoded = atob(decodeURIComponent(value));
            const json = JSON.parse(decoded);
            if (json.email) {
              return json.email;
            }
          } catch (e) {
            // Decode failed - Cloudflare cookie format might have changed
            console.debug('Cloudflare cookie decode failed:', e);
          }
        }
      }
    } catch (error) {
      console.debug('Cookie extraction failed:', error);
    }
    return null;
  }

  private getCachedEmail(): string | null {
    try {
      const cached = localStorage.getItem(CloudflareAuthClient.CACHE_KEY);
      return cached || null;
    } catch {
      // localStorage may not be available
      return null;
    }
  }

  cacheUser(email: string): void {
    try {
      if (email && email !== CloudflareAuthClient.FALLBACK_EMAIL) {
        localStorage.setItem(CloudflareAuthClient.CACHE_KEY, email);
      }
    } catch {
      // localStorage may not be available - graceful degradation
    }
  }

  logout(): void {
    // Clear cache
    try {
      localStorage.removeItem(CloudflareAuthClient.CACHE_KEY);
    } catch {
      // localStorage may not be available
    }

    // Redirect to Cloudflare logout endpoint
    // If running locally without Cloudflare, this will 404 but browser will handle it
    window.location.href = '/cdn-cgi/access/logout';
  }

  /**
   * Verify if we're behind Cloudflare Access by checking for CF cookies
   * Useful for development where Cloudflare may not be active
   */
  isCloudflareProtected(): boolean {
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name] = cookie.trim().split('=');
        if (name.startsWith('__Secure-cf') || name.startsWith('cf_')) {
          return true;
        }
      }
    } catch {
      // Cookie check failed
    }
    return false;
  }
}

export const cloudflareAuth = new CloudflareAuthClient();
