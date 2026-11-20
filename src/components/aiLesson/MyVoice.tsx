import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Mic, Music, RefreshCw, Star, Target, Trash2, Users, X } from 'lucide-react';
import { LINES, MASTERY_LEVELS } from '../../data/masteryPath';
import { useBackToClose } from '../../utils/backToClose';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';
import { lineMarks } from '../../utils/masteryPath';
import {
  PART_NAMES, bestAndWorst, factsOf, lineWord, noteOrdinal, partOfRange, phraseTries, rangeLabel, tenOf, triesWord, weekBars,
  worstLine, worstNote, type AiTake, type Fact, type FactSource, type WeekBar,
} from '../../utils/aiPlan';
import { askConfirm } from '../ui/kit';
import { Button, Card, Dot, Helper, Note, Press, Row, Rows, SectionLabel, Seg, ToggleRow, TopBar, cx, FOCUS, Bar } from '../ui2';
import { useMasteryPath } from '../mastery/useMasteryPath';
import { Bottom } from './parts';
import { forgetAiNote, saveAiNote, useAiNote } from './useAiNote';
import { pieceTitle } from './useLessonData';
import type { MyVoiceTab } from './open';

// „ჩემი ხმა“ — what the AI teacher keeps about the member, in three tabs (boards x-idea-dghiuri · x-idea-diapazoni ·
// x-ai-rveuli): „დღიური“ (how many notes in ten were right, week by week, from the lesson's tries), „ხმის ზომა“ (the measured
// range, „ნოტები ჩემს ხმაზე“, the part that suits it) and „AI-ს რვეული“ (the four lines of „ოსტატობის გზა“ and every line the
// teacher remembers, each deleted with its source). The wrapper reads the record; `MyVoiceView` draws it from props alone.

/** a phrase of the diary: whose and which (`part` from 0, shown from 1) */
export interface DiaryPhrase { piece: string; part: number; title: string }
/** one of the four lines' bars: its name and the share passed in the current level (0–1) */
export interface VoiceLine { name: string; share: number }

export interface MyVoiceViewProps {
  tab: MyVoiceTab;
  onTab: (t: MyVoiceTab) => void;
  /** false while the record is still coming: only the head and the tabs show */
  ready: boolean;
  /** the last eight weeks, oldest first (weekBars) */
  bars: WeekBar[];
  best: DiaryPhrase | null;
  worst: DiaryPhrase | null;
  /** the measured range (MIDI) and the part found; null = not measured yet */
  voice: { low: number; high: number; part?: 1 | 2 | 3 } | null;
  /** „ნოტები ჩემს ხმაზე“ */
  fit: boolean;
  onFit: (on: boolean) => void;
  /** ხმა · სმენა · რიტმი · გალობა, in that order */
  lines: VoiceLine[];
  facts: Fact[];
  onForget: (id: FactSource) => void;
  onForgetAll: () => void;
  onClose: () => void;
  onRemeasure: () => void;
  onPractice: (piece: string, part: number) => void;
  /** the „სავარჯიშოა“ row: the phrase's own page */
  onOpenPhrase: (ph: DiaryPhrase) => void;
}

const TABS: { id: MyVoiceTab; label: string }[] = [
  { id: 'diary', label: 'დღიური' }, { id: 'range', label: 'ხმის ზომა' }, { id: 'notebook', label: 'AI-ს რვეული' },
];

/** The page itself, everything by props. */
export const MyVoiceView: React.FC<MyVoiceViewProps> = p => (
  <>
    <TopBar title="ჩემი ხმა" onBack={p.onClose} className="px-4" />
    <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
      <Seg label="ჩემი ხმა" items={TABS} value={p.tab} onChange={p.onTab} />
      {p.ready && p.tab === 'diary' && <Diary {...p} />}
      {p.ready && p.tab === 'range' && <Range {...p} />}
      {p.ready && p.tab === 'notebook' && <Notebook {...p} />}
    </div>
    {p.ready && <BottomOf {...p} />}
  </>
);

// ——— „დღიური“ ———

/** the chart's height for the bars (the labels go under them in the same 128px) */
const BAR_MAX = 106;
const barHeight = (share: number) => Math.round(16 + Math.max(0, Math.min(1, share)) * (BAR_MAX - 16));
const phraseLine = (ph: DiaryPhrase) => `${ph.title} · ფრაზა ${ph.part + 1}`;

