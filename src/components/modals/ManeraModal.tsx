import React from 'react';
import { Music, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { useChants } from '../../context';

interface ManeraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_VALUES = [
  '0',
  '10',
  '20',
  '30',
  '40',
  '50',
  '60',
  '70',
  '75',
  '80',
  '85',
  '90',
  '95',
  '99',
  '100',
];

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
  const numericVal = Math.min(100, Math.max(0, Number(effVal) || 0));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val === '' || Number(val) <= 100) {
      onEffChange(val);
    }
  };

  // Circular Chart Props
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (numericVal / 100) * circumference;

  let colorClass = 'text-emerald-500';
  if (numericVal < 50) colorClass = 'text-red-500';
  else if (numericVal <= 80) colorClass = 'text-amber-500';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-white/95 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs hover:border-amber-300 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-extrabold text-amber-950 text-sm sm:text-base leading-snug flex-1 pr-1">
          {num}. {title}
        </span>

        {/* Responsive, Non-Clipping Circular Gauge */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const inputEl = e.currentTarget.querySelector('input');
            if (inputEl) inputEl.focus();
          }}
          className="relative shrink-0 flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 p-1 bg-amber-50/50 rounded-2xl border border-amber-200/60 shadow-2xs cursor-text"
        >
          <svg className="w-full h-full -rotate-90 drop-shadow-2xs pointer-events-none" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              className="text-amber-100/90"
              strokeWidth="5.5"
              fill="none"
              stroke="currentColor"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              className={colorClass}
              strokeWidth="5.5"
              fill="none"
              stroke="currentColor"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-center justify-center -space-x-0.5">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={effVal}
                onChange={handleChange}
                onClick={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                placeholder="0"
                className="w-8 text-center text-xs sm:text-sm font-black text-slate-900 bg-transparent focus:outline-none p-0 cursor-text"
              />
              <span className="text-[10px] font-black text-amber-800 pointer-events-none">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Percentage Presets */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-amber-900/80">⚡️ სწრაფი არჩევა:</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-15 gap-1">
          {PRESET_VALUES.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEffChange(preset);
              }}
              className={`py-1 px-0.5 rounded-lg text-[10px] font-black border transition-all text-center cursor-pointer select-none ${
                effVal === preset || (effVal === '' && preset === '0')
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs scale-102 ring-1 ring-amber-400/40'
                  : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200/90'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50/80 via-amber-50/40 to-white border border-amber-200/70 rounded-xl p-3 sm:p-3.5 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-2xs">
        <span className="font-extrabold text-amber-900 block mb-1 flex items-center gap-1.5">
          <span>😎</span>
          <span>რჩევა:</span>
          <span>😎</span>
        </span>
        {advice}
      </div>
    </div>
  );
}

export const ManeraModal: React.FC<ManeraModalProps> = ({ isOpen, onClose }) => {
  const { maneraStats, saveManeraToFirestore } = useChants();

  if (!isOpen) return null;

  const totalEff =
    MANERA_ITEMS.length > 0
      ? Math.round(
          MANERA_ITEMS.reduce((acc, curr) => {
            const rawVal =
              maneraStats[curr.num] !== undefined ? maneraStats[curr.num] : curr.defaultEff;
            const val = rawVal === '0' ? '' : rawVal;
            return acc + (Number(val) || 0);
          }, 0) / MANERA_ITEMS.length
        )
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto bg-slate-50/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-amber-200/90 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
      >
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs">
              <Music className="w-4 h-4 text-[#85502c]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              მანერა
            </h3>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-300 shadow-2xs"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-3 pt-1">
            {/* Definition */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-slate-700 space-y-2 mb-4">
              <p className="font-bold text-amber-900">განმარტება:</p>
              <p>
                საძირკველი არის ის საფუძველი, რომელზეც დგას პიროვნების შემოქმედება და შესწავლილი პროგრამა. იგი მყარდება და ეფუძნება სწორ სულიერ ჩვევებსა და სულიერ ნიადაგს. ამ ნაწილში მოცემულია სწორი საშემსრულებლო რჩევები და აღნიშნულია მოსწავლის მიერ მათი გამოყენების ეფექტურობა.
              </p>
            </div>

            {/* Overall Performance Chart (Medium) */}
            <div className="flex items-center justify-between bg-gradient-to-r from-amber-50/90 via-amber-100/50 to-white border border-amber-200/90 rounded-2xl p-4 shadow-xs mb-4 gap-3">
              <div className="space-y-0.5">
                <p className="font-bold text-amber-950 text-sm sm:text-base">საერთო ეფექტურობა</p>
                <p className="text-amber-800/80 text-[11px] sm:text-xs font-medium">საშუალო მაჩვენებელი</p>
              </div>
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0 bg-white/80 p-1 rounded-2xl border border-amber-200/60 shadow-2xs">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" className="text-amber-100/80" strokeWidth="6" fill="none" stroke="currentColor" />
                  <circle
                    cx="40"
                    cy="40"
                    r="30"
                    className={totalEff > 79 ? 'text-emerald-500' : totalEff < 50 ? 'text-red-500' : 'text-amber-500'}
                    strokeWidth="6"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - totalEff / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-black text-lg text-amber-950">{totalEff}%</span>
              </div>
            </div>

            {MANERA_ITEMS.map((item, idx) => {
              const rawVal =
                maneraStats[item.num] !== undefined ? maneraStats[item.num] : item.defaultEff;
              const finalVal = rawVal === '0' ? '' : rawVal;
              return (
                <ManeraItem
                  key={idx}
                  {...item}
                  effVal={finalVal}
                  onEffChange={(newVal) => {
                    const next = { ...maneraStats, [item.num]: newVal };
                    saveManeraToFirestore(next);
                  }}
                />
              );
            })}
          </div>
        </div>
      </SwipeToDismiss>
    </div>
  );
};
