import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Max possible average score per day.
// Non-Friday: 5 prayers × 27 pts = 135. Friday: +10 for Surah Al-Kahf = 145.
// We use 135 as the base to treat the Friday Surah Al-Kahf 10 pts as a bonus.
export const MAX_AVERAGE_SCORE = 135;

const PercentageModeContext = createContext({
  percentageMode: false,
  setPercentageMode: () => {},
  formatScore: (score) => (score ?? 0).toFixed(2),
  scoreLabel: 'avg score',
});

export function PercentageModeProvider({ children, currentUser }) {
  const [percentageMode, setPercentageModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load setting from Firestore when user is available
  useEffect(() => {
    if (!currentUser) {
      setPercentageModeState(false);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    const fetchSetting = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!cancelled && userDoc.exists()) {
          setPercentageModeState(userDoc.data().percentageMode || false);
        }
      } catch (error) {
        console.error('Error fetching percentageMode setting:', error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };

    fetchSetting();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Persist to Firestore and update local state
  const setPercentageMode = useCallback(async (newValue) => {
    setPercentageModeState(newValue);
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, { percentageMode: newValue });
    } catch (error) {
      console.error('Error saving percentageMode setting:', error);
    }
  }, [currentUser]);

  /**
   * formatScore(rawScore, decimals?)
   * When percentageMode is ON  → returns "72.4%" (percentage of MAX_AVERAGE_SCORE)
   * When percentageMode is OFF → returns "97.50" (raw score, 2 decimal places by default)
   */
  const formatScore = useCallback((rawScore, decimals) => {
    const num = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0;
    if (percentageMode) {
      const pct = (num / MAX_AVERAGE_SCORE) * 100;
      return `${pct.toFixed(decimals ?? 1)}%`;
    }
    return num.toFixed(decimals ?? 2);
  }, [percentageMode]);

  /**
   * formatScoreNumber(rawScore)
   * Returns the numeric value to pass to <CountUp> (no suffix).
   */
  const formatScoreNumber = useCallback((rawScore) => {
    const num = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : 0;
    if (percentageMode) {
      return parseFloat(((num / MAX_AVERAGE_SCORE) * 100).toFixed(1));
    }
    return parseFloat(num.toFixed(1));
  }, [percentageMode]);

  /** Human-readable label suffix for score displays */
  const scoreLabel = percentageMode ? 'avg score %' : 'avg score';

  /** Short label for inline use */
  const scoreLabelShort = percentageMode ? '%' : 'pts';

  const value = {
    percentageMode,
    setPercentageMode,
    formatScore,
    formatScoreNumber,
    scoreLabel,
    scoreLabelShort,
    loaded,
  };

  return (
    <PercentageModeContext.Provider value={value}>
      {children}
    </PercentageModeContext.Provider>
  );
}

export function usePercentageMode() {
  return useContext(PercentageModeContext);
}
