import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useChants, useNavigation } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { usesVoices } from '../../utils/pathItems';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { ChevronRight, Compass } from 'lucide-react';
import { IndependentWorkCard } from './IndependentWorkCard';
import { PATH_CARD, PATH_LABEL } from './pathStyle';
import { MONTHS_GE } from '../../utils/dateNames';


// Card at the top of "საგანძურის გზა": the path's progress and this month's study hours as two equal rings
// side by side, the independent work under them
export const PathSummary: React.FC = () => {
  const { selectedChantVariants = {} } = useChants();
  const { user } = useAuth();
  const { navigateTo } = useNavigation();
  // this month's independent-work hours
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

  return (
    <section className={PATH_CARD}>
      {/* side by side from 360px; the narrowest phones stack them */}
      <div className={`grid grid-cols-1 gap-3 sm:gap-5 ${s.total && hasMonth ? 'min-[360px]:grid-cols-2' : ''}`}>
        {s.total ? (
          <Stat
            label="შენი გზა"
            percent={s.percent}
            value={s.learned}
            of={s.total}
            unit="ნასწავლი"
            note={s.voiceSlots > 0 ? `${s.voices}/${s.voiceSlots} ხმა` : `${s.total - s.learned} სასწავლი`}
            done={s.percent >= 100}
          />
        ) : (
          <FirstStep onStart={() => navigateTo('galoba')} />
        )}
        {hasMonth && (
          <Stat
            label={MONTHS_GE[new Date().getMonth()]}
            percent={month!.percent}
            value={month!.worked}
            of={month!.planned}
            unit="სთ"
            note={month!.percent >= 100 ? 'შესრულდა' : `${month!.remaining} სთ დარჩა`}
            done={month!.percent >= 100}
          />
        )}
      </div>
      <div className="mt-3.5 pt-3.5 border-t border-[#efe5d4]">
        <IndependentWorkCard flat />
      </div>
    </section>
  );
};

// An empty path: one step to take instead of a ring of zeros
const FirstStep: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
    <span className="shrink-0 w-[52px] h-[52px] sm:w-16 sm:h-16 rounded-full bg-[#7a2028]/[0.06] flex items-center justify-center text-[#7a2028]">
      <Compass className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.7} />
    </span>
    <div className="min-w-0 space-y-1.5">
      <p className={PATH_LABEL}>შენი გზა</p>
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

// one stat of the card: a plain ring with the percent in it, the numbers beside it (green when done)
const Stat: React.FC<{
  label: string;
  percent: number;
  value: number;
  of: number;
  unit: string;
  note: string;
  done?: boolean;
}> = ({ label, percent, value, of, unit, note, done }) => {
  const p = useSweep(Math.max(0, Math.min(100, percent)));
  const R = 23, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
      <div role="img" aria-label={`${label}: ${percent}%`} className="relative shrink-0 w-[52px] h-[52px] sm:w-16 sm:h-16">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={R} fill="none" stroke="#f1e8da" strokeWidth="5" />
          {p > 0.5 && (
            <circle
              cx="28" cy="28" r={R} fill="none" stroke={done ? '#059669' : '#7a2028'} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - p / 100)}
            />
          )}
        </svg>
        <span aria-hidden className="absolute inset-0 flex items-center justify-center font-black tabular-nums leading-none text-[#2a2017] text-[13px] sm:text-[15px]">
          {Math.round(p)}
          <span className="text-[9px] sm:text-[10px] font-bold text-[#a08a76]">%</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className={PATH_LABEL}>{label}</p>
        <p className="mt-1 leading-none tabular-nums flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
          <span className="text-xl sm:text-2xl font-black text-[#2a2017]">{value}</span>
          <span className="text-sm font-bold text-[#b3a594]">/ {of}</span>
          <span className="text-xs font-semibold text-[#75685a]">{unit}</span>
        </p>
        <p className="mt-1 truncate text-xs text-[#8a7a6a]">{note}</p>
      </div>
    </div>
  );
};
