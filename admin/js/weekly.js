(function (SGC) {
  'use strict';

  const { $, setLoading, fillTable } = SGC.dom;
  const { state, status, api, fmt, charts } = SGC;
  const cfg = SGC.config;

  const el = {
    section: $('weekly-section'),
    grid: $('weekly-grid'),
    empty: $('weekly-empty'),
    table: $('table-week'),
    visits: $('chart-week-visits'),
    peak: $('chart-week-peak'),
    duration: $('chart-week-duration'),
  };

  function normalize(list) {
    const byDate = new Map((Array.isArray(list) ? list : []).map((d) => [d.date, d]));
    return fmt.lastDays(7).map((date) => {
      const day = byDate.get(date);
      return {
        date,
        visits: day ? fmt.toNumber(day.totalVisits) : null,
        unique: day ? fmt.toNumber(day.uniqueStudents) : null,
        peak: day ? fmt.toNumber(day.peakOccupancy) : null,
        duration: day ? fmt.toNumber(day.averageDurationMinutes) : null,
      };
    });
  }

  function dayLink(day) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link';
    button.textContent = fmt.longDay(day.date);
    button.addEventListener('click', () => SGC.daily.select(day.date, true));
    return button;
  }

  function render() {
    const days = state.weekly;
    if (!days) return;

    const hasData = days.some((d) => d.visits !== null);
    el.grid.hidden = !hasData;
    el.empty.hidden = hasData;

    if (hasData) {
      charts.weekVisits(el.visits, days, (date) => SGC.daily.select(date, true));
      charts.weekPeak(el.peak, days, state.capacity);
      charts.weekDuration(el.duration, days);

      const total = days.reduce((sum, d) => sum + (d.visits || 0), 0);
      el.visits.setAttribute(
        'aria-label',
        `Visits and unique students per day for the last 7 days. ${fmt.number(total)} visits in total.`
      );
    } else {
      charts.destroy('weekVisits');
      charts.destroy('weekPeak');
      charts.destroy('weekDuration');
    }

    fillTable(el.table, [
      { label: 'Day', value: dayLink },
      { label: 'Total visits', numeric: true, value: (d) => fmt.number(d.visits) },
      { label: 'Unique students', numeric: true, value: (d) => fmt.number(d.unique) },
      { label: 'Peak occupancy', numeric: true, value: (d) => fmt.number(d.peak) },
      { label: 'Avg. workout', numeric: true, value: (d) => fmt.minutes(d.duration) },
    ], days);
  }

  async function load(silent) {
    if (!state.active || state.inFlight.weekly) return;
    state.inFlight.weekly = true;
    if (!silent) setLoading(el.section, true);

    const res = await api.getWeeklySummary(cfg.GYM_ID);

    state.inFlight.weekly = false;
    setLoading(el.section, false);
    if (!state.active) return;

    if (res.ok) {
      state.weekly = normalize(res.data);
      status.setError('weekly', '');
      render();
    } else {
      status.setError('weekly', `Weekly summary: ${res.message}`);
    }
  }

  SGC.weekly = { render, load };
}(window.SGC));
