(function (SGC) {
  'use strict';

  const fmt = SGC.fmt;
  const registry = {};

  function available() {
    return typeof window.Chart !== 'undefined';
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function tokens() {
    return {
      font: cssVar('--font'),
      surface: cssVar('--surface'),
      ink1: cssVar('--ink-1'),
      ink2: cssVar('--ink-2'),
      ink3: cssVar('--ink-3'),
      grid: cssVar('--grid'),
      axis: cssVar('--axis'),
      border: cssVar('--border'),
      visits: cssVar('--c-visits'),
      unique: cssVar('--c-unique'),
      occupancy: cssVar('--c-occupancy'),
      duration: cssVar('--c-duration'),
    };
  }

  function withAlpha(hex, alpha) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    const full = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
    const n = parseInt(full, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function compact(value) {
    return value >= 1000 ? `${value / 1000}K` : value;
  }

  const crosshair = {
    id: 'crosshair',
    beforeDatasetsDraw(chart, _args, opts) {
      if (!opts || !opts.enabled || !chart.tooltip) return;
      const active = chart.tooltip.getActiveElements();
      if (!active || !active.length) return;
      const { top, bottom } = chart.chartArea;
      const x = active[0].element.x;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.lineWidth = 1;
      ctx.strokeStyle = opts.color;
      ctx.stroke();
      ctx.restore();
    },
  };

  const capacityLine = {
    id: 'capacityLine',
    beforeDatasetsDraw(chart, _args, opts) {
      if (!opts || !opts.value) return;
      const y = chart.scales.y.getPixelForValue(opts.value);
      const { left, right, top, bottom } = chart.chartArea;
      if (y < top - 1 || y > bottom + 1) return;
      const ctx = chart.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.lineWidth = 1;
      ctx.strokeStyle = opts.color;
      ctx.stroke();
      ctx.fillStyle = opts.textColor;
      ctx.font = `11px ${opts.font}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Capacity ${opts.value}`, right, y - 4);
      ctx.restore();
    },
  };

  function legendLabels(chart) {
    const labels = window.Chart.defaults.plugins.legend.labels.generateLabels(chart);
    labels.forEach((label) => {
      const dataset = chart.data.datasets[label.datasetIndex];
      const isLine = dataset.type === 'line';
      label.pointStyle = isLine ? 'line' : 'rectRounded';
      if (isLine) label.strokeStyle = dataset.borderColor;
    });
    return labels;
  }

  function baseOptions(t, opts) {
    const o = opts || {};
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: reduceMotion ? false : { duration: 250 },
      interaction: { mode: 'index', intersect: false },
      layout: { padding: { top: o.capacity ? 16 : 4, right: 4 } },
      scales: {
        x: {
          grid: { display: false },
          border: { color: t.axis },
          ticks: { color: t.ink3, maxRotation: 0, autoSkip: true, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          suggestedMax: o.capacity || undefined,
          grid: { color: t.grid, lineWidth: 1 },
          border: { display: false },
          ticks: { color: t.ink3, precision: 0, maxTicksLimit: 6, callback: compact, font: { size: 11 } },
        },
      },
      plugins: {
        legend: o.legend
          ? {
            position: 'top',
            align: 'start',
            labels: {
              color: t.ink2,
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10,
              padding: 16,
              font: { size: 12 },
              generateLabels: legendLabels,
            },
          }
          : { display: false },
        tooltip: {
          backgroundColor: t.surface,
          borderColor: t.border,
          borderWidth: 1,
          titleColor: t.ink2,
          bodyColor: t.ink1,
          titleFont: { size: 12, weight: '400' },
          bodyFont: { size: 13, weight: '600' },
          padding: 10,
          cornerRadius: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            title: (items) => (o.title ? o.title(items[0]) : items[0].label),
            label: (ctx) => `${fmt.number(ctx.parsed.y)}${o.unit || ''}  ${ctx.dataset.label}`,
            labelColor: (ctx) => ({
              borderColor: ctx.dataset.borderColor,
              backgroundColor: ctx.dataset.borderColor,
              borderWidth: 0,
              borderRadius: 1,
            }),
            labelPointStyle: () => ({ pointStyle: 'line', rotation: 0 }),
          },
        },
        crosshair: { enabled: !!o.crosshair, color: t.axis },
        capacityLine: o.capacity
          ? { value: o.capacity, color: t.axis, textColor: t.ink3, font: t.font }
          : false,
      },
    };
  }

  function barSet(label, data, color) {
    return {
      type: 'bar',
      label,
      data,
      backgroundColor: color,
      hoverBackgroundColor: withAlpha(color, 0.78),
      borderColor: color,
      borderWidth: 0,
      borderRadius: 4,
      borderSkipped: 'start',
      maxBarThickness: 24,
      categoryPercentage: 0.7,
      barPercentage: 0.85,
      pointStyle: 'rectRounded',
    };
  }

  function lineSet(label, data, color, surface) {
    return {
      type: 'line',
      label,
      data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      borderJoinStyle: 'round',
      borderCapStyle: 'round',
      tension: 0,
      spanGaps: false,
      pointStyle: 'circle',
      pointRadius: 4,
      pointHoverRadius: 5,
      pointHitRadius: 12,
      pointBackgroundColor: color,
      pointBorderColor: surface,
      pointBorderWidth: 2,
    };
  }

  function upsert(key, canvas, config) {
    const existing = registry[key];
    if (existing && existing.canvas === canvas) {
      existing.config.type = config.type;
      existing.data = config.data;
      existing.options = config.options;
      existing.update();
      return existing;
    }
    if (existing) existing.destroy();
    registry[key] = new window.Chart(canvas, config);
    return registry[key];
  }

  function destroy(key) {
    if (registry[key]) {
      registry[key].destroy();
      delete registry[key];
    }
  }

  function destroyAll() {
    Object.keys(registry).forEach(destroy);
  }

  function init() {
    if (!available()) return;
    const t = tokens();
    window.Chart.defaults.font.family = t.font;
    window.Chart.defaults.color = t.ink2;
  }

  function dayHourly(canvas, rows, capacity) {
    if (!available()) return null;
    const t = tokens();
    const line = lineSet('People inside', rows.map((r) => r.occupancy), t.occupancy, t.surface);
    line.order = 0;
    const bars = barSet('Check-ins', rows.map((r) => r.visits), t.visits);
    bars.order = 1;

    return upsert('dayHourly', canvas, {
      type: 'bar',
      data: { labels: rows.map((r) => r.hour), datasets: [line, bars] },
      options: baseOptions(t, { legend: true, capacity }),
      plugins: [crosshair, capacityLine],
    });
  }

  function weekVisits(canvas, days, onSelect) {
    if (!available()) return null;
    const t = tokens();
    const options = baseOptions(t, {
      legend: true,
      title: (item) => fmt.longDay(days[item.dataIndex].date),
    });
    options.onClick = (evt, _els, chart) => {
      const hit = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
      if (hit.length && onSelect) onSelect(days[hit[0].index].date);
    };
    options.onHover = (evt, els) => {
      evt.native.target.style.cursor = els.length ? 'pointer' : 'default';
    };

    return upsert('weekVisits', canvas, {
      type: 'bar',
      data: {
        labels: days.map((d) => fmt.dayLabel(d.date)),
        datasets: [
          barSet('Total visits', days.map((d) => d.visits), t.visits),
          barSet('Unique students', days.map((d) => d.unique), t.unique),
        ],
      },
      options,
    });
  }

  function weekPeak(canvas, days, capacity) {
    if (!available()) return null;
    const t = tokens();

    return upsert('weekPeak', canvas, {
      type: 'bar',
      data: {
        labels: days.map((d) => fmt.dayLabel(d.date)),
        datasets: [barSet('Peak occupancy', days.map((d) => d.peak), t.occupancy)],
      },
      options: baseOptions(t, {
        capacity,
        unit: ' people',
        title: (item) => fmt.longDay(days[item.dataIndex].date),
      }),
      plugins: [capacityLine],
    });
  }

  function weekDuration(canvas, days) {
    if (!available()) return null;
    const t = tokens();

    return upsert('weekDuration', canvas, {
      type: 'line',
      data: {
        labels: days.map((d) => fmt.dayLabel(d.date)),
        datasets: [lineSet('Average workout', days.map((d) => d.duration), t.duration, t.surface)],
      },
      options: baseOptions(t, {
        crosshair: true,
        unit: ' min',
        title: (item) => fmt.longDay(days[item.dataIndex].date),
      }),
      plugins: [crosshair],
    });
  }

  SGC.charts = { available, init, destroy, destroyAll, dayHourly, weekVisits, weekPeak, weekDuration };
}(window.SGC));
