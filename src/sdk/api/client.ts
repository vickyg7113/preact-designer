/**
 * API client for Visual Designer backend
 * Base URL: https://devgw.revgain.ai/rg-pex
 * Headers: iud (read from target URL localStorage)
 */

const API_BASE_URL = 'https://devgw.revgain.ai/rg-pex';

const IUD_STORAGE_KEY = 'designerIud';

/**
 * Get the iud value from localStorage (target URL's localStorage)
 */
function getIudHeader(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(IUD_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Build headers for API requests, including iud from localStorage
 */
function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const iud = getIudHeader();
  if (iud) {
    headers['iud'] = iud;
  }

  return headers;
}

/**
 * API client instance - fetches with base URL and iud header from localStorage
 */
export const apiClient = {
  baseUrl: API_BASE_URL,

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...buildHeaders(), ...(options?.headers as Record<string, string>) },
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  async post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      ...options,
      headers: { ...buildHeaders(), ...(options?.headers as Record<string, string>) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  async put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      method: 'PUT',
      ...options,
      headers: { ...buildHeaders(), ...(options?.headers as Record<string, string>) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(url, {
      method: 'DELETE',
      ...options,
      headers: { ...buildHeaders(), ...(options?.headers as Record<string, string>) },
    });
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  },
};

export { IUD_STORAGE_KEY };
