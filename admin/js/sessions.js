(function (SGC) {
  'use strict';

  const { $, setText, fillTable, element } = SGC.dom;
  const { state, status, api, fmt } = SGC;
  const cfg = SGC.config;

  const el = {
    count: $('inside-count'),
    filter: $('inside-filter'),
    table: $('inside-table'),
    empty: $('inside-empty'),
  };

  let supported = true;

  function matches(session, query) {
    if (!query) return true;
    const haystack = `${session.name || ''} ${session.studentId || ''} ${session.department || ''}`.toLowerCase();
    return haystack.includes(query);
  }

  function personCell(session) {
    const cell = element('span', 'person');
    cell.appendChild(element('span', 'person-name', session.name || 'Unknown student'));
    cell.appendChild(element('span', 'person-meta', [session.studentId, session.department].filter(Boolean).join(' · ')));
    return cell;
  }

  function showEmpty(message) {
    el.table.textContent = '';
    el.empty.hidden = false;
    setText(el.empty, message);
  }

  function render() {
    if (!supported) {
      setText(el.count, '');
      showEmpty('This version of the API does not list the people inside.');
      return;
    }

    const list = state.sessions;
    if (!list) return;

    const query = el.filter.value.trim().toLowerCase();
    const rows = list.filter((session) => matches(session, query));
    setText(el.count, `(${list.length})`);

    if (rows.length === 0) {
      showEmpty(list.length === 0 ? 'No one is checked in right now.' : 'No one matches this filter.');
      return;
    }

    el.empty.hidden = true;
    fillTable(el.table, [
      { label: 'Student', value: personCell },
      { label: 'Checked in', value: (s) => fmt.time(s.checkInTime) },
      { label: 'Time inside', numeric: true, value: (s) => fmt.duration(s.minutesInside) },
    ], rows);
  }

  async function tick() {
    if (!state.active || !supported || state.inFlight.sessions) return;
    state.inFlight.sessions = true;
    const res = await api.getActiveSessions(cfg.GYM_ID);
    state.inFlight.sessions = false;
    if (!state.active) return;

    if (res.ok) {
      state.sessions = Array.isArray(res.data) ? res.data : [];
      status.setError('sessions', '');
    } else if (res.status === 404) {
      supported = false;
    } else {
      status.setError('sessions', `People inside: ${res.message}`);
      return;
    }
    render();
  }

  function reset() {
    supported = true;
    el.filter.value = '';
    el.table.textContent = '';
    el.empty.hidden = true;
    setText(el.count, '');
  }

  el.filter.addEventListener('input', render);

  SGC.sessions = { render, tick, reset };
}(window.SGC));
