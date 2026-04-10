import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  getLineChartOptions,
  getChartColors,
  getSparklineOptions,
  axisLabelForTrendDate,
  getLinePointMarkerDatasetStyle,
} from '../lib/chartTheme';
import { ensureChartsRegistered, ChartJS } from '../lib/registerCharts';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Calendar,
  Clock,
  Home,
  X,
} from 'lucide-react';
import { MosqueIcon } from './icons/MosqueIcon';
import {
  getMonthlyStats,
  getYearlyStats,
  getRecentStats,
  getAllTimeStats,
  getDailyTrend,
  getPrayerDataInRange,
} from '../services/analyticsService';
import { DEBUG_LOGS_ENABLED } from '../config/debug';
import { PRAYER_STATUS, PRAYER_COLORS, PRAYER_TYPES, PRAYER_SCORES, SURAH_ALKAHF, SURAH_STATUS, SURAH_SCORES } from '../services/prayerService';
import { useTheme } from '../contexts/ThemeContext';
import {
  AnalyticsCard,
  AnalyticsSection,
  ChartCard,
  EmptyStateCard,
  InsightCallout,
  SectionHeader,
} from './analytics';
import {
  buildLastNDaysSlotCompletionSeries,
} from '../analytics/progressDerivations';

const Progress = () => {
  const { currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const [timeframe, setTimeframe] = useState('alltime'); // Default to 'alltime'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [masjidMode, setMasjidMode] = useState(false);
  const [trendType, setTrendType] = useState('average'); // 'average' | 'composite'
  const [dailyTrend, setDailyTrend] = useState([]);
  const [cumulativeTrend, setCumulativeTrend] = useState([]); // leaderboard-style cumulative series
  const [smooth, setSmooth] = useState(false); // moving average smoothing
  const [zoomReady, setZoomReady] = useState(false); // zoom plugin loaded
  const [isSmallScreen, setIsSmallScreen] = useState(typeof window !== 'undefined' ? window.innerWidth < 480 : false);
  const [atAGlance, setAtAGlance] = useState(null);
  const chartRef = useRef(null);

  useEffect(() => {
    ensureChartsRegistered();
  }, []);

  // Load user preferences from localStorage
  useEffect(() => {
    if (currentUser) {
      const savedTimeframe = localStorage.getItem(`progress_timeframe_${currentUser.uid}`);
      if (savedTimeframe) {
        setTimeframe(savedTimeframe);
      }
      
      const savedMonth = localStorage.getItem(`progress_month_${currentUser.uid}`);
      const savedYear = localStorage.getItem(`progress_year_${currentUser.uid}`);
      if (savedMonth) setSelectedMonth(parseInt(savedMonth));
      if (savedYear) setSelectedYear(parseInt(savedYear));
    }
  }, [currentUser]);

  // Fetch user's Masjid Mode setting
  useEffect(() => {
    const fetchMasjidMode = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setMasjidMode(userDoc.data().masjidMode || false);
          }
        } catch (error) {
          console.error('Error fetching masjid mode:', error);
          setMasjidMode(false);
        }
      }
    };
    fetchMasjidMode();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadStats();
    }
  }, [currentUser, timeframe, selectedMonth, selectedYear, masjidMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load the zoom plugin to avoid hard dependency at build time.
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('chartjs-plugin-zoom');
        if (mod && mod.default) {
          // Register only once
          if (!ChartJS.registry.plugins.get('zoom')) {
            ChartJS.register(mod.default);
          }
          if (mounted) setZoomReady(true);
        }
      } catch (e) {
        // Plugin not installed; zoom will be disabled gracefully
        if (mounted) setZoomReady(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setAtAGlance(null);
      let statsData;
      let startDate;
      let endDate;
      
      switch (timeframe) {
        case 'month':
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth, masjidMode);
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0);
          break;
        case 'year':
          statsData = await getYearlyStats(currentUser.uid, selectedYear, masjidMode);
          startDate = new Date(selectedYear, 0, 1);
          endDate = new Date(selectedYear, 11, 31);
          break;
        case 'recent':
          statsData = await getRecentStats(currentUser.uid, 30, masjidMode);
          endDate = new Date();
          startDate = new Date();
          startDate.setDate(endDate.getDate() - 29);
          break;
        case 'alltime':
          statsData = await getAllTimeStats(currentUser.uid, masjidMode);
          endDate = new Date();
          startDate = new Date();
          startDate.setFullYear(endDate.getFullYear() - 1); // last 12 months for trend
          break;
        default:
          statsData = await getMonthlyStats(currentUser.uid, selectedYear, selectedMonth, masjidMode);
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0);
      }
      
      if (DEBUG_LOGS_ENABLED) {
        console.log('Progress Debug - Loaded stats data:', statsData);
        console.log('Progress Debug - Surah Al-Kahf stats:', statsData.surahAlKahfStats);
      }
      setStats(statsData);

      // Load daily trend (complete days only), calendar-window glance metrics, and build cumulative series
      if (startDate && endDate) {
        const now = new Date();
        const last7End = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const last7Start = new Date(last7End);
        last7Start.setDate(last7Start.getDate() - 6);

        const [trend, prayerData, last7Map] = await Promise.all([
          getDailyTrend(currentUser.uid, startDate, endDate, masjidMode),
          getPrayerDataInRange(currentUser.uid, startDate, endDate),
          getPrayerDataInRange(currentUser.uid, last7Start, last7End),
        ]);

        setDailyTrend(trend);

        const spark = buildLastNDaysSlotCompletionSeries(last7Map, 7, now);
        setAtAGlance({
          weekSparkLabels: spark.labels,
          weekSparkValues: spark.values,
        });

        // Build cumulative series using raw prayer data and leaderboard formulas
        const dates = Object.keys(prayerData).sort();

        // Cumulative aggregates
        let totalScore = 0;
        let totalDays = 0; // complete days counted
        let totalPrayers = 0;
        const breakdown = {
          [PRAYER_STATUS.NOT_PRAYED]: 0,
          [PRAYER_STATUS.QAZA]: 0,
          [PRAYER_STATUS.HOME]: 0,
          [PRAYER_STATUS.MASJID]: 0
        };
        let currentStreak = 0;
        // Surah Al-Kahf running counters for Home Mode
        let fridaysTotal = 0;
        let fridaysRecited = 0;

        const series = [];

        // Helper: per-day completeness and scoring similar to calculatePrayerStats
        const isFridayLocal = (dateObj) => dateObj.getDay() === 5;

        dates.forEach(date => {
          const dayData = prayerData[date];
          const [y, m, d] = date.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d);

          let dayScore = 0;
          let allFivePrayersMarked = true;
          let markedPrayersCount = 0;
          let dayHasAllGoodPrayers = true; // Home or Masjid only

          Object.values(PRAYER_TYPES).forEach(prayer => {
            const status = dayData[prayer];
            if (status !== undefined && status !== null && status !== '') {
              markedPrayersCount++;
              // Score per status mirrors PRAYER_SCORES but leaderboard uses 27 for both Home/Masjid in masjidMode; otherwise PRAYER_SCORES
              const scoreMap = masjidMode ? {
                [PRAYER_STATUS.NOT_PRAYED]: 0,
                [PRAYER_STATUS.QAZA]: 13,
                [PRAYER_STATUS.HOME]: 27,
                [PRAYER_STATUS.MASJID]: 27,
              } : PRAYER_SCORES;
              dayScore += scoreMap[status];
              if (status === PRAYER_STATUS.NOT_PRAYED || status === PRAYER_STATUS.QAZA) {
                dayHasAllGoodPrayers = false;
              }
            } else {
              allFivePrayersMarked = false;
              dayHasAllGoodPrayers = false;
            }
          });

          // Friday Surah handling for completeness and score
          let fridayComplete = true;
          if (isFridayLocal(dateObj)) {
            if (dayData.hasOwnProperty(SURAH_ALKAHF) && dayData[SURAH_ALKAHF] !== null) {
              const surahStatus = dayData[SURAH_ALKAHF];
              if (surahStatus === '') {
                fridayComplete = false;
              } else if (surahStatus === SURAH_STATUS.RECITED || surahStatus === SURAH_STATUS.MISSED) {
                // Use the same scoring as analytics service / leaderboard
                dayScore += SURAH_SCORES[surahStatus] || 0;
              } else {
                fridayComplete = false;
              }
            } else {
              fridayComplete = false;
            }
          }

          const dayIsComplete = allFivePrayersMarked && (isFridayLocal(dateObj) ? fridayComplete : true);

          // Update streak (only if 5 marked and all are Home/Masjid)
          if (dayHasAllGoodPrayers && markedPrayersCount === 5) {
            currentStreak++;
          } else {
            currentStreak = 0;
          }

          if (dayIsComplete) {
            totalDays++;
            totalScore += dayScore;
            // update breakdown & totals
            Object.values(PRAYER_TYPES).forEach(prayer => {
              const status = dayData[prayer];
              breakdown[status]++;
              totalPrayers++;
            });
            // Track surah counters by calendar (only increment totals when it's Friday and status set)
            if (isFridayLocal(dateObj) && dayData.hasOwnProperty(SURAH_ALKAHF) && dayData[SURAH_ALKAHF] !== '') {
              fridaysTotal++;
              if (dayData[SURAH_ALKAHF] === SURAH_STATUS.RECITED) fridaysRecited++;
            }
          }

          // Derive cumulative metrics up to this date
          const averageScore = totalDays > 0 ? totalScore / totalDays : 0;
          const consistency = totalPrayers > 0 ? ((totalPrayers - breakdown[PRAYER_STATUS.NOT_PRAYED]) / totalPrayers) * 100 : 0;
          const masjidPercentage = totalPrayers > 0 ? (breakdown[PRAYER_STATUS.MASJID] / totalPrayers) * 100 : 0;

          // New Composite formula alignment with Leaderboard
          // 1) Average @45%
          const maxPossibleAverage = 145;
          const avgNorm = Math.min(averageScore / maxPossibleAverage, 1) * 100;
          const avgComp = avgNorm * 0.45;
          // 2) Consistency @20%
          const consComp = (Math.max(0, Math.min(consistency || 0, 100))) * 0.20;
          // 3) Streak @10%
          const streakNorm = Math.min(currentStreak / 30, 1) * 100;
          const streakComp = streakNorm * 0.10;
          // 4) Special (Masjid% or Surah) @10%
          let specialMetric = masjidPercentage || 0;
          if (masjidMode) {
            const surahConsistency = fridaysTotal > 0 ? (fridaysRecited / fridaysTotal) * 100 : null;
            specialMetric = (surahConsistency != null) ? surahConsistency : (consistency || 0);
          }
          specialMetric = Math.max(0, Math.min(specialMetric, 100));
          const specialComp = specialMetric * 0.10;
          // 5) Days Tracked @15% with timeframe-aware cap
          let cap = 60;
          if (timeframe === 'recent') cap = 30;
          else if (timeframe === 'month') cap = new Date(selectedYear, selectedMonth, 0).getDate();
          else if (timeframe === 'year') cap = 60;
          else if (timeframe === 'alltime') cap = 60;
          const daysTrackedNorm = Math.min(totalDays / cap, 1) * 100;
          const daysTrackedComp = daysTrackedNorm * 0.15;

          let composite = avgComp + consComp + streakComp + specialComp + daysTrackedComp;

          series.push({
            date,
            avg: averageScore,
            comp: Math.round(composite * 100) / 100
          });
        });

        setCumulativeTrend(series);
      } else {
        setDailyTrend([]);
        setCumulativeTrend([]);
        setAtAGlance(null);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPrayerStatusIcon = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return <MosqueIcon className="w-5 h-5 shrink-0" strokeWidth={1.85} />;
      case PRAYER_STATUS.HOME:
        return <Home className="w-5 h-5" />;
      case PRAYER_STATUS.QAZA:
        return <Clock className="w-5 h-5" />;
      default:
        return <X className="w-5 h-5" />;
    }
  };

  // Prepare chart data
  const isDark = resolvedTheme === 'dark';

  const sparkLineData = React.useMemo(() => {
    if (!atAGlance?.weekSparkLabels?.length) return null;
    const c = getChartColors(isDark);
    const markers = getLinePointMarkerDatasetStyle(isDark);
    return {
      labels: atAGlance.weekSparkLabels,
      datasets: [
        {
          label: 'Five prayers addressed',
          data: atAGlance.weekSparkValues,
          borderColor: c.accent,
          backgroundColor: c.accentFill,
          fill: true,
          tension: 0.46,
          borderWidth: 2.5,
          pointStyle: 'circle',
          pointRadius: 4,
          pointHoverRadius: 7,
          pointHitRadius: 28,
          ...markers,
        },
      ],
    };
  }, [atAGlance, isDark]);

  const sparkLineOptions = React.useMemo(() => getSparklineOptions(isDark), [isDark]);

  // Trend chart configuration — shared axis rules from chartTheme (mobile: Jan 8 · desktop: d/m/yy)
  const trendLabels = React.useMemo(() => {
    const source = cumulativeTrend.length > 0 ? cumulativeTrend : dailyTrend;
    const style = isSmallScreen ? 'compact' : undefined;
    return source.map((p) => axisLabelForTrendDate(p.date, style));
  }, [cumulativeTrend, dailyTrend, isSmallScreen]);
  // Use leaderboard-style cumulative series when available, otherwise fallback to per-day values
  const trendDataValues = React.useMemo(() => {
    if (cumulativeTrend.length > 0) {
      return trendType === 'average' ? cumulativeTrend.map(p => p.avg) : cumulativeTrend.map(p => p.comp);
    }
    return trendType === 'average' ? dailyTrend.map(p => p.averageScore) : dailyTrend.map(p => p.compositeScore);
  }, [cumulativeTrend, dailyTrend, trendType]);

  // Compute moving average for smoothing
  const movingAverage = (values, windowSize = 7) => {
    const result = [];
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= windowSize) sum -= values[i - windowSize];
      const denom = Math.min(i + 1, windowSize);
      result.push(sum / denom);
    }
    return result;
  };
  const smoothedValues = React.useMemo(() => movingAverage(trendDataValues, trendType === 'average' ? 5 : 7), [trendDataValues, trendType]);
  const chartPalette = getChartColors(isDark);
  const primaryStroke = chartPalette.accent;
  const primaryFill = chartPalette.accentFill;

  // Dynamic Y-axis range based on visible series (smoothed or raw)
  const { dynMin, dynMax } = React.useMemo(() => {
    const vals = (smooth ? smoothedValues : trendDataValues).filter(v => Number.isFinite(v));
    let minOut = trendType === 'average' ? 0 : 0;
    let maxOut = trendType === 'average' ? 145 : 100;
    if (vals.length > 0) {
      const vmin = Math.min(...vals);
      const vmax = Math.max(...vals);
      const span = Math.max(1, vmax - vmin);
      const pad = Math.max(span * 0.12, trendType === 'average' ? 3 : 2);
      let minY = vmin - pad;
      let maxY = vmax + pad;
      if (trendType === 'composite') {
        minY = Math.max(0, minY);
        maxY = Math.min(100, maxY);
        if (maxY - minY < 10) {
          const add = (10 - (maxY - minY)) / 2;
          minY = Math.max(0, minY - add);
          maxY = Math.min(100, maxY + add);
        }
      } else {
        minY = Math.max(0, minY);
        maxY = Math.min(150, maxY);
        if (maxY - minY < 10) {
          const add = (10 - (maxY - minY)) / 2;
          minY = Math.max(0, minY - add);
          maxY = Math.min(150, maxY + add);
        }
      }
      minOut = minY;
      maxOut = maxY;
    }
    return { dynMin: minOut, dynMax: maxOut };
  }, [smooth, smoothedValues, trendDataValues, trendType]);

  const trendData = React.useMemo(() => {
    const pt = getLinePointMarkerDatasetStyle(isDark);
    return {
      labels: trendLabels,
      datasets: [
        {
          label:
            trendType === 'average'
              ? 'Average score (complete days)'
              : 'Composite (ranking-style)',
          data: smooth ? smoothedValues : trendDataValues,
          borderColor: primaryStroke,
          backgroundColor: primaryFill,
          pointStyle: 'circle',
          pointRadius: (ctx) => {
            const len = ctx.dataset.data?.length ?? 0;
            const i = ctx.dataIndex;
            if (len <= 1) return 4.5;
            if (i === len - 1) return 4.5;
            if (len <= 14) return 3;
            return 0;
          },
          pointHoverRadius: 7,
          pointHitRadius: 24,
          pointBackgroundColor: pt.pointBackgroundColor,
          pointBorderColor: pt.pointBorderColor,
          pointBorderWidth: (ctx) => {
            const len = ctx.dataset.data?.length ?? 0;
            const i = ctx.dataIndex;
            if (len <= 0) return 0;
            return i === len - 1 || len <= 14 ? pt.pointBorderWidth : 0;
          },
          pointHoverBackgroundColor: pt.pointHoverBackgroundColor,
          pointHoverBorderColor: pt.pointHoverBorderColor,
          pointHoverBorderWidth: pt.pointHoverBorderWidth,
          fill: true,
          tension: smooth ? 0.46 : 0.34,
          borderWidth: 2.75,
        },
      ],
    };
  }, [
    trendLabels,
    trendType,
    smooth,
    smoothedValues,
    trendDataValues,
    primaryStroke,
    primaryFill,
    isDark,
  ]);

  const zoomConfig = React.useMemo(
    () =>
      zoomReady
        ? {
            zoom: {
              wheel: { enabled: !isSmallScreen, modifierKey: null, speed: 0.05 },
              pinch: { enabled: true, speed: isSmallScreen ? 0.15 : 0.4 },
              mode: 'x',
              drag: { enabled: false },
            },
            pan: {
              enabled: true,
              mode: 'x',
              threshold: isSmallScreen ? 25 : 10,
              speed: isSmallScreen ? 3 : 10,
            },
            limits: {
              x: { min: 'original', max: 'original', minRange: isSmallScreen ? 6 : 3 },
              y: { min: 0 },
            },
          }
        : undefined,
    [zoomReady, isSmallScreen]
  );

  const trendOptions = React.useMemo(() => {
    const base = getLineChartOptions(isDark, {
      yMin: dynMin,
      yMax: dynMax,
      xMaxTicks: isSmallScreen ? 5 : 8,
      zoomConfig,
    });
    return {
      ...base,
      plugins: {
        ...base.plugins,
        tooltip: {
          ...base.plugins.tooltip,
          callbacks: {
            ...base.plugins.tooltip.callbacks,
            label(ctx) {
              const val = ctx.parsed?.y;
              const raw = typeof val === 'number' && Number.isFinite(val) ? val : 0;
              const prefix = trendType === 'average' ? 'Average' : 'Composite';
              const formatted =
                trendType === 'average' ? raw.toFixed(0) : raw.toFixed(2);
              return ` ${prefix}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        ...base.scales,
        x: {
          ...base.scales.x,
          ticks: {
            ...base.scales.x.ticks,
            maxRotation: isSmallScreen ? 32 : 0,
            minRotation: isSmallScreen ? 28 : 0,
            padding: isSmallScreen ? 10 : 6,
          },
        },
      },
    };
  }, [isDark, dynMin, dynMax, isSmallScreen, zoomConfig, trendType]);

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'month':
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'year':
        return `${selectedYear}`;
      case 'recent':
        return 'Last 30 Days';
      case 'alltime':
        return 'All Time';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[40vh] px-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <AnalyticsCard className="w-full max-w-md py-16 flex flex-col items-center gap-5">
          <div
            className="h-10 w-10 rounded-full border-2 border-jj-border/80 border-t-jj-accent dark:border-white/12 dark:border-t-teal-300 animate-spin"
            aria-hidden
          />
          <p className="text-sm font-medium text-jj-muted dark:text-stone-400 tracking-tight">
            Loading…
          </p>
        </AnalyticsCard>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6 sm:space-y-8 px-1">
        <EmptyStateCard
          icon={Calendar}
          title="No analytics yet"
          body="Sign in and log full days to see charts and metrics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-9 lg:space-y-10">
      <div className="flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-wrap gap-1 p-1 rounded-jj-lg bg-jj-mist/75 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            {[
              { key: 'alltime', label: 'All time', shortLabel: 'All' },
              { key: 'recent', label: 'Last 30 days', shortLabel: '30d' },
              { key: 'month', label: 'Month', shortLabel: 'Mo' },
              { key: 'year', label: 'Year', shortLabel: 'Yr' },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setTimeframe(option.key);
                  if (currentUser) {
                    localStorage.setItem(`progress_timeframe_${currentUser.uid}`, option.key);
                  }
                }}
                className={`flex-1 min-w-[4.5rem] sm:flex-none min-h-11 px-3 py-2.5 rounded-jj text-xs sm:text-sm font-semibold transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-mist dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  timeframe === option.key
                    ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-100 shadow-jj-card dark:shadow-none ring-1 ring-black/[0.06] dark:ring-white/[0.1]'
                    : 'text-jj-muted dark:text-stone-400 hover:text-jj-ink dark:hover:text-stone-200'
                }`}
              >
                <span className="sm:hidden">{option.shortLabel}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {timeframe === 'month' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const month = parseInt(e.target.value, 10);
                    setSelectedMonth(month);
                    if (currentUser) {
                      localStorage.setItem(`progress_month_${currentUser.uid}`, month.toString());
                    }
                  }}
                  className="text-sm rounded-jj min-h-11 border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark px-3.5 py-2 text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const year = parseInt(e.target.value, 10);
                    setSelectedYear(year);
                    if (currentUser) {
                      localStorage.setItem(`progress_year_${currentUser.uid}`, year.toString());
                    }
                  }}
                  className="text-sm rounded-jj min-h-11 border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark px-3.5 py-2 text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={2024 + i} value={2024 + i}>
                      {2024 + i}
                    </option>
                  ))}
                </select>
              </>
            )}

            {timeframe === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => {
                  const year = parseInt(e.target.value, 10);
                  setSelectedYear(year);
                  if (currentUser) {
                    localStorage.setItem(`progress_year_${currentUser.uid}`, year.toString());
                  }
                }}
                className="text-sm rounded-jj min-h-11 border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark px-3.5 py-2 text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2024 + i} value={2024 + i}>
                    {2024 + i}
                  </option>
                ))}
              </select>
            )}

            <p className="text-sm text-jj-muted dark:text-stone-400 sm:ml-auto">
              Viewing <span className="font-medium text-jj-ink dark:text-stone-200">{getTimeframeLabel()}</span>
            </p>
          </div>
      </div>

      <>
        {stats.totalDays < 1 && stats.totalPrayers < 1 && (
          <InsightCallout title="Not enough data yet">
            Log at least one full day in this range to see charts and totals.
          </InsightCallout>
        )}

        <AnalyticsSection labelledBy="status-totals-title">
          <SectionHeader
            id="status-totals"
            eyebrow="Snapshot"
            title="Status totals"
            description="Counts and % of prayers on completed days in this range."
          />
          <AnalyticsCard className="p-5 sm:p-7 shadow-sm border-jj-border/80 dark:border-white/10">
            <div
              className={`grid grid-cols-2 gap-3 sm:gap-6 ${
                masjidMode ? 'md:grid-cols-3 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {masjidMode ? (
                <>
                  {/* Home */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: PRAYER_COLORS[PRAYER_STATUS.HOME] }}
                      >
                        {getPrayerStatusIcon(PRAYER_STATUS.HOME)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">Home</h4>
                    <p className="text-2xl font-bold text-gray-900">{stats.prayerBreakdown[PRAYER_STATUS.HOME]}</p>
                    <p className="text-sm text-gray-600">{stats.totalPrayers > 0 ? ((stats.prayerBreakdown[PRAYER_STATUS.HOME] / stats.totalPrayers) * 100).toFixed(1) : 0}%</p>
                  </div>

                  {/* Qaza */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: PRAYER_COLORS[PRAYER_STATUS.QAZA] }}
                      >
                        {getPrayerStatusIcon(PRAYER_STATUS.QAZA)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">Qaza</h4>
                    <p className="text-2xl font-bold text-gray-900">{stats.prayerBreakdown[PRAYER_STATUS.QAZA]}</p>
                    <p className="text-sm text-gray-600">{stats.totalPrayers > 0 ? ((stats.prayerBreakdown[PRAYER_STATUS.QAZA] / stats.totalPrayers) * 100).toFixed(1) : 0}%</p>
                  </div>

                  {/* Not Prayed */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: PRAYER_COLORS[PRAYER_STATUS.NOT_PRAYED] }}
                      >
                        {getPrayerStatusIcon(PRAYER_STATUS.NOT_PRAYED)}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">Not Prayed</h4>
                    <p className="text-2xl font-bold text-gray-900">{stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED]}</p>
                    <p className="text-sm text-gray-600">{stats.totalPrayers > 0 ? ((stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED] / stats.totalPrayers) * 100).toFixed(1) : 0}%</p>
                  </div>
                </>
              ) : (
                // Standard mode: original four tiles
                <>
                  {Object.entries(stats.prayerBreakdown).map(([status, count]) => {
                    const percentage = stats.totalPrayers > 0 ? (count / stats.totalPrayers * 100).toFixed(1) : 0;
                    return (
                      <div key={status} className="text-center">
                        <div className="flex items-center justify-center mb-3">
                          <div 
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: PRAYER_COLORS[status] }}
                          >
                            {getPrayerStatusIcon(status)}
                          </div>
                        </div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {status === PRAYER_STATUS.MASJID ? 'Masjid' :
                           status === PRAYER_STATUS.HOME ? 'Home' :
                           status === PRAYER_STATUS.QAZA ? 'Qaza' : 'Not Prayed'}
                        </h4>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-sm text-gray-600">{percentage}%</p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </AnalyticsCard>
        </AnalyticsSection>

        <ChartCard
          id="spark-week"
          eyebrow="Last 7 days"
          title="Weekly pulse"
          description="Last 7 days: % of the five prayers with a logged status (not &quot;not prayed&quot;)."
          minHeightClass="min-h-[212px] sm:min-h-[236px]"
        >
          {sparkLineData ? (
            <div className="h-[212px] sm:h-[236px] w-full" role="img" aria-label="Seven day prayer completion trend">
              <Line data={sparkLineData} options={sparkLineOptions} />
            </div>
          ) : (
            <EmptyStateCard
              className="border-0 shadow-none bg-transparent py-8"
              icon={Calendar}
              title="Week view needs entries"
              body="Log days this week to see the sparkline."
            />
          )}
        </ChartCard>

        <ChartCard
          id="trajectory-main"
          eyebrow="Selected range"
          title="Trajectory"
          description="Average or composite score over the selected range. Pinch or use zoom controls."
          minHeightClass="min-h-[292px]"
          headerRight={
            <div className="flex flex-wrap gap-1.5 justify-end max-w-full p-1 rounded-jj-lg bg-jj-mist/70 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <button
                type="button"
                className={`min-h-10 px-3.5 py-2 rounded-jj text-xs sm:text-sm font-semibold transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-mist dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  trendType === 'average'
                    ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-100 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
                    : 'text-jj-muted dark:text-stone-400 hover:text-jj-ink dark:hover:text-stone-200'
                }`}
                onClick={() => setTrendType('average')}
              >
                Average
              </button>
              <button
                type="button"
                className={`min-h-10 px-3.5 py-2 rounded-jj text-xs sm:text-sm font-semibold transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-mist dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  trendType === 'composite'
                    ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-100 shadow-sm ring-1 ring-black/[0.06] dark:ring-white/[0.08]'
                    : 'text-jj-muted dark:text-stone-400 hover:text-jj-ink dark:hover:text-stone-200'
                }`}
                onClick={() => setTrendType('composite')}
              >
                Composite
              </button>
              <button
                type="button"
                className={`min-h-10 px-3.5 py-2 rounded-jj text-xs sm:text-sm font-semibold transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-mist dark:focus-visible:ring-offset-jj-surface-dark-2 ${
                  smooth
                    ? 'bg-jj-ink text-white dark:bg-stone-200 dark:text-stone-900'
                    : 'text-jj-muted dark:text-stone-400 hover:text-jj-ink dark:hover:text-stone-200'
                }`}
                onClick={() => setSmooth((s) => !s)}
                title="Toggle smoothing (moving average)"
              >
                Smooth {smooth ? 'on' : 'off'}
              </button>
            </div>
          }
          footer={
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
              <p className="text-[11px] sm:text-xs text-jj-muted dark:text-stone-500 max-w-prose">
                Smooth: 5‑day (average) or 7‑day (composite) moving average. Turn off for raw daily points.
              </p>
              <div className="flex items-center gap-1.5 shrink-0 p-0.5 rounded-jj bg-jj-mist/60 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
                <button
                  type="button"
                  className={`min-h-10 min-w-10 rounded-jj text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent transition-colors ${
                    zoomReady
                      ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-200 shadow-sm dark:shadow-none'
                      : 'text-stone-400 cursor-not-allowed'
                  }`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && typeof chart.zoom === 'function') chart.zoom(0.9);
                    } catch {}
                  }}
                  aria-label="Zoom out chart"
                >
                  −
                </button>
                <button
                  type="button"
                  className={`min-h-10 min-w-10 rounded-jj text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent transition-colors ${
                    zoomReady
                      ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-200 shadow-sm dark:shadow-none'
                      : 'text-stone-400 cursor-not-allowed'
                  }`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && typeof chart.zoom === 'function') chart.zoom(1.1);
                    } catch {}
                  }}
                  aria-label="Zoom in chart"
                >
                  +
                </button>
                <button
                  type="button"
                  className={`min-h-10 px-3 rounded-jj text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent transition-colors ${
                    zoomReady
                      ? 'bg-jj-surface dark:bg-jj-elevated-dark text-jj-ink dark:text-stone-200 shadow-sm dark:shadow-none'
                      : 'text-stone-400 cursor-not-allowed'
                  }`}
                  disabled={!zoomReady}
                  onClick={() => {
                    try {
                      const chart = chartRef.current?.chart || chartRef.current;
                      if (chart && chart.resetZoom) chart.resetZoom();
                      else if (chart && chart.chart && chart.chart.resetZoom) chart.chart.resetZoom();
                    } catch {}
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          }
        >
          {trendDataValues.length > 0 ? (
            <div className="h-[17.5rem] sm:h-[20rem] w-full" role="img" aria-label="Score trajectory chart">
              <Line ref={chartRef} data={trendData} options={trendOptions} />
            </div>
          ) : (
            <EmptyStateCard
              className="border-0 shadow-none bg-transparent py-6"
              icon={Calendar}
              title="No line yet"
              body="Need at least one complete day in this range."
            />
          )}
        </ChartCard>
      </>
    </div>
  );
};

export default Progress;
