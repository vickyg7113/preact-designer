/**
 * API client for Visual Designer backend
 * Base URL: resolved from customerDetails.BASE_API_URL_MAIN in localStorage
 * Headers: Authorization, role, iud, rcid, schema — mirroring the platform axios interceptor
 */

const FALLBACK_API_BASE_URL = 'https://devgw.revgain.ai/rg-pex';

function resolveRequestContext(): {
  baseUrl: string;
  accessToken: string;
  iud: string;
  rcid: string;
  schema: string;
  role: string;
} {
  if (typeof window === 'undefined') {
    return { baseUrl: FALLBACK_API_BASE_URL, accessToken: '', iud: '', rcid: '', schema: '', role: '' };
  }

  try {
    const customerDetails = localStorage.getItem('customerDetails')
      ? JSON.parse(localStorage.getItem('customerDetails')!)
      : null;

    const rgAuth = localStorage.getItem('RGAuth')
      ? JSON.parse(localStorage.getItem('RGAuth')!)
      : null;

    const selectedViewUser = localStorage.getItem('selectedViewUser')
      ? JSON.parse(localStorage.getItem('selectedViewUser')!)
      : null;

    const baseUrl = customerDetails?.BASE_API_URL_MAIN
      ? `${customerDetails.BASE_API_URL_MAIN}/rg-pex`
      : FALLBACK_API_BASE_URL;

    const accessToken = localStorage.getItem('access_token') || '';
    const iud = selectedViewUser?.id || rgAuth?.email || '';
    const rcid = customerDetails?.RG_CUSTOMER_ID || '';
    const schema = customerDetails?.CUSTOMER_SCHEMA || '';

    const selectedRoleFromViewUser = selectedViewUser?.role || selectedViewUser?.manager_role;
    const selectedRoleFromSession = sessionStorage.getItem('RGSelectedRole');
    let rolesToUse: string[];

    if (selectedRoleFromViewUser) {
      rolesToUse = [selectedRoleFromViewUser];
    } else if (selectedRoleFromSession) {
      rolesToUse = [selectedRoleFromSession];
    } else {
      rolesToUse = rgAuth?.realm_access?.roles || [];
    }

    const role = rolesToUse.map((r: string) => r.replace(/\s+/g, '_')).join(',');

    return { baseUrl, accessToken, iud, rcid, schema, role };
  } catch {
    return { baseUrl: FALLBACK_API_BASE_URL, accessToken: '', iud: '', rcid: '', schema: '', role: '' };
  }
}

function buildHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const { accessToken, iud, rcid, schema, role } = resolveRequestContext();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...(role && { role }),
    ...(iud && { iud }),
    ...(rcid && { rcid }),
    ...(schema && { schema }),
    ...extraHeaders,
  };

  return headers;
}

/**
 * API client instance - fetches with base URL and iud header from localStorage
 */
export const IUD_STORAGE_KEY = 'designerIud';

export const apiClient = {
  get baseUrl() {
    return resolveRequestContext().baseUrl;
  },

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

