import React from 'react';
import { AnalyticsCard } from './AnalyticsCard';

export function EmptyStateCard({
  icon: Icon,
  title,
  body,
  action,
  className = '',
}) {
  return (
    <AnalyticsCard className={`text-center py-12 sm:py-16 px-5 ${className}`}>
      {Icon && (
        <div className="mx-auto mb-5 h-14 w-14 rounded-jj-lg bg-jj-mist/80 dark:bg-white/[0.05] flex items-center justify-center ring-1 ring-black/[0.05] dark:ring-white/[0.08]">
          <Icon className="w-6 h-6 text-jj-muted dark:text-stone-500" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-[0.9375rem] font-semibold tracking-tight text-jj-ink dark:text-stone-100">
        {title}
      </h3>
      {body && (
        <p className="text-sm text-jj-muted dark:text-stone-400/95 mt-2.5 max-w-[18rem] mx-auto leading-relaxed">
          {body}
        </p>
      )}
      {action && <div className="mt-8 flex justify-center">{action}</div>}
    </AnalyticsCard>
  );
}
