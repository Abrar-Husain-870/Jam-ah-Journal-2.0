import React from 'react';

export function KPIStatCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasize = false,
  className = '',
}) {
  return (
    <article
      className={`group jj-card-hover-lift rounded-jj-xl px-4 py-4 sm:px-5 sm:py-5 ${
        emphasize
          ? 'bg-gradient-to-b from-teal-50/95 via-white to-white dark:from-teal-950/40 dark:via-jj-surface-dark-2 dark:to-jj-surface-dark-2 shadow-[0_1px_0_rgba(13,109,99,0.1),0_20px_48px_-20px_rgba(13,109,99,0.22)] dark:shadow-[0_1px_0_rgba(94,234,212,0.12),0_24px_56px_-24px_rgba(0,0,0,0.55)] ring-1 ring-teal-900/12 dark:ring-teal-400/15'
          : 'bg-jj-surface dark:bg-jj-surface-dark-2 shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:shadow-jj-card-dark ring-1 ring-black/[0.05] dark:ring-white/[0.07]'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`uppercase leading-tight font-semibold text-jj-muted dark:text-stone-500 ${
              emphasize
                ? 'text-[0.65rem] tracking-[0.14em]'
                : 'text-2xs tracking-cap-wide'
            }`}
          >
            {label}
          </p>
          <p
            className={`font-semibold tabular-nums tracking-[-0.03em] text-jj-ink dark:text-stone-50 mt-2 sm:mt-2.5 leading-none ${
              emphasize
                ? 'text-[1.75rem] sm:text-[2rem] md:text-[2.25rem]'
                : 'text-[1.3125rem] sm:text-[1.5rem]'
            }`}
          >
            {value}
          </p>
          {hint && (
            <p
              className={`text-jj-muted dark:text-stone-500 mt-2 sm:mt-2.5 leading-relaxed max-w-[22rem] ${
                emphasize ? 'text-sm sm:text-[0.9375rem]' : 'text-[0.8125rem]'
              }`}
            >
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`shrink-0 rounded-jj-lg flex items-center justify-center transition-colors duration-jj ${
              emphasize
                ? 'h-11 w-11 bg-white/80 dark:bg-white/[0.07] text-jj-accent dark:text-teal-300 ring-1 ring-teal-900/10 dark:ring-white/[0.12]'
                : 'h-10 w-10 bg-jj-mist/85 dark:bg-white/[0.05] text-jj-accent/90 dark:text-teal-300/90 ring-1 ring-black/[0.05] dark:ring-white/[0.07]'
            }`}
            aria-hidden
          >
            <Icon className={emphasize ? 'w-5 h-5' : 'w-[1.125rem] h-[1.125rem]'} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </article>
  );
}