const Diary: React.FC<MyVoiceViewProps> = ({ bars, best, worst, onOpenPhrase }) => {
  // the week the big number tells: the newest with a try
  let at = -1;
  for (let i = bars.length - 1; i >= 0; i--) if (bars[i].tries) { at = i; break; }
  if (at < 0) {
    return (
      <Card className="p-[18px]">
        <p className="text-body leading-normal text-mut">დღიური პირველი გაკვეთილების შემდეგ შეივსება — აქ ყოველ კვირას გამოჩნდება, რამდენი ნოტი იმღერე ზუსტად.</p>
      </Card>
    );
  }
  const shown = bars[at];
  const thisWeek = at === bars.length - 1;
  const before = at > 0 && bars[at - 1].tries ? bars[at - 1] : null;
  const when = thisWeek ? 'ამ კვირას' : `${shown.label}-ის კვირას`;
  const sub = before && thisWeek ? `${when} · წინა კვირას 10-დან ${tenOf(before.share)} იყო` : when;
  return (
    <>
      <Card className="p-[18px]">
        <div className="flex items-baseline gap-2.5">
          <span className="text-hero leading-none font-bold text-wine">10-დან {tenOf(shown.share)}</span>
          <span className="text-body font-semibold">ნოტი ზუსტად</span>
        </div>
        <div className="mt-1.5 text-meta text-mut">{sub}</div>
        <div role="img" aria-label={bars.map(b => `${b.label}: ${b.tries ? `10-დან ${tenOf(b.share)}` : 'ცდა არ იყო'}`).join(', ')}
          className="mt-4 flex h-32 items-end gap-1.5">
          {bars.map((b, i) => (
            <span key={b.week} aria-hidden="true" className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {/* a week without a try keeps its empty track, so it never reads as a week sung wrong */}
              {b.tries
                ? <span className={cx('w-full max-w-[26px] rounded-chip', i === at ? 'bg-wine' : 'bg-dim')} style={{ height: barHeight(b.share) }} />
                : <span className="w-full max-w-[26px] rounded-chip border-[1.5px] border-dashed border-dim" style={{ height: BAR_MAX }} />}
              <span className="text-cap text-mut">{b.label}</span>
            </span>
          ))}
        </div>
      </Card>
      {best && (
        <Rows>
          <Row lead={<Dot icon={<Star />} />} title="ყველაზე კარგად" sub={best.title} wrap right={null} />
          {worst && (
            <Row lead={<Dot icon={<RefreshCw />} />} title="სავარჯიშოა" sub={phraseLine(worst)} wrap onClick={() => onOpenPhrase(worst)} />
          )}
        </Rows>
      )}
    </>
  );
};

// ——— „ხმის ზომა“ ———

/** the range bar's scale, MIDI: from a low bass to a high voice */
const SCALE_LOW = 40;
const SCALE_HIGH = 79;
const pct = (m: number) => Math.max(0, Math.min(100, ((m - SCALE_LOW) / (SCALE_HIGH - SCALE_LOW)) * 100));

const Range: React.FC<MyVoiceViewProps> = ({ voice, fit, onFit }) => {
  if (!voice) {
    return (
      <Card className="p-[18px]">
        <p className="text-body leading-normal text-mut">ხმა ჯერ არ გაგვიზომავს. ორ წუთში გავიგებთ, რომელი ნოტები გიდის თავისუფლად და რომელი ხმა შეგეფერება.</p>
      </Card>
    );
  }
  const left = pct(voice.low);
  const right = Math.max(left + 3, pct(voice.high));
  const [part, partWho] = PART_NAMES[voice.part ?? partOfRange(voice.low, voice.high)].split(' · ');
  return (
    <>
      <Card className="p-[18px]">
        <div className="text-meta font-semibold text-mut">თავისუფლად მღერი</div>
        <div className="mt-0.5 text-hero font-bold">{rangeLabel(voice.low, voice.high)}</div>
        <div aria-hidden="true" className="relative mx-0.5 mt-[18px] mb-2 h-4 rounded-chip bg-track">
          <span className="absolute inset-y-0 rounded-chip bg-wine" style={{ left: `${left}%`, right: `${100 - right}%` }} />
        </div>
        <div aria-hidden="true" className="flex justify-between text-meta text-mut">
          <span>დაბალი</span>
          <span>მაღალი</span>
        </div>
      </Card>
      <Rows>
        <ToggleRow lead={<Dot icon={<Music />} />} title="ნოტები ჩემს ხმაზე" sub="მაღალს თვითონ დავწევ" on={fit} onChange={onFit} />
        <Row lead={<Dot icon={<Users />} />} title={`შეგეფერება: ${part}`} sub={`${partWho} · მასწავლებელი წყვეტს`} right={null} />
      </Rows>
      <Note>იზომება ერთხელ, ორ წუთში. ხმაურში შეიძლება შეცდეს — ამიტომ ყოველთვის შეცვლი.</Note>
    </>
  );
};

// ——— „AI-ს რვეული“ ———

