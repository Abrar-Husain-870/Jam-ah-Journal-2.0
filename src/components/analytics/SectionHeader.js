import React from 'react';

export function SectionHeader({
  eyebrow,
  title,
  description,
  id,
  right,
  className = '',
}) {
  const titleId = id ? `${id}-title` : undefined;
  return (
    <header className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="jj-eyebrow">{eyebrow}</p>}
        {title && (
          <h2
            id={titleId}
            className="jj-section-title mt-1.5 sm:mt-2 text-balance"
          >
            {title}
          </h2>
        )}
        {description && (
          <p className="jj-body-quiet mt-2 sm:mt-2.5 max-w-prose text-pretty">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0 w-full sm:w-auto">{right}</div>}
    </header>
  );
}
