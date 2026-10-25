(function (SGC) {
  'use strict';

  const { $, setText } = SGC.dom;
  const { state, status, api, fmt } = SGC;
  const cfg = SGC.config;

  const STATUS_VIEW = {
    open: { label: 'Open', icon: '✓' },
    full: { label: 'Full', icon: '●' },
    closed: { label: 'Closed', icon: '✕' },
    maintenance: { label: 'Maintenance', icon: '!' },
  };

  const el = {
    card: $('live'),
    name: $('live-title'),
    location: $('gym-location'),
    badge: $('gym-status'),
    badgeText: $('gym-status-text'),
    current: $('occ-current'),
    capacity: $('occ-capacity'),
    percent: $('occ-percent'),
    hours: $('gym-hours'),
    meter: $('meter'),
    meterFill: $('meter-fill'),
    updated: $('live-updated'),
  };

  const subscribers = [];

  function subscribe(fn) {
    subscribers.push(fn);
  }

  function effectiveStatus(gym) {
    if (gym.status === 'open' && Number(gym.currentOccupancy) >= Number(gym.capacity)) return 'full';
    return gym.status;
  }

  function meterLevel(name, percent) {
    if (name !== 'open' && name !== 'full') return 'off';
    if (percent >= 90) return 'high';
    if (percent >= 70) return 'mid';
    return 'low';
  }

  function render() {
    const gym = state.gym;
    if (!gym) return;

    const current = Number(gym.currentOccupancy) || 0;
    const capacity = Number(gym.capacity) || 0;
    const percent = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
    const name = effectiveStatus(gym);
    const view = STATUS_VIEW[name] || { label: String(name || 'Unknown'), icon: '·' };
    const hours = gym.openingHours;

    setText(el.name, gym.gymName || 'Gymnasium');
    setText(el.location, gym.location || '');
    setText(el.current, fmt.number(current));
    setText(el.capacity, fmt.number(capacity));
    setText(el.percent, `${percent}%`);
    setText(el.hours, hours && hours.open && hours.close ? `${hours.open}–${hours.close}` : '—');
    setText(el.updated, fmt.clock());

    el.badge.dataset.status = STATUS_VIEW[name] ? name : 'unknown';
    setText(el.badgeText, view.label);
    el.badge.querySelector('.badge-icon').textContent = view.icon;

    el.meterFill.style.width = `${percent}%`;
    el.meter.dataset.level = meterLevel(name, percent);
    el.meter.setAttribute('aria-valuenow', String(percent));
    el.meter.setAttribute('aria-valuetext', `${current} of ${capacity} people inside`);

    const capacityChanged = state.capacity !== capacity;
    state.capacity = capacity;
    subscribers.forEach((fn) => fn(gym, capacityChanged));
  }

  async function tick() {
    if (!state.active || state.inFlight.live) return;
    state.inFlight.live = true;
    const res = await api.getGymStatus(cfg.GYM_ID);
    state.inFlight.live = false;
    if (!state.active) return;

    if (res.ok && res.data) {
      state.gym = res.data;
      status.setError('live', '');
      el.card.classList.remove('is-stale');
      status.setConnection('live', 'Live');
      render();
      return;
    }

    el.card.classList.add('is-stale');
    status.setConnection('offline', res.status === 0 ? 'Offline · retrying' : 'Error');
    status.setError('live', res.message);
  }

  function reset() {
    el.card.classList.remove('is-stale');
  }

  SGC.live = { render, tick, reset, subscribe };
}(window.SGC));
