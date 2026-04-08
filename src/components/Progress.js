import React, { useState, useEffect, useRef } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  getBarChartOptions,
  getLineChartOptions,
  getChartColors,
  getMutedStatusColors,
  getCountsHorizontalBarOptions,
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
  TrendingUp,
  Target,
  Flame,
  Award,
  Clock,
  Star,
  Home,
  Church,
  X,
  Zap,
  Book
} from 'lucide-react';
import {
  getMonthlyStats,
  getYearlyStats,
  getRecentStats,
  getAllTimeStats,
  getMotivationalInsights,
  getDailyTrend,
  getPrayerDataInRange,
  calculatePrayerStats,
} from '../services/analyticsService';
import { PRAYER_STATUS, PRAYER_COLORS, PRAYER_TYPES, PRAYER_SCORES, SURAH_ALKAHF, SURAH_STATUS, SURAH_SCORES } from '../services/prayerService';
import { useTheme } from '../contexts/ThemeContext';
import {
  AnalyticsCard,
  AnalyticsSection,
  ChartCard,
  EmptyStateCard,
  InsightCallout,
  KPIStatCard,
  SectionHeader,
} from './analytics';
import { startOfCalendarMonth, startOfCalendarWeek } from '../analytics/dateRange';
import {
  buildLastNDaysSlotCompletionSeries,
  countAddressedPrayerSlots,
  deriveSalahAdherenceInsights,
  deriveWeekdayMissInsight,
} from '../analytics/progressDerivations';

