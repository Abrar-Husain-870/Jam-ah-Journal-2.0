/** Pure date helpers for calendar-aligned analytics windows (local timezone). */

export function formatLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Start of calendar week (Sunday 00:00 local) containing `ref`. */
export function startOfCalendarWeek(ref) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

export function startOfCalendarMonth(ref) {
  return new Date(ref.getFullYear(), ref.getMonth(), 1);
}

export function endOfToday() {
  return new Date();
}
