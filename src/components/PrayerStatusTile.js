import React from 'react';
import { PRAYER_TYPES, PRAYER_COLORS } from '../services/prayerService';

const PrayerStatusTile = ({ date, dayData }) => {
  const prayers = Object.values(PRAYER_TYPES);
  const prayerStatuses = prayers.map((p) => (dayData ? dayData[p] : null));
  const filledPrayers = prayerStatuses.filter(Boolean).length;

  let backgroundStyle = { background: 'transparent' };

  if (filledPrayers > 0) {
    let gradientString = 'conic-gradient(';
    let currentAngle = 0;
    const anglePerPrayer = 360 / prayers.length;

    prayerStatuses.forEach((status, index) => {
      const color = status ? PRAYER_COLORS[status] : 'rgba(120,113,108,0.22)';
      gradientString += `${color} ${currentAngle}deg ${currentAngle + anglePerPrayer}deg`;
      currentAngle += anglePerPrayer;
      if (index < prayers.length - 1) {
        gradientString += ', ';
      }
    });
    gradientString += ')';
    backgroundStyle = { background: gradientString };
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
      <div
        className="jj-hover-tile-scale w-[2.35rem] h-[2.35rem] sm:w-10 sm:h-10 rounded-full flex items-center justify-center transform ring-1 ring-black/[0.06] dark:ring-white/[0.11] shadow-[0_2px_10px_-3px_rgba(41,37,36,0.14)] dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.5)]"
        style={backgroundStyle}
      >
        <div className="w-[1.45rem] h-[1.45rem] sm:w-7 sm:h-7 bg-white dark:bg-jj-surface-dark-2 rounded-full flex items-center justify-center ring-1 ring-black/[0.05] dark:ring-white/[0.09]">
          <span className="text-[10px] sm:text-[11px] font-semibold text-stone-800 dark:text-stone-100 tabular-nums tracking-[-0.02em]">
            {date.getDate()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PrayerStatusTile;
