(function (SGC) {
  'use strict';

  const { $, setText } = SGC.dom;
  const { state, status, api, fmt, charts, live, sessions, settings, weekly, daily } = SGC;
  const cfg = SGC.config;

  const el = {
    loginView: $('login-view'),
    loginForm: $('login-form'),
    loginId: $('login-id'),
    loginPassword: $('login-password'),
    loginMessage: $('login-message'),
    loginSubmit: $('login-submit'),
    serverSettings: $('server-settings'),
    apiBase: $('api-base'),
    apiSave: $('api-save'),
    apiReset: $('api-reset'),
    dashboard: $('dashboard-view'),
    userName: $('user-name'),
    userRole: $('user-role'),
    logout: $('logout'),
    refresh: $('refresh'),
    footerApi: $('footer-api'),
    backToApp: $('back-to-app'),
  };

  const timers = { live: null, summary: null };

  function setLoginMessage(message, isError) {
    el.loginMessage.hidden = !message;
    el.loginMessage.textContent = message || '';
    el.loginMessage.classList.toggle('is-info', !isError);
  }

  function showLogin(message, isError) {
    el.dashboard.hidden = true;
    el.loginView.hidden = false;
    el.apiBase.value = api.getApiBase();
    setLoginMessage(message || '', isError !== false);
    el.loginPassword.value = '';
    el.loginId.focus();
  }

  function showDashboard() {
    el.loginView.hidden = true;
    el.dashboard.hidden = false;
  }

  function refreshLive() {
    return Promise.all([live.tick(), sessions.tick()]);
  }

  function refreshSummaries() {
    weekly.load(true);
    if (state.date === fmt.today()) daily.load(true);
  }

  function stopPolling() {
    clearInterval(timers.live);
    clearInterval(timers.summary);
    timers.live = null;
    timers.summary = null;
  }

  function startPolling() {
    stopPolling();
    timers.live = setInterval(refreshLive, cfg.LIVE_POLL_MS);
    timers.summary = setInterval(refreshSummaries, cfg.SUMMARY_POLL_MS);
  }

  function enterDashboard() {
    const user = api.getUser() || {};

    state.reset();
    state.active = true;
    live.reset();
    sessions.reset();
    settings.clear();

    setText(el.userName, user.name || 'Administrator');
    setText(el.userRole, String(user.role || 'admin').toUpperCase());
    setText(el.footerApi, api.getApiBase());
    status.setConnection('connecting', 'Connecting…');

    if (!charts.available()) {
      status.setError('charts', 'Chart.js could not be loaded, so charts are hidden. Check your internet connection.');
    }

    showDashboard();
    daily.render();
    refreshLive();
    weekly.load(false);
    daily.load(false);
    startPolling();
  }

  function enterLogin(message, isError) {
    state.active = false;
    stopPolling();
    charts.destroyAll();
    showLogin(message, isError);
  }

  async function submitLogin(event) {
    event.preventDefault();
    const adminId = el.loginId.value.trim();
    const password = el.loginPassword.value;

    if (!/^\d{8}$/.test(adminId)) {
      setLoginMessage('Admin ID must be 8 digits.', true);
      el.loginId.focus();
      return;
    }
    if (!password) {
      setLoginMessage('Password is required.', true);
      el.loginPassword.focus();
      return;
    }

    setLoginMessage('', true);
    el.loginSubmit.disabled = true;
    el.loginSubmit.textContent = 'Signing in…';

    const res = await api.login(adminId, password);

    el.loginSubmit.disabled = false;
    el.loginSubmit.textContent = 'Sign in';

    if (!res.ok) {
      setLoginMessage(res.message, true);
      if (res.status === 0) el.serverSettings.open = true;
      el.loginPassword.select();
      return;
    }

    el.loginPassword.value = '';
    enterDashboard();
  }

  async function signOut() {
    el.logout.disabled = true;
    await api.logout();
    el.logout.disabled = false;
    enterLogin('', false);
  }

  function saveApiBase() {
    api.setApiBase(el.apiBase.value);
    el.apiBase.value = api.getApiBase();
    setLoginMessage(`API address saved: ${api.getApiBase()}`, false);
  }

  function resetApiBase() {
    api.setApiBase('');
    el.apiBase.value = api.getApiBase();
    setLoginMessage('API address reset to the default.', false);
  }

  function redrawCharts() {
    if (!state.active) return;
    charts.init();
    weekly.render();
    daily.render();
  }

  function getCurrentTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.setAttribute('data-theme', theme);
      if (meta) meta.content = theme;
      localStorage.setItem('theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (meta) meta.content = 'light dark';
      localStorage.removeItem('theme');
    }

    const current = getCurrentTheme();
    const nextLabel = current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    document.querySelectorAll('.theme-toggle').forEach((btn) => {
      btn.setAttribute('aria-label', nextLabel);
      btn.setAttribute('title', nextLabel);
    });

    redrawCharts();
  }

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';

    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => {
        applyTheme(next);
      });
    } else {
      applyTheme(next);
    }
  }

  async function boot() {
    applyTheme(localStorage.getItem('theme'));
    charts.init();
    el.apiBase.value = api.getApiBase();
    if (el.backToApp) {
      const host = window.location.hostname || 'localhost';
      el.backToApp.href = `http://${host}:8081`;
    }

    const res = await api.restoreSession();
    if (res.ok) {
      enterDashboard();
    } else if (res.status !== 401) {
      enterLogin(res.status === -1 ? '' : res.message, res.status !== -1);
      if (res.status === 0) el.serverSettings.open = true;
    }
  }

  api.onUnauthorized(() => enterLogin('Your session has expired. Please sign in again.', false));

  live.subscribe((_gym, capacityChanged) => {
    if (!capacityChanged) return;
    weekly.render();
    daily.render();
  });

  document.addEventListener('visibilitychange', () => {
    if (!state.active) return;
    if (document.hidden) {
      stopPolling();
      return;
    }
    refreshLive();
    refreshSummaries();
    startPolling();
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawCharts);
  }

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', toggleTheme);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      applyTheme(e.newValue);
    }
  });

  el.loginForm.addEventListener('submit', submitLogin);
  el.apiSave.addEventListener('click', saveApiBase);
  el.apiReset.addEventListener('click', resetApiBase);
  el.logout.addEventListener('click', signOut);
  el.refresh.addEventListener('click', () => {
    refreshLive();
    weekly.load(false);
    daily.load(false);
  });

  boot();
}(window.SGC));
