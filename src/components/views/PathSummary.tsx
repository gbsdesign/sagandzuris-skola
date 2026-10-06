import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChants } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { usesVoices } from '../../utils/pathItems';
import { useAuth, useNavigation } from '../../context';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { ChevronRight, Compass } from 'lucide-react';
import { IndependentWorkCard } from './IndependentWorkCard';
import { MONTHS_GE } from '../../utils/dateNames';


// Card at the top of "საგანძურის გზა": progress on the path, this month's study hours and the independent work
export const PathSummary: React.FC = () => {
  const { selectedChantVariants = {} } = useChants();
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  // this month's independent-work hours (moved here from the independent-work panel)
  const month = useMonthlyStudyStats(user?.uid);
  const s = useMemo(() => {
    const items = Object.values(filterValidVariants(selectedChantVariants));
    let learned = 0, voices = 0, voiceSlots = 0, score = 0;
    for (const it of items) {
      const v = Array.isArray(it.voices) ? it.voices.length : 0;
      if (it.isLearned || v > 0) learned++;
      // chants and songs are learned voice by voice (3 voices); poems and instruments are simply learned or not
      if (usesVoices(it.variantId)) {
        voices += v;
        voiceSlots += 3;
        score += Math.min(v, 3) / 3;
      } else {
        score += it.isLearned ? 1 : 0;
      }
    }
    return { total: items.length, learned, voices, voiceSlots, percent: items.length ? Math.round((100 * score) / items.length) : 0 };
  }, [selectedChantVariants]);

  const hasMonth = !!month && month.planned > 0;
  // the unfolded calendar needs the card's full width
  const [workOpen, setWorkOpen] = useState(false);
  const side = !workOpen;

  // Wide screens: the path's ring fills the left of the divider, the month and the independent work stack
  // on its right (the unfolded calendar takes the full width underneath). Phones stack all three.
  const ringCell = `${side && hasMonth ? 'sm:row-span-2' : ''} ${side || hasMonth ? 'sm:pr-6 sm:border-r sm:border-[#efe5d4]' : ''}`;
  const workCell = `min-w-0 ${side ? `sm:col-start-2 sm:pl-6 ${hasMonth ? 'sm:self-end' : 'sm:self-center'}` : 'sm:col-span-2'}`;

  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_12px_30px_-20px_rgba(42,32,23,0.35)] p-3.5 sm:p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3">
        {s.total ? (
          <Stat
            big
            className={ringCell}
            label="შენი გზა"
            percent={s.percent}
            value={s.learned}
            of={s.total}
            unit="ნასწავლი"
            note={s.voiceSlots > 0 ? `${s.voices}/${s.voiceSlots} ხმა` : `${s.total - s.learned} სასწავლი`}
          />
        ) : (
          <FirstStep className={ringCell} onStart={() => navigateTo('galoba')} />
        )}
        {hasMonth && (
          <Stat
            className="pt-3 border-t border-[#efe5d4] sm:pt-0 sm:border-t-0 sm:pl-6 self-center"
            label={MONTHS_GE[new Date().getMonth()]}
            percent={month!.percent}
            value={month!.worked}
            of={month!.planned}
            unit="სთ"
            note={<>{month!.remaining} სთ დარჩა<span className="hidden sm:inline"> · {month!.missed} გამოტოვებული</span></>}
            done={month!.percent >= 100}
          />
        )}
        <div className={workCell}>
          <IndependentWorkCard flat onOpenChange={setWorkOpen} />
        </div>
      </div>
    </section>
  );
};

// An empty path: one step to take instead of a ring of zeros
const FirstStep: React.FC<{ className?: string; onStart: () => void }> = ({ className = '', onStart }) => (
  <div className={`flex items-center gap-4 sm:gap-5 min-w-0 ${className}`}>
    <span className="relative shrink-0 w-16 h-16 min-[380px]:w-[5.5rem] min-[380px]:h-[5.5rem] sm:w-28 sm:h-28 rounded-full bg-[radial-gradient(circle_at_50%_30%,#ffffff,#f6eee2)] ring-[6px] ring-[#f3e9db] ring-inset flex items-center justify-center text-[#7a2028]">
      <Compass className="w-7 h-7 min-[380px]:w-9 min-[380px]:h-9 sm:w-11 sm:h-11" strokeWidth={1.6} />
    </span>
    <div className="min-w-0 space-y-2">
      <p className="text-[13px] sm:text-sm font-bold text-[#7a2028]">შენი გზა</p>
      <p className="text-sm leading-snug text-[#4a3426]">აქ გამოჩნდება, რას სწავლობ და რამდენი ისწავლე.</p>
      <button
        type="button"
        onClick={onStart}
        className="min-h-11 py-2 pl-4 pr-3 rounded-[22px] bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-sm font-bold leading-snug text-left inline-flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.97] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.7)]"
      >
        აირჩიე პირველი საგალობელი
        <ChevronRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  </div>
);