const Notebook: React.FC<MyVoiceViewProps> = ({ lines, facts, onForget }) => (
  <>
    <Card className="px-[18px] py-3">
      {lines.map(l => (
        <div key={l.name} className="flex min-h-10 items-center gap-3">
          <span className="w-[62px] shrink-0 text-body font-bold">{l.name}</span>
          <Bar value={l.share} h={8} className="min-w-0 flex-1" />
          <span className="w-[86px] shrink-0 text-right text-meta font-semibold text-mut">{lineWord(l.share)}</span>
        </div>
      ))}
    </Card>
    <SectionLabel label="რა ჩაინიშნა" />
    {facts.length ? (
      <>
        <Rows>
          {facts.map(f => (
            <Row key={f.id} title={f.title} sub={f.sub} wrap right={
              <Press aria-label={`წაშლა: ${f.title}`} title="წაშლა" onClick={() => onForget(f.id)} className={cx(
                'relative flex size-icon shrink-0 cursor-pointer items-center justify-center rounded-full bg-track text-mut transition active:scale-95',
                'before:absolute before:-inset-1 before:rounded-full [&_svg]:size-4',
                FOCUS,
              )}>
                <X strokeWidth={2} />
              </Press>
            } />
          ))}
        </Rows>
        <Helper icon={<Info strokeWidth={1.75} />}>AI-ს შენზე სხვა არაფერი ახსოვს. რასაც წაშლი, დაივიწყებს.</Helper>
      </>
    ) : (
      <Card className="p-[18px]">
        <p className="text-body leading-normal text-mut">AI-ს შენზე ჯერ არაფერი ჩაუნიშნავს. გაკვეთილების შემდეგ აქ გამოჩნდება, რა დაიმახსოვრა — და ყოველ ხაზს წაშლი.</p>
      </Card>
    )}
  </>
);

// ——— the button at the bottom of each tab ———

const BottomOf: React.FC<MyVoiceViewProps> = ({ tab, worst, voice, facts, onPractice, onRemeasure, onForgetAll }) => {
  if (tab === 'diary') {
    if (!worst) return null;
    return <Bottom><Button full icon={<Mic />} onClick={() => onPractice(worst.piece, worst.part)}>ვივარჯიშო ეს ფრაზა</Button></Bottom>;
  }
  if (tab === 'range') {
    return (
      <Bottom>
        {voice
          ? <Button full kind="ghost" icon={<Mic />} onClick={onRemeasure}>თავიდან გავზომო</Button>
          : <Button full icon={<Mic />} onClick={onRemeasure}>გავზომოთ · 2 წუთი</Button>}
      </Bottom>
    );
  }
  if (!facts.length) return null;
  return <Bottom><Button full kind="ghost" icon={<Trash2 />} onClick={onForgetAll}>ყველაფრის წაშლა</Button></Bottom>;
};

// ——— a phrase's page (board x-idea-dghiuri-2), opened from „სავარჯიშოა“ ———

