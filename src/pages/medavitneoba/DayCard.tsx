import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, ChevronDown } from 'lucide-react';
import { PROSE } from '../../components/views/PrayerText';
import { addDays, dayMonthGe, fromIso, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe } from '../../data/churchCalendar';
import { useMembership } from '../../utils/memberAccess';
import { triggerHaptic } from '../../utils/haptics';
import { dayTakeId, readingsOf, toneName, toneOf, type Reading } from '../../utils/dayReadings';
import { bibleRangesHtml, ReadAloud } from './parts';

// „დღის წესი“ on the course's list: the week's tone, the day's saints and readings, for today or the coming Sunday,
// read out of the church calendar (utils/dayReadings.ts). An Apostle reading unfolds with its text and the recorder,
// whose take can go to the teacher (id dayTakeId). The calendar is a feature (utils/memberAccess): no feature, no card.

const CARD = 'rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)]';

// the calendar's labels in words; the rest stay as written („წმ. მამათა“, „მღ.მთ“)
const LABELS: Record<string, string> = {
  '': 'ლიტურგიაზე', 'ლიტ': 'ლიტურგიაზე', 'ცისკ': 'ცისკარზე', 'მწუხრ': 'მწუხრზე', 'რიგ': 'რიგისა', 'ღირ': 'ღირსისა',
};
const labelOf = (l: string) => LABELS[l] ?? l;