const Progress = () => {
  const { currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const [timeframe, setTimeframe] = useState('alltime'); // Default to 'alltime'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
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
      
      console.log('Progress Debug - Loaded stats data:', statsData);
      console.log('Progress Debug - Surah Al-Kahf stats:', statsData.surahAlKahfStats);
      setStats(statsData);
      setInsights(getMotivationalInsights(statsData));

      // Load daily trend (complete days only), calendar-window glance metrics, and build cumulative series
      if (startDate && endDate) {
        const now = new Date();
        const w0 = startOfCalendarWeek(now);
        const m0 = startOfCalendarMonth(now);
        const last7End = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const last7Start = new Date(last7End);
        last7Start.setDate(last7Start.getDate() - 6);
        const prev7End = new Date(last7Start);
        prev7End.setDate(prev7End.getDate() - 1);
        const prev7Start = new Date(prev7End);
        prev7Start.setDate(prev7Start.getDate() - 6);

        const [trend, prayerData, weekMap, monthMap, last7Map, prev7Map] = await Promise.all([
          getDailyTrend(currentUser.uid, startDate, endDate, masjidMode),
          getPrayerDataInRange(currentUser.uid, startDate, endDate),
          getPrayerDataInRange(currentUser.uid, w0, now),
          getPrayerDataInRange(currentUser.uid, m0, now),
          getPrayerDataInRange(currentUser.uid, last7Start, last7End),
          getPrayerDataInRange(currentUser.uid, prev7Start, prev7End),
        ]);

        setDailyTrend(trend);

        const s7 = calculatePrayerStats(last7Map, masjidMode);
        const sPrev7 = calculatePrayerStats(prev7Map, masjidMode);
        const spark = buildLastNDaysSlotCompletionSeries(last7Map, 7, now);
        setAtAGlance({
          weekAddressed: countAddressedPrayerSlots(weekMap),
          monthAddressed: countAddressedPrayerSlots(monthMap),
          consistencyDelta7d: (s7.consistency || 0) - (sPrev7.consistency || 0),
          weekdayMissText: deriveWeekdayMissInsight(last7Map),
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
        return <Church className="w-5 h-5" />;
      case PRAYER_STATUS.HOME:
        return <Home className="w-5 h-5" />;
      case PRAYER_STATUS.QAZA:
        return <Clock className="w-5 h-5" />;
      default:
        return <X className="w-5 h-5" />;
    }
  };

  const getInsightIcon = (type) => {
    const cls = 'w-5 h-5 shrink-0 text-jj-accent dark:text-teal-300 opacity-90';
    switch (type) {
      case 'praise':
        return <Award className={cls} strokeWidth={1.75} />;
      case 'achievement':
        return <Star className={cls} strokeWidth={1.75} />;
      case 'momentum':
        return <Flame className={cls} strokeWidth={1.75} />;
      case 'encouragement':
        return <TrendingUp className={cls} strokeWidth={1.75} />;
      default:
        return <Target className={cls} strokeWidth={1.75} />;
    }
  };

  // Prepare chart data
  const isDark = resolvedTheme === 'dark';
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false;
  const muted = React.useMemo(() => getMutedStatusColors(isDark), [isDark]);

  /** Same breakdown semantics as the former doughnut: completed-day counts by status (+ perfect days row in home mode). */
  const statusBarData = React.useMemo(() => {
    if (!stats) return null;
    if (masjidMode) {
      const labels = ['Perfect Days', 'Prayed', 'Qaza', 'Not Prayed'];
      return {
        labels,
        datasets: [
          {
            label: 'Count',
            data: [
              stats.totalDays,
              stats.prayerBreakdown[PRAYER_STATUS.HOME],
              stats.prayerBreakdown[PRAYER_STATUS.QAZA],
              stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED],
            ],
            backgroundColor: [muted.perfect, muted.home, muted.qaza, muted.notPrayed],
            borderWidth: 0,
          },
        ],
      };
    }
    return {
      labels: ['Masjid', 'Home', 'Qaza', 'Not Prayed'],
      datasets: [
        {
          label: 'Count',
          data: [
            stats.prayerBreakdown[PRAYER_STATUS.MASJID],
            stats.prayerBreakdown[PRAYER_STATUS.HOME],
            stats.prayerBreakdown[PRAYER_STATUS.QAZA],
            stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED],
          ],
          backgroundColor: [muted.masjid, muted.home, muted.qaza, muted.notPrayed],
          borderWidth: 0,
        },
      ],
    };
  }, [stats, masjidMode, muted]);

  const prayerTypeData = React.useMemo(() => {
    if (!stats) return null;
    const labels = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    if (masjidMode) {
      return {
        labels,
        datasets: [
          {
            label: 'Home',
            data: Object.keys(stats.prayerTypeStats).map((prayer) =>
              stats.prayerTypeStats[prayer][PRAYER_STATUS.HOME]
            ),
            backgroundColor: muted.home,
          },
          {
            label: 'Qaza',
            data: Object.keys(stats.prayerTypeStats).map((prayer) =>
              stats.prayerTypeStats[prayer][PRAYER_STATUS.QAZA]
            ),
            backgroundColor: muted.qaza,
          },
          {
            label: 'Not Prayed',
            data: Object.keys(stats.prayerTypeStats).map((prayer) =>
              stats.prayerTypeStats[prayer][PRAYER_STATUS.NOT_PRAYED]
            ),
            backgroundColor: muted.notPrayed,
          },
        ],
      };
    }
    return {
      labels,
      datasets: [
        {
          label: 'Masjid',
          data: Object.keys(stats.prayerTypeStats).map((prayer) =>
            stats.prayerTypeStats[prayer][PRAYER_STATUS.MASJID]
          ),
          backgroundColor: muted.masjid,
        },
        {
          label: 'Home',
          data: Object.keys(stats.prayerTypeStats).map((prayer) =>
            stats.prayerTypeStats[prayer][PRAYER_STATUS.HOME]
          ),
          backgroundColor: muted.home,
        },
        {
          label: 'Qaza',
          data: Object.keys(stats.prayerTypeStats).map((prayer) =>
            stats.prayerTypeStats[prayer][PRAYER_STATUS.QAZA]
          ),
          backgroundColor: muted.qaza,
        },
        {
          label: 'Not Prayed',
          data: Object.keys(stats.prayerTypeStats).map((prayer) =>
            stats.prayerTypeStats[prayer][PRAYER_STATUS.NOT_PRAYED]
          ),
          backgroundColor: muted.notPrayed,
        },
      ],
    };
  }, [stats, masjidMode, muted]);

  const barOptions = React.useMemo(
    () =>
      getBarChartOptions(isDark, {
        stacked: true,
        xTickLimit: isMobile ? 5 : 7,
        isMobile,
      }),
    [isDark, isMobile]
  );

  const statusBarOptions = React.useMemo(() => getCountsHorizontalBarOptions(isDark), [isDark]);

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

  const trendNarrative = React.useMemo(() => {
    const series = smooth ? smoothedValues : trendDataValues;
    if (!series || series.length < 2) return null;
    const first = series[0];
    const last = series[series.length - 1];
    if (!Number.isFinite(first) || !Number.isFinite(last)) return null;
    const delta = last - first;
    const up = delta > 0.5;
    const down = delta < -0.5;
    const label = trendType === 'average' ? 'average day score' : 'composite trajectory';
    if (up) {
      return `Over this window, your ${label} climbed from ${trendType === 'average' ? first.toFixed(0) : first.toFixed(1)} to ${trendType === 'average' ? last.toFixed(0) : last.toFixed(1)}.`;
    }
    if (down) {
      return `Over this window, your ${label} eased from ${trendType === 'average' ? first.toFixed(0) : first.toFixed(1)} toward ${trendType === 'average' ? last.toFixed(0) : last.toFixed(1)}—small resets are part of the path.`;
    }
    return `Your ${label} stayed steady—consistency often matters more than spikes.`;
  }, [smooth, smoothedValues, trendDataValues, trendType]);

  const glanceInsights = React.useMemo(() => {
    if (!stats || !atAGlance) return [];
    const items = [];
    const { best } = deriveSalahAdherenceInsights(stats.prayerTypeStats);
    if (best.length >= 2) {
      items.push({
        key: 'salah',
        title: 'Salah pattern',
        body: `You are steadiest with ${best[0].label} and ${best[1].label} in this view.`,
      });
    } else if (best.length === 1) {
      items.push({
        key: 'salah',
        title: 'Salah pattern',
        body: `You are steadiest with ${best[0].label} in this view.`,
      });
    }
    if (Math.abs(atAGlance.consistencyDelta7d) >= 0.35) {
      const up = atAGlance.consistencyDelta7d > 0;
      items.push({
        key: 'delta',
        title: 'Week over week',
        body: up
          ? `Overall consistency is roughly ${atAGlance.consistencyDelta7d.toFixed(1)} points higher than the prior 7 days.`
          : `Consistency eased about ${Math.abs(atAGlance.consistencyDelta7d).toFixed(1)} points versus the prior week—useful signal, not a verdict.`,
      });
    }
    if (stats.currentStreak >= 3 && stats.bestStreak > 0) {
      items.push({
        key: 'streak',
        title: 'Streak',
        body:
          stats.currentStreak >= stats.bestStreak
            ? `You are on your best run yet (${stats.currentStreak} days)—one careful day at a time.`
            : `Current streak (${stats.currentStreak} days); personal best is ${stats.bestStreak}. The gap closes quietly when the days line up.`,
      });
    }
    return items;
  }, [stats, atAGlance]);

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
            Gathering your insights…
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
          body="Sign in and track a few full days to unlock charts and gentle summaries."
        />
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-9 lg:space-y-10">
      <section className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 shadow-jj dark:shadow-jj-dark ring-1 ring-black/[0.045] dark:ring-white/[0.08] p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="min-w-0">
            <p className="jj-eyebrow">Insights</p>
            <h1 className="text-[1.625rem] sm:text-[1.875rem] font-semibold tracking-[-0.02em] text-jj-ink dark:text-stone-50 mt-2 leading-tight text-balance">
              Clarity for your salāh
            </h1>
            <p className="text-sm sm:text-[0.9375rem] text-jj-muted dark:text-stone-400 mt-3 max-w-xl leading-relaxed text-pretty">
              Analytics built around complete days—calm signal to support return, not performance.
            </p>
          </div>
          <div className="hidden sm:flex h-14 w-14 shrink-0 rounded-jj-lg bg-gradient-to-b from-teal-50 to-white dark:from-teal-950/40 dark:to-jj-surface-dark-2 items-center justify-center ring-1 ring-teal-900/8 dark:ring-teal-800/25">
            <TrendingUp className="w-6 h-6 text-jj-accent dark:text-teal-300" strokeWidth={1.85} />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-5">
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
      </section>

      <>
        <AnalyticsSection labelledBy="progress-kpi-title">
          <SectionHeader
            id="progress-kpi"
            eyebrow="Overview"
            title="At a glance"
            description="A quiet read on rhythm, not a scorecard—every figure respects the same complete-day rules as your journal."
          />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
            <KPIStatCard
              label="Overall consistency"
              value={`${(stats.consistency || 0).toFixed(1)}%`}
              hint="Prayers accounted for on completed days"
              icon={Target}
              emphasize
              className="col-span-2 md:col-span-3"
            />
            <KPIStatCard
              label="Current streak"
              value={stats.currentStreak}
              hint="Days with strong completion in this window"
              icon={Zap}
            />
            <KPIStatCard label="Longest streak" value={stats.bestStreak} hint="Personal best run" icon={Flame} />
            <KPIStatCard
              label="This calendar week"
              value={atAGlance != null ? atAGlance.weekAddressed : '—'}
              hint="Prayer slots addressed (not left unmarked)"
              icon={Calendar}
            />
            <KPIStatCard
              label="Month through today"
              value={atAGlance != null ? atAGlance.monthAddressed : '—'}
              hint="Prayer slots with a logged status"
              icon={Calendar}
            />
            <KPIStatCard
              label="Consistency vs prior week"
              value={
                atAGlance != null
                  ? `${atAGlance.consistencyDelta7d >= 0 ? '+' : ''}${atAGlance.consistencyDelta7d.toFixed(1)} pts`
                  : '—'
              }
              hint="Rolling 7 days vs the 7 before (same metrics as overview)"
              icon={TrendingUp}
              className="col-span-2 md:col-span-1"
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            <KPIStatCard
              label="Completed days"
              value={stats.totalDays}
              hint="Fully logged days in this view"
              icon={Calendar}
            />
            <KPIStatCard
              label={masjidMode ? 'Surah al‑Kahf' : 'Masjid share'}
              value={
                masjidMode
                  ? `${(stats.surahAlKahfStats?.consistency || 0).toFixed(1)}%`
                  : `${(stats.masjidPercentage || 0).toFixed(1)}%`
              }
              hint={masjidMode ? 'Friday rhythm (when tracked)' : 'Of completed prayers in congregation'}
              icon={masjidMode ? Book : Church}
            />
            <KPIStatCard
              label="Average score"
              value={(stats.averageScore || 0).toFixed(2)}
              hint="Per completed day"
              icon={Award}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          {stats.totalDays < 1 && stats.totalPrayers < 1 && (
            <InsightCallout title="Early days">
              Track a few full days to unlock richer charts and calmer insights—empty space is expected when you are just starting.
            </InsightCallout>
          )}

          {(glanceInsights.length > 0 || atAGlance?.weekdayMissText) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {glanceInsights.map((gi) => (
                <InsightCallout key={gi.key} title={gi.title}>
                  {gi.body}
                </InsightCallout>
              ))}
              {atAGlance?.weekdayMissText && (
                <InsightCallout key="weekday-miss" title="Rhythm">
                  {atAGlance.weekdayMissText}
                </InsightCallout>
              )}
            </div>
          )}
        </AnalyticsSection>

        {trendNarrative && trendDataValues.length > 0 && (
          <InsightCallout title="Trajectory read">{trendNarrative}</InsightCallout>
        )}

          {stats.surahAlKahfStats.totalFridays > 0 && (
            <div className="rounded-3xl border border-jj-border/80 dark:border-white/10 bg-jj-surface dark:bg-jj-surface-dark p-5 sm:p-7 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-jj-ink dark:text-stone-100 mb-2 flex items-center gap-2">
                <Book className="w-5 h-5 text-violet-800 dark:text-violet-200" strokeWidth={1.75} />
                Friday · Surah al‑Kahf
              </h3>
              <p className="text-sm text-jj-muted dark:text-stone-500 mb-4 sm:mb-5">
                Tracked only on Fridays you fully completed elsewhere in the journal.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="rounded-2xl p-3 sm:p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Total Fridays</p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.surahAlKahfStats.totalFridays}</p>
                    </div>
                    <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
                  </div>
                </div>
                
                <div className="rounded-2xl p-3 sm:p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Recited</p>
                      <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.surahAlKahfStats.recited}</p>
                    </div>
                    <Book className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
                  </div>
                </div>
                
                <div className="rounded-2xl p-3 sm:p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Missed</p>
                      <p className="text-lg sm:text-2xl font-bold text-red-600">{stats.surahAlKahfStats.missed}</p>
                    </div>
                    <X className="w-4 h-4 sm:w-6 sm:h-6 text-red-500" />
                  </div>
                </div>
                
                <div className="rounded-2xl p-3 sm:p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium">Consistency</p>
                      <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.surahAlKahfStats.consistency.toFixed(1)}%</p>
                    </div>
                    <Target className="w-4 h-4 sm:w-6 sm:h-6 text-purple-500" />
                  </div>
                </div>
              </div>
              
              {/* Surah Al-Kahf Progress Bar */}
              <div className="rounded-2xl p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-jj-ink dark:text-stone-200">Friday completion</span>
                  <span className="text-sm text-gray-600">
                    {stats.surahAlKahfStats.recited} / {stats.surahAlKahfStats.totalFridays} Fridays
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-800">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${stats.surahAlKahfStats.consistency}%` 
                    }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-jj-muted dark:text-stone-500">
                  {stats.surahAlKahfStats.consistency >= 80 ? (
                    <span className="text-emerald-800 dark:text-emerald-200 font-medium">Strong Friday rhythm in this window.</span>
                  ) : stats.surahAlKahfStats.consistency >= 60 ? (
                    <span className="text-jj-ink dark:text-stone-300 font-medium">A workable baseline—protect the next Friday early.</span>
                  ) : (
                    <span className="text-jj-muted dark:text-stone-400 font-medium">If you miss, log it honestly; the line only reflects what you already chose to record.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {insights.length > 0 && (
            <div className="rounded-3xl border border-jj-border/80 dark:border-white/10 bg-jj-surface dark:bg-jj-surface-dark p-5 sm:p-7 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-jj-ink dark:text-stone-100 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-jj-gold dark:text-amber-200" strokeWidth={1.75} />
                Reflections
              </h3>
              <p className="text-sm text-jj-muted dark:text-stone-500 mb-4">
                Short reads based on your completed-day window—companions to the charts, not a grade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {insights.map((insight, index) => (
                  <div key={index} className="rounded-2xl p-4 border border-jj-border/70 dark:border-white/10 bg-white/70 dark:bg-black/25">
                    <div className="flex items-start gap-3">
                      {getInsightIcon(insight.type)}
                      <div>
                        <h4 className="font-semibold text-jj-ink dark:text-stone-100 mb-1">{insight.title}</h4>
                        <p className="text-jj-muted dark:text-stone-400 text-sm leading-relaxed">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        <AnalyticsSection labelledBy="charts-breakdown-title" className="space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            <ChartCard
              id="charts-breakdown"
              eyebrow="Completed days"
              title="Where effort landed"
              description="How complete days distribute across status—horizontal layout, one row per category, easy to scan on a phone."
              minHeightClass="min-h-[232px] sm:min-h-[272px]"
            >
              {statusBarData && stats.totalPrayers > 0 ? (
                <div className="h-[232px] sm:h-[272px] w-full" role="img" aria-label="Prayer status counts bar chart">
                  <Bar data={statusBarData} options={statusBarOptions} />
                </div>
              ) : (
                <EmptyStateCard
                  className="border-0 shadow-none bg-transparent py-8"
                  icon={Calendar}
                  title="No breakdown yet"
                  body="Complete a full day in this range to see how your statuses balance."
                />
              )}
            </ChartCard>

            <ChartCard
              id="charts-per-prayer"
              eyebrow="Adherence"
              title="Prayer-by-prayer pattern"
              description="Fajr through Isha—stacked counts on completed days only, with restrained color so the shape carries the story."
              minHeightClass="min-h-[256px] sm:min-h-[300px]"
            >
              {prayerTypeData && stats.totalPrayers > 0 ? (
                <div className="h-[256px] sm:h-[300px] w-full" role="img" aria-label="Stacked prayer status by salah">
                  <Bar data={prayerTypeData} options={barOptions} />
                </div>
              ) : (
                <EmptyStateCard
                  className="border-0 shadow-none bg-transparent py-8"
                  icon={TrendingUp}
                  title="Pattern unlocks with data"
                  body="Once you log complete days, this view highlights where the five prayers cluster."
                />
              )}
            </ChartCard>
          </div>
        </AnalyticsSection>

        <AnalyticsSection labelledBy="status-totals-title">
          <SectionHeader
            id="status-totals"
            eyebrow="Snapshot"
            title="Status totals"
            description="Percentages sit beside raw counts—both reference only prayers on completed days in this timeframe."
          />
          <AnalyticsCard className="p-5 sm:p-7 shadow-sm border-jj-border/80 dark:border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {masjidMode ? (
                // Home Prayer Mode: show Home, Qaza, Not Prayed, then Surah Al-Kahf last
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

                  {/* Surah Al-Kahf tile (last) */}
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: '#7c3aed' }}
                      >
                        <Book className="w-6 h-6" />
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">Surah Al-Kahf</h4>
                    <p className="text-2xl font-bold text-gray-900">{stats.surahAlKahfStats?.recited || 0}</p>
                    <p className="text-sm text-gray-600">{(stats.surahAlKahfStats?.consistency || 0).toFixed(1)}%</p>
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
          description="Share of the five salāhs with any logged outcome other than not prayed—calendar context around your main range."
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
              body="Log a few days this week to see the gentle seven-day line."
            />
          )}
        </ChartCard>

        <ChartCard
          id="trajectory-main"
          eyebrow="Selected range"
          title="Trajectory"
          description="Your average or composite line across this filter—zoom to inspect busy weeks; smoothing is optional, never the default truth."
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
                Smoothing uses a 5‑day window for averages and 7 for composite—turn it off to read exact daily values.
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
              body="Finish at least one full day in this range to see how your average or composite moves."
            />
          )}
        </ChartCard>
      </>
    </div>
  );
};

export default Progress;
