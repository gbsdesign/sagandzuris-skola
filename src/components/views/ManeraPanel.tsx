import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Lightbulb, ChevronDown, MessageSquareText } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { MANERA_ITEMS } from '../../data/habitsAndManera';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';

// One colour rule for every percentage: <50 red, 50–79 amber, 80+ green
export const maneraTone = (v: number) =>
  v >= 80 ? { ring: '#059669', text: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' }
  : v >= 50 ? { ring: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' }
  : { ring: '#e11d48', text: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' };

/** A teacher's mark on one tip: the percent, an optional note, who wrote it and when (ms). */
export type ManeraMark = { v: number; note?: string; by?: string; byUid?: string; at?: number };

/** students/{uid}.maneraReview, written only by teachers and admins (firestore.rules); anything malformed is left out. */
export const readManeraReview = (raw: unknown): Record<string, ManeraMark> => {
  const out: Record<string, ManeraMark> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [num, m] of Object.entries(raw as Record<string, unknown>)) {
    if (!m || typeof m !== 'object') continue;
    const r = m as Record<string, unknown>;
    if (typeof r.v !== 'number' || !Number.isFinite(r.v)) continue;
    out[num] = {
      v: Math.min(100, Math.max(0, Math.round(r.v))),
      note: typeof r.note === 'string' && r.note.trim() ? r.note.trim() : undefined,
      by: typeof r.by === 'string' ? r.by : undefined,
      byUid: typeof r.byUid === 'string' ? r.byUid : undefined,
      at: typeof r.at === 'number' ? r.at : undefined,
    };
  }
  return out;
};

export const markDate = (at?: number) => {
  if (!at) return '';
  const d = new Date(at);
  return `${d.getDate()} ${MONTHS_SHORT_GE[d.getMonth()]}`;
};

/** My own manera: each tip's mark from my teachers (null while unmarked), and the average of the marked ones. */
export const useManera = () => {
  const { user } = useAuth();
  const [review, setReview] = useState<Record<string, ManeraMark>>({});
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), snap => setReview(readManeraReview(snap.data()?.maneraReview)), () => {});
  }, [user]);
  const marks = MANERA_ITEMS.map(item => review[item.num] ?? null);
  const given = marks.filter((m): m is ManeraMark => !!m);
  const average = given.length ? Math.round(given.reduce((a, m) => a + m.v, 0) / given.length) : null;
  return { marks, average };
};

/** The percent as a small coloured pill; a quiet dash while there is no mark. */
export const ManeraScore: React.FC<{ v: number | null | undefined }> = ({ v }) => {
  if (v === null || v === undefined) return <span className="w-11 text-center text-sm font-bold text-[#cbbca6]">—</span>;
  const t = maneraTone(v);
  return <span className={`min-w-11 h-6 px-2 rounded-full ring-1 text-xs font-black tabular-nums flex items-center justify-center ${t.bg} ${t.text}`}>{v}%</span>;
};

/** The average for the card's title; nothing until a teacher has marked something. */
export const ManeraAverageBadge: React.FC = () => {
  const { average } = useManera();
  return average === null ? null : <ManeraScore v={average} />;
};

// "მანერა" for the student, to read: one row per performance tip with the teacher's mark; a tap unfolds the
// teacher's note (who wrote it, when) and the tip's advice. Only teachers and admins mark (ManeraReviewEditor).
export const ManeraContent: React.FC = () => {
  const { marks } = useManera();
  const [openNum, setOpenNum] = useState<string | null>(null);
  const marked = marks.some(Boolean);

  return (
    <div className="text-[#2a2017]">
      <p className="px-1 pb-3 text-[13px] leading-relaxed text-[#8a7a6a]">
        საშემსრულებლო საძირკველი ცხრა რჩევად. {marked ? 'თითოეულს მასწავლებელი აფასებს.' : 'შეფასებას და შენიშვნებს მასწავლებელი დაწერს.'}
      </p>
      <ul className="border-y border-[#f1e8d9] divide-y divide-[#f1e8d9]">
        {MANERA_ITEMS.map((item, i) => {
          const m = marks[i];
          const open = openNum === item.num;
          return (
            <li key={item.num}>
              <button
                type="button"
                onClick={() => setOpenNum(open ? null : item.num)}
                aria-expanded={open}
                className={`w-full min-h-12 flex items-center gap-2.5 px-1 py-2 text-left cursor-pointer transition-colors ${open ? '' : 'hover:bg-[#fbf6ec]/70'}`}
              >
                <span className="w-5 shrink-0 text-center text-xs font-bold text-[#c4b49c] tabular-nums">{item.num}</span>
                <span className={`flex-1 min-w-0 text-[14px] font-semibold leading-snug ${open ? 'text-[#7a2028]' : ''}`}>{item.title}</span>
                {m?.note && <MessageSquareText aria-label="მასწავლებლის შენიშვნა" className="w-4 h-4 shrink-0 text-[#b3a594]" />}
                <ManeraScore v={m?.v} />
                <ChevronDown className={`w-4 h-4 shrink-0 text-[#b3a594] transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="pl-[34px] pr-1 pb-4 pt-0.5 space-y-3 sg-in">
                  {m?.note && (
                    <div className="border-l-2 border-[#7a2028]/35 pl-3">
                      <p className="text-[13.5px] leading-relaxed text-[#2a2017] whitespace-pre-line">{m.note}</p>
                      <p className="mt-1 text-[11.5px] font-semibold text-[#8a7a6a]">
                        {m.by || 'მასწავლებელი'}{m.at ? ` · ${markDate(m.at)}` : ''}
                      </p>
                    </div>
                  )}
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