/** „2 ნოე“ */
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT_GE[m - 1] ?? ''}`;
};
/** each note of a try, right or not: from its marks, else (an older try) its count of right notes first */
const notesOf = (t: AiTake): boolean[] =>
  t.x ? Array.from(t.x, c => c === '1') : Array.from({ length: t.n }, (_, i) => i < t.h);

export interface PhraseDiaryProps {
  phrase: DiaryPhrase;
  /** the phrase's last tries, newest last (phraseTries) */
  tries: AiTake[];
  onBack: () => void;
  onPractice: (piece: string, part: number) => void;
}

/** One phrase in the diary: each try's notes as dots, the note sung off most often, one button. Everything by props. */
export const PhraseDiaryView: React.FC<PhraseDiaryProps> = ({ phrase, tries, onBack, onPractice }) => {
  const worst = worstNote(tries);
  return (
    <>
      <TopBar title={phrase.title} sub={`ფრაზა ${phrase.part + 1} · ${triesWord(tries.length)}`} onBack={onBack} className="px-4" />
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        {tries.length ? (
          <Card className="px-[18px] pt-4 pb-1.5">
            <div className="pb-2 text-meta font-semibold text-mut">ზუსტი ნოტები ცდების მიხედვით</div>
            {tries.map((t, k) => {
              const notes = notesOf(t);
              return (
                <div key={k} className="flex items-center gap-3 border-t border-line py-[11px]">
                  <span className="w-14 shrink-0 text-meta font-semibold text-mut">{dayLabel(t.d)}</span>
                  <span aria-hidden="true" className={cx('flex min-w-0 flex-1', notes.length > 8 ? 'gap-0.5' : 'gap-[5px]')}>
                    {notes.map((ok, i) => <span key={i} className={cx('h-2.5 min-w-0 flex-1 rounded-full', ok ? 'bg-wine' : 'bg-dim')} />)}
                  </span>
                  <span className="w-[72px] shrink-0 text-right text-body font-bold whitespace-nowrap">{t.n}-დან {t.h}</span>
                </div>
              );
            })}
          </Card>
        ) : (
          <Card className="p-[18px]">
            <p className="text-body leading-normal text-mut">ამ ფრაზის ცდები ჯერ არ ჩანს. იმღერე გაკვეთილზე — და აქ გამოჩნდება.</p>
          </Card>
        )}
        {worst && (
          <Card>
            <div className="flex items-start gap-3">
              <Dot icon={<Target />} />
              <div className="min-w-0 flex-1">
                <div className="text-lead font-bold">{noteOrdinal(worst.i)}</div>
                <div className="text-body leading-snug font-semibold text-gold-ink">{worstLine(worst)}</div>
              </div>
            </div>
          </Card>
        )}
        <Helper icon={<Info strokeWidth={1.75} />}>ჩანს მხოლოდ შენი საკუთარი ცდები. სხვას არავის ეგზავნება.</Helper>
      </div>
      <Bottom><Button full icon={<Mic />} onClick={() => onPractice(phrase.piece, phrase.part)}>ვივარჯიშო 2 წუთი</Button></Bottom>
    </>
  );
};

// ——— the wrapper ———

/** a take's „piece~part“ */
const splitKey = (key: string): { piece: string; part: number } | null => {
  const i = key.lastIndexOf('~');
  const part = Number(key.slice(i + 1));
  return i > 0 && Number.isInteger(part) ? { piece: key.slice(0, i), part } : null;
};
const phraseOf = (key: string | undefined): DiaryPhrase | null => {
  const k = key ? splitKey(key) : null;
  return k ? { ...k, title: pieceTitle(k.piece) || 'საგალობელი' } : null;
};

/** „ჩემი ხმა“ over the whole screen, one layer above the lesson (so it opens over the lesson's start screen too). */
export const MyVoice: React.FC<{
  startTab?: MyVoiceTab;
  onClose: () => void;
  onRemeasure: () => void;
  onPractice: (piece: string, part: number) => void;
}> = ({ startTab = 'diary', onClose, onRemeasure, onPractice }) => {
  const [tab, setTab] = useState<MyVoiceTab>(startTab);
  const { uid, note, today } = useAiNote();
  const { record, summary } = useMasteryPath();

  const lines = useMemo((): VoiceLine[] => {
    const marks = lineMarks(MASTERY_LEVELS[summary.level] ?? MASTERY_LEVELS[0], record);
    // a line the level has no exercises of is behind the member
    return LINES.map(li => {
      const m = marks.find(x => x.line === li.id);
      return { name: li.name, share: m ? m.passed / m.total : 1 };
    });
  }, [record, summary.level]);
  const bars = useMemo(() => weekBars(note?.takes, today), [note?.takes, today]);
  const { best, worst } = useMemo(() => {
    const bw = bestAndWorst(note?.takes, today);
    return { best: phraseOf(bw.best?.p), worst: phraseOf(bw.worst?.p) };
  }, [note?.takes, today]);
  const facts = useMemo(() => factsOf(note ?? undefined, today), [note, today]);

  const forgetAll = async () => {
    if (!uid) return;
    const yes = await askConfirm({
      title: 'ყველაფერი წავშალო?',
      text: 'AI მასწავლებელი დაივიწყებს შენს ხმის ზომას, დღიურს და გაცნობის პასუხებს.',
      ok: 'წაშლა',
      danger: true,
    });
    if (yes) void forgetAiNote(uid, 'all');
  };

  // the phrase's page: an inner screen with its own „უკან“; the phone's back closes only it
  const [phrase, setPhrase] = useState<DiaryPhrase | null>(null);
  useBackToClose(!!phrase, () => setPhrase(null));
  const tries = useMemo(() => (phrase ? phraseTries(note?.takes, `${phrase.piece}~${phrase.part}`) : []), [phrase, note?.takes]);
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => { layer.current?.scrollTo({ top: 0 }); }, [phrase]);

  return (
    <div ref={layer} className="fixed inset-0 z-[75] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col">
        {phrase ? (
          <PhraseDiaryView phrase={phrase} tries={tries} onBack={() => setPhrase(null)} onPractice={onPractice} />
        ) : (
          <MyVoiceView
            tab={tab} onTab={setTab} ready={note !== null}
            bars={bars} best={best} worst={worst}
            voice={note?.voice ?? null} fit={note?.fit !== false} onFit={on => { if (uid) void saveAiNote(uid, { fit: on }); }}
            lines={lines} facts={facts}
            onForget={id => { if (uid) void forgetAiNote(uid, id); }} onForgetAll={() => void forgetAll()}
            onClose={onClose} onRemeasure={onRemeasure} onPractice={onPractice} onOpenPhrase={setPhrase}
          />
        )}
      </div>
    </div>
  );
};
