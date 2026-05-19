import React from 'react';

export function CrescentIcon({ score, className = 'crescent' }: { score: number; className?: string }) {
  // SVG paths based on the 3 tiers
  let path = '';
  let fill = '#6B6960'; // text-tertiary for faint
  let isBright = false;

  if (score >= 80) {
    path = 'M 11 1 A 10 10 0 0 1 11 21 A 7 10 0 0 0 11 1 Z';
    isBright = true;
  } else if (score >= 60) {
    path = 'M 11 2.5 A 8.5 8.5 0 0 1 11 19.5 A 4.5 8.5 0 0 0 11 2.5 Z';
    fill = '#9A9892'; // text-secondary
  } else {
    path = 'M 11 5 A 6 6 0 0 1 11 17 A 2 6 0 0 0 11 5 Z';
    // faint uses default fill
  }

  return (
    <svg className={className} viewBox="0 0 22 22" fill="none">
      {isBright && (
        <defs>
          <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8D9A3"/>
            <stop offset="100%" stopColor="#C9B98A"/>
          </linearGradient>
        </defs>
      )}
      <circle cx="11" cy="11" r="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
      <path d={path} fill={isBright ? 'url(#bg1)' : fill}/>
    </svg>
  );
}
