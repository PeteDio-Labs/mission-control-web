class APIClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    // In dev mode, use empty base URL so requests go through the Vite proxy
    // (which injects Cloudflare service token headers server-side).
    // In production builds, use the full API URL.
    if (import.meta.env.DEV) {
      // Dev: Vite proxy intercepts /api and /metrics, injecting CF headers server-side
      this.baseUrl = '';
    } else {
      // Prod: nginx proxies /api and /metrics to backend with CF headers injected at runtime.
      // VITE_API_URL can override for custom setups; defaults to relative URLs.
      this.baseUrl = import.meta.env.VITE_API_URL ?? '';
    }
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add backend API token if set
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  createEventSource(path: string): EventSource {
    let urlStr: string;
    if (this.baseUrl) {
      const url = new URL(path, this.baseUrl);
      if (this.token) {
        url.searchParams.set('token', this.token);
      }
      urlStr = url.toString();
    } else {
      urlStr = this.token ? `${path}?token=${encodeURIComponent(this.token)}` : path;
    }
    return new EventSource(urlStr);
  }
}

export const apiClient = new APIClient();
