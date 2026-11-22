import React, { useEffect, useRef, useState } from 'react';
import { Check as CheckIcon, ChevronDown, ChevronLeft, ChevronRight, Ellipsis, Music } from 'lucide-react';
import { Card, Note, Num, Pill, Press, RoundButton, Rows, Seg, TopBar, cx } from '../../../components/ui2';
import { useAuth, useNavigation } from '../../../context';
import { dayMonthGe, weekdayGe } from '../../../data/churchCalendar';
import { triggerHaptic } from '../../../utils/haptics';
import { toneName } from '../../../utils/dayReadings';
import { rankLabel, type ServiceId, type Step } from '../../../utils/dayService';
import type { ReportPlace } from '../../../utils/dayReport';
import { SAT_OPTIONS, WEEKDAY_OPTIONS, useDayService } from '../../medavitneoba/DayService';
import { NextButton, ReportLink, StepBody, whoLine } from './DayParts';
import { MoreSheet, NotesSheet, OrderSheet, PatronSheet, RankSheet, ReadingsSheet, ToneSheet } from './DaySheets';
import { ReportSheet } from './Report';
import { Page } from './parts';
import { DayChants } from './DayChants';

// x-medavitne-dghe — „დღის მსახურება“ in the new look: one line for the day (‹ date ›, the tone and the rank), the services as a
// switch, then the service's steps as one list — a step's text opens with a tap, its number marks „აქ ვარ“, a ♪ opens its
// notes. The page opens by itself on what is served now („ახლა“: in the evening the next day's vespers). An opened step ends
// with „შემდეგი“ — the place moves on and the next step opens under it (after the last one: the next service) — and a quiet
// „შეცდომა ვნახე“. The four tiles and the switches of the old page are in „⋯“, with the day's food, the readings and the
// calendar. The rules and the state are the old page's (useDayService, pages/medavitneoba/DayService.tsx).

