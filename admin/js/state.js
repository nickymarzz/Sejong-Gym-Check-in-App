(function (SGC) {
  'use strict';

  const { $, setText } = SGC.dom;

  const banner = $('banner');
  const conn = $('conn');
  const connText = $('conn-text');

  const state = {};

  function reset() {
    state.active = false;
    state.gym = null;
    state.capacity = null;
    state.date = SGC.fmt.today();
    state.daily = undefined;
    state.weekly = null;
    state.sessions = null;
    state.errors = {};
    state.inFlight = {};
  }

  function renderBanner() {
    const message = Object.values(state.errors)[0] || '';
    banner.hidden = !message;
    banner.textContent = message;
  }

  function setError(key, message) {
    if (message) state.errors[key] = message;
    else delete state.errors[key];
    renderBanner();
  }

  function setConnection(name, text) {
    conn.dataset.state = name;
    setText(connText, text);
  }

  reset();
  state.reset = () => {
    reset();
    renderBanner();
  };

  SGC.state = state;
  SGC.status = { setError, setConnection };
}(window.SGC));
