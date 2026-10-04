import React, { useState } from 'react';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { useChants } from '../../context';

const QUICK_VALUES = [0, 25, 50, 75, 100];

// One colour rule for every percentage: <50 red, 50–79 amber, 80+ green
export const maneraTone = (v: number) =>
  v >= 80 ? { ring: '#059669', text: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' }
  : v >= 50 ? { ring: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' }
  : { ring: '#e11d48', text: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' };

/** Each item's value as saved (or its default), and the average shown on the folded card. */
export const useManera = () => {
  const { maneraStats, saveManeraToFirestore } = useChants();
  const values = MANERA_ITEMS.map(item => {
    const raw = maneraStats[item.num] !== undefined ? maneraStats[item.num] : item.defaultEff;
    return Math.min(100, Math.max(0, Number(raw) || 0));
  });
  const average = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const set = (num: string, v: number) => saveManeraToFirestore({ ...maneraStats, [num]: String(v) });
  return { values, average, set };
};

/** Average as a small coloured pill, for the folded "მანერა" card. */
export const ManeraAverageBadge: React.FC = () => {
  const { average } = useManera();
  const t = maneraTone(average);
  return <span className={`h-6 px-2 rounded-full ring-1 text-xs font-black tabular-nums flex items-center ${t.bg} ${t.text}`}>{average}%</span>;
};

// one-word names for the folded card
const SHORT: Record<string, string> = {
  '1': 'დიაფრაგმა', '2': 'მკერდი', '3': 'ყელი', '4': 'სახე', '5': 'დიქცია',
  '6': 'პირი', '7': 'ხმოვნები', '8': 'მორგება', '9': 'დგომა',
};

/** Each tip's percentage as a tiny ring with a one-word label; one row shows as many as fit. */
export const ManeraQuickRings: React.FC = () => {
  const { values } = useManera();
  const R = 10, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-wrap md:justify-end gap-x-0.5 h-[40px] overflow-hidden">
      {MANERA_ITEMS.map((item, i) => {
        const v = values[i];
        return (
          <span key={item.num} title={`${item.title}: ${v}%`} className="w-[58px] flex flex-col items-center gap-0.5">
            <span className="relative w-7 h-7">
              <svg viewBox="0 0 28 28" className="w-full h-full -rotate-90">
                <circle cx="14" cy="14" r={R} fill="none" stroke="#f1e8da" strokeWidth="3" />
                {v > 0 && (
                  <circle cx="14" cy="14" r={R} fill="none" stroke={maneraTone(v).ring} strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} />
                )}
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-[#2a2017] tabular-nums">{v}</span>
            </span>
            <span className="w-full text-center text-[9px] leading-none font-semibold text-[#8a7a6a] truncate">{SHORT[item.num] || item.title}</span>
          </span>
        );
      })}
    </div>
  );
};

const MiniRing: React.FC<{ value: number }> = ({ value }) => {
  const R = 15, C = 2 * Math.PI * R;
  return (
    <span className="relative w-10 h-10 shrink-0">
      <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" stroke="#f1e8da" strokeWidth="4" />
        {value > 0 && (
          <circle cx="20" cy="20" r={R} fill="none" stroke={maneraTone(value).ring} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-300" />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#2a2017] tabular-nums">{value}</span>
    </span>
  );
};

// "მანერა": one compact row per performance tip; tap a row to rate it (slider + quick values) and read the advice.
export const ManeraContent: React.FC = () => {
  const { values, set } = useManera();
  const [openNum, setOpenNum] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ num: string; v: number } | null>(null);

  return (
    <div className="space-y-3 text-[#2a2017]">
      <p className="text-[13px] leading-relaxed text-[#75685a] px-1">
        საძირკველი არის ის საფუძველი, რომელზეც დგას პიროვნების შემოქმედება და შესწავლილი პროგრამა. აქ მოცემულია სწორი საშემსრულებლო
        რჩევები — შეაფასე, რამდენად ეფექტურად იყენებ თითოეულს.
      </p>

      <ul className="rounded-2xl ring-1 ring-[#efe5d4] bg-white divide-y divide-[#f1e8d9] overflow-hidden">
        {MANERA_ITEMS.map((item, i) => {
          const open = openNum === item.num;
          const v = draft?.num === item.num ? draft.v : values[i];
          return (
            <li key={item.num}>
              <button
                type="button"
                onClick={() => setOpenNum(open ? null : item.num)}
                aria-expanded={open}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left cursor-pointer transition-colors ${open ? 'bg-[#fbf6ec]' : 'hover:bg-[#fbf6ec]/60'}`}
              >
                <span className="w-6 text-center text-xs font-bold text-[#b3a594] tabular-nums">{item.num}</span>
                <span className="flex-1 min-w-0 text-sm font-semibold leading-snug">{item.title}</span>
                <MiniRing value={v} />
                <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="px-3 pb-3.5 pt-1 bg-[#fbf6ec] space-y-3 animate-in fade-in duration-150">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={v}
                    onChange={e => setDraft({ num: item.num, v: Number(e.target.value) })}
                    onPointerUp={() => { if (draft) { set(draft.num, draft.v); setDraft(null); } }}
                    onKeyUp={() => { if (draft) { set(draft.num, draft.v); setDraft(null); } }}
                    aria-label={`${item.title} — ეფექტურობა`}
                    className="w-full accent-[#7a2028] cursor-pointer"
                  />
                  <div className="flex gap-1.5">
                    {QUICK_VALUES.map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => set(item.num, q)}
                        className={`flex-1 h-9 rounded-full text-xs font-bold tabular-nums cursor-pointer transition-colors ${
                          v === q ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                        }`}
                      >
                        {q}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[#4a3426] whitespace-pre-line">
                    <span className="inline-flex items-center gap-1 font-bold text-[#7a2028] mr-1">
                      <Lightbulb className="w-3.5 h-3.5" /> რჩევა:
                    </span>
                    {item.advice}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