const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const DayScreen: React.FC = () => {
  const d = useDayService();
  const { user } = useAuth();
  const { handleGoBack } = useNavigation();
  const [more, setMore] = useState(false);
  const [readings, setReadings] = useState(false);
  const [open, setOpen] = useState<number[]>([]);
  const [report, setReport] = useState<ReportPlace | null>(null);
  const rows = useRef<Record<number, HTMLDivElement | null>>({});
  // the step „შემდეგი მსახურება“ leads to: opened once that service is on screen
  const wantOpen = useRef<number | null>(null);
  // another day or service: every step folds again
  useEffect(() => {
    const w = wantOpen.current;
    wantOpen.current = null;
    setOpen(w !== null && w >= 0 ? [w] : []);
  }, [d.iso, d.service.id]);
  const toggle = (i: number) => { triggerHaptic(8); setOpen(o => (o.includes(i) ? o.filter(x => x !== i) : [...o, i])); };
  // marking the place opens its text
  const mark = (i: number) => { d.mark(i); if (d.at !== i) setOpen(o => (o.includes(i) ? o : [...o, i])); };
  // „შემდეგი“: the place moves on, the next step opens under this one and comes to the top of the screen
  const goNext = (i: number) => {
    d.goStep(i);
    setOpen(o => (o.includes(i) ? o : [...o, i]));
    requestAnimationFrame(() => rows.current[i]?.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' }));
  };
  const goService = (id: ServiceId) => {
    wantOpen.current = d.startService(id);
    window.scrollTo({ top: 0 });
  };

  if (!d.canCal) return (
    <Page>
      <TopBar title="დღის მსახურება" onBack={handleGoBack} />
      <Card><p className="text-body leading-relaxed text-mut">დღის მსახურება საეკლესიო კალენდარს იყენებს — ის შენთვის ჯერ გახსნილი არ არის.</p></Card>
    </Page>
  );

  // away from what is served now: the middle of the day's card leads back
  const away = d.iso !== d.nowIso;
  const dayName = `${weekdayGe(d.iso)}, ${dayMonthGe(d.iso)}`;
  const line = [d.great?.name, d.tone ? toneName(d.tone) : null, d.ownOrder ? null : rankLabel(d.rank)].filter(Boolean).join(' · ');
  const when = [d.service.when, d.service.note].filter(Boolean).join(' · ');
  // what the page was set to — sent with „შეცდომა ვნახე“, so the place can be found again
  const placeOf = (n: number, s: Step): ReportPlace => ({
    iso: d.iso, day: dayName, service: d.service.title, n, step: s.title,
    setup: [
      d.tone ? toneName(d.tone) : '',
      d.ownOrder ? '' : rankLabel(d.rank),
      d.patron ? `ტაძარი: ${d.patron.name}` : '',
      `შაბათ საღამოს — ${SAT_OPTIONS.find(o => o.id === d.order.sat)?.label.toLowerCase() ?? d.order.sat}`,
      `სადაგ დღეს — ${WEEKDAY_OPTIONS.find(o => o.id === d.order.weekday)?.label.toLowerCase() ?? d.order.weekday}`,
      d.priestOn ? 'მღვდლის ტექსტები ჩართულია' : '',
    ],
  });

  return (
    <Page>
      <TopBar
        title="დღის მსახურება"
        onBack={handleGoBack}
        right={<RoundButton label="მეტი" onClick={() => setMore(true)}><Ellipsis aria-hidden="true" strokeWidth={1.75} /></RoundButton>}
      />

      {/* the day: ‹ date › and one line under it */}
      <Card pad="sm" className="flex items-center gap-2">
        <RoundButton label="წინა დღე" tone="page" onClick={() => d.move(-1)}><ChevronLeft aria-hidden="true" strokeWidth={1.75} /></RoundButton>
        <Press
          disabled={!away}
          onClick={d.goNow}
          aria-label={away ? `${dayName} — დაბრუნება იმაზე, რაც ახლა იმსახურება` : undefined}
          className="flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center text-center disabled:cursor-default"
        >
          <span className="text-lead leading-tight font-bold wrap-break-word">{dayName}</span>
          {line && <span className="text-meta text-mut wrap-break-word">{line}</span>}
          {away && <span className="text-meta font-bold text-wine">ახლაზე დაბრუნება</span>}
        </Press>
        <RoundButton label="შემდეგი დღე" tone="page" onClick={() => d.move(1)}><ChevronRight aria-hidden="true" strokeWidth={1.75} /></RoundButton>
      </Card>
      {d.day === undefined && <Note>იტვირთება…</Note>}
      {d.day === null && <Note>ამ დღის კალენდარი ჯერ არ გამოქვეყნებულა — წესი ზოგადად ჩანს.</Note>}

      {d.tabs.length > 1 && (
        <Seg label="მსახურება" items={d.tabs.map(t => ({ id: t.id, label: t.label }))} value={d.service.id} onChange={d.setTab} />
      )}
      {/* when this service is served; „ახლა“ — it is the one served at this hour */}
      {(when || d.isNow) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 px-1.5">
          {d.isNow && <Pill on>ახლა</Pill>}
          {when && <p className="min-w-0 flex-1 text-meta leading-normal text-mut wrap-break-word">{when}</p>}
        </div>
      )}

      <DayChants iso={d.iso} now={d.iso === d.nowIso} />

      {/* the steps; the old script (ხუცური) turns this box's text */}
      <div key={String(d.oldOn)} ref={d.setFlowEl}>
        <Rows aria-label={d.service.title}>
          {d.shown.map(({ s, i }, n) => {
            const here = d.at === i;
            const past = d.at > i;
            const isOpen = open.includes(i);
            const next = d.shown[n + 1];
            return (
              <div key={`${d.tab}-${i}`} ref={el => { rows.current[i] = el; }} className="flex scroll-mt-3 flex-col">
                <div className="flex min-h-row items-center gap-1 py-1 pr-1.5 pl-1.5">
                  <Press onClick={() => mark(i)} aria-pressed={here} aria-label={`${n + 1} — აქ ვარ`}
                    className="flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-wine/60">
                    {past ? (
                      <span aria-hidden="true" className="flex size-[30px] items-center justify-center rounded-full bg-tint text-wine"><CheckIcon className="size-4" /></span>
                    ) : <Num n={n + 1} on={here} />}
                  </Press>
                  <Press onClick={() => toggle(i)} aria-expanded={isOpen}
                    className="flex min-h-tap min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine/60">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className={cx('text-lead leading-snug font-bold wrap-break-word', here && 'text-wine')}>{s.title}</span>
                      <span className="text-meta text-mut">{whoLine(s)}</span>
                    </span>
                    {here && <Pill on>აქ ვარ</Pill>}
                  </Press>
                  {s.chants?.length ? (
                    <RoundButton size={36} tone="plain" label={`${s.title} — ნოტები`} onClick={() => { triggerHaptic(8); d.setNotesOf(s); }}>
                      <Music aria-hidden="true" strokeWidth={1.75} />
                    </RoundButton>
                  ) : null}
                  <Press tabIndex={-1} aria-hidden="true" onClick={() => toggle(i)} className="flex size-9 shrink-0 cursor-pointer items-center justify-center text-mut">
                    <ChevronDown className={cx('size-[18px] transition-transform', isOpen ? 'rotate-180' : '-rotate-90')} strokeWidth={2} />
                  </Press>
                </div>
                {isOpen && (
                  <StepBody s={s} inp={d.inp} priestOn={d.priestOn} onTone={() => d.setToneOpen(d.tone)}>
                    {next ? (
                      <NextButton kicker="შემდეგი" title={next.s.title} strong={here} onClick={() => goNext(next.i)} />
                    ) : d.after ? (
                      <NextButton across kicker="შემდეგი მსახურება" title={[d.after.title, d.after.when].filter(Boolean).join(' · ')} strong={here}
                        onClick={() => goService(d.after!.id)} />
                    ) : null}
                    {user && <ReportLink onClick={() => setReport(placeOf(n + 1, s))} />}
                  </StepBody>
                )}
              </div>
            );
          })}
        </Rows>
      </div>
      <Note>ნაწილის ბოლოს „შემდეგი“ გადაგიყვანს და ადგილს თვითონ მონიშნავს — ნომერზე შეხებითაც ინიშნება. ზოგადი წესია ტიპიკონის მიხედვით; ტაძრებში ცოტათი განსხვავდება.</Note>

      <MoreSheet open={more} d={d} onClose={() => setMore(false)} onReadings={() => setReadings(true)} />
      <ReadingsSheet open={readings} d={d} onClose={() => setReadings(false)} />
      <RankSheet open={d.sheet === 'rank'} value={d.rank} guessed={d.guessed} onPick={d.setRank} onClose={() => d.setSheet(null)} />
      <OrderSheet open={d.sheet === 'order'} value={d.order} onPick={d.saveOrder} onClose={() => d.setSheet(null)} />
      <PatronSheet open={d.sheet === 'patron'} value={d.patron} onPick={d.savePatron} onClose={() => d.setSheet(null)} />
      <ToneSheet tone={d.toneOpen} onClose={() => d.setToneOpen(null)} />
      <NotesSheet step={d.notesOf} tone={d.tone} onClose={() => d.setNotesOf(null)} />
      <ReportSheet place={report} onClose={() => setReport(null)} />
    </Page>
  );
};
