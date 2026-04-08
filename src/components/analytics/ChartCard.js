import React from 'react';
import { SectionHeader } from './SectionHeader';

export function ChartCard({
  id,
  eyebrow,
  title,
  description,
  headerRight,
  minHeightClass = 'min-h-[200px] sm:min-h-[240px]',
  children,
  footer,
}) {
  return (
    <div className="rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 shadow-jj dark:shadow-jj-dark ring-1 ring-black/[0.04] dark:ring-white/[0.06] overflow-hidden">
      <div className="px-4 pt-5 pb-3.5 sm:px-7 sm:pt-6 sm:pb-4 border-b border-black/[0.04] dark:border-white/[0.06]">
        <SectionHeader
          id={id}
          eyebrow={eyebrow}
          title={title}
          description={description}
          right={headerRight}
        />
      </div>
      <div
        className={`relative px-4 sm:px-8 pt-5 pb-6 sm:pb-7 bg-gradient-to-b from-jj-mist/25 via-jj-surface-2/30 to-jj-surface/50 dark:from-white/[0.03] dark:via-black/[0.08] dark:to-jj-surface-dark/90 ${minHeightClass}`}
      >
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.07] to-transparent"
          aria-hidden
        />
        <div className="relative">{children}</div>
      </div>
      {footer && (
        <div className="px-4 sm:px-7 py-3.5 sm:py-4 border-t border-black/[0.04] dark:border-white/[0.06] text-2xs sm:text-xs text-jj-muted dark:text-stone-500 leading-relaxed bg-jj-mist/25 dark:bg-white/[0.02]">
          {footer}
        </div>
      )}
    </div>
  );
}
