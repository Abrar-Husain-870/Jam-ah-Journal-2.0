/**
 * Chart.js — single premium visual language (calm, editorial, product-grade).
 * All chart options should flow through helpers here; avoid one-off Chart.js defaults in screens.
 */

export const FONT_STACK =
  "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Canvas layout — extra right/bottom room for ticks without clipping */
export const CHART_LAYOUT = {
  main: { top: 8, right: 6, bottom: 4, left: 2 },
  bar: { top: 12, right: 8, bottom: 4, left: 0 },
  line: { top: 10, right: 8, bottom: 6, left: 4 },
  /** Extra top room so 100% points (r≈4–7px) are not clipped by the chart area edge */
  spark: { top: 18, right: 10, bottom: 8, left: 2 },
  horizontalBar: { top: 4, right: 10, bottom: 4, left: 4 },
};

export function chartAnimationPreset({ short = false } = {}) {
  return {
    duration: short ? 480 : 680,
    easing: 'easeOutCubic',
  };
}

/** Apply once — reduces generic Chart.js typography */
export function applyChartJsGlobalFont(ChartJS) {
  if (!ChartJS || ChartJS._jjFontApplied) return;
  ChartJS.defaults.font.family = FONT_STACK;
  ChartJS.defaults.font.size = 11;
  ChartJS.defaults.color = '#78716c';
  ChartJS._jjFontApplied = true;
}

export function getChartColors(isDark) {
  return {
    text: isDark ? '#e7e5e4' : '#1c1917',
    textMuted: isDark ? '#a8a29e' : '#57534e',
    grid: isDark ? 'rgba(255,255,255,0.038)' : 'rgba(28,25,23,0.06)',
    gridMinor: isDark ? 'rgba(255,255,255,0.022)' : 'rgba(28,25,23,0.035)',
    surface: isDark ? 'rgba(28,27,26,0.97)' : 'rgba(255,255,255,0.98)',
    surfaceGlass: isDark ? 'rgba(38,37,35,0.94)' : 'rgba(252,250,247,0.98)',
    border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(28,25,23,0.09)',
    accent: isDark ? '#5eead4' : '#0d6d63',
    accentFill: isDark ? 'rgba(45,212,191,0.09)' : 'rgba(13,109,99,0.085)',
    accentMuted: isDark ? '#99f6e4' : '#115e59',
  };
}

/**
 * Line/spark point markers — Chart.js merges `options.elements.point`; avoid radius/borderWidth 0 there
 * or dataset point styling can fail to show. Light core + teal ring reads on dark canvas; inverse on light.
 */
export function getLinePointMarkerDatasetStyle(isDark) {
  const c = getChartColors(isDark);
  if (isDark) {
    return {
      pointBackgroundColor: '#fafaf9',
      pointBorderColor: '#2dd4bf',
      pointBorderWidth: 2.5,
      pointHoverBackgroundColor: '#ffffff',
      pointHoverBorderColor: '#5eead4',
      pointHoverBorderWidth: 2.5,
    };
  }
  return {
    pointBackgroundColor: c.accent,
    pointBorderColor: '#1c1917',
    pointBorderWidth: 2.5,
    pointHoverBackgroundColor: '#115e59',
    pointHoverBorderColor: '#0c0a09',
    pointHoverBorderWidth: 2.5,
  };
}

/** Muted fills — cohesive with accent teal, restrained saturation */
export function getMutedStatusColors(isDark) {
  if (isDark) {
    return {
      masjid: '#6ee7b0',
      home: '#5eead4',
      qaza: '#e0b565',
      notPrayed: '#e5989a',
      perfect: '#86d9b8',
    };
  }
  return {
    masjid: '#0f766e',
    home: '#0d6d63',
    qaza: '#a16207',
    notPrayed: '#b45309',
    perfect: '#166534',
  };
}

export function chartTooltipPlugins(isDark, titleCallback, labelCallback) {
  const c = getChartColors(isDark);
  return {
    enabled: true,
    intersect: false,
    mode: 'index',
    position: 'nearest',
    backgroundColor: c.surfaceGlass,
    titleColor: c.text,
    bodyColor: c.textMuted,
    borderColor: c.border,
    borderWidth: 1,
    padding: { top: 12, right: 14, bottom: 12, left: 14 },
    cornerRadius: 12,
    caretSize: 0,
    caretPadding: 10,
    displayColors: true,
    boxPadding: 6,
    boxWidth: 7,
    boxHeight: 7,
    usePointStyle: true,
    multiKeyBackground: 'transparent',
    titleFont: {
      family: FONT_STACK,
      size: 10,
      weight: '600',
      letterSpacing: '0.06em',
    },
    titleSpacing: 6,
    titleMarginBottom: 8,
    bodyFont: {
      family: FONT_STACK,
      size: 13,
      weight: '400',
      lineHeight: 1.4,
    },
    bodySpacing: 6,
    footerFont: { family: FONT_STACK, size: 11 },
    callbacks: {
      title: titleCallback,
      label: labelCallback,
    },
  };
}

