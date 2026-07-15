import React, { useState, useEffect, useRef } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  getLineChartOptions,
  getChartColors,
  axisLabelForTrendDate,
  getLinePointMarkerDatasetStyle,
  getBarChartOptions,
} from '../lib/chartTheme';
import { ensureChartsRegistered, ChartJS } from '../lib/registerCharts';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Calendar,
  Clock,
  Home,
  X,
  Target,
  Zap,
  Trophy,
  BarChart3,
  ChevronDown,
  BookOpen
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
import { 
  PRAYER_STATUS, 
  PRAYER_TYPES, 
  PRAYER_SCORES, 
  SURAH_ALKAHF, 
  SURAH_STATUS, 
  SURAH_SCORES,
  getPrayerScores 
} from '../services/prayerService';
import CountUp from './CountUp';
import { useTheme } from '../contexts/ThemeContext';
import { usePercentageMode, MAX_AVERAGE_SCORE } from '../contexts/PercentageModeContext';

import {
  AnalyticsCard,
  ChartCard,
  EmptyStateCard,
  InsightCallout,
  KPIStatCard,
} from './analytics';
import {
  buildLastNDaysSlotCompletionSeries,
} from '../analytics/progressDerivations';

// Process heat map activity data for Heat.js
const processHeatMapData = (prayerData, masjidMode = false) => {
  if (!prayerData) return [];
  
  const data = [];
  const prayerScores = getPrayerScores(masjidMode);
  
  Object.entries(prayerData).forEach(([dateStr, dayData]) => {
    // Correctly parse date from YYYY-MM-DD to avoid timezone shifts
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    
    // Calculate daily score based on prayer statuses
    let dailyScore = 0;
    let completedPrayers = 0;
    let hasAnyPrayer = false;
    
    Object.values(PRAYER_TYPES).forEach(prayer => {
      const status = dayData[prayer];
      if (status !== undefined && status !== null && status !== '') {
        hasAnyPrayer = true;
        completedPrayers++;
        // Use standard scoring from prayerService
        dailyScore += prayerScores[status] || 0;
      }
    });
    
    // Add Surah Al-Kahf score if it's Friday
    if (date.getDay() === 5) { // Friday
      const surahStatus = dayData[SURAH_ALKAHF];
      if (surahStatus && SURAH_SCORES[surahStatus]) {
        dailyScore += SURAH_SCORES[surahStatus];
      }
    }
    
    // Determine activity level (0-10) based on daily score
    // Max possible score is 145 (5 masjid prayers + surah al-kahf)
    let level = 0;
    if (hasAnyPrayer) {
      if (dailyScore > 0) {
        // More granular levels (1-10) based on score
        level = Math.max(1, Math.min(10, Math.ceil((dailyScore / 145) * 10)));
      } else {
        level = 0; // Data exists but score is 0
      }
    }
    
    // Create meaningful trend type based on score
    let trendType = 'No Data';
    if (hasAnyPrayer) {
      if (dailyScore >= 135) trendType = 'Exceptional';
      else if (dailyScore >= 100) trendType = 'Excellent';
      else if (dailyScore >= 60) trendType = 'Good';
      else if (dailyScore >= 30) trendType = 'Fair';
      else if (dailyScore > 0) trendType = 'Partial';
      else trendType = 'Zero Score';
    }
    
    data.push({
      date: date,
      dateStr: dateStr, // Use original string for stable matching
      trendType: trendType,
      value: completedPrayers,
      score: dailyScore,
      level: level,
      hasData: hasAnyPrayer
    });
  });
  
  return data;
};

