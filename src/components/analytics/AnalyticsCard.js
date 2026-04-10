import React from 'react';

export function AnalyticsCard({ children, className = '', padded = true }) {
  return (
    <div
      className={`jj-card-hover-lift rounded-jj-xl bg-jj-surface dark:bg-jj-surface-dark-2 shadow-jj-card dark:shadow-jj-card-dark ring-1 ring-black/[0.045] dark:ring-white/[0.08] ${
        padded ? 'p-5 sm:p-7' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
