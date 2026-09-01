// Centralized API and WebSocket URL configuration for Cloudflare Pages / Production
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) return cleanEndpoint;
  const cleanBase = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${cleanBase}${cleanEndpoint}`;
}

export function getSocketUrl() {
  if (API_BASE_URL) return API_BASE_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}