// Process prayer-wise performance data for bar chart
const processPrayerWisePerformance = (prayerData) => {
  const prayerNames = {
    [PRAYER_TYPES.FAJR]: 'Fajr',
    [PRAYER_TYPES.DHUHR]: 'Dhuhr',
    [PRAYER_TYPES.ASR]: 'Asr',
    [PRAYER_TYPES.MAGHRIB]: 'Maghrib',
    [PRAYER_TYPES.ISHA]: 'Isha'
  };

  const statusCounts = {};
  
  // Initialize counts for each prayer
  Object.values(PRAYER_TYPES).forEach(prayer => {
    statusCounts[prayer] = {
      [PRAYER_STATUS.MASJID]: 0,
      [PRAYER_STATUS.HOME]: 0,
      [PRAYER_STATUS.QAZA]: 0,
      [PRAYER_STATUS.NOT_PRAYED]: 0
    };
  });

  // Count occurrences for each prayer status
  Object.values(prayerData).forEach(dayData => {
    Object.values(PRAYER_TYPES).forEach(prayer => {
      const status = dayData[prayer];
      if (status && statusCounts[prayer][status] !== undefined) {
        statusCounts[prayer][status]++;
      }
    });
  });

  // Transform data for chart
  const labels = Object.values(PRAYER_TYPES).map(prayer => prayerNames[prayer]);
  const datasets = [
    {
      label: 'Masjid',
      data: Object.values(PRAYER_TYPES).map(prayer => statusCounts[prayer][PRAYER_STATUS.MASJID]),
    },
    {
      label: 'Home',
      data: Object.values(PRAYER_TYPES).map(prayer => statusCounts[prayer][PRAYER_STATUS.HOME]),
    },
    {
      label: 'Qaza',
      data: Object.values(PRAYER_TYPES).map(prayer => statusCounts[prayer][PRAYER_STATUS.QAZA]),
    },
    {
      label: 'Not Prayed',
      data: Object.values(PRAYER_TYPES).map(prayer => statusCounts[prayer][PRAYER_STATUS.NOT_PRAYED]),
    }
  ];

  return { labels, datasets };
};