/** Stacked bars: compact legend above chart reads like a product header */
export function chartLegendTop(isDark, { compact = false } = {}) {
  const c = getChartColors(isDark);
  return {
    display: true,
    position: 'top',
    align: 'start',
    labels: {
      boxWidth: compact ? 6 : 7,
      boxHeight: compact ? 6 : 7,
      padding: compact ? 10 : 12,
      usePointStyle: true,
      pointStyle: 'circle',
      color: c.textMuted,
      font: { family: FONT_STACK, size: compact ? 9.5 : 10, weight: '500' },
    },
  };
}

export function chartCartesianScales(isDark, yOptions = {}) {
  const c = getChartColors(isDark);
  return {
    x: {
      grid: { display: false, drawBorder: false },
      border: { display: false },
      ticks: {
        color: c.textMuted,
        font: { family: FONT_STACK, size: 10, weight: '400' },
        maxRotation: 0,
        autoSkip: true,
        autoSkipPadding: 12,
        padding: 8,
        ...yOptions.xTicks,
      },
      offset: true,
    },
    y: {
      beginAtZero: yOptions.beginAtZero !== false,
      grid: {
        color: c.grid,
        drawBorder: false,
        lineWidth: 1,
        tickLength: 0,
        tickBorderDash: [2],
      },
      border: { display: false },
      ticks: {
        color: c.textMuted,
        font: { family: FONT_STACK, size: 10, weight: '400' },
        padding: 12,
        maxTicksLimit: 5,
        ...yOptions.yTicks,
      },
      ...yOptions.yScale,
    },
  };
}

export function getBarChartOptions(
  isDark,
  { stacked = true, xTickLimit, compactLegend = false, isMobile = false } = {}
) {
  const baseScales = chartCartesianScales(isDark, {
    beginAtZero: true,
    xTicks: xTickLimit
      ? {
          maxTicksLimit: xTickLimit,
          maxRotation: isMobile ? 0 : 0,
        }
      : {},
    yTicks: { maxTicksLimit: 5 },
  });

  if (stacked) {
    baseScales.x.stacked = true;
    baseScales.y.stacked = true;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.bar },
    interaction: { mode: 'index', intersect: false },
    animation: chartAnimationPreset({ short: false }),
    plugins: {
      legend: chartLegendTop(isDark, { compact: compactLegend }),
      tooltip: chartTooltipPlugins(
        isDark,
        (items) => (items[0]?.label ? String(items[0].label) : ''),
        (ctx) => {
          const v = ctx.parsed?.y;
          const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          return ` ${ctx.dataset.label}: ${n}`;
        }
      ),
    },
    scales: baseScales,
    datasets: {
      bar: {
        borderRadius: 5,
        borderSkipped: false,
        borderWidth: 0,
        maxBarThickness: isMobile ? 44 : 40,
        categoryPercentage: 0.72,
        barPercentage: 0.9,
      },
    },
  };
}

export function getHorizontalBarOptions(isDark, { compactLegend = true } = {}) {
  const c = getChartColors(isDark);
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.horizontalBar },
    interaction: { mode: 'index', intersect: false },
    animation: chartAnimationPreset({ short: false }),
    plugins: {
      legend: chartLegendTop(isDark, { compact: compactLegend }),
      tooltip: chartTooltipPlugins(
        isDark,
        (items) => (items[0]?.label ? String(items[0].label) : ''),
        (ctx) => {
          const v = ctx.parsed?.x;
          const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          return ` ${ctx.dataset.label}: ${n}`;
        }
      ),
    },
    scales: {
      x: {
        beginAtZero: true,
        stacked: true,
        grid: { color: c.grid, drawBorder: false, lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: c.textMuted,
          font: { family: FONT_STACK, size: 10, weight: '400' },
          padding: 10,
          maxTicksLimit: 6,
        },
      },
      y: {
        stacked: true,
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: {
          color: c.text,
          font: { family: FONT_STACK, size: 11, weight: '600' },
          padding: 10,
        },
      },
    },
    datasets: {
      bar: {
        borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 7, bottomRight: 7 },
        borderSkipped: false,
        borderWidth: 0,
        maxBarThickness: 28,
      },
    },
  };
}

