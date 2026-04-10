import React from 'react';

/**
 * Masjid / mosque silhouette (dome + minaret), stroke style aligned with Lucide icons.
 */
export function MosqueIcon({ className = '', strokeWidth = 2, 'aria-hidden': ariaHidden = true }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={ariaHidden}
    >
      {/* Minaret */}
      <path d="M5 21V9" />
      <path d="M4 9h2" />
      <path d="M5 9V7.5L6.5 5h-3L6.5 7.5V9" />
      <path d="M6.5 5V3.5" />
      {/* Hall + dome */}
      <path d="M8 21V13h14v8" />
      <path d="M8 13c0-3.2 2.5-5.5 7-5.5s7 2.3 7 5.5" />
      {/* Arch */}
      <path d="M11 21v-3.5c0-.8.6-1.5 1.5-1.5s1.5.7 1.5 1.5V21" />
    </svg>
  );
}
