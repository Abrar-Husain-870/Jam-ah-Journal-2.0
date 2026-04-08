import React from 'react';

/** Seven-day intensity strip from 0–100 completion percents. */
export function WeekCompletionStrip({ labels, values, className = '' }) {
  if (!values || values.length === 0) return null;
  return (
    <div
      className={`flex gap-1 sm:gap-1.5 w-full ${className}`}
      role="img"
      aria-label="Last seven days prayer slot completion"
    >
      {values.map((v, i) => (
        <div key={i} className="flex-1 min-w-0 flex flex-col items-center gap-1">
          <div
            className="w-full h-2 sm:h-2.5 rounded-full overflow-hidden bg-stone-200/80 dark:bg-white/10"
            title={labels[i] ? `${labels[i]}: ${v}%` : `${v}%`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500 dark:from-teal-600 dark:to-teal-400 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, v))}%` }}
            />
          </div>
          <span className="text-[9px] sm:text-[10px] text-jj-muted dark:text-stone-500 truncate max-w-full text-center">
            {labels[i]?.slice(0, 3) || ''}
          </span>
        </div>
      ))}
    </div>
  );
}