// Custom Heat Map Component (without external dependencies)
const HeatMapComponent = React.memo(({ data, isDark }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [timePeriod, setTimePeriod] = useState(() => {
    return localStorage.getItem('heatmap-default-period') || '3months';
  });

  // Filter data based on selected time period
  const getFilteredData = () => {
    if (data.length === 0) return [];
    
    const now = new Date();
    let startDate = new Date();
    
    switch (timePeriod) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        return data;
      default:
        startDate.setMonth(now.getMonth() - 3);
    }
    
    return data.filter(item => new Date(item.date) >= startDate);
  };

  const handlePeriodChange = (newPeriod) => {
    setTimePeriod(newPeriod);
    localStorage.setItem('heatmap-default-period', newPeriod);
  };

  const filteredData = getFilteredData();

  // Get color based on prayer level (0-10)
  // Higher level = more score = darker green shade
  const getColor = (level) => {
    if (isDark) {
      // In dark mode, we go from a very light green to a solid green
      const darkColors = [
        '#1f2937', // 0: Gray-800
        '#f0fdf4', // 1: Green-50
        '#dcfce7', // 2: Green-100
        '#bbf7d0', // 3: Green-200
        '#86efac', // 4: Green-300
        '#4ade80', // 5: Green-400
        '#22c55e', // 6: Green-500
        '#16a34a', // 7: Green-600
        '#15803d', // 8: Green-700
        '#166534', // 9: Green-800
        '#14532d', // 10: Green-900 (Darkest green)
      ];
      return darkColors[level] || darkColors[0];
    } else {
      // In light mode, we go from a very light green to a deep dark green
      const lightColors = [
        '#f3f4f6', // 0: Gray-100
        '#dcfce7', // 1: Green-100
        '#bbf7d0', // 2: Green-200
        '#86efac', // 3: Green-300
        '#4ade80', // 4: Green-400
        '#22c55e', // 5: Green-500
        '#16a34a', // 6: Green-600
        '#15803d', // 7: Green-700
        '#166534', // 8: Green-800
        '#14532d', // 9: Green-900
        '#064e3b', // 10: Green-950 (Darkest)
      ];
      return lightColors[level] || lightColors[0];
    }
  };

  // Helper to format date consistently for matching
  const formatDateForGrid = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    if (filteredData.length === 0) return [];

    const sortedData = [...filteredData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = new Date(sortedData[0].date);
    const endDate = new Date(sortedData[sortedData.length - 1].date);
    
    const grid = [];
    const currentDate = new Date(startDate);
    
    // Adjust to start on Monday (1) instead of Sunday (0) for proper alignment
    const dayOfWeek = currentDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, so go back 6 days to Monday
    currentDate.setDate(currentDate.getDate() - daysToMonday);
    
    while (currentDate <= endDate || grid.length % 7 !== 0) {
      const dateStr = formatDateForGrid(currentDate);
      const dataItem = sortedData.find(item => 
        (item.dateStr || item.date.toISOString().split('T')[0]) === dateStr
      );
      
      grid.push({
        date: new Date(currentDate),
        dateStr: dateStr,
        data: dataItem,
        isCurrentMonth: currentDate.getMonth() === startDate.getMonth()
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return grid;
  };

  const grid = generateCalendarGrid();
  const weeks = [];
  for (let i = 0; i < grid.length; i += 7) {
    weeks.push(grid.slice(i, i + 7));
  }

  const getTooltipText = (item) => {
    const dateStr = item.date.toLocaleDateString();
    if (!item.data) {
      return `${dateStr}: No data`;
    }
    return `${dateStr}: ${item.data.score} points`;
  };

  return (
    <div className="w-full overflow-x-auto mb-4">
      {/* Time period filter buttons */}
      <div className="flex flex-wrap items-center justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '1month', label: '1 Month' },
            { value: '3months', label: '3 Months' },
            { value: '6months', label: '6 Months' },
            { value: '1year', label: '1 Year' },
            { value: 'all', label: 'All Time' }
          ].map(period => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timePeriod === period.value
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              style={{
                backgroundColor: timePeriod === period.value ? (isDark ? '#10b981' : '#059669') : 'transparent',
              }}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="inline-block">
        {/* Month labels */}
        <div className="flex items-center mb-6">
          <div className="w-12"></div>
          <div className="flex relative w-full h-4">
            {weeks.map((week, weekIndex) => {
              const date = week[0].date;
              const isFirstWeekOfMonth = weekIndex === 0 || 
                (weekIndex > 0 && date.getMonth() !== weeks[weekIndex-1][0].date.getMonth());
              
              // Collision check: Skip the first month label if the next month starts very soon (within 2 weeks)
              if (weekIndex === 0 && weeks.length > 2) {
                const nextMonthWeekIndex = weeks.findIndex((w, i) => i > 0 && w[0].date.getMonth() !== date.getMonth());
                if (nextMonthWeekIndex !== -1 && nextMonthWeekIndex < 3) {
                  return null;
                }
              }
              
              if (isFirstWeekOfMonth) {
                return (
                  <div 
                    key={weekIndex} 
                    className="absolute text-[10px] font-medium text-gray-400 dark:text-gray-500 whitespace-nowrap"
                    style={{ left: `${weekIndex * 16}px` }}
                  >
                    {date.toLocaleDateString('en', { month: 'short', year: weekIndex === 0 || date.getMonth() === 0 ? 'numeric' : undefined })}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
        
        {/* Main heat map grid */}
        <div className="flex items-start">
          {/* Weekday labels */}
          <div className="flex flex-col mr-2">
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1">Mon</div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1"></div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1">Wed</div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1"></div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1">Fri</div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1"></div>
            <div className="text-xs text-gray-500 w-8 h-3 flex items-center justify-end mb-1">Sun</div>
          </div>
          
          {/* Calendar grid */}
          <div className="flex">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col mr-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:scale-110 mb-1"
                    style={{
                      backgroundColor: getColor(day.data?.level || 0),
                    }}
                    title={getTooltipText(day)}
                    onClick={() => setSelectedDate(day)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Less</span>
            <div className="flex space-x-0.5">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                <div
                  key={level}
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: getColor(level) }}
                />
              ))}
            </div>
            <span>More</span>
          </div>
          
          {selectedDate && (
            <div className="text-right">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {selectedDate.date.toLocaleDateString()}: {selectedDate.data ? `${selectedDate.data.score} points` : 'No data'}
              </div>
              <div className="text-gray-500">
                {selectedDate.data ? selectedDate.data.trendType : ''}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Info display */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Prayer Activity</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
              {filteredData.filter(d => d.hasData).length} tracked days
            </span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
              {timePeriod === 'all' ? 'All time' : timePeriod.replace('months', ' months').replace('month', ' month').replace('year', ' year')}
            </span>
          </div>
          {filteredData.length > 0 && (
            <div className="text-gray-500 dark:text-gray-400">
              {filteredData[0].date.toLocaleDateString()} – {filteredData[filteredData.length-1].date.toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const Progress = () => {
  const { currentUser } = useAuth();
  const { resolvedTheme } = useTheme();
  const { formatScore, formatScoreNumber, scoreLabel, percentageMode } = usePercentageMode();

  const [timeframe, setTimeframe] = useState('alltime'); // Default to 'alltime'
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [masjidMode, setMasjidMode] = useState(false);
  const [countUpEnabled, setCountUpEnabled] = useState(true);
  const [trendType, setTrendType] = useState(() => {
    return localStorage.getItem('progress_trend_type') || 'average';
  }); // 'average' | 'composite'
  const [dailyTrend, setDailyTrend] = useState([]);
  const [cumulativeTrend, setCumulativeTrend] = useState([]); // leaderboard-style cumulative series
  const [smooth, setSmooth] = useState(() => {
    return localStorage.getItem('progress_smooth') === 'true';
  }); // moving average smoothing
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

  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setMasjidMode(data.masjidMode || false);
            setCountUpEnabled(data.countUpEnabled !== false);
          }
        } catch (error) {
          console.error('Error fetching user settings:', error);
          setMasjidMode(false);
          setCountUpEnabled(true);
        }
      }
    };
    fetchSettings();
  }, [currentUser]);

  const handleCountUpToggle = async () => {
    try {
      const newEnabled = !countUpEnabled;
      setCountUpEnabled(newEnabled);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          countUpEnabled: newEnabled
        });
      }
    } catch (error) {
      console.error('Error updating count-up setting:', error);
    }
  };

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
        
        // Process prayer-wise performance data for bar chart
        const prayerWiseData = processPrayerWisePerformance(prayerData);
        
        // Process heat map activity data
        const heatMapData = processHeatMapData(prayerData, masjidMode);
        
        setAtAGlance({
          weekSparkLabels: spark.labels,
          weekSparkValues: spark.values,
          prayerWiseData: prayerWiseData,
          heatMapData: heatMapData,
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

  // Prayer-wise performance bar chart data
  const prayerWiseData = React.useMemo(() => {
    if (!atAGlance?.prayerWiseData) return null;
    
    // Custom distinguishable colors within app theme
    const customColors = isDark ? {
      masjid: '#10b981',    // emerald green
      home: '#06b6d4',      // cyan  
      qaza: '#f59e0b',      // amber
      notPrayed: '#ef4444', // red (more distinct)
    } : {
      masjid: '#059669',    // darker emerald
      home: '#0891b2',      // darker cyan
      qaza: '#d97706',      // darker amber
      notPrayed: '#dc2626', // darker red
    };
    
    const datasets = atAGlance.prayerWiseData.datasets.map((dataset, index) => {
      let backgroundColor;
      switch (dataset.label) {
        case 'Masjid':
          backgroundColor = customColors.masjid;
          break;
        case 'Home':
          backgroundColor = customColors.home;
          break;
        case 'Qaza':
          backgroundColor = customColors.qaza;
          break;
        case 'Not Prayed':
          backgroundColor = customColors.notPrayed;
          break;
        default:
          backgroundColor = customColors.home;
      }
      
      return {
        ...dataset,
        backgroundColor,
        borderColor: backgroundColor,
        borderWidth: 0,
      };
    });
    
    return {
      labels: atAGlance.prayerWiseData.labels,
      datasets,
    };
  }, [atAGlance, isDark]);

  const statusBreakdownData = React.useMemo(() => {
    if (!stats?.prayerBreakdown) return null;

    const customColors = isDark
      ? {
          masjid: '#10b981',
          home: '#06b6d4',
          qaza: '#f59e0b',
          notPrayed: '#ef4444',
        }
      : {
          masjid: '#059669',
          home: '#0891b2',
          qaza: '#d97706',
          notPrayed: '#dc2626',
        };

    const labels = ['Masjid', 'Home', 'Qaza', 'Not Prayed'];
    const values = [
      stats.prayerBreakdown[PRAYER_STATUS.MASJID] || 0,
      stats.prayerBreakdown[PRAYER_STATUS.HOME] || 0,
      stats.prayerBreakdown[PRAYER_STATUS.QAZA] || 0,
      stats.prayerBreakdown[PRAYER_STATUS.NOT_PRAYED] || 0,
    ];

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            customColors.masjid,
            customColors.home,
            customColors.qaza,
            customColors.notPrayed,
          ],
          borderColor: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.95)',
          borderWidth: 1,
          hoverOffset: 6,
        },
      ],
    };
  }, [stats, isDark]);

  const statusBreakdownOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || '';
              const value = ctx.parsed ?? 0;
              const total = Array.isArray(ctx.dataset?.data)
                ? ctx.dataset.data.reduce((acc, v) => acc + (Number(v) || 0), 0)
                : 0;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${label}: ${value} (${pct}%)`;
            },
          },
        },
      },
    }),
    []
  );

  // Heat map data processing for Heat.js
  const heatMapData = React.useMemo(() => {
    if (!atAGlance?.heatMapData) return [];
    return atAGlance.heatMapData;
  }, [atAGlance]);

  const prayerWiseOptions = React.useMemo(() => getBarChartOptions(isDark, {
    stacked: false,
    compactLegend: true,
    isMobile: isSmallScreen,
  }), [isDark, isSmallScreen]);

  // Trend chart configuration — shared axis rules from chartTheme (mobile: Jan 8 · desktop: d/m/yy)
  const trendLabels = React.useMemo(() => {
    const source = cumulativeTrend.length > 0 ? cumulativeTrend : dailyTrend;
    const style = isSmallScreen ? 'compact' : undefined;
    return source.map((p) => axisLabelForTrendDate(p.date, style));
  }, [cumulativeTrend, dailyTrend, isSmallScreen]);
  // Use leaderboard-style cumulative series when available, otherwise fallback to per-day values
  const trendDataValues = React.useMemo(() => {
    let vals;
    if (cumulativeTrend.length > 0) {
      vals = trendType === 'average' ? cumulativeTrend.map(p => p.avg) : cumulativeTrend.map(p => p.comp);
    } else {
      vals = trendType === 'average' ? dailyTrend.map(p => p.averageScore) : dailyTrend.map(p => p.compositeScore);
    }
    if (trendType === 'average' && percentageMode) {
      return vals.map(v => (v / MAX_AVERAGE_SCORE) * 100);
    }
    return vals;
  }, [cumulativeTrend, dailyTrend, trendType, percentageMode]);

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
              let formatted;
              if (trendType === 'average' && percentageMode) {
                formatted = `${raw.toFixed(1)}%`;
              } else {
                formatted = trendType === 'average' ? raw.toFixed(0) : raw.toFixed(2);
              }
              return ` ${prefix}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        ...base.scales,
        y: {
          ...base.scales.y,
          ticks: {
            ...base.scales.y.ticks,
            callback: (value) => {
              if (trendType === 'average' && percentageMode) {
                return `${value.toFixed(0)}%`;
              }
              return value;
            },
          },
        },
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
  }, [isDark, dynMin, dynMax, isSmallScreen, zoomConfig, trendType, percentageMode]);

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'month':
        return `${new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case 'year':
        return `${selectedYear}`;
      case 'recent':
        return 'Last 30 Days';
      case 'alltime':
        return '';
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
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => {
                      const month = parseInt(e.target.value, 10);
                      setSelectedMonth(month);
                      if (currentUser) {
                        localStorage.setItem(`progress_month_${currentUser.uid}`, month.toString());
                      }
                    }}
                    className="text-sm rounded-jj min-h-11 border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark pl-3.5 pr-10 py-2 text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-jj-muted dark:text-stone-500 pointer-events-none" strokeWidth={2} />
                </div>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={(e) => {
                      const year = parseInt(e.target.value, 10);
                      setSelectedYear(year);
                      if (currentUser) {
                        localStorage.setItem(`progress_year_${currentUser.uid}`, year.toString());
                      }
                    }}
                    className="text-sm rounded-jj min-h-11 border border-jj-border dark:border-white/12 bg-jj-surface dark:bg-jj-canvas-dark pl-3.5 pr-10 py-2 text-jj-ink dark:text-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={2024 + i} value={2024 + i}>
                        {2024 + i}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-jj-muted dark:text-stone-500 pointer-events-none" strokeWidth={2} />
                </div>
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

            
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPIStatCard
          label="Days Tracked"
          value={stats?.totalTrackedDays || stats?.totalDays || 0}
          icon={Calendar}
          emphasize={true}
        />
        <KPIStatCard
          label="Consistency %"
          value={`${(stats.consistency ?? 0).toFixed(1)}%`}
          icon={Target}
          emphasize={true}
        />
        <KPIStatCard
          label="Current Streak"
          value={stats.currentStreak ?? 0}
          hint="days"
          icon={Zap}
          emphasize={true}
        />
        <KPIStatCard
          label="Best Streak"
          value={stats.bestStreak ?? 0}
          hint="days"
          icon={Trophy}
          emphasize={true}
        />
        <KPIStatCard
          label="Missed Prayers"
          value={`${(
            stats.totalPrayers > 0
              ? ((stats.prayerBreakdown?.[PRAYER_STATUS.NOT_PRAYED] || 0) / stats.totalPrayers) * 100
              : 0
          ).toFixed(1)}%`}
          icon={X}
          emphasize={true}
        />
        <KPIStatCard
          label="Average Score"
          value={formatScore(stats.averageScore ?? 0)}
          icon={BarChart3}
          emphasize={true}
        />
      </div>
      
      {/* Surah Al-Kahf Stats Section */}
      {stats.surahAlKahfStats.totalFridays > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <BookOpen className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-bold text-jj-muted dark:text-stone-500 uppercase tracking-widest">Surah Al-Kahf</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPIStatCard
              label="Recited"
              value={`${stats.surahAlKahfStats.recited}/${stats.surahAlKahfStats.totalFridays}`}
              icon={BookOpen}
              emphasize={true}
            />
            <KPIStatCard
              label="Consistency"
              value={`${(stats.surahAlKahfStats.consistency ?? 0).toFixed(1)}%`}
              icon={Zap}
              emphasize={true}
            />
          </div>
        </div>
      )}

      <>
        {stats.totalDays < 1 && stats.totalPrayers < 1 && (
          <InsightCallout title="Not enough data yet">
            Log at least one full day in this range to see charts and totals.
          </InsightCallout>
        )}

        <ChartCard
          id="prayer-status-breakdown"
          eyebrow="Snapshot"
          title="Prayer Status Breakdown"
          description=""
          minHeightClass="min-h-[320px]"
        >
          {statusBreakdownData && stats.totalPrayers > 0 ? (
            <div className="flex flex-col items-center relative w-full">
              {/* Animation Toggle - Positioned top right of the card content area */}
              <button
                type="button"
                onClick={handleCountUpToggle}
                className={`absolute -top-1 right-0 sm:right-1 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-jj focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent z-20 ${
                  countUpEnabled 
                    ? 'bg-jj-accent/10 text-jj-accent dark:text-teal-300 ring-1 ring-jj-accent/20 shadow-sm' 
                    : 'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-900/50 shadow-sm'
                }`}
                title={countUpEnabled ? 'Disable count-up animation' : 'Enable count-up animation'}
              >
                <Zap className={`w-3.5 h-3.5 ${countUpEnabled ? 'fill-current' : ''}`} />
              </button>

              <div className="h-[320px] w-full max-w-[420px] relative flex items-center justify-center" role="img" aria-label="Prayer status breakdown chart">
                <Doughnut data={statusBreakdownData} options={statusBreakdownOptions} />

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="flex items-baseline gap-0.5 leading-none">
                    <CountUp
                      to={formatScoreNumber(stats.averageScore ?? 0)}
                      from={0}
                      duration={1.5}
                      enabled={countUpEnabled}
                      className="text-4xl font-black text-jj-ink dark:text-stone-100"
                    />
                    {percentageMode && (
                      <span className="text-xl font-black text-jj-ink dark:text-stone-100">%</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-jj-muted dark:text-stone-500 uppercase tracking-widest mt-1">{scoreLabel}</span>
                </div>
              </div>

              <div className="w-full mt-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-1">
                  {(() => {
                    // Same custom colors as prayer-wise performance chart
                    const customColors = isDark ? {
                      masjid: '#10b981',    // emerald green
                      home: '#06b6d4',      // cyan  
                      qaza: '#f59e0b',      // amber
                      notPrayed: '#ef4444', // red (more distinct)
                    } : {
                      masjid: '#059669',    // darker emerald
                      home: '#0891b2',      // darker cyan
                      qaza: '#d97706',      // darker amber
                      notPrayed: '#dc2626', // darker red
                    };

                    const getStatusColor = (status) => {
                      switch (status) {
                        case PRAYER_STATUS.MASJID: return customColors.masjid;
                        case PRAYER_STATUS.HOME: return customColors.home;
                        case PRAYER_STATUS.QAZA: return customColors.qaza;
                        case PRAYER_STATUS.NOT_PRAYED: return customColors.notPrayed;
                        default: return customColors.home;
                      }
                    };

                    // Define the order: masjid, home, qaza, not prayed
                    const statusOrder = [
                      { key: PRAYER_STATUS.MASJID, label: 'Masjid' },
                      { key: PRAYER_STATUS.HOME, label: 'Home' },
                      { key: PRAYER_STATUS.QAZA, label: 'Qaza' },
                      { key: PRAYER_STATUS.NOT_PRAYED, label: 'Not Prayed' }
                    ];

                    const visibleStatuses = masjidMode
                      ? statusOrder.filter(status => status.key !== PRAYER_STATUS.MASJID)
                      : statusOrder;

                    return (
                      <>
                        {visibleStatuses.map((status) => {
                          const count = stats.prayerBreakdown[status.key] || 0;
                          const percentage = stats.totalPrayers > 0 ? (count / stats.totalPrayers * 100).toFixed(1) : 0;
                          return (
                            <div
                              key={status.key}
                              className="flex items-center gap-3 rounded-jj-lg bg-jj-mist/55 dark:bg-white/[0.04] ring-1 ring-black/[0.04] dark:ring-white/[0.06] px-3 py-3"
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: getStatusColor(status.key) }}
                              >
                                {getPrayerStatusIcon(status.key)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-jj-muted dark:text-stone-400 truncate">{status.label}</p>
                                <p className="text-base font-bold text-jj-ink dark:text-stone-100 leading-tight">
                                  {count}
                                  <span className="text-xs font-semibold text-jj-muted dark:text-stone-500"> ({percentage}%)</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <EmptyStateCard
              className="border-0 shadow-none bg-transparent py-8"
              icon={Calendar}
              title="No prayer data"
              body="Log prayers in this range to see the status breakdown chart."
            />
          )}
        </ChartCard>

        <ChartCard
          id="prayer-wise-performance"
          eyebrow={getTimeframeLabel()}
          title="Prayer-wise Performance"
          description={`${getTimeframeLabel()} Count of each prayer status by prayer type.`}
          minHeightClass="min-h-[280px] sm:min-h-[320px]"
        >
          {prayerWiseData ? (
            <div className="h-[280px] sm:h-[320px] w-full" role="img" aria-label="Prayer-wise performance breakdown">
              <Bar data={prayerWiseData} options={prayerWiseOptions} />
            </div>
          ) : (
            <EmptyStateCard
              className="border-0 shadow-none bg-transparent py-8"
              icon={Calendar}
              title="Prayer data needed"
              body={`Log days in this period to see prayer-wise performance.`}
            />
          )}
        </ChartCard>

        <ChartCard
          id="activity-heat-map"
          eyebrow="Consistency"
          title="Activity Heat Map"
          description="Daily prayer completion consistency over the selected timeframe."
          minHeightClass="min-h-[200px] sm:min-h-[220px]"
        >
          {heatMapData.length > 0 ? (
            <HeatMapComponent data={heatMapData} isDark={isDark} />
          ) : (
            <EmptyStateCard
              className="border-0 shadow-none bg-transparent py-8"
              icon={Calendar}
              title="No activity data"
              body="Log prayers to see your consistency heat map."
            />
          )}
        </ChartCard>

        <ChartCard
          id="trajectory-main"
          eyebrow=""
          title="Trajectory"
          description="Average or composite score over the selected range."
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
                onClick={() => {
                  setTrendType('average');
                  localStorage.setItem('progress_trend_type', 'average');
                }}
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
                onClick={() => {
                  setTrendType('composite');
                  localStorage.setItem('progress_trend_type', 'composite');
                }}
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
                onClick={() => {
                  const newSmooth = !smooth;
                  setSmooth(newSmooth);
                  localStorage.setItem('progress_smooth', newSmooth.toString());
                }}
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
                  className={`ml-auto min-h-10 px-3 rounded-jj text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent transition-colors ${
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
