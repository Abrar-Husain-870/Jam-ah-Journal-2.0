import React from 'react';

export function InsightCallout({ title, children, variant = 'default', className = '' }) {
  const styles =
    variant === 'accent'
      ? 'ring-1 ring-teal-900/12 dark:ring-teal-400/20 bg-gradient-to-b from-teal-50/55 to-jj-surface/30 dark:from-teal-950/28 dark:to-transparent'
      : 'ring-1 ring-black/[0.05] dark:ring-white/[0.08] bg-jj-mist/35 dark:bg-white/[0.035]';

  return (
    <aside
      className={`rounded-jj-xl px-4 py-4 sm:px-6 sm:py-5 ${styles} ${className}`}
      role="note"
    >
      {title && (
        <p className="text-2xs font-semibold uppercase tracking-cap-wide text-jj-accent dark:text-teal-300/95 mb-2 sm:mb-2.5">
          {title}
        </p>
      )}
      <div className="text-sm text-jj-ink dark:text-stone-200/95 leading-relaxed text-pretty">
        {children}
      </div>
    </aside>
  );
}