const ApostleText: React.FC<{ r: Reading; iso: string }> = ({ r, iso }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    bibleRangesHtml(r.file, r.ranges).then(h => alive && setHtml(h), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [r]);
  return (
    <div className="mt-2.5 sg-in">
      <div className={`${PROSE} rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] px-4 py-4 sm:px-5`}>
        {html
          ? <div dangerouslySetInnerHTML={{ __html: html }} />
          : <p className="font-sans text-[14px] text-[#8a7a6a]">{failed ? 'ტექსტის ჩატვირთვა ვერ მოხერხდა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>}
      </div>
      <ReadAloud sendId={dayTakeId(r, iso)} />
    </div>
  );
};

export const DayCard: React.FC = () => {
  const canCal = useMembership().can('calendar');
  const [today] = useState(todayIso);
  const dow = fromIso(today).getDay();
  const sunday = addDays(today, 7 - dow); // the coming Sunday (a week on, when today is one)
  const [which, setWhich] = useState<'today' | 'sunday'>('today');
  const iso = which === 'today' ? today : sunday;
  const day = useCalendarDay(canCal ? iso : null);
  // a weekday sings the tone of the Sunday before it
  const lastSunday = addDays(iso, -fromIso(iso).getDay());
  const sundayDay = useCalendarDay(canCal && lastSunday !== iso ? lastSunday : null);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => setOpen(null), [iso]);

  const readings = useMemo(() => (day ? readingsOf(day) : []), [day]);
  if (!canCal) return null;

  const tone = day ? toneOf(day) ?? (lastSunday !== iso && sundayDay ? toneOf(sundayDay) : null) : null;
  const title = day?.t.replace(/\s*ხმა\s+[IVX]+\.?\s*$/, '').replace(/\.\s*$/, '');
  const saints = day?.s.slice(0, 3) ?? [];
  const more = (day?.s.length ?? 0) - saints.length;
  // the readings in their order, under their label
  const groups: { label: string; items: { r: Reading; i: number }[] }[] = [];
  readings.forEach((r, i) => {
    const label = labelOf(r.label);
    const g = groups[groups.length - 1];
    if (g?.label === label) g.items.push({ r, i }); else groups.push({ label, items: [{ r, i }] });
  });

  return (
    <section aria-label="დღის წესი მედავითნისთვის" className={`${CARD} p-4 sm:p-5 mb-5`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a0703c]">დღის წესი</p>
        <div role="tablist" aria-label="რომელი დღე" className="inline-flex p-1 rounded-full bg-[#f4ece0]">
          {([['today', 'დღეს'], ['sunday', dow === 0 ? 'შემდეგი კვირა' : 'კვირას']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={which === id}
              onClick={() => { triggerHaptic(8); setWhich(id); }}
              className={`h-9 px-4 rounded-full text-[14px] font-bold cursor-pointer transition ${
                which === id ? 'bg-white text-[#7a2028] shadow-[0_1px_3px_rgba(42,32,23,0.15)]' : 'text-[#6b5c4d] hover:text-[#2a2017]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#8a7a6a]">{weekdayGe(iso)}, {dayMonthGe(iso)} <span className="font-semibold text-[#b3a594]">· ძვ. სტ. {oldDayMonthGe(iso)}</span></p>
          {title && <h3 className="mt-0.5 font-serif-ge text-[18px] font-bold leading-snug text-[#2a2017] text-pretty">{title}</h3>}
        </div>
        {tone && (
          <span className="shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            <span className="text-[11px] font-bold leading-none text-[#fbf6ec]/75">ხმა</span>
            <span className="mt-1 font-serif-ge text-[22px] font-bold leading-none">{toneName(tone).replace('ხმა ', '')}</span>
          </span>
        )}
      </div>

      {day === undefined ? (
        <p className="mt-3 text-[14px] text-[#8a7a6a]">იტვირთება…</p>
      ) : day === null ? (
        <p className="mt-3 text-[14px] leading-relaxed text-[#8a7a6a]">ამ დღის კალენდარი ჯერ არ გამოქვეყნებულა.</p>
      ) : (
        <>
          {saints.length > 0 && (
            <ul className="mt-3 space-y-1 font-serif-ge text-[15px] leading-snug">
              {saints.map((s, i) => (
                <li key={i} className={`flex gap-2 ${s.b ? 'font-bold text-[#7a2028]' : 'text-[#4a3826]'}`}>
                  <span className="mt-[0.55em] w-1.5 h-1.5 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                  <span className="text-pretty line-clamp-3">{s.n}</span>
                </li>
              ))}
              {more > 0 && <li className="pl-3.5 font-sans text-[13px] font-semibold text-[#8a7a6a]">და კიდევ {more}</li>}
            </ul>
          )}

          <div className="mt-4 pt-3.5 border-t border-[#f1e8d9]">
            <p className="text-[15px] font-bold text-[#2a2017]">საკითხავები</p>
            {groups.length ? groups.map(g => (
              <div key={g.label + g.items[0].i} className="mt-2.5">
                <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{g.label}</p>
                <ul className="mt-1 space-y-1.5">
                  {g.items.map(({ r, i }) => (
                    <li key={i}>
                      {r.apostle ? (
                        <>
                          <button type="button" aria-expanded={open === i}
                            onClick={() => { triggerHaptic(8); setOpen(o => (o === i ? null : i)); }}
                            className={`w-full min-h-12 px-3.5 py-2 rounded-2xl flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] ${
                              open === i ? 'bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/25' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30'
                            }`}>
                            <BookOpen className="w-5 h-5 shrink-0 text-[#7a2028]" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-bold leading-snug text-[#2a2017]">{r.name} {r.ref}</span>
                              <span className="block text-[13px] text-[#8a7a6a]">სამოციქულო{r.zachalo ? ` · დასაბამი ${r.zachalo}` : ''} · წაიკითხე და ჩაიწერე</span>
                            </span>
                            <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${open === i ? 'rotate-180' : ''}`} />
                          </button>
                          {open === i && <ApostleText r={r} iso={iso} />}
                        </>
                      ) : (
                        <p className="min-h-11 px-3.5 py-2 flex flex-col justify-center">
                          <span className="text-[15px] font-semibold leading-snug text-[#4a3826]">სახარება · {r.name} {r.ref}</span>
                          {r.zachalo && <span className="text-[13px] text-[#8a7a6a]">დასაბამი {r.zachalo}</span>}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )) : (
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#8a7a6a]">ამ დღეს კალენდარში საკითხავი არ წერია.</p>
            )}
            <p className="mt-3 text-[13px] leading-snug text-[#8a7a6a]">სახარებას დიაკონი ან მღვდელი კითხულობს; მედავითნე — სამოციქულოს.</p>
          </div>

          <button type="button" onClick={() => openChurchCalendar(iso)}
            className="mt-3.5 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028] text-[14px] font-bold cursor-pointer transition active:scale-[0.97]">
            <CalendarDays className="w-4 h-4" />სრული განგება კალენდარში
          </button>
        </>
      )}
    </section>
  );
};
