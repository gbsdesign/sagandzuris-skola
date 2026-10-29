import React, { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../utils/dateNames';
import { monthCounts, weekSeries } from '../../utils/growth';
import { tbilisiToday } from '../../utils/hangi';
import { useGrowthWeeks } from '../../hooks/useGrowth';
import { Fold } from './Fold';
import type { UserRecord } from './UsersTab';

// „სკოლის ზრდა“ (admin review, idea 12, 2026-10-28): two small column charts in ⚙ „სკოლა“, one under the other (never one
// plot with two scales) — new members by month (the last 12) and active members by week (the last 12, kept since the
// count began; utils/growth.ts). One series each, so no legend: the chart's own title names it. The columns are the brand
// wine one step lighter (#9b2c35: inside the lightness band and ≥3:1 on the card), ≤24px wide with a 4px round top; only
// the peak and the latest carry their number, every column tells its own on hover or focus, and „ცხრილად“ lists them all.

const MARK = '#9b2c35';
const MARK_HOVER = '#b03a45';

interface Point { key: string; label: string; full: string; n: number | null }

const Columns: React.FC<{ title: string; data: Point[]; unit: (n: number) => string; every: number }> = ({ title, data, unit, every }) => {
  const [at, setAt] = useState<number | null>(null);
  const known = data.map(d => d.n ?? 0);
  const max = Math.max(1, ...known);
  const peak = known.indexOf(Math.max(...known));
  const last = data.length - 1;
  const PLOT = 104; // px for the columns; their numbers sit above, inside the 124px plot
  const tip = at !== null ? data[at] : null;
  return (
    <figure className="min-w-0">
      <figcaption className="text-[13px] font-bold text-[#4a3426]">{title}</figcaption>
      <div className="relative mt-2">
        {/* the one readout: value first, then the period */}
        {tip && (
          <div role="status" className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-[#2a2017] px-2.5 py-1.5 text-center shadow-lg whitespace-nowrap"
            style={{ left: `${Math.min(88, Math.max(12, ((at! + 0.5) / data.length) * 100))}%` }}>
            <span className="block text-[14px] font-bold text-[#fbf6ec]">{tip.n === null ? 'არ დათვლილა' : unit(tip.n)}</span>
            <span className="block text-[12px] text-[#d9c8ac]">{tip.full}</span>
          </div>
        )}
        <div className="flex items-end gap-[2px] h-[124px] border-b border-[#e8dcc8]" onPointerLeave={() => setAt(null)}>
          {data.map((d, i) => {
            const h = d.n ? Math.max(3, Math.round((d.n / max) * PLOT)) : 0;
            const labelled = d.n !== null && d.n > 0 && (i === peak || i === last);
            return (
              <button key={d.key} type="button" aria-label={`${d.full}: ${d.n === null ? 'არ დათვლილა' : unit(d.n)}`}
                onPointerEnter={() => setAt(i)} onFocus={() => setAt(i)} onBlur={() => setAt(a => (a === i ? null : a))}
                className="flex-1 min-w-0 h-full flex flex-col items-center justify-end cursor-default outline-none focus-visible:bg-[#7a2028]/[0.06] rounded-t-md">
                {labelled && <span className="mb-1 text-[11px] font-semibold leading-none text-[#4a3426]">{d.n}</span>}
                {d.n === null ? (
                  // a week nobody counted: a small dot, not a zero
                  <span className="mb-0.5 w-1.5 h-1.5 rounded-full bg-[#d9c8ac]" aria-hidden />
                ) : (
                  <span aria-hidden className="w-[70%] max-w-[24px] rounded-t-[4px] transition-colors"
                    style={{ height: h, background: at === i ? MARK_HOVER : MARK }} />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-[2px] mt-1" aria-hidden>
          {data.map((d, i) => (
            <span key={d.key} className="flex-1 min-w-0 text-center text-[11px] leading-tight text-[#8a7a6a] whitespace-nowrap overflow-visible">
              {(last - i) % every === 0 ? d.label : ''}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-2 group">
        <summary className="inline-flex h-8 items-center px-2 -mx-2 rounded-full text-[12px] font-bold text-[#7a2028] cursor-pointer hover:bg-[#7a2028]/[0.06] list-none">ცხრილად</summary>
        <table className="mt-1 w-full text-[13px]">
          <tbody>
            {[...data].reverse().map(d => (
              <tr key={d.key} className="border-b border-[#f1e8d9] last:border-0">
                <td className="py-1 text-[#75685a]">{d.full}</td>
                <td className="py-1 text-right font-semibold tabular-nums text-[#2a2017]">{d.n === null ? '—' : d.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
};

const dayName = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_SHORT_GE[+iso.slice(5, 7) - 1]}`;

export const GrowthFold: React.FC<{ users: UserRecord[] }> = ({ users }) => {
  const { weeks } = useGrowthWeeks();
  const today = tbilisiToday();
  const months = useMemo<Point[]>(() => monthCounts(users.map(u => u.createdAt), today).map(m => {
    const [y, mo] = m.key.split('-').map(Number);
    return { key: m.key, n: m.n, label: MONTHS_SHORT_GE[mo - 1], full: `${MONTHS_GE[mo - 1]} ${y}` };
  }), [users, today]);
  const byWeek = useMemo<Point[]>(() => weekSeries(weeks, today).map(w => ({
    key: w.key, n: w.n, label: dayName(w.key), full: `კვირა ${dayName(w.key)}-დან`,
  })), [weeks, today]);
  const thisMonth = months[months.length - 1]?.n ?? 0;
  const thisWeek = byWeek[byWeek.length - 1]?.n;
  return (
    <Fold icon={<TrendingUp />} title="სკოლის ზრდა"
      summary={<>ამ თვეში {thisMonth} ახალი{thisWeek != null && ` · ამ კვირაში აქტიური ${thisWeek}`}</>}
      info="ახალი წევრები — ვინც იმ თვეში პირველად შემოვიდა აპში. აქტიური — ვინც ბოლო 7 დღეში შემოვიდა (ადმინების, მასწავლებლების და გასულების გარდა); ეს რიცხვი ინახება, როცა ადმინი პანელს ხსნის, ამიტომ კვირები დათვლის დაწყებიდან ჩანს.">
      <div className="space-y-5">
        <Columns title="ახალი წევრები თვეების მიხედვით" data={months} unit={n => `${n} ახალი`} every={3} />
        {byWeek.length >= 2 ? (
          <Columns title="აქტიური წევრები კვირების მიხედვით" data={byWeek} unit={n => `${n} აქტიური`} every={4} />
        ) : (
          <p className="text-[13px] text-[#75685a] leading-snug">
            <span className="font-bold text-[#4a3426]">აქტიური წევრები კვირების მიხედვით</span> — ითვლება ამ კვირიდან
            {thisWeek != null && <> (ახლა: <span className="font-semibold text-[#2a2017]">{thisWeek}</span>)</>}; გრაფიკი მეორე კვირიდან გამოჩნდება.
          </p>
        )}
      </div>
    </Fold>
  );
};
