import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, HelpCircle, Leaf, Mic, Square } from 'lucide-react';
import { playStartNotes } from '../../utils/chantSynth';
import { startSinging, type SingSession } from '../../utils/singCapture';
import { liveWord, offPitch, warmNotes, WARM_BAND, WARM_HOLD_MS, type LessonLength } from '../../utils/aiLesson';
import { noteName } from '../../utils/pearls';
import { triggerHaptic } from '../../utils/haptics';
import { Bar, Button, Card, Dot, Rows, Row, Stats, cx } from '../ui2';
import type { PrepQuestion } from '../../utils/lessonPrep';
import { Bottom, CenterNote, TeacherSays, ToneCircle } from './parts';
import { usePlayer } from './usePlayer';
import type { Phrase } from './useLessonData';
import { melodyIn } from '../../utils/learn';
import { ChoirView } from './Choir';
import type { ChoirParts } from './choirMix';
import { useChoirTake } from './useChoirTake';

// The AI lesson's other screens: the warm-up, „გალობა“ (what is already known, all voices, not counted — my voice is
// listened to while the others sound, then heard back in the choir: Choir.tsx), the summary and the offer to rest.

/** „გახურება“: three notes from my voice's base, „მმმ“ on each, held three seconds; the next note sounds by itself. */
export const WarmStep: React.FC<{ base: number; onDone: () => void }> = ({ base, onDone }) => {
  const notes = warmNotes(base);
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(0);
  const [word, setWord] = useState<ReturnType<typeof liveWord>>('');
  const [listening, setListening] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [error, setError] = useState('');
  const session = useRef<SingSession | null>(null);
  const state = useRef({ at: 0, held: 0, lastT: 0, lastVoice: 0 });
  useEffect(() => () => session.current?.cancel(), []);

  const stop = () => { session.current?.cancel(); session.current = null; setListening(false); setWord(''); };
  const finish = () => { stop(); window.setTimeout(onDone, 1200); };

  const start = async () => {
    if (listening) { stop(); return; }
    setError(''); setQuiet(false);
    triggerHaptic(12);
    state.current = { at, held: 0, lastT: 0, lastVoice: 0 };
    setHeld(0);
    await playStartNotes([notes[at]], 0, false, 0.5, 1.4).catch(() => undefined);
    try {
      session.current = await startSinging((midi, t) => {
        const s = state.current;
        const dt = s.lastT ? t - s.lastT : 0;
        s.lastT = t;
        const goal = notes[s.at];
        if (midi != null) {
          s.lastVoice = t;
          setQuiet(false);
          setWord(liveWord(midi, goal, WARM_BAND));
          if (Math.abs(offPitch(midi, goal)) <= WARM_BAND) s.held += dt;
        } else if (t - s.lastVoice > 6000) setQuiet(true);
        setHeld(s.held);
        if (s.held >= WARM_HOLD_MS) {
          triggerHaptic(24);
          s.at += 1; s.held = 0;
          setAt(s.at);
          if (s.at >= notes.length) { finish(); return; }
          void playStartNotes([notes[s.at]], 0, false, 0.5, 1.2).catch(() => undefined);
        }
      });
      setListening(true);
    } catch {
      setError('მიკროფონი ვერ ჩაირთო. ბრაუზერს მიკროფონის ნება მიეცი და კიდევ სცადე.');
    }
  };

  const done = at >= notes.length;
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Card pad="none" className="px-4 pt-[18px] pb-5">
          <div className="text-center text-meta font-semibold text-mut">სამი ნოტი · თითო სამი წამი</div>
          <div className="mt-3.5 flex h-[112px] items-end justify-center gap-3.5">
            {notes.map((m, i) => (
              <div key={m} style={{ marginBottom: i * 18 }}>
                <ToneCircle name={noteName(m)} state={i < at ? 'done' : i === at ? 'now' : 'next'} />
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-title font-bold">{done ? 'ხმა გამთბარია' : 'იმღერე „მმმ“'}</div>
          {listening && !done && (
            <div className="mx-auto mt-3 max-w-[220px]">
              <Bar value={Math.min(1, held / WARM_HOLD_MS)} tone="gold" h={6} label="რამდენ ხანს გიჭირავს ნოტი" />
              <div className={cx('mt-2 text-center text-head font-bold', word === 'ზუსტად' ? 'text-leaf-ink' : 'text-gold-ink')}>
                {quiet ? 'ხმა ვერ გავიგონე' : word ? `${word}${word === 'ოდნავ მაღლა' ? ' ↑' : word === 'ოდნავ დაბლა' ? ' ↓' : ''}` : '…'}
              </div>
            </div>
          )}
        </Card>
        <TeacherSays text={quiet ? 'ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.' : 'ხმა გავათბოთ. მოუსმინე ნოტს და გააგრძელე.'}>
          {done ? 'კარგია. ახლა — გამეორება.' : quiet ? 'ხმა ვერ გავიგონე. ტელეფონი ახლოს მოიტანე.' : 'ხმა გავათბოთ. მოუსმინე ნოტს და გააგრძელე.'}
        </TeacherSays>
        {error && <p className="px-1.5 text-meta text-gold-ink">{error}</p>}
      </div>
      <Bottom>
        {listening
          ? <Button full icon={<Square fill="currentColor" />} onClick={stop}>დასრულება</Button>
          : <Button full icon={<Mic />} disabled={done} onClick={start}>ვმღერი</Button>}
      </Bottom>
    </>
  );
};

/** „გალობა“: the phrases already known, nothing counted. The microphone listens while the synthesizer sings the other
 *  voices; then „ასე ჟღერ გუნდში“ (Choir.tsx) — or, with no microphone or nothing heard, straight to the summary. */
export const SingStep: React.FC<{ phrase: Phrase; known: number[]; fresh: number | null; shift?: number; onDone: () => void }> = ({ phrase, known, fresh, shift = 0, onDone }) => {
  const { score, vi, parts } = phrase;
  const player = usePlayer(score, vi, 1, shift);
  const choir = useChoirTake();
  const [sung, setSung] = useState(false);
  const [making, setMaking] = useState(false);
  const [mix, setMix] = useState<ChoirParts | null>(null);
  const list = [...new Set(known)].sort((a, b) => a - b);
  const a = parts[list[0]] ?? parts[phrase.part];
  const b = parts[list[list.length - 1]] ?? parts[phrase.part];
  const end = async (complete: boolean) => {
    const startedAt = player.startedAt();
    player.stop();
    setSung(true);
    if (!choir.listening()) { window.setTimeout(onDone, 1200); return; }
    setMaking(true);
    const got = await choir.finish({ score, vi, shift, from: a.s0, to: b.s1, startedAt, complete });
    setMaking(false);
    if (got) setMix(got); else window.setTimeout(onDone, 1200);
  };
  const go = async () => {
    // during the count-in: called off; while sounding: ended here
    if (player.counting) { player.stop(); choir.cancel(); return; }
    if (player.playing) { if (choir.listening()) void end(false); else player.stop(); return; }
    const ears = await choir.listen();
    void player.along(a.s0, b.s1, ears ? 'others' : 'all', ears ? melodyIn(score, vi, a.b0, b.b1)[0] ?? null : null,
      { rounds: 1, onDone: () => void end(true) });
  };
  if (mix) return <ChoirView parts={mix} vi={vi} title={phrase.title} onNext={onDone} />;
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Card pad="none" className="px-4 py-[22px] text-center">
          <div className="text-title font-bold leading-snug">იგალობე, რაც უკვე იცი</div>
          <div className="mt-1.5 text-body text-mut">„{phrase.title}“ · {score.voices.length > 2 ? 'სამივე ხმა ჟღერს' : 'ყველა ხმა ჟღერს'}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {list.map(i => (
              <span key={i} className={cx('inline-flex h-icon items-center gap-1.5 rounded-full px-3.5 text-meta font-bold [&_svg]:size-3.5',
                i === fresh ? 'bg-tint text-wine' : 'bg-page text-ink')}>
                {i !== fresh && <Check strokeWidth={2.5} />}
                {`ფრაზა ${i + 1}${i === fresh ? ' · ახალი' : ''}`}
              </span>
            ))}
          </div>
        </Card>
        <TeacherSays text="ბოლოს — სიამოვნებისთვის. შეცდომას აღარ ვითვლი.">
          {making ? 'კარგი იყო. ახლა მოისმენ, როგორ ჟღერს.' : sung ? 'კარგი იყო. ახლა — შეჯამება.' : 'ბოლოს — სიამოვნებისთვის. შეცდომას აღარ ვითვლი.'}
        </TeacherSays>
      </div>
      <Bottom>
        {making
          ? <Button full disabled>ვამზადებ…</Button>
          : player.playing || player.counting
            ? <Button full icon={<Square fill="currentColor" />} onClick={go}>დასრულება</Button>
            : <Button full icon={<Mic />} disabled={sung} onClick={go}>ვგალობ</Button>}
      </Bottom>
    </>
  );
};

/** Teacher-approved questions about the chant's words: a tap shows the answer. */
const MiniQuiz: React.FC<{ items: PrepQuestion[] }> = ({ items }) => {
  const [open, setOpen] = useState<number[]>([]);
  return (
    <Rows>
      {items.map((it, i) => {
        const on = open.includes(i);
        return (
          <Row key={i} wrap lead={<Dot icon={<HelpCircle />} />} title={it.q}
            sub={on ? it.a : 'შეეხე — პასუხი გამოჩნდება'} right={null}
            aria-expanded={on} onClick={() => setOpen(o => (o.includes(i) ? o.filter(k => k !== i) : [...o, i]))} />
        );
      })}
    </Rows>
  );
};

/** „შეჯამება“: three numbers, one sentence, tomorrow — and only if wished, three minutes more. */
export const SummaryStep: React.FC<{
  learned: number; reviews: number; known: number; total: number; say: string; tomorrow: string; length: LessonLength;
  /** up to two questions about the chant's words the teacher approved (utils/lessonPrep.ts) */
  quiz?: PrepQuestion[];
  onFinish: () => void; onMore: () => void;
}> = ({ learned, reviews, known, total, say, tomorrow, quiz = [], onFinish, onMore }) => (
  <>
    <div className="flex flex-col gap-3 px-4 pb-4">
      <Stats items={[
        { value: learned, label: 'ახალი ფრაზა' },
        { value: reviews, label: 'გამეორება' },
        { value: total ? `${known} / ${total}` : '—', label: 'ფრაზა იცი' },
      ]} />
      <TeacherSays text={say}>{say}</TeacherSays>
      <Rows>
        <Row lead={<Dot icon={<CalendarDays />} />} title="ხვალ" sub={tomorrow} right={null} />
      </Rows>
      {quiz.length > 0 && <MiniQuiz items={quiz} />}
    </div>
    <Bottom>
      <Button full icon={<Check />} onClick={onFinish}>დასრულება</Button>
      <Button full kind="ghost" onClick={onMore}>კიდევ 3 წუთი მინდა</Button>
    </Bottom>
  </>
);

/** „დავისვენოთ“: offered after a long practice or when the tries keep falling. */
export const RestStep: React.FC<{ why: string; onStop: () => void; onMore: () => void }> = ({ why, onStop, onMore }) => (
  <>
    <CenterNote icon={<Leaf />} title="დავისვენოთ">{why}</CenterNote>
    <Bottom>
      <Button full icon={<Check />} onClick={onStop}>დღეისთვის საკმარისია</Button>
      <Button full kind="ghost" onClick={onMore}>კიდევ ერთი ცდა</Button>
    </Bottom>
  </>
);
