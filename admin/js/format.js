(function (SGC) {
  'use strict';

  const TZ = SGC.config.TIMEZONE;

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const clockFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });

  function parseDay(ymd) {
    return new Date(`${ymd}T00:00:00Z`);
  }

  function today() {
    const parts = {};
    dateParts.formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function addDays(ymd, n) {
    const d = parseDay(ymd);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function lastDays(n) {
    const end = today();
    const days = [];
    for (let i = n - 1; i >= 0; i -= 1) days.push(addDays(end, -i));
    return days;
  }

  function dayLabel(ymd) {
    const weekday = parseDay(ymd).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    return `${weekday} ${Number(ymd.slice(8, 10))}`;
  }

  function longDay(ymd) {
    return parseDay(ymd).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  }

  function clock(date) {
    return clockFmt.format(date || new Date());
  }

  function time(iso) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '—' : timeFmt.format(date);
  }

  function toNumber(value) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  function number(value) {
    const n = toNumber(value);
    return n === null ? '—' : n.toLocaleString('en-US');
  }

  function minutes(value) {
    const n = toNumber(value);
    return n === null ? '—' : `${n} min`;
  }

  function duration(value) {
    const n = toNumber(value);
    if (n === null) return '—';
    if (n < 60) return `${n} min`;
    return `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')} min`;
  }

  function peakHour(value) {
    if (!value) return '—';
    const range = /^(\d{2}):00\s*[-–]\s*(\d{2}):00$/.exec(value);
    if (range) return `${range[1]}:00–${range[2]}:00`;
    const single = /^(\d{2}):00$/.exec(value);
    if (single) {
      const next = String((Number(single[1]) + 1) % 24).padStart(2, '0');
      return `${single[1]}:00–${next}:00`;
    }
    return String(value);
  }

  SGC.fmt = {
    today, addDays, lastDays, dayLabel, longDay, clock, time,
    toNumber, number, minutes, duration, peakHour,
  };
}(window.SGC));
