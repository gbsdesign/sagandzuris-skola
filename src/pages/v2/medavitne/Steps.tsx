import React, { useState } from 'react';
import { BookOpen, Check as CheckIcon, ChevronDown, Clock, Library, ListOrdered, Music, Users, X } from 'lucide-react';
import { CheckButton, Card, Dot, H2, Num, Press, Row, Rows, Two, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { loadPsalmHtml } from '../../../utils/hourPsalms';
import { useReadText } from '../../medavitneoba/parts';
import type { LessonStep } from '../../../data/medavitneLessons';
import { PROSE_V2, Rich, Waiting, splitPoint } from './parts';
import { Recorder } from './Recorder';

// A lesson's five kinds of step in the new look (boards x-medavitne-gakvetili, -rigi, -kitkhva, -testi, -davaleba):
// ვისწავლოთ · თანმიმდევრობა · წავიკითხოთ ხმამაღლა · შეამოწმე თავი · დავალება. The texts and the rules are the old page's
// (pages/medavitneoba/parts.tsx).

type Of<K extends LessonStep['kind']> = Extract<LessonStep, { kind: K }>;

const POINT_ICONS = [<BookOpen key="b" />, <ListOrdered key="l" />, <Library key="y" />, <Clock key="c" />, <Music key="m" />];

const Body: React.FC<{ lines: string[] }> = ({ lines }) => (
  <div className="flex flex-col gap-3 px-1 text-lead leading-relaxed text-ink">
    {lines.map((p, i) => <p key={i} className="wrap-break-word"><Rich text={p} /></p>)}
  </div>
);

const Learn: React.FC<{ step: Of<'learn'> }> = ({ step }) => (
  <>
    <H2 big>{step.title}</H2>
    <Body lines={step.body} />
    {step.points && (
      <Rows>
        {step.points.map((p, i) => {
          const { title, sub } = splitPoint(p);
          return <Row key={i} lead={<Dot icon={POINT_ICONS[i % POINT_ICONS.length]} />} title={title} sub={sub} wrap />;
        })}
      </Rows>
    )}
  </>
);

const Order: React.FC<{ step: Of<'order'> }> = ({ step }) => (
  <>
    <H2 big sub={step.intro}>{step.title}</H2>
    <Rows>
      {step.items.map(([name, note], i) => <Row key={i} lead={<Num n={i + 1} />} title={name} sub={note} wrap />)}
    </Rows>
  </>
);

/** several psalms: each folds open by itself (one reads some of them) */
const PsalmFold: React.FC<{ n: number }> = ({ n }) => {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const toggle = () => {
    triggerHaptic(8);
    if (!open && html === null) loadPsalmHtml(n).then(setHtml, () => setFailed(true));
    setOpen(o => !o);
  };
  return (
    <div className="flex flex-col">
      <Row title={`ფსალმუნი ${n}`} onClick={toggle} aria-expanded={open}
        right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />} />
      {open && (html ? <div className={cx(PROSE_V2, 'px-4 pb-4')} dangerouslySetInnerHTML={{ __html: html }} /> : <Waiting failed={failed} className="px-4 pb-4" />)}
    </div>
  );
};

const Read: React.FC<{ step: Of<'read'>; sendId?: string }> = ({ step, sendId }) => {
  const [syllables, setSyllables] = useState<number | undefined>();
  const { one, html, failed } = useReadText(step, setSyllables);
  return (
    <>
      <H2 big sub={step.intro}>{step.title}</H2>
      {(step.lines?.length || one || step.bible) && (
        <Card className={cx(PROSE_V2, 'bg-gold-tint/40')}>
          {step.lines?.map((l, i) => <p key={i}>{l}</p>)}
          {step.bible && <p className="font-sans text-meta font-bold text-mut">{step.bible.name} {step.bible.ch}, {step.bible.from}–{step.bible.to}</p>}
          {(one || step.bible) && (html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Waiting failed={failed} className="font-sans" />)}
        </Card>
      )}
      {!one && step.psalms && step.psalms.length > 0 && (
        <Rows>{step.psalms.map(n => <PsalmFold key={n} n={n} />)}</Rows>
      )}
      <Recorder sendId={sendId} syllables={syllables} />
    </>
  );
};

