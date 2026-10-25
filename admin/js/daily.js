(function (SGC) {
  'use strict';

  const { $, setText, setLoading, fillTable } = SGC.dom;
  const { state, status, api, fmt, charts } = SGC;
  const cfg = SGC.config;

  const el = {
    section: $('daily-section'),
    label: $('day-label'),
    input: $('day-input'),
    prev: $('day-prev'),
    next: $('day-next'),
    today: $('day-today'),
    body: $('daily-body'),
    chartCard: $('daily-chart-card'),
    empty: $('daily-empty'),
    table: $('table-day'),
    canvas: $('chart-day-hourly'),
    visits: $('tile-visits'),
    unique: $('tile-unique'),
    peak: $('tile-peak'),
    peakSub: $('tile-peak-sub'),
    peakHour: $('tile-peak-hour'),
    duration: $('tile-duration'),
  };

  function normalizeHourly(list) {
    return (Array.isArray(list) ? list : [])
      .map((row) => ({
        hour: String(row.hour),
        visits: fmt.toNumber(row.visits) || 0,
        occupancy: fmt.toNumber(row.occupancy) || 0,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }

  function renderControls() {
    const today = fmt.today();
    el.input.max = today;
    el.input.value = state.date;
    el.next.disabled = state.date >= today;
    el.today.disabled = state.date === today;
    setText(el.label, fmt.longDay(state.date));
  }

  function renderTiles(summary) {
    const has = !!summary;
    setText(el.visits, has ? fmt.number(summary.totalVisits) : '—');
    setText(el.unique, has ? fmt.number(summary.uniqueStudents) : '—');
    setText(el.peak, has ? fmt.number(summary.peakOccupancy) : '—');
    setText(el.peakSub, has && state.capacity ? `of ${fmt.number(state.capacity)}` : '');
    setText(el.peakHour, has ? fmt.peakHour(summary.peakHour) : '—');
    setText(el.duration, has ? fmt.minutes(summary.averageDurationMinutes) : '—');
  }

  function renderChart(summary, rows) {
    charts.dayHourly(el.canvas, rows, state.capacity);
    el.canvas.setAttribute(
      'aria-label',
      `Check-ins and people inside by hour on ${fmt.longDay(state.date)}. Peak hour ${fmt.peakHour(summary.peakHour)}.`
    );
    fillTable(el.table, [
      { label: 'Hour', value: (r) => r.hour },
      { label: 'Check-ins', numeric: true, value: (r) => fmt.number(r.visits) },
      { label: 'People inside', numeric: true, value: (r) => fmt.number(r.occupancy) },
    ], rows);
  }

  function render() {
    renderControls();

    const summary = state.daily;
    const has = !!summary && typeof summary === 'object';
    const rows = has ? normalizeHourly(summary.hourlyBreakdown) : [];

    renderTiles(has ? summary : null);

    el.chartCard.hidden = rows.length === 0;
    el.empty.hidden = summary === undefined || rows.length > 0;

    if (!el.empty.hidden) {
      setText(
        el.empty,
        has
          ? 'This summary has no hourly breakdown.'
          : `No summary for ${fmt.longDay(state.date)}. A day's summary appears after its first check-in.`
      );
    }

    if (rows.length > 0) {
      renderChart(summary, rows);
    } else {
      charts.destroy('dayHourly');
      el.table.textContent = '';
    }
  }

  async function load(silent) {
    if (!state.active || state.inFlight.daily) return;
    const requested = state.date;
    state.inFlight.daily = true;
    if (!silent) setLoading(el.body, true);

    const res = await api.getDailySummary(cfg.GYM_ID, requested);

    state.inFlight.daily = false;
    setLoading(el.body, false);
    if (!state.active) return;

    if (requested !== state.date) {
      load(silent);
      return;
    }

    if (res.ok) {
      state.daily = res.data || null;
      status.setError('daily', '');
    } else {
      status.setError('daily', `Daily summary: ${res.message}`);
      if (state.daily === undefined) state.daily = null;
    }
    render();
  }

  function select(date, scroll) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > fmt.today()) return;
    state.date = date;
    state.daily = undefined;
    render();
    load(false);
    if (scroll) el.section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  el.prev.addEventListener('click', () => select(fmt.addDays(state.date, -1), false));
  el.next.addEventListener('click', () => select(fmt.addDays(state.date, 1), false));
  el.today.addEventListener('click', () => select(fmt.today(), false));
  el.input.addEventListener('change', () => {
    if (el.input.value) select(el.input.value, false);
    else renderControls();
  });

  SGC.daily = { render, load, select };
}(window.SGC));
