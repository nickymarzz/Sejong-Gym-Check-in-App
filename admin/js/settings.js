(function (SGC) {
  'use strict';

  const { $ } = SGC.dom;
  const { state, api } = SGC;
  const cfg = SGC.config;

  const el = {
    form: $('settings-form'),
    capacity: $('settings-capacity'),
    status: $('settings-status'),
    open: $('settings-open'),
    close: $('settings-close'),
    message: $('settings-message'),
    save: $('settings-save'),
    reset: $('settings-reset'),
  };

  let dirty = false;
  let messageTimer = null;

  function fill(gym) {
    const hours = gym.openingHours || {};
    el.capacity.value = gym.capacity;
    el.status.value = gym.status;
    el.open.value = hours.open || '';
    el.close.value = hours.close || '';
  }

  function sync(gym) {
    if (!dirty) fill(gym);
  }

  function setMessage(text, tone) {
    clearTimeout(messageTimer);
    el.message.hidden = !text;
    el.message.textContent = text;
    el.message.dataset.tone = tone || 'info';
    if (text && tone === 'success') {
      messageTimer = setTimeout(() => setMessage(''), 4000);
    }
  }

  function validate(gym) {
    const capacity = Number(el.capacity.value);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > cfg.MAX_CAPACITY) {
      return `Capacity must be a whole number between 1 and ${cfg.MAX_CAPACITY}.`;
    }
    if (capacity < gym.currentOccupancy) {
      return `Capacity cannot be lower than the ${gym.currentOccupancy} people inside.`;
    }
    if (!el.open.value || !el.close.value) {
      return 'Enter both an opening and a closing time.';
    }
    if (el.close.value <= el.open.value) {
      return 'Closing time must be later than the opening time.';
    }
    return '';
  }

  function collectChanges(gym) {
    const hours = gym.openingHours || {};
    const changes = {};
    const capacity = Number(el.capacity.value);

    if (capacity !== Number(gym.capacity)) changes.capacity = capacity;
    if (el.status.value !== gym.status) changes.status = el.status.value;
    if (el.open.value !== (hours.open || '') || el.close.value !== (hours.close || '')) {
      changes.openingHours = { open: el.open.value, close: el.close.value };
    }
    return changes;
  }

  function confirmStatusChange(gym, next) {
    if (gym.status !== 'open' || next === 'open') return true;
    const inside = Number(gym.currentOccupancy) || 0;
    const note = inside > 0 ? ` ${inside} ${inside === 1 ? 'person is' : 'people are'} still inside.` : '';
    return window.confirm(`Setting the gym to ${next} stops new check-ins.${note} Continue?`);
  }

  async function submit(event) {
    event.preventDefault();
    const gym = state.gym;
    if (!gym) return;

    const problem = validate(gym);
    if (problem) {
      setMessage(problem, 'error');
      return;
    }

    const changes = collectChanges(gym);
    if (Object.keys(changes).length === 0) {
      setMessage('There are no changes to save.', 'info');
      return;
    }
    if (changes.status && !confirmStatusChange(gym, changes.status)) return;

    el.save.disabled = true;
    setMessage('');
    const res = await api.updateGymSettings(cfg.GYM_ID, changes);
    el.save.disabled = false;

    if (!res.ok) {
      setMessage(res.message, 'error');
      return;
    }

    state.gym = res.data;
    dirty = false;
    fill(state.gym);
    SGC.live.render();
    setMessage('Settings saved.', 'success');
  }

  function discard() {
    dirty = false;
    if (state.gym) fill(state.gym);
    setMessage('');
  }

  function clear() {
    dirty = false;
    el.form.reset();
    setMessage('');
  }

  el.form.addEventListener('submit', submit);
  el.reset.addEventListener('click', discard);
  el.form.addEventListener('input', () => {
    dirty = true;
    setMessage('');
  });

  SGC.live.subscribe(sync);

  SGC.settings = { sync, clear };
}(window.SGC));