const Quiz: React.FC<{ step: Of<'quiz'> }> = ({ step }) => {
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === step.answer;
  return (
    <>
      <H2 big>{step.question}</H2>
      <div role="group" aria-label={step.question} className="flex flex-col gap-2.5">
        {step.options.map((o, i) => {
          const chosen = pick === i;
          // a wrong pick is marked alone, so the next try is still a real one; the right one ends the question
          const won = right && i === step.answer;
          return (
            <Press key={i} disabled={pick !== null && right}
              onClick={() => { triggerHaptic(i === step.answer ? 15 : 30); setPick(i); }}
              className={cx(
                'flex min-h-[52px] w-full cursor-pointer items-center gap-3 rounded-tile px-4 py-2.5 text-left text-lead font-bold transition active:scale-[0.99] disabled:cursor-default',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
                won ? 'bg-leaf-tint text-leaf-ink ring-2 ring-leaf'
                  : chosen ? 'bg-tint text-wine ring-2 ring-wine/40'
                  : right ? 'bg-surf text-mut'
                  : 'bg-surf text-ink',
              )}>
              <span className="min-w-0 flex-1 wrap-break-word">{o}</span>
              {won && <CheckIcon aria-label="სწორია" className="size-5 shrink-0" />}
              {chosen && !right && <X aria-label="არასწორია" className="size-5 shrink-0" />}
            </Press>
          );
        })}
      </div>
      {pick !== null && (
        <p role="status" className={cx('sg-in rounded-tile px-4 py-3 text-body leading-relaxed', right ? 'bg-leaf-tint text-ink' : 'bg-tint text-ink')}>
          <strong className={right ? 'text-leaf-ink' : 'text-wine'}>{right ? 'სწორია! ' : 'არასწორია. '}</strong>
          {right ? step.explain : 'დაფიქრდი და სხვა პასუხი სცადე.'}
        </p>
      )}
    </>
  );
};

const Task: React.FC<{ step: Of<'task'>; onPsalter: () => void }> = ({ step, onPsalter }) => {
  // the ticks are the reader's own reminder for now: kept only while the step is open
  const [done, setDone] = useState<number[]>([]);
  return (
    <>
      <H2 big>{step.title}</H2>
      <Rows>
        {step.body.map((t, i) => {
          const on = done.includes(i);
          return (
            <div key={i} className="flex min-h-14 items-center gap-1 py-1.5 pr-4 pl-1.5">
              <CheckButton on={on} label={on ? 'შესრულებულია' : 'შევასრულე'}
                onChange={v => { triggerHaptic(10); setDone(d => (v ? [...d, i] : d.filter(x => x !== i))); }} />
              <span className={cx('min-w-0 flex-1 text-lead leading-snug wrap-break-word', on ? 'text-mut' : 'font-semibold text-ink')}><Rich text={t} /></span>
            </div>
          );
        })}
        {step.open === 'psalter' && (
          <Row lead={<Dot icon={<Users />} />} title="წაიკითხე შენი კანონი" sub="ფსალმუნთა ჯგუფში" onClick={onPsalter} />
        )}
      </Rows>
    </>
  );
};

export const StepV2: React.FC<{ step: LessonStep; onPsalter: () => void; sendId?: string }> = ({ step, onPsalter, sendId }) =>
  step.kind === 'learn' ? <Learn step={step} />
  : step.kind === 'order' ? <Order step={step} />
  : step.kind === 'read' ? <Read step={step} sendId={sendId} />
  : step.kind === 'quiz' ? <Quiz step={step} />
  : <Task step={step} onPsalter={onPsalter} />;

/** the end of a lesson: done, and „ვისწავლე“ marks it learned */
export const Finished: React.FC<{ learned: boolean; onLearned: (on: boolean) => void }> = ({ learned, onLearned }) => (
  <div className="flex flex-col items-center gap-2 px-4 pt-8 text-center">
    <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-leaf-tint text-leaf-ink"><CheckIcon className="size-8" /></span>
    <Two title="გაკვეთილი გავლილია" className="mt-2 flex-none items-center" wrap />
    <p className="max-w-sm text-body leading-relaxed text-mut">როცა დავალებას შეასრულებ და თავს დარწმუნებულად იგრძნობ, მონიშნე ნასწავლად.</p>
    <Press aria-pressed={learned} onClick={() => { triggerHaptic(15); onLearned(!learned); }}
      className={cx(
        'mt-3 inline-flex h-tap-lg cursor-pointer items-center gap-2 rounded-full px-6 text-body font-bold transition active:scale-[0.97]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
        learned ? 'bg-leaf text-white' : 'bg-surf text-leaf-ink ring-2 ring-leaf',
      )}>
      <CheckIcon aria-hidden="true" className="size-5" />{learned ? 'ნასწავლია' : 'ვისწავლე'}
    </Press>
  </div>
);
