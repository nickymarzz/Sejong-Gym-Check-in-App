(function (SGC) {
  'use strict';

  const cfg = SGC.config;
  const REQUEST_TIMEOUT_MS = 8000;

  const memory = { token: null, user: null };
  let unauthorizedHandler = null;

  function sessionStore() {
    try { return window.sessionStorage; } catch (_) { return null; }
  }

  function localStore() {
    try { return window.localStorage; } catch (_) { return null; }
  }

  function defaultApiBase() {
    const host = window.location.hostname || '127.0.0.1';
    return `http://${host}:${cfg.API_PORT}/api`;
  }

  function getApiBase() {
    const store = localStore();
    const saved = store ? store.getItem(cfg.STORAGE.API_BASE) : null;
    return (saved || defaultApiBase()).replace(/\/+$/, '');
  }

  function setApiBase(value) {
    const store = localStore();
    if (!store) return;
    const clean = (value || '').trim();
    if (clean) store.setItem(cfg.STORAGE.API_BASE, clean);
    else store.removeItem(cfg.STORAGE.API_BASE);
  }

  function getToken() {
    const store = sessionStore();
    return (store && store.getItem(cfg.STORAGE.TOKEN)) || memory.token;
  }

  function getUser() {
    const store = sessionStore();
    try {
      const raw = store && store.getItem(cfg.STORAGE.USER);
      return raw ? JSON.parse(raw) : memory.user;
    } catch (_) {
      return memory.user;
    }
  }

  function setSession(token, user) {
    memory.token = token;
    memory.user = user;
    const store = sessionStore();
    if (!store) return;
    store.setItem(cfg.STORAGE.TOKEN, token);
    store.setItem(cfg.STORAGE.USER, JSON.stringify(user));
  }

  function clearSession() {
    memory.token = null;
    memory.user = null;
    const store = sessionStore();
    if (!store) return;
    store.removeItem(cfg.STORAGE.TOKEN);
    store.removeItem(cfg.STORAGE.USER);
  }

  function onUnauthorized(fn) {
    unauthorizedHandler = fn;
  }

  function firstError(errors) {
    if (!errors || typeof errors !== 'object') return null;
    const first = Object.values(errors)[0];
    return Array.isArray(first) ? first[0] : first || null;
  }

  async function request(path, options) {
    const { method = 'GET', body = null, auth = true, token = null, quiet = false } = options || {};
    const bearer = token || (auth ? getToken() : null);

    const headers = { Accept: 'application/json' };
    if (body !== null) headers['Content-Type'] = 'application/json';
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${getApiBase()}${path}`, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);

      if (res.status === 401 && bearer && !quiet && unauthorizedHandler) {
        clearSession();
        unauthorizedHandler();
      }

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          message: firstError(json && json.errors) || (json && json.message) || `Request failed (HTTP ${res.status}).`,
          data: json ? json.data : null,
          errors: json ? json.errors : null,
        };
      }

      return {
        ok: true,
        status: res.status,
        message: (json && json.message) || 'OK',
        data: json && json.data !== undefined ? json.data : json,
        errors: null,
      };
    } catch (err) {
      const timedOut = err && err.name === 'AbortError';
      return {
        ok: false,
        status: 0,
        message: timedOut
          ? `The server at ${getApiBase()} did not answer in time.`
          : `Cannot reach the API at ${getApiBase()}. Is the backend running?`,
        data: null,
        errors: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  function isAdmin(user) {
    return !!user && cfg.ADMIN_ROLES.indexOf(user.role) !== -1;
  }

  async function login(adminId, password) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { studentId: adminId, password },
      auth: false,
    });
    if (!res.ok) return res;

    const payload = res.data || {};
    if (!payload.token || !payload.user) {
      return { ok: false, status: res.status, message: 'Unexpected response from the server.', data: null };
    }

    if (!isAdmin(payload.user)) {
      await request('/auth/logout', { method: 'POST', token: payload.token, quiet: true });
      return {
        ok: false,
        status: 403,
        message: 'This account does not have administrator access.',
        data: null,
      };
    }

    setSession(payload.token, payload.user);
    return { ok: true, status: res.status, message: res.message, data: payload.user };
  }

  async function restoreSession() {
    const token = getToken();
    if (!token) return { ok: false, status: -1, message: '', data: null };

    const res = await request('/auth/me');
    if (!res.ok) return res;
    if (!isAdmin(res.data)) {
      clearSession();
      return { ok: false, status: 403, message: 'This account does not have administrator access.', data: null };
    }
    setSession(token, res.data);
    return res;
  }

  async function logout() {
    await request('/auth/logout', { method: 'POST', quiet: true });
    clearSession();
  }

  function getGymStatus(gymId) {
    return request(`/gym/status/${encodeURIComponent(gymId)}`);
  }

  function getDailySummary(gymId, date) {
    return request(`/dashboard/gyms/${encodeURIComponent(gymId)}/summary/${encodeURIComponent(date)}`);
  }

  function getWeeklySummary(gymId) {
    return request(`/dashboard/gyms/${encodeURIComponent(gymId)}/weekly`);
  }

  function getActiveSessions(gymId) {
    return request(`/dashboard/gyms/${encodeURIComponent(gymId)}/active`);
  }

  function updateGymSettings(gymId, changes) {
    return request(`/dashboard/gyms/${encodeURIComponent(gymId)}/settings`, {
      method: 'PATCH',
      body: changes,
    });
  }

  SGC.api = {
    getApiBase,
    setApiBase,
    getUser,
    onUnauthorized,
    login,
    restoreSession,
    logout,
    getGymStatus,
    getDailySummary,
    getWeeklySummary,
    getActiveSessions,
    updateGymSettings,
  };
}(window.SGC));
