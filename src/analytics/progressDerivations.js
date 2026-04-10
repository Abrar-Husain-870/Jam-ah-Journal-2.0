import { PRAYER_TYPES, PRAYER_STATUS } from '../services/prayerService';

/**
 * Count prayer slots marked as anything other than "not prayed" across all days in map.
 */
export function countAddressedPrayerSlots(prayerData) {
  if (!prayerData) return 0;
  let n = 0;
  Object.values(prayerData).forEach((day) => {
    Object.values(PRAYER_TYPES).forEach((key) => {
      const s = day[key];
      if (s !== undefined && s !== null && s !== '' && s !== PRAYER_STATUS.NOT_PRAYED) {
        n++;
      }
    });
  });
  return n;
}

/**
 * For each of the last `n` calendar days ending `endDate`, % of five prayers addressed (not unmarked, not not_prayed).
 * Returns parallel arrays labels (short) and values 0–100.
 */
export function buildLastNDaysSlotCompletionSeries(prayerData, n = 7, endDate = new Date()) {
  const labels = [];
  const values = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    labels.push(
      d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
    );
    const row = prayerData[key];
    if (!row) {
      values.push(0);
      continue;
    }
    let good = 0;
    Object.values(PRAYER_TYPES).forEach((p) => {
      const s = row[p];
      if (s !== undefined && s !== null && s !== '' && s !== PRAYER_STATUS.NOT_PRAYED) {
        good++;
      }
    });
    values.push(Math.round((good / 5) * 100));
  }
  return { labels, values };
}

const PRAYER_LABELS = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

/**
 * From calculatePrayerStats.prayerTypeStats: best & weakest by non–not-prayed share among complete days.
 */
export function deriveSalahAdherenceInsights(prayerTypeStats) {
  if (!prayerTypeStats) return { best: [], weakest: [] };
  const scores = Object.entries(prayerTypeStats).map(([key, row]) => {
    const t = row.total || 0;
    if (t <= 0) return { key, label: PRAYER_LABELS[key] || key, rate: -1 };
    const bad = row[PRAYER_STATUS.NOT_PRAYED] || 0;
    const rate = ((t - bad) / t) * 100;
    return { key, label: PRAYER_LABELS[key] || key, rate };
  });
  const valid = scores.filter((s) => s.rate >= 0).sort((a, b) => b.rate - a.rate);
  if (valid.length === 0) return { best: [], weakest: [] };
  const best = valid.slice(0, 2).filter((s) => s.rate > 0);
  const weakest = valid.slice(-2).reverse().filter((s) => s.rate < 100);
  return { best, weakest };
}

/** Optional copy when weekday vs weekend "not prayed" counts diverge (last-window prayerData). */
export function deriveWeekdayMissInsight(prayerData) {
  if (!prayerData || Object.keys(prayerData).length < 4) return null;
  let wdMiss = 0;
  let weMiss = 0;
  Object.entries(prayerData).forEach(([key, day]) => {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const dow = dt.getDay();
    const isWeekend = dow === 0 || dow === 6;
    let miss = 0;
    Object.values(PRAYER_TYPES).forEach((p) => {
      if (day[p] === PRAYER_STATUS.NOT_PRAYED) miss++;
    });
    if (miss <= 0) return;
    if (isWeekend) weMiss += miss;
    else wdMiss += miss;
  });
  if (wdMiss + weMiss < 2) return null;
  if (wdMiss >= 2 && wdMiss > weMiss * 1.2) {
    return 'More “not prayed” on weekdays than weekends in this window.';
  }
  if (weMiss >= 2 && weMiss > wdMiss * 1.2) {
    return 'More “not prayed” on weekends than weekdays in this window.';
  }
  return null;
}
