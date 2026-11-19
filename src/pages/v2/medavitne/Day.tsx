import React, { useEffect, useState } from 'react';
import { Check as CheckIcon, ChevronDown, ChevronLeft, ChevronRight, Ellipsis, Music } from 'lucide-react';
import { Card, Note, Num, Pill, Press, RoundButton, Rows, Seg, TopBar, cx } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { dayMonthGe, weekdayGe } from '../../../data/churchCalendar';
import { triggerHaptic } from '../../../utils/haptics';
import { toneName } from '../../../utils/dayReadings';
import { rankLabel } from '../../../utils/dayService';
import { useDayService } from '../../medavitneoba/DayService';
import { StepBody, whoLine } from './DayParts';
import { MoreSheet, NotesSheet, OrderSheet, PatronSheet, RankSheet, ReadingsSheet, ToneSheet } from './DaySheets';
import { Page } from './parts';

// x-medavitne-dghe — „დღის მსახურება“ in the new look: one line for the day (‹ date ›, the tone and the rank), the services as a
// switch, then the service's steps as one list — a step's text opens with a tap, its number marks „აქ ვარ“, a ♪ opens its
// notes. The four tiles and two switches of the old page are in „⋯“, with the day's food, the readings and the calendar.
// The rules and the state are the old page's (useDayService, pages/medavitneoba/DayService.tsx).

export const DayScreen: React.FC = () => {
  const d = useDayService();
  const { handleGoBack } = useNavigation();
  const [more, setMore] = useState(false);
  const [readings, setReadings] = useState(false);
  const [open, setOpen] = useState<number[]>([]);
  // another day or service: every step folds again
  useEffect(() => setOpen([]), [d.iso, d.service.id]);
  const toggle = (i: number) => { triggerHaptic(8); setOpen(o => (o.includes(i) ? o.filter(x => x !== i) : [...o, i])); };
  // marking the place opens its text
  const mark = (i: number) => { d.mark(i); if (d.at !== i) setOpen(o => (o.includes(i) ? o : [...o, i])); };

  if (!d.canCal) return (
    <Page>
      <TopBar title="დღის მსახურება" onBack={handleGoBack} />
      <Card><p className="text-body leading-relaxed text-mut">დღის მსახურება საეკლესიო კალენდარს იყენებს — ის შენთვის ჯერ გახსნილი არ არის.</p></Card>
    </Page>
  );

  const notToday = d.iso !== d.today;
  const line = [d.great?.name, d.tone ? toneName(d.tone) : null, d.ownOrder ? null : rankLabel(d.rank)].filter(Boolean).join(' · ');
  const when = [d.service.when, d.service.note].filter(Boolean).join(' · ');

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
          disabled={!notToday}
          onClick={() => { triggerHaptic(8); d.setIso(d.today); }}
          aria-label={notToday ? `${weekdayGe(d.iso)}, ${dayMonthGe(d.iso)} — დღევანდელზე დაბრუნება` : undefined}
          className="flex min-h-tap min-w-0 flex-1 flex-col items-center justify-center text-center disabled:cursor-default"
        >
          <span className="text-lead leading-tight font-bold wrap-break-word">{weekdayGe(d.iso)}, {dayMonthGe(d.iso)}</span>
          <span className="text-meta text-mut wrap-break-word">
            {line}{notToday && <> · <span className="font-bold text-wine">დღეს</span></>}
          </span>
        </Press>
        <RoundButton label="შემდეგი დღე" tone="page" onClick={() => d.move(1)}><ChevronRight aria-hidden="true" strokeWidth={1.75} /></RoundButton>
      </Card>
      {d.day === undefined && <Note>იტვირთება…</Note>}
      {d.day === null && <Note>ამ დღის კალენდარი ჯერ არ გამოქვეყნებულა — წესი ზოგადად ჩანს.</Note>}

      {d.tabs.length > 1 && (
        <Seg label="მსახურება" items={d.tabs.map(t => ({ id: t.id, label: t.label }))} value={d.service.id} onChange={d.setTab} />
      )}
      {when && <Note>{when}</Note>}

      {/* the steps; the old script (ხუცური) turns this box's text */}
      <div key={String(d.oldOn)} ref={d.setFlowEl}>
        <Rows aria-label={d.service.title}>
          {d.shown.map(({ s, i }, n) => {
            const here = d.at === i;
            const past = d.at > i;
            const isOpen = open.includes(i);
            return (
              <div key={`${d.tab}-${i}`} className="flex flex-col">
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
                {isOpen && <StepBody s={s} inp={d.inp} priestOn={d.priestOn} onTone={() => d.setToneOpen(d.tone)} />}
              </div>
            );
          })}
        </Rows>
      </div>
      <Note>ნომერს შეეხე — მოინიშნება, სად ხარ. ზოგადი წესია ტიპიკონის მიხედვით; ტაძრებში ცოტათი განსხვავდება.</Note>

      <MoreSheet open={more} d={d} onClose={() => setMore(false)} onReadings={() => setReadings(true)} />
      <ReadingsSheet open={readings} d={d} onClose={() => setReadings(false)} />
      <RankSheet open={d.sheet === 'rank'} value={d.rank} guessed={d.guessed} onPick={d.setRank} onClose={() => d.setSheet(null)} />
      <OrderSheet open={d.sheet === 'order'} value={d.order} onPick={d.saveOrder} onClose={() => d.setSheet(null)} />
      <PatronSheet open={d.sheet === 'patron'} value={d.patron} onPick={d.savePatron} onClose={() => d.setSheet(null)} />
      <ToneSheet tone={d.toneOpen} onClose={() => d.setToneOpen(null)} />
      <NotesSheet step={d.notesOf} tone={d.tone} onClose={() => d.setNotesOf(null)} />
    </Page>
  );
};
