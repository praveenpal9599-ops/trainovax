/**
 * Thin fetch wrapper — all network access goes through here.
 * Handles auth headers, JSON, multipart uploads, errors and session expiry.
 */
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'trainovax.token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token, remember) {
    try {
      this.clear();
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}

function buildUrl(path, query) {
  const url = `${API_URL}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') params.append(k, v); });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request(method, path, { body, query, signal, raw } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(buildUrl(path, query), { method, headers, body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined, signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
  }
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new ApiError(res.status, data.message || `Request failed (${res.status})`, data.details);
  }
  return data;
}

export const http = {
  get: (path, query, opts) => request('GET', path, { query, ...opts }),
  post: (path, body, opts) => request('POST', path, { body, ...opts }),
  put: (path, body, opts) => request('PUT', path, { body, ...opts }),
  patch: (path, body, opts) => request('PATCH', path, { body, ...opts }),
  del: (path, opts) => request('DELETE', path, opts),
  upload: (path, fields) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    return request('POST', path, { body: fd });
  },
};

/** Resolve an uploaded file path (e.g. /uploads/x.jpg) to an absolute URL. */
export function assetUrl(path) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const origin = /^https?:\/\//.test(API_URL) ? new URL(API_URL).origin : '';
  return `${origin}${path}`;
}
