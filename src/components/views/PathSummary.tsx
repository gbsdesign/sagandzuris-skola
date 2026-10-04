import React, { useMemo } from 'react';
import { useChants } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { ALL_CHANTS } from '../../data/gelatiBookChants';
import { useAuth } from '../../context';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { IndependentWorkCard } from './IndependentWorkCard';

const MONTH_NAMES_GE = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

const CHANT_IDS = new Set(ALL_CHANTS.flatMap(c => c.variants.map(v => v.id)));
const INSTRUMENTS = ['chonguri', 'fanduri', 'doli', 'garmoni', 'chuniri', 'changi'];

// Chants and songs are learned voice by voice (3 voices); poems and instruments are simply learned or not
const byVoices = (id: string) =>
  CHANT_IDS.has(id) || id.startsWith('tsirva_') || !(id.includes('_p') || INSTRUMENTS.some(p => id.startsWith(p)));

// Compact card at the top of "საგანძურის გზა": progress on the path and this month's study hours, side by side
export const PathSummary: React.FC = () => {
  const { selectedChantVariants = {} } = useChants();
  const { user } = useAuth();
  // this month's independent-work hours (moved here from the independent-work panel)
  const month = useMonthlyStudyStats(user?.uid);
  const s = useMemo(() => {
    const items = Object.values(filterValidVariants(selectedChantVariants));
    let learned = 0, voices = 0, voiceSlots = 0, score = 0;
    for (const it of items) {
      const v = Array.isArray(it.voices) ? it.voices.length : 0;
      if (it.isLearned || v > 0) learned++;
      if (byVoices(it.variantId)) {
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
    <section className="rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_12px_30px_-20px_rgba(42,32,23,0.35)] p-3.5 sm:p-4 space-y-3">
      <div className={`grid ${hasMonth ? 'grid-cols-2 divide-x divide-[#efe5d4]' : 'grid-cols-1'}`}>
        <Stat
          big
          label="შენი გზა"
          percent={s.percent}
          value={s.learned}
          of={s.total}
          unit="ნასწავლი"
          note={s.voiceSlots > 0 ? `${s.voices}/${s.voiceSlots} ხმა` : `${s.total - s.learned} სასწავლი`}
        />
        {hasMonth && (
          <Stat
            className="pl-3 sm:pl-4"
            label={MONTH_NAMES_GE[new Date().getMonth()]}
            percent={month!.percent}
            value={month!.worked}
            of={month!.planned}
            unit="სთ"
            note={<>{month!.remaining} სთ დარჩა<span className="hidden sm:inline"> · {month!.missed} გამოტოვებული</span></>}
            done={month!.percent >= 100}
          />
        )}
      </div>

      {/* independent work sits where the next-lesson strip used to be */}
      <IndependentWorkCard flat />
    </section>
  );
};

// one half of the card: a small ring and the numbers beside it
const Stat: React.FC<{
  label: string;
  percent: number;
  value: number;
  of: number;
  unit: string;
  note: React.ReactNode;
  done?: boolean;
  /** the path's own ring: larger, with a gradient arc and a soft glow */
  big?: boolean;
  className?: string;
}> = ({ label, percent, value, of, unit, note, done, big, className = '' }) => {
  const R = 22, C = 2 * Math.PI * R;
  const grad = `ring-${React.useId().replace(/:/g, '')}`;
  const arc = big && !done ? `url(#${grad})` : done ? '#059669' : '#7a2028';
  return (
    <div className={`flex items-center ${big ? 'gap-3.5 sm:gap-4' : 'gap-3'} min-w-0 ${className}`}>
      <div className={`relative shrink-0 ${big ? 'w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24' : 'w-14 h-14'}`}>
        {big && <div className="absolute inset-2 rounded-full bg-[#7a2028]/10 blur-lg" />}
        <svg viewBox="0 0 56 56" className="relative w-full h-full -rotate-90">
          {big && (
            <defs>
              <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c8574a" />
                <stop offset="100%" stopColor="#6b1a22" />
              </linearGradient>
            </defs>
          )}
          {big && <circle cx="28" cy="28" r="17" fill="#fbf6ec" />}
          <circle cx="28" cy="28" r={R} fill="none" stroke="#f1e8da" strokeWidth={big ? 6 : 5} />
          <circle
            cx="28" cy="28" r={R} fill="none" stroke={arc} strokeWidth={big ? 6 : 5} strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - Math.min(100, percent) / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-black text-[#2a2017] tabular-nums ${big ? 'text-lg sm:text-xl' : 'text-[13px]'}`}>
          {percent}<span className={big ? 'text-xs font-bold text-[#8a7a6a] ml-px' : ''}>%</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className={`font-semibold truncate ${big ? 'text-[13px] text-[#7a2028]' : 'text-xs text-[#8a7a6a]'}`}>{label}</p>
        <p className="leading-tight tabular-nums flex flex-wrap items-baseline gap-x-1">
          <span className={`font-serif-ge font-bold text-[#2a2017] ${big ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{value}</span>
          <span className="text-sm font-semibold text-[#b3a594]">/ {of}</span>
          <span className="text-xs font-semibold text-[#75685a]">{unit}</span>
        </p>
        <p className="text-[11px] text-[#8a7a6a] truncate">{note}</p>
      </div>
    </div>
  );
};