// Eases a shown number toward its target (from 0 when it first appears): drives the ring's sweep and count-up
const useSweep = (target: number, ms = 1100) => {
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

// 60 bezel ticks around the path's ring (viewBox 0 0 100 100, clockwise from 12 o'clock), every fifth longer
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * 2 * Math.PI, s = Math.sin(a), c = Math.cos(a), r = i % 5 ? 46.5 : 45;
  return { x1: 50 + r * s, y1: 50 - r * c, x2: 50 + 49.5 * s, y2: 50 - 49.5 * c, major: i % 5 === 0 };
});
// the ring's band, 64–86% of the radius; track, glow and arc are all cut to it
const BAND = 'radial-gradient(farthest-side, transparent 63.5%, #000 64.5% 85.5%, transparent 86.5%)';
const BAND_STYLE: React.CSSProperties = { WebkitMaskImage: BAND, maskImage: BAND };

// The path's progress: a coral-to-wine sweep with a soft glow, a knob riding its tip,
// a bezel of ticks that colour as they are passed, and the percent on a convex disc
const PathRing: React.FC<{ percent: number; label: string }> = ({ percent, label }) => {
  const p = useSweep(Math.max(0, Math.min(100, percent)));
  const arc = `conic-gradient(#ef8f6f 0%, #b33a42 ${p * 0.55}%, #6b1a22 ${p}%, transparent ${p}%)`;
  return (
    <div
      role="img"
      aria-label={`${label}: ${percent}%`}
      className="relative shrink-0 w-[5.5rem] h-[5.5rem] sm:w-32 sm:h-32 md:w-36 md:h-36"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" aria-hidden>
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke={i * 6 < p * 3.6 ? '#b33a42' : '#e7dccb'}
            strokeOpacity={i * 6 < p * 3.6 ? 0.75 : 1}
            strokeWidth={t.major ? 1.3 : 0.8}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[#f3e9db]" style={BAND_STYLE} />
      <div className="absolute inset-0 blur-[4px] sm:blur-[7px] opacity-50">
        <div className="w-full h-full" style={{ ...BAND_STYLE, background: arc }} />
      </div>
      <div className="absolute inset-0" style={{ ...BAND_STYLE, background: arc }} />
      {/* rounded start of the arc */}
      {p > 0.5 && (
        <span className="absolute left-1/2 top-[12.5%] w-[10.5%] h-[10.5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ef8f6f]" />
      )}
      {/* the knob rides the arc's tip */}
      <div className="absolute inset-0" style={{ transform: `rotate(${p * 3.6}deg)` }}>
        <span className="absolute left-1/2 top-[12.5%] w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgba(107,26,34,0.12),0_0_10px_rgba(107,26,34,0.35)] flex items-center justify-center">
          <span className="w-[40%] h-[40%] rounded-full bg-[#7a2028]" />
        </span>
      </div>
      <div
        aria-hidden
        className="absolute inset-[21%] rounded-full bg-[radial-gradient(circle_at_50%_30%,#ffffff,#f6eee2)] shadow-[inset_0_1px_4px_rgba(42,32,23,0.12),0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center"
      >
        <span className="flex items-start font-black tabular-nums tracking-tight leading-none">
          <span className="bg-gradient-to-b from-[#3a2a1f] to-[#7a2028] bg-clip-text text-transparent text-xl sm:text-[1.75rem] md:text-[2rem]">
            {Math.round(p)}
          </span>
          <span className="text-[0.6rem] sm:text-xs font-bold text-[#a08a76] ml-px sm:ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
};

// one stat of the card: a ring and the numbers beside it (the path's own ring is the big one)
const Stat: React.FC<{
  label: string;
  percent: number;
  value: number;
  of: number;
  unit: string;
  note: React.ReactNode;
  done?: boolean;
  big?: boolean;
  className?: string;
}> = ({ label, percent, value, of, unit, note, done, big, className = '' }) => {
  const R = 22, C = 2 * Math.PI * R;
  return (
    <div className={`flex items-center ${big ? 'gap-4 sm:gap-5' : 'gap-3'} min-w-0 ${className}`}>
      {big ? (
        <PathRing percent={percent} label={label} />
      ) : (
        <div className="relative w-14 h-14 shrink-0">
          <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
            <circle cx="28" cy="28" r={R} fill="none" stroke="#f1e8da" strokeWidth="5" />
            <circle
              cx="28" cy="28" r={R} fill="none" stroke={done ? '#059669' : '#7a2028'} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(100, percent) / 100)}
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-[#2a2017] tabular-nums">{percent}%</span>
        </div>
      )}
      <div className="min-w-0">
        <p className={`truncate ${big ? 'text-[13px] sm:text-sm font-bold text-[#7a2028]' : 'text-xs font-semibold text-[#8a7a6a]'}`}>{label}</p>
        <p className="leading-tight tabular-nums flex flex-wrap items-baseline gap-x-1">
          <span className={`font-serif-ge font-bold text-[#2a2017] ${big ? 'text-[1.75rem] sm:text-[2rem]' : 'text-xl'}`}>{value}</span>
          <span className="text-sm font-semibold text-[#b3a594]">/ {of}</span>
          <span className={`font-semibold text-[#75685a] ${big ? 'text-xs sm:text-sm' : 'text-xs'}`}>{unit}</span>
        </p>
        <p
          className={`truncate ${
            big
              ? 'mt-1.5 inline-block max-w-full px-2.5 py-0.5 rounded-full bg-[#7a2028]/[0.06] text-[11px] sm:text-xs font-semibold text-[#7a2028]'
              : 'text-[11px] text-[#8a7a6a]'
          }`}
        >
          {note}
        </p>
      </div>
    </div>
  );
};
