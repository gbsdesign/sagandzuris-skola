import React, { useEffect, useRef, useState } from 'react';

// Eases a shown number toward its target (from 0 when it first appears): drives the ring's sweep and count-up
export const useSweep = (target: number, ms = 1100) => {
  const [shown, setShown] = useState(0);
  const at = useRef(0);
  useEffect(() => {
    const from = at.current;
    if (from === target) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      at.current = target;
      setShown(target);
      return;
    }
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const k = Math.min(1, (now - t0) / ms);
      at.current = from + (target - from) * (1 - (1 - k) ** 3);
      setShown(at.current);
      if (k < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return shown;
};

// A plain 52px ring with the percent in it (green when done) for the stats of "საგანძურის გზა"
export const PercentRing: React.FC<{ percent: number; label: string; done?: boolean }> = ({ percent, label, done }) => {
  const p = useSweep(Math.max(0, Math.min(100, percent)));
  const R = 23, C = 2 * Math.PI * R;
  return (
    <span role="img" aria-label={`${label}: ${percent}%`} className="relative shrink-0 w-[52px] h-[52px]">
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={R} fill="none" stroke="#f1e8da" strokeWidth="5" />
        {p > 0.5 && (
          <circle
            cx="28" cy="28" r={R} fill="none" stroke={done ? '#059669' : '#7a2028'} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)}
          />
        )}
      </svg>
      <span aria-hidden className="absolute inset-0 flex items-center justify-center font-black tabular-nums leading-none text-[#2a2017] text-[13px]">
        {Math.round(p)}
        <span className="text-[11px] font-bold text-[#a08a76]">%</span>
      </span>
    </span>
  );
};
