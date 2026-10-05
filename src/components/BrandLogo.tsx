/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BrandLogoProps {
  onDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  onDark = false,
  size = 'md',
  showWordmark = true,
}) => {
  // SVG Canvas scale
  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.25 : 1.0;
  const width = 65 * scale;
  const height = 42 * scale;

  const plusFill = onDark ? '#FFFFFF' : '#1A1A1A';
  const redFill = '#DC2626';

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Pure flat geometry 65 x 42 unit canvas */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 65 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="Hays + Sons H+ Brandmark"
      >
        {/* Red vertical bar: x=0, y=0, width=14, height=42 */}
        <rect x="0" y="0" width="14" height="42" fill={redFill} />
        {/* Plus crossbar: starts exactly at x=14 flush against red bar, width=51, height=14 */}
        <rect x="14" y="14" width="51" height="14" fill={plusFill} />
        {/* Plus stem: x=36, y=0, width=14, height=42 */}
        <rect x="36" y="0" width="14" height="42" fill={plusFill} />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-extrabold tracking-tight ${
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
            } ${onDark ? 'text-white' : 'text-slate-900'}`}
          >
            Hays+Sons
          </span>
          <span
            className={`font-medium tracking-normal mt-1 ${
              size === 'sm' ? 'text-[10px]' : 'text-xs'
            } ${onDark ? 'text-slate-300' : 'text-slate-500'}`}
          >
            Restoration Document Suite
          </span>
        </div>
      )}
    </div>
  );
};
