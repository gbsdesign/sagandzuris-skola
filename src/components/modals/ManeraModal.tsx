import React, { useRef, useState } from 'react';
import { Lightbulb, Music, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { useChants } from '../../context';

interface ManeraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_VALUES = [0, 25, 50, 75, 100];

// Amber track filled up to the value (via --track) with a white round thumb
const SLIDER_CLASS = [
  'w-full h-6 appearance-none bg-transparent cursor-pointer',
  '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:[background:var(--track)]',
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:w-[22px] [&::-webkit-slider-thumb]:h-[22px] [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-amber-600 [&::-webkit-slider-thumb]:shadow-sm',
  '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:[background:var(--track)]',
  '[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:w-[22px] [&::-moz-range-thumb]:h-[22px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-amber-600',
].join(' ');

// One colour rule for every gauge: <50 red, 50–79 amber, 80+ green
function ringColor(value: number) {
  if (value >= 80) return 'text-emerald-500';
  if (value >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function effStatus(value: number, ratedCount: number) {
  if (ratedCount === 0) return { label: 'ჯერ არ შეგიფასებია', chip: 'bg-slate-100 text-slate-600 border-slate-200' };
  if (value >= 80) return { label: 'ძალიან კარგი', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (value >= 50) return { label: 'კარგი, გააგრძელე', chip: 'bg-amber-50 text-amber-800 border-amber-200' };
  return { label: 'საჭიროებს ვარჯიშს', chip: 'bg-red-50 text-red-700 border-red-200' };
}

function Ring({
  value,
  className,
  onClick,
  children,
}: {
  value: number;
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div onClick={onClick} className={`relative shrink-0 flex items-center justify-center ${className}`}>
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} className="text-amber-100" strokeWidth="6" fill="none" stroke="currentColor" />
        {value > 0 && (
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`${ringColor(value)} transition-[stroke-dashoffset] duration-300`}
            strokeWidth="6"
            fill="none"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="relative flex items-baseline justify-center">{children}</div>
    </div>
  );
}

function ManeraItem({
  num,
  title,
  advice,
  effVal,
  onEffChange,
}: {
  num: string;
  title: string;
  defaultEff: string;
  advice: string;
  effVal: string;
  onEffChange: (val: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // While the slider is being dragged, keep the value local and save once on release
  const [draft, setDraft] = useState<string | null>(null);
  const shownVal = draft ?? effVal;
  const numericVal = Math.min(100, Math.max(0, Number(shownVal) || 0));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || Number(val) <= 100) {
      onEffChange(val);
    }
  };

  const commitDraft = () => {
    if (draft !== null) {
      onEffChange(draft);
      setDraft(null);
    }
  };

  return (
    <div className="bg-white border border-amber-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 shrink-0 rounded-full bg-amber-100 border border-amber-300/70 text-amber-900 text-sm font-black flex items-center justify-center">
          {num}
        </span>
        <h4 className="flex-1 font-extrabold text-amber-950 text-sm sm:text-base leading-snug">{title}</h4>

        <Ring value={numericVal} className="w-16 h-16 cursor-text" onClick={() => inputRef.current?.focus()}>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={shownVal}
            onChange={handleChange}
            placeholder="0"
            aria-label={`${title} — ეფექტურობა პროცენტებში`}
            style={{ width: `${Math.max(1, shownVal.length)}ch` }}
            className="text-center text-base font-black text-slate-900 bg-transparent focus:outline-none p-0 cursor-text placeholder:text-slate-400"
          />
          <span className="text-xs font-black text-amber-800 pointer-events-none">%</span>
        </Ring>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={numericVal}
        onChange={(e) => setDraft(e.target.value)}
        onPointerUp={commitDraft}
        onKeyUp={commitDraft}
        onBlur={commitDraft}
        aria-label={`${title} — ეფექტურობის სლაიდერი`}
        style={{ '--track': `linear-gradient(to right, #d97706 ${numericVal}%, #fef3c7 ${numericVal}%)` } as React.CSSProperties}
        className={SLIDER_CLASS}
      />

      <div className="flex flex-wrap gap-2">
        {QUICK_VALUES.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onEffChange(String(preset))}
            className={`flex-1 min-w-11 h-9 rounded-xl text-xs font-bold border transition-colors cursor-pointer select-none ${
              numericVal === preset
                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
            }`}
          >
            {preset}%
          </button>
        ))}
      </div>

      <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3 sm:p-3.5 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
        <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
          <Lightbulb className="w-4 h-4" />
          რჩევა
        </span>
        {advice}
      </div>
    </div>
  );
}

export const ManeraModal: React.FC<ManeraModalProps> = ({ isOpen, onClose }) => {
  const { maneraStats, saveManeraToFirestore } = useChants();

  if (!isOpen) return null;

  const values = MANERA_ITEMS.map((item) => {
    const rawVal = maneraStats[item.num] !== undefined ? maneraStats[item.num] : item.defaultEff;
    return rawVal === '0' ? '' : rawVal;
  });
  const totalEff =
    values.length > 0
      ? Math.round(values.reduce((acc, val) => acc + (Number(val) || 0), 0) / values.length)
      : 0;
  const ratedCount = values.filter((val) => Number(val) > 0).length;
  const status = effStatus(totalEff, ratedCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-50 rounded-3xl p-4 sm:p-6 shadow-2xl border border-amber-200/90 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
      >
        {/* Header stays visible while scrolling through the items */}
        <div className="sticky -top-4 sm:-top-6 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5 bg-slate-50/95 backdrop-blur-md border-b border-amber-200/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-2xs">
              <Music className="w-[18px] h-[18px] text-[#85502c]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">მანერა</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200 bg-white shadow-2xs"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Definition */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
          <p className="font-bold text-amber-900">განმარტება:</p>
          <p>
            საძირკველი არის ის საფუძველი, რომელზეც დგას პიროვნების შემოქმედება და შესწავლილი პროგრამა. იგი მყარდება და ეფუძნება სწორ სულიერ ჩვევებსა და სულიერ ნიადაგს. ამ ნაწილში მოცემულია სწორი საშემსრულებლო რჩევები და აღნიშნულია მოსწავლის მიერ მათი გამოყენების ეფექტურობა.
          </p>
        </div>

        {/* Overall performance */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-amber-50 via-amber-100/50 to-white border border-amber-200/90 rounded-2xl p-4 shadow-xs">
          <div className="space-y-1 min-w-0">
            <p className="font-bold text-amber-950 text-sm sm:text-base">საერთო ეფექტურობა</p>
            <p className="text-amber-800/80 text-xs font-medium">
              შეფასებულია {ratedCount} / {MANERA_ITEMS.length}
            </p>
            <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${status.chip}`}>
              {status.label}
            </span>
          </div>
          <Ring value={totalEff} className="w-20 h-20 bg-white/80 rounded-full shadow-2xs">
            <span className="font-black text-lg text-amber-950">{totalEff}%</span>
          </Ring>
        </div>

        {MANERA_ITEMS.map((item, idx) => (
          <ManeraItem
            key={item.num}
            {...item}
            effVal={values[idx]}
            onEffChange={(newVal) => {
              const next = { ...maneraStats, [item.num]: newVal };
              saveManeraToFirestore(next);
            }}
          />
        ))}
      </SwipeToDismiss>
    </div>
  );
};