export function getLineChartOptions(isDark, { yMin, yMax, xMaxTicks = 8, zoomConfig } = {}) {
  const c = getChartColors(isDark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.line },
    interaction: { mode: 'index', intersect: false },
    animation: chartAnimationPreset({ short: false }),
    plugins: {
      legend: { display: false },
      tooltip: chartTooltipPlugins(
        isDark,
        (items) => (items[0]?.label ? String(items[0].label) : ''),
        (ctx) => {
          const v = ctx.parsed?.y;
          const raw = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          const label = ctx.dataset?.label || 'Value';
          return ` ${label}: ${raw.toFixed(ctx.dataset.yPrecision ?? 2)}`;
        }
      ),
      decimation: { enabled: false },
      ...(zoomConfig ? { zoom: zoomConfig } : {}),
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 7,
        hitRadius: 22,
        borderWidth: 2.5,
        backgroundColor: isDark ? '#fafaf9' : c.accent,
        borderColor: isDark ? '#2dd4bf' : '#1c1917',
        hoverBorderWidth: 2.5,
        hoverBackgroundColor: isDark ? '#ffffff' : '#115e59',
        hoverBorderColor: isDark ? '#5eead4' : '#0c0a09',
      },
      line: {
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        tension: 0.35,
        borderWidth: 2.5,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        offset: true,
        ticks: {
          color: c.textMuted,
          font: { family: FONT_STACK, size: 10, weight: '400' },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 14,
          maxTicksLimit: xMaxTicks,
          padding: 8,
        },
      },
      y: {
        beginAtZero: false,
        ...(yMin != null ? { min: yMin } : {}),
        ...(yMax != null ? { max: yMax } : {}),
        grid: {
          color: c.grid,
          drawBorder: false,
          lineWidth: 1,
        },
        border: { display: false },
        ticks: {
          color: c.textMuted,
          font: { family: FONT_STACK, size: 10, weight: '400' },
          padding: 10,
          maxTicksLimit: 5,
        },
      },
    },
  };
}

export function getSparklineOptions(isDark) {
  const c = getChartColors(isDark);
  const pt = getLinePointMarkerDatasetStyle(isDark);
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.spark },
    interaction: { mode: 'index', intersect: false },
    animation: chartAnimationPreset({ short: true }),
    plugins: {
      legend: { display: false },
      tooltip: chartTooltipPlugins(
        isDark,
        (items) => (items[0]?.label ? String(items[0].label) : ''),
        (ctx) => {
          const v = ctx.parsed?.y;
          const raw = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          return ` ${raw.toFixed(0)}% addressed`;
        }
      ),
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 7,
        hitRadius: 28,
        borderWidth: pt.pointBorderWidth,
        backgroundColor: pt.pointBackgroundColor,
        borderColor: pt.pointBorderColor,
        hoverBorderWidth: pt.pointHoverBorderWidth,
        hoverBackgroundColor: pt.pointHoverBackgroundColor,
        hoverBorderColor: pt.pointHoverBorderColor,
      },
      line: { tension: 0.45, borderWidth: 2.5, borderCapStyle: 'round' },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: c.textMuted,
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 7,
          font: { family: FONT_STACK, size: 10, weight: '500' },
          padding: 6,
        },
      },
      y: {
        min: 0,
        // Headroom above 100 so markers at max aren’t cut in half (trajectory uses dynamic max already)
        max: 110,
        grid: { color: c.gridMinor, lineWidth: 1, drawBorder: false },
        border: { display: false },
        ticks: {
          color: c.textMuted,
          font: { family: FONT_STACK, size: 10, weight: '400' },
          stepSize: 25,
          maxTicksLimit: 5,
          padding: 8,
          callback: (value) => {
            if (typeof value !== 'number' || value > 100) return '';
            return `${value}%`;
          },
        },
      },
    },
  };
}

export function getCountsHorizontalBarOptions(isDark) {
  const c = getChartColors(isDark);
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.horizontalBar },
    interaction: { mode: 'index', intersect: false },
    animation: chartAnimationPreset({ short: true }),
    plugins: {
      legend: { display: false },
      tooltip: chartTooltipPlugins(
        isDark,
        (items) =>
          items[0]?.label ? String(items[0].label) : 'Completed days',
        (ctx) => {
          const v = ctx.parsed?.x;
          const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
          return ` ${n} ${n === 1 ? 'day' : 'days'}`;
        }
      ),
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: c.grid, drawBorder: false, lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: c.textMuted,
          font: { family: FONT_STACK, size: 10, weight: '400' },
          precision: 0,
          padding: 10,
          maxTicksLimit: 6,
        },
      },
      y: {
        grid: { display: false, drawBorder: false },
        border: { display: false },
        ticks: {
          color: c.text,
          font: { family: FONT_STACK, size: 11, weight: '600' },
          padding: 8,
        },
      },
    },
    datasets: {
      bar: {
        borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 8, bottomRight: 8 },
        borderSkipped: false,
        borderWidth: 0,
        maxBarThickness: 26,
      },
    },
  };
}

export function axisLabelForTrendDate(iso, style) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (style === 'compact') {
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  if (style === 'micro') {
    return String(d);
  }
  return `${d}/${m}/${String(y).slice(2)}`;
}

export function getDoughnutOptions(isDark, { cutout = '58%' } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: CHART_LAYOUT.main },
    cutout,
    rotation: -Math.PI / 2,
    animation: chartAnimationPreset({ short: false }),
    plugins: {
      legend: chartLegendTop(isDark, { compact: true }),
      tooltip: chartTooltipPlugins(
        isDark,
        (items) => (items[0]?.label ? String(items[0].label) : 'Breakdown'),
        (ctx) => {
          const raw = ctx.raw;
          const dataset = ctx.chart?.data?.datasets?.[0]?.data;
          const total = Array.isArray(dataset) ? dataset.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
          const n = typeof raw === 'number' ? raw : 0;
          const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
          return ` ${n} (${pct}%)`;
        }
      ),
    },
  };
}
