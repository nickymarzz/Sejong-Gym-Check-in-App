import { CONFIG } from '../../config';

let inMemoryToken = null;

export function setAuthToken(token) {
  inMemoryToken = token;
  try {
    if (typeof localStorage !== 'undefined') {
      if (token) localStorage.setItem('sgc_token', token);
      else localStorage.removeItem('sgc_token');
    }
  } catch (_) {}
}

export function getAuthToken() {
  if (inMemoryToken) return inMemoryToken;
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('sgc_token');
    }
  } catch (_) {}
  return null;
}

export async function apiRequest(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const url = `${CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getAuthToken();

  const reqHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers: reqHeaders,
  };

  if (body !== null) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 7000) : null;
  if (controller) {
    options.signal = controller.signal;
  }

  try {
    const res = await fetch(url, options);
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = json?.message || `Request failed with status ${res.status}`;
      return {
        success: false,
        status: res.status,
        message: errorMsg,
        data: json?.data || null,
      };
    }

    return {
      success: true,
      status: res.status,
      message: json?.message || 'Success',
      data: json?.data !== undefined ? json.data : json,
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      status: 0,
      message: isTimeout
        ? `Connection timeout: cannot reach ${url}. Ensure phone and PC are on the same Wi-Fi.`
        : (err.message || 'Cannot reach API server. Ensure backend is running.'),
      data: null,
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
