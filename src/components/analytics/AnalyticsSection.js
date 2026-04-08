import React from 'react';

export function AnalyticsSection({ labelledBy, children, className = '' }) {
  return (
    <section
      className={`space-y-6 sm:space-y-8 ${className}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
