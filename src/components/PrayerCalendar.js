import React, { useState, useEffect, useRef, useCallback } from 'react';
import Calendar from 'react-calendar';
import { ChevronLeft, ChevronRight, Church, Home, Clock, X, Book, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query as fsQuery, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  PRAYER_TYPES, 
  PRAYER_STATUS, 
  PRAYER_COLORS,
  SURAH_ALKAHF,
  SURAH_STATUS,
  SURAH_COLORS,
  savePrayerStatus,
  getPrayerStatusForDate,
  calculateDayScore,
  isFriday
} from '../services/prayerService';
import { getPrayerDataInRangeFresh, invalidatePrayerRangeCache } from '../services/analyticsService';
import PrayerStatusTile from './PrayerStatusTile'; // Import the new component
import 'react-calendar/dist/Calendar.css';
import './PrayerCalendar.css'; // Import custom styles
import { useOnlineStatus } from '../contexts/OnlineStatusContext';

const PrayerCalendar = () => {
  const { currentUser } = useAuth();
  const { online } = useOnlineStatus();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const monthChangeTimer = useRef(null);
  const [selectedDayData, setSelectedDayData] = useState({});
  const [masjidMode, setMasjidMode] = useState(false);
  const saveTimersRef = useRef({});
  const persistToastTimerRef = useRef(null);
  const [persistToast, setPersistToast] = useState(null);
  const [outlinedDateStr, setOutlinedDateStr] = useState(null);

  const toDateStr = useCallback((d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, []);
  const cacheKeyForRange = useCallback((uid, start, end) => `pcache_${uid}_${toDateStr(start)}_${toDateStr(end)}`, [toDateStr]);
  const snapshotActiveRef = useRef(false);

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
        }
      }
    };
    fetchMasjidMode();
  }, [currentUser]);

  // Load calendar-range data when user or visible month changes (debounced)
  useEffect(() => {
    if (!currentUser) return;
    if (monthChangeTimer.current) clearTimeout(monthChangeTimer.current);
    monthChangeTimer.current = setTimeout(() => {
      loadMonthData();
    }, 150);
    return () => {
      if (monthChangeTimer.current) clearTimeout(monthChangeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentMonth]);

  // When selectedDate or monthData changes, update the selectedDayData
  useEffect(() => {
    if (selectedDate) {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      setSelectedDayData(monthData[dateStr] || {});
    }
  }, [selectedDate, monthData]);

  const loadMonthData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startOfCalendarView = new Date(firstDayOfMonth);
      startOfCalendarView.setDate(startOfCalendarView.getDate() - firstDayOfMonth.getDay());
      const endOfCalendarView = new Date(lastDayOfMonth);
      endOfCalendarView.setDate(endOfCalendarView.getDate() + (6 - lastDayOfMonth.getDay()));

      // 1) Hydrate immediately from cache for this range (if available)
      try {
        const cacheKey = cacheKeyForRange(currentUser.uid, startOfCalendarView, endOfCalendarView);
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.data) setMonthData(parsed.data);
        }
      } catch {}

      // Single ranged fetch over the visible calendar window (fresh to avoid stale in-memory cache)
      // If a real-time snapshot is active, skip setting from fetch to avoid stale overwrite
      let fetchedData;
      if (!snapshotActiveRef.current) {
        fetchedData = await getPrayerDataInRangeFresh(currentUser.uid, startOfCalendarView, endOfCalendarView);
        setMonthData(fetchedData || {});
      }

      // 2) Write-through cache for this range (only if we actually fetched)
      if (fetchedData) {
        try {
          const cacheKey = cacheKeyForRange(currentUser.uid, startOfCalendarView, endOfCalendarView);
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: fetchedData }));
        } catch {}
      }
    } catch (error) {
      console.error('Error loading month data:', error);
    }
  }, [currentUser, currentMonth, cacheKeyForRange]);

  // Real-time listener for visible range to hydrate instantly from Firestore local cache
  useEffect(() => {
    if (!currentUser) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startOfCalendarView = new Date(firstDayOfMonth);
    startOfCalendarView.setDate(startOfCalendarView.getDate() - firstDayOfMonth.getDay());
    const endOfCalendarView = new Date(lastDayOfMonth);
    endOfCalendarView.setDate(endOfCalendarView.getDate() + (6 - lastDayOfMonth.getDay()));

    const startStr = toDateStr(startOfCalendarView);
    const endStr = toDateStr(endOfCalendarView);
    const prayersRef = collection(db, 'users', currentUser.uid, 'prayers');
    const q = fsQuery(
      prayersRef,
      where('__name__', '>=', startStr),
      where('__name__', '<=', endStr),
      orderBy('__name__')
    );
    const unsub = onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      snapshotActiveRef.current = true;
      const data = {};
      snap.forEach(d => {
        data[d.id] = d.data();
      });
      setMonthData(data);
      // keep cache in sync
      try {
        const cacheKey = cacheKeyForRange(currentUser.uid, startOfCalendarView, endOfCalendarView);
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
      } catch {}
    });
    return () => {
      snapshotActiveRef.current = false;
      unsub();
    };
  }, [currentUser, currentMonth, toDateStr, cacheKeyForRange]);

  useEffect(() => {
    return () => {
      if (persistToastTimerRef.current) {
        clearTimeout(persistToastTimerRef.current);
      }
    };
  }, []);

  const handlePrayerStatusChange = (prayer, rawStatus) => {
    if (!currentUser) return;
    if (!online) return;

    // Normalize 'clear' to null for deletion
    const status = rawStatus === 'clear' ? null : rawStatus;

    // Build updated day data
    const updatedDayData = { ...selectedDayData };
    if (status !== null) {
      updatedDayData[prayer] = status;
    } else {
      delete updatedDayData[prayer];
    }

    // Optimistic UI update
    setSelectedDayData(updatedDayData);
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    setMonthData(prevData => ({
      ...prevData,
      [dateStr]: updatedDayData
    }));

    // Debounced save per date key
    if (saveTimersRef.current[dateStr]) clearTimeout(saveTimersRef.current[dateStr]);
    saveTimersRef.current[dateStr] = setTimeout(async () => {
      try {
        await savePrayerStatus(currentUser.uid, selectedDate, prayer, status);
        // Invalidate cached ranges for this user to avoid stale reads on navigation
        invalidatePrayerRangeCache(currentUser.uid);
        // Re-fetch this date to ensure monthData reflects persisted write (fixes navigation loss)
        const refreshed = await getPrayerStatusForDate(currentUser.uid, selectedDate);
        setMonthData(prev => ({ ...prev, [dateStr]: refreshed || {} }));
        setSelectedDayData(refreshed || {});

        // Update cache for current visible range with the refreshed day
        try {
          const year = currentMonth.getFullYear();
          const month = currentMonth.getMonth();
          const firstDayOfMonth = new Date(year, month, 1);
          const lastDayOfMonth = new Date(year, month + 1, 0);
          const startOfCalendarView = new Date(firstDayOfMonth);
          startOfCalendarView.setDate(startOfCalendarView.getDate() - firstDayOfMonth.getDay());
          const endOfCalendarView = new Date(lastDayOfMonth);
          endOfCalendarView.setDate(endOfCalendarView.getDate() + (6 - lastDayOfMonth.getDay()));
          const cacheKey = cacheKeyForRange(currentUser.uid, startOfCalendarView, endOfCalendarView);
          const existing = localStorage.getItem(cacheKey);
          const base = existing ? JSON.parse(existing).data || {} : {};
          const merged = { ...base, [dateStr]: refreshed || {} };
          localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: merged }));
        } catch {}
        if (persistToastTimerRef.current) clearTimeout(persistToastTimerRef.current);
        setPersistToast('saved');
        persistToastTimerRef.current = setTimeout(() => {
          setPersistToast(null);
          persistToastTimerRef.current = null;
        }, 2000);
      } catch (e) {
        console.error('Error updating prayer status:', e);
        if (persistToastTimerRef.current) clearTimeout(persistToastTimerRef.current);
        setPersistToast('error');
        persistToastTimerRef.current = setTimeout(() => {
          setPersistToast(null);
          persistToastTimerRef.current = null;
        }, 5000);
      }
    }, 200);
  };

  // Refresh monthData when the page regains focus/visibility (fixes cross-route sync)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        loadMonthData();
      }
    };
    const handleFocus = () => {
      if (currentUser) loadMonthData();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentUser, loadMonthData]);

  const getPrayerIcon = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return <Church className="w-4 h-4" />;
      case PRAYER_STATUS.HOME:
        return <Home className="w-4 h-4" />;
      case PRAYER_STATUS.QAZA:
        return <Clock className="w-4 h-4" />;
      case PRAYER_STATUS.NOT_PRAYED:
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case PRAYER_STATUS.MASJID:
        return 'Masjid';
      case PRAYER_STATUS.HOME:
        return masjidMode ? 'Prayed' : 'Home';
      case PRAYER_STATUS.QAZA:
        return 'Qaza';
      case PRAYER_STATUS.NOT_PRAYED:
        return 'Not Prayed';
      default:
        return '';
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const dayData = monthData[dateStr];
      return <PrayerStatusTile date={date} dayData={dayData} />;
    }
    return null;
  };

  const formatPrayerName = (prayer) => {
    return prayer.charAt(0).toUpperCase() + prayer.slice(1);
  };

  return (
    <div className="w-full rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 shadow-jj dark:shadow-jj-dark ring-1 ring-black/[0.045] dark:ring-white/[0.07] overflow-hidden">
      <div className="px-4 sm:px-8 pt-6 sm:pt-9 pb-5 sm:pb-6 border-b border-black/[0.05] dark:border-white/[0.06]">
        <p className="jj-eyebrow text-center">Daily journal</p>
        <h2 className="text-[1.3125rem] sm:text-2xl font-semibold tracking-[-0.022em] text-jj-ink dark:text-stone-50 text-center mt-2.5 text-balance leading-[1.2]">
          Mark today with honesty
        </h2>
        <p className="text-center text-sm text-jj-muted dark:text-stone-400 mt-3 max-w-md mx-auto leading-relaxed text-pretty">
          Tap a day—the ring shows completion at a glance; details stay below.
        </p>
      </div>

      <div className="p-3.5 sm:p-7 bg-gradient-to-b from-jj-mist/25 via-jj-surface-2/20 to-jj-surface/30 dark:from-white/[0.02] dark:via-black/[0.12] dark:to-jj-surface-dark/40">
        <Calendar
          onChange={setSelectedDate}
          onClickDay={(date) => {
            const today = new Date();
            const clickedStr = toDateStr(date);
            const isToday = toDateStr(today) === clickedStr;
            if (isToday) {
              // Clear any existing outline when clicking today
              setOutlinedDateStr(null);
              return;
            }
            setOutlinedDateStr((prev) => (prev === clickedStr ? null : clickedStr));
          }}
          onActiveStartDateChange={({ activeStartDate }) => setCurrentMonth(activeStartDate)}
          value={selectedDate}
          tileContent={tileContent}
          className="w-full border-none"
          tileClassName={({ date, view }) => {
            if (view !== 'month') return null;
            const cls = ['prayer-tile'];
            const today = new Date();
            const dateStr = toDateStr(date);
            if (toDateStr(today) === dateStr) {
              cls.push('tile-today');
            } else if (outlinedDateStr === dateStr) {
              cls.push('tile-outline');
            }
            return cls.join(' ');
          }}
          navigationLabel={({ date }) => (
            <span className="text-[0.9375rem] font-semibold tracking-tight text-jj-ink dark:text-stone-100">
              {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
          )}
          prevLabel={<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-jj-muted dark:text-stone-400" strokeWidth={2} />}
          nextLabel={<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-jj-muted dark:text-stone-400" strokeWidth={2} />}
        />
      </div>

      <div className="border-t border-black/[0.05] dark:border-white/[0.06] bg-jj-mist/40 dark:bg-jj-canvas-dark/95 p-4 sm:p-8">
        <h3 className="font-semibold text-jj-ink dark:text-stone-100 mb-4 sm:mb-5 text-[0.9375rem] sm:text-base tracking-tight">
          {selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        {(persistToast === 'saved' || persistToast === 'error') && (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm -mt-2 mb-4 sm:mb-5 font-medium transition-opacity duration-200 ${
              persistToast === 'saved'
                ? 'text-teal-700 dark:text-teal-300'
                : 'text-red-800/90 dark:text-red-300/95'
            }`}
          >
            {persistToast === 'saved'
              ? 'Saved to your journal.'
              : 'Couldn’t save. Check your connection and try again.'}
          </p>
        )}
        
        <div className="space-y-2.5 sm:space-y-3">
          {Object.values(PRAYER_TYPES).map(prayer => {
            const status = selectedDayData ? selectedDayData[prayer] : undefined;
            
            return (
              <div key={prayer} className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-jj-xl bg-jj-surface dark:bg-jj-elevated-dark ring-1 ring-black/[0.05] dark:ring-white/[0.07] shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:shadow-none transition-[box-shadow,ring-color] duration-jj hover:ring-black/[0.07] dark:hover:ring-white/[0.1]">
                <div className="flex items-center gap-3 min-w-0">
                  {status ? (
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-black/[0.06] dark:ring-white/10"
                      style={{ backgroundColor: PRAYER_COLORS[status] }}
                    />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-stone-300 dark:border-stone-600 bg-transparent" />
                  )}
                  <span className="font-semibold text-[0.9375rem] text-jj-ink dark:text-stone-100 truncate">
                    {formatPrayerName(prayer)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-jj-muted dark:text-stone-400 flex items-center gap-1.5 tabular-nums">
                    {status ? (
                      <>
                        {getPrayerIcon(status)}
                        {getStatusLabel(status)}
                      </>
                    ) : (
                      <span className="text-stone-400 dark:text-stone-500">Pending</span>
                    )}
                  </span>
                  
                  {!online && (
                    <span title="Offline: view-only" className="text-gray-400 dark:text-gray-500">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <select
                    value={status || ""}
                    onChange={(e) => handlePrayerStatusChange(prayer, e.target.value)}
                    disabled={!online}
                    className={`text-sm rounded-jj min-h-11 px-3 py-2 min-w-[8.5rem] sm:min-w-[9.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-jj-accent focus-visible:ring-offset-2 focus-visible:ring-offset-jj-surface dark:focus-visible:ring-offset-jj-elevated-dark bg-jj-surface dark:bg-jj-surface-dark-2 text-jj-ink dark:text-stone-100 font-medium ${
                      !online
                        ? 'border border-stone-200 dark:border-white/10 opacity-55 cursor-not-allowed'
                        : 'border border-jj-border dark:border-white/12'
                    }`}
                  >
                    <option value="">-- Select --</option>
                    <option value="clear">Clear</option>
                    <option value={PRAYER_STATUS.NOT_PRAYED}>Not Prayed</option>
                    <option value={PRAYER_STATUS.QAZA}>Qaza</option>
                    {!masjidMode && <option value={PRAYER_STATUS.HOME}>Home</option>}
                    {!masjidMode && <option value={PRAYER_STATUS.MASJID}>Masjid</option>}
                    {masjidMode && <option value={PRAYER_STATUS.HOME}>Prayed</option>}
                  </select>
                </div>
              </div>
            );
          })}
          
          {isFriday(selectedDate) && (
            <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-jj-xl ring-1 ring-violet-200/45 dark:ring-violet-500/20 bg-jj-surface dark:bg-jj-elevated-dark shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:shadow-none">
              <div className="flex items-center gap-3">
                {selectedDayData && selectedDayData[SURAH_ALKAHF] ? (
                  <div 
                    className="w-3 h-3 flex items-center justify-center"
                    style={{ color: SURAH_COLORS[selectedDayData[SURAH_ALKAHF]] }}
                  >
                    <Book className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-3 h-3 flex items-center justify-center border-2 border-gray-300 rounded">
                    <Book className="w-2 h-2 text-gray-300" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="font-semibold text-jj-ink dark:text-stone-100">Surah Al-Kahf</span>
                  <div className="text-2xs text-violet-700 dark:text-violet-300/90 font-semibold mt-0.5 uppercase tracking-cap">
                    Friday · 10 pts
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-jj-muted dark:text-stone-400 flex items-center gap-1.5">
                  {selectedDayData && selectedDayData[SURAH_ALKAHF] ? (
                    <>
                      <Book className="w-4 h-4" strokeWidth={1.85} />
                      {selectedDayData[SURAH_ALKAHF] === SURAH_STATUS.RECITED ? 'Recited' : 'Missed'}
                    </>
                  ) : (
                    <span className="text-stone-400 dark:text-stone-500">Pending</span>
                  )}
                </span>
                
                {!online && (
                  <span title="Offline: view-only" className="text-gray-400 dark:text-gray-500">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}

                <select
                  value={(selectedDayData && selectedDayData[SURAH_ALKAHF]) || ""}
                  onChange={(e) => handlePrayerStatusChange(SURAH_ALKAHF, e.target.value)}
                  disabled={!online}
                  className={`text-sm rounded-jj min-h-11 px-3 py-2 min-w-[8.5rem] sm:min-w-[9.5rem] focus:outline-none focus-visible:ring-2 bg-jj-surface dark:bg-jj-surface-dark-2 text-jj-ink dark:text-stone-100 font-medium ${
                    !online
                      ? 'border border-stone-200 dark:border-white/10 opacity-55 cursor-not-allowed'
                      : 'border border-violet-300/55 dark:border-violet-500/25 focus-visible:ring-violet-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-jj-surface dark:focus-visible:ring-offset-jj-elevated-dark'
                  }`}
                >
                  <option value="">-- Select --</option>
                  <option value="clear">Clear</option>
                  <option value={SURAH_STATUS.RECITED}>Recited</option>
                  <option value={SURAH_STATUS.MISSED}>Missed</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 sm:mt-6 p-4 sm:p-5 rounded-jj-xl bg-jj-surface dark:bg-jj-elevated-dark ring-1 ring-black/[0.05] dark:ring-white/[0.08]">
          <div className="flex justify-between items-center gap-3">
            <span className="text-sm font-semibold text-jj-ink dark:text-stone-200">Daily score</span>
            <span className="text-base font-semibold tabular-nums tracking-tight text-jj-accent dark:text-teal-300">
              {(() => {
                const dayScore = calculateDayScore(selectedDayData, selectedDate, masjidMode);
                const maxScore = isFriday(selectedDate) ? 145 : 135;
                return dayScore !== null ? `${dayScore} / ${maxScore}` : 'Not tracked';
              })()}
            </span>
          </div>
          {isFriday(selectedDate) && (
            <div className="text-2xs text-violet-700/90 dark:text-violet-300/85 mt-2 font-medium flex items-center gap-1.5 uppercase tracking-cap">
              <Book className="w-3.5 h-3.5" strokeWidth={1.85} />
              Includes Surah al-Kahf (+10)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayerCalendar;
