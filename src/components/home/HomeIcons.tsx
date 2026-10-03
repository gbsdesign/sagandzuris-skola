import React from 'react';

// grape centres in the original 160×28 drawing; the cluster is scaled up around its stem point (80, 11.5)
const GRAPES: [number, number, number][] = [
  [77.6, 14.6, 1.7], [81, 14.6, 1.7],
  [75.9, 17.6, 1.7], [79.3, 17.6, 1.7], [82.7, 17.6, 1.7],
  [77.6, 20.6, 1.7], [81, 20.6, 1.7],
  [79.3, 23.6, 1.6],
];
const CLUSTER_SCALE = 10;

// the one ornament on the page: a thin vine with two leaves and a big grape cluster (echoes the logo)
export const VineOrnament: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 160 152" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path vectorEffect="non-scaling-stroke" d="M6 9h52M102 9h52" />
    <path vectorEffect="non-scaling-stroke" d="M58 9c5 0 8 2.5 12 2.5M102 9c-5 0-8 2.5-12 2.5" />
    <path vectorEffect="non-scaling-stroke" d="M70 11.5c-4.5-1-7.5 1.6-7.5 5 3.6.4 6.6-1.4 7.5-5zM90 11.5c4.5-1 7.5 1.6 7.5 5-3.6.4-6.6-1.4-7.5-5z" fill="currentColor" fillOpacity={0.12} />
    <path vectorEffect="non-scaling-stroke" d="M70 11.5h20M80 11.5V9.2c0-1.6 1.2-2.6 2.6-2.6" />
    <g transform={`translate(80 11.5) scale(${CLUSTER_SCALE}) translate(-80 -11.5)`}>
      <path vectorEffect="non-scaling-stroke" strokeWidth={4} d="M80 11.5c0 .6-.3 1-.7 1.5" />
      {GRAPES.map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="#f8f2e7" strokeWidth={0.12} />
          <circle cx={cx - r * 0.35} cy={cy - r * 0.35} r={r * 0.28} fill="#fff" fillOpacity={0.28} stroke="none" />
        </g>
      ))}
    </g>
  </svg>
);
