import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Ear, Headphones, Mic, Square, Users, Volume2 } from 'lucide-react';
import { makeTimeMap } from '../../utils/chantSynth';
import { afterTry, chunksOfPart, melodyGroups, melodyIn, timelineIn, type LearnChunk, type LearnRecord } from '../../utils/learn';
import { afterTake, diffLine, lastSeenWord, ordinal, splitLine, verdictLine, type NextMove } from '../../utils/aiLesson';
import { saveLearnPart } from '../../hooks/useLearning';
import { VoiceLine } from './VoiceLine';
import { Bar, Button, Card, Duo, Press, cx } from '../ui2';
import { LiveRoll, rollNotes, type RollMark } from './LiveRoll';
import { Bottom, CenterNote, PhraseCard, TeacherSays, Way } from './parts';
import { usePlayer } from './usePlayer';
import { useTake } from './useTake';
import type { Phrase } from './useLessonData';
import { recordTry } from './useAiNote';
import { CompareView } from './Compare';
import { TheoryNote } from './Theory';
// AI step 4 (ask, voice commands, the teacher's voice)
import { AskLink } from './AskExtras';
import { VoiceHeardCard, VoiceListenLine, useVoiceCommands } from './VoiceCommands';
import { hushTeacher } from './TeacherVoice';
import type { VoiceCommandId } from '../../utils/voiceCommands';

// One phrase in the AI lesson. „ახალი ფრაზა“: small pieces of my voice (heard, sung back — 70% passes), then „ერთად“
// (the other voices sound, three rounds), then „მარტო“ (the whole phrase, 80% learns it — students.learning, as the
// learning mode). „გამეორება“: the whole phrase once, two tries at most. After every try the teacher says up to three
// sentences (utils/aiLesson): the result, one correction, what to do; three tries that do not pass change the way
// (a smaller piece, then another day); a good try moves on by itself; the pace starts slow and rises after two good tries.
// A try that did not pass offers „შეადარე ყურით“ (Compare.tsx: my take and the phrase side by side); a new phrase with a
// rule the member has not met yet offers it once („პატარა თეორია“, Theory.tsx).

const PIECE_PASS = 0.7;
const WHOLE_PASS = 0.8;
const AUTO_NEXT_MS = 2200;
const REVIEW_TRIES = 2;

type Stage = { kind: 'piece'; i: number } | { kind: 'together' } | { kind: 'alone' };

/** three tries that did not pass (board x-ai-samjer): the stretch's first two notes alone, slowly — then the stretch
 *  again; null when it has two notes or fewer (nothing smaller to try) */
const firstTwo = (p: Phrase, c: LearnChunk): LearnChunk | null => {
  const groups = melodyGroups(p.score, p.vi, c.b0, c.b1);
  if (groups.length < 3) return null;
  const cut = groups[2][0];
  const { toSec } = makeTimeMap(p.score.tempos);
  return { b0: c.b0, b1: cut, s0: c.s0, s1: toSec(cut) };
};
const LATER = 'დღეს სხვა ფრაზა ვცადოთ. ამას ხვალ დავუბრუნდებით.';

export const PhraseStep: React.FC<{
  phrase: Phrase;
  mode: 'new' | 'review';
  rec: LearnRecord | undefined;
  uid: string | null;
  today: string;
  /** the part's minutes are over: after this try the lesson moves on */
  timeUp: () => boolean;
  /** a try's share, for the lesson's tally */
  onTry: (share: number) => void;
  /** the phrase learned (new) or remembered (review) */
  onLearned: () => void;
  /** this phrase is done — `again`: take the next phrase of the piece if time allows */
  onDone: (again: boolean) => void;
  /** the lesson's top shows the singing's state too */
  slow: boolean;
  setSlow: (v: boolean) => void;
  /** semitones the phrase is moved into the member's voice („ნოტები ჩემს ხმაზე“), 0 = as written */
  shift?: number;
  /** AI step 4: „ჰკითხე მასწავლებელს“ under the phrase (AskExtras), none when the AI teacher is off for the person */
  onAsk?: () => void;
  /** AI step 4: the voice commands listen between tries (VoiceCommands) */
  voiceCommands?: boolean;
}> = ({ phrase, mode, rec, uid, today, timeUp, onTry, onLearned, onDone, slow, setSlow, shift = 0, onAsk, voiceCommands = false }) => {
  const { score, vi, parts } = phrase;
  const part = parts[phrase.part];
  const review = mode === 'review';
  const many = score.voices.length > 1;
  const [pieces, setPieces] = useState<LearnChunk[]>(() => chunksOfPart(score, vi, part));
  const [split, setSplit] = useState(false);
  /** the piece the way was changed at (its line says so), -1 none */
  const [splitAt, setSplitAt] = useState(-1);
  /** „შეადარე ყურით“ open in place of the phrase */
  const [comparing, setComparing] = useState(false);
  const firstStage: Stage = review ? { kind: 'alone' } : pieces.length > 1 ? { kind: 'piece', i: 0 } : many ? { kind: 'together' } : { kind: 'alone' };
  const [stage, setStage] = useState<Stage>(firstStage);
  const [shares, setShares] = useState<number[]>([]);
  const [slowGood, setSlowGood] = useState(0);
  const [said, setSaid] = useState<{ say: string; move: NextMove; focus: number; passed: boolean } | null>(null);
  const [rounds, setRounds] = useState(0);
  const [learnedNow, setLearnedNow] = useState(false);
  const autoTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(autoTimer.current), []);

  const speed = review ? (split ? 0.75 : 1) : slow ? 0.75 : 1;
  const player = usePlayer(score, vi, speed, shift);

  // the phrase's notes as bars, and the stretch asked now
  const phraseNotes = useMemo(() => rollNotes(timelineIn(score, vi, part.b0, part.b1)), [score, vi, part]);
  const range = stage.kind === 'piece' && pieces[stage.i] ? pieces[stage.i] : part;
  const target = useMemo(() => melodyIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const lengths = useMemo(() => rollNotes(timelineIn(score, vi, range.b0, range.b1)).map(n => n.len), [score, vi, range.b0, range.b1]);
  // which bars of the phrase are the stretch's: from the first bar starting inside it, as many as it has
  const from = useMemo(() => {
    const t = range.s0 - part.s0;
    const k = phraseNotes.findIndex(n => n.t0 >= t - 0.02);
    return k < 0 ? 0 : k;
  }, [phraseNotes, range.s0, part.s0]);
  const stageKey = `${phrase.piece}|${phrase.part}|${stage.kind}|${stage.kind === 'piece' ? stage.i : ''}|${range.b0}|${range.b1}`;
  const take = useTake({ target, lengths, transpose: shift, resetKey: stageKey, onBefore: player.stop });
  useEffect(() => { setShares([]); setSaid(null); setRounds(0); setComparing(false); }, [stageKey]);

  const passMark = stage.kind === 'piece' ? PIECE_PASS : WHOLE_PASS;
  const learnedCount = Object.entries(rec || {}).filter(([k, r]) => Number(k) < parts.length && r.level >= 1).length + (learnedNow && !(rec?.[phrase.part]?.level ?? 0) ? 1 : 0);

  const goStage = (s: Stage) => { window.clearTimeout(autoTimer.current); player.stop(); take.cancel(); setStage(s); };
  const afterPieces = () => goStage(many ? { kind: 'together' } : { kind: 'alone' });
  const nextStage = () => {
    if (stage.kind === 'piece') {
      if (stage.i + 1 < pieces.length) goStage({ kind: 'piece', i: stage.i + 1 });
      else afterPieces();
    } else if (stage.kind === 'together') goStage({ kind: 'alone' });
  };

  // a take ends: read it, say it, save it, and move
  const doneFor = useRef('');
  useEffect(() => {
    const r = take.result;
    if (!r || take.phase !== 'done') return;
    const key = `${stageKey}|${shares.length}`;
    if (doneFor.current === key) return;
    doneFor.current = key;
    const said = afterTake(r.read, { before: shares, slow: speed < 1, slowGood, split, pass: passMark });
    const passed = r.read.heard && said.share >= passMark;
    setShares(s => [...s, said.share]);
    onTry(said.share);
    // the AI teacher's notebook: the leaps missed, and a whole phrase's try for the diary
    if (r.read.heard) recordTry(uid, phrase.piece, phrase.part, target, r.read.notes, stage.kind === 'alone');
    if (stage.kind === 'alone' && r.read.heard) {
      // the whole phrase: saved as the learning mode saves it (a review on its day moves it on)
      const next = afterTry(rec?.[phrase.part], Math.round(said.share * 100), passed, today);
      saveLearnPart(uid, phrase.piece, phrase.part, next);
      if (passed) { setLearnedNow(true); onLearned(); }
    }
    if (said.move === 'tempo') { setSlow(false); setSlowGood(0); } else if (speed < 1 && passed) setSlowGood(n => n + 1); else setSlowGood(0);
    let text = said.say;
    if (passed && stage.kind === 'alone' && !review) text = `${verdictLine(r.read.hits, r.read.n)} ${ordinal(phrase.part + 1)} ფრაზა ნასწავლია.`;
    if (passed && review) text = `${verdictLine(r.read.hits, r.read.n)} გავიხსენეთ.`;
    if (!passed && review && shares.length + 1 >= REVIEW_TRIES && r.read.heard) text = `${said.say} ხვალ კიდევ გავიმეორებთ.`.trim();
    // a three-tries change of way: the first two notes alone and slower (the new piece's own line says so), then the
    // stretch again; nothing smaller to try → another day
    let move = said.move;
    if (move === 'split') {
      const two = firstTwo(phrase, stage.kind === 'piece' ? pieces[stage.i] : { b0: part.b0, b1: part.b1, s0: part.s0, s1: part.s1 });
      if (two) {
        setSplit(true);
        if (!review) setSlow(true);
        if (stage.kind === 'piece') {
          setPieces(p => [...p.slice(0, stage.i), two, ...p.slice(stage.i)]);
          setSplitAt(stage.i);
        } else {
          setPieces([two, ...chunksOfPart(score, vi, part)]);
          setSplitAt(0);
          goStage({ kind: 'piece', i: 0 });
        }
      } else { move = 'later'; text = LATER; }
    }
    setSaid({ say: text, move, focus: said.focus, passed });
    // a good piece moves on by itself; time over moves the lesson on
    if (passed && stage.kind === 'piece') autoTimer.current = window.setTimeout(nextStage, AUTO_NEXT_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [take.result, take.phase]);

  // — „ერთად“ —
  const singAlong = () => {
    if (player.playing || player.counting) { player.stop(); return; }
    setRounds(0);
    void player.along(part.s0, part.s1, 'others', target[0] ?? null, {
      rounds: 3,
      onRound: n => setRounds(n),
      onDone: () => { setSaid({ say: 'სამი წრე მორჩა. ახლა — მარტო.', move: 'done', focus: -1, passed: true }); autoTimer.current = window.setTimeout(() => goStage({ kind: 'alone' }), 1600); },
    });
  };

  // the bars' marks: done pieces and the phrase sung right are wine; the stretch asked now is gold; after a take its notes
  const marks: RollMark[] = phraseNotes.map((_, i) => {
    const inStretch = i >= from && i < from + target.length;
    const r = take.result?.read;
    if (inStretch && r && take.phase === 'done') return r.notes[i - from]?.hit ? 'hit' : 'miss';
    if (take.phase === 'singing' && inStretch) return i - from < 0 ? 'hit' : 'wait';
    if (inStretch) return stage.kind === 'alone' ? 'wait' : 'now';
    if (stage.kind === 'piece') return i < from ? 'hit' : 'wait';
    return 'wait';
  });
  const devs = phraseNotes.map((_, i) => (i >= from && i < from + target.length ? take.result?.read.notes[i - from]?.dev ?? null : null));
  const focusBar = said && said.focus >= 0 ? from + said.focus : -1;
  const pieceStart = range.s0 - part.s0;
  const playhead = player.at != null ? (stage.kind === 'together' ? player.at : pieceStart + player.at) : null;

  const learnedAll = Math.min(parts.length, learnedCount);
  const caption = review
    ? `${phrase.title} · ფრაზა ${phrase.part + 1} · ${lastSeenWord(rec?.[phrase.part]?.at || today, today)}`
    : `${phrase.title} · ფრაზა ${phrase.part + 1} / ${parts.length}`;
  const picture = part.sys.length ? (
    <VoiceLine score={score} sys={part.sys} vi={vi} span={stage.kind === 'piece' ? [range.b0, range.b1] : null} />
  ) : null;

  // ——— what shows ———
  const phase = take.phase;
  const singing = phase === 'cue' || phase === 'singing' || phase === 'scoring';
  const heardNothing = phase === 'done' && take.result && !take.result.read.heard;

  // ——— AI step 4: the teacher's voice never sounds into a take; „ხმით მართვა“ does what the buttons do ———
  useEffect(() => { if (singing || player.counting) hushTeacher(); }, [singing, player.counting]);
  const runCommand = (id: VoiceCommandId): string => {
    hushTeacher();
    window.clearTimeout(autoTimer.current);
    if (id === 'stop') { player.stop(); return 'გავჩერდი. თქვი, რა გავაკეთო.'; }
    if (id === 'slow') {
      if (review) return 'გამეორებაში ნამდვილი ტემპით ვმღერით.';
      setSlow(true);
      return 'ტემპი — 75%';
    }
    if (id === 'listen') {
      if (stage.kind === 'together') { void player.listen(part.s0, part.s1, 'all'); return 'ყველა ხმა ჟღერს'; }
      void player.listen(range.s0, range.s1, 'mine');
      return 'შენი ხმა ჟღერს';
    }
    if (id === 'again') {
      if (stage.kind === 'together') { singAlong(); return 'ერთად — თავიდან'; }
      setComparing(false);
      void take.start();
      return 'პირველი ნოტი ისმის — იმღერე';
    }
    if (stage.kind === 'piece') { nextStage(); return 'შემდეგი ნაწილი'; }
    if (stage.kind === 'together') { goStage({ kind: 'alone' }); return 'ახლა — მარტო'; }
    onDone(!review && said?.passed === true && !timeUp());
    return 'შემდეგზე გადავდივართ';
  };
  const cmd = useVoiceCommands({ on: voiceCommands && !comparing, busy: singing || player.playing || player.counting, run: runCommand });

  if (heardNothing) {
    return (
      <>
        <CenterNote icon={<Mic />} title="ხმა ვერ გავიგონე">ტელეფონი ახლოს მოიტანე ან უფრო წყნარი ადგილი მოძებნე.</CenterNote>
        <Bottom>
          <Button full icon={<Mic />} onClick={take.start}>კიდევ ვცდი</Button>
          <MicCheck />
        </Bottom>
      </>
    );
  }

  // „შეადარე ყურით“: after a try that did not pass, my take and the stretch side by side
  const read = phase === 'done' ? take.result?.read : undefined;
  // only while another try is offered here
  const canCompare = !!said && !said.passed && !!read?.heard && said.move !== 'split' && said.move !== 'later' && stage.kind !== 'together'
    && !(review && shares.length >= REVIEW_TRIES) && !timeUp();
  if (comparing && canCompare && read && take.result) {
    const want: RollMark[] = phraseNotes.map((_, i) => (i < from + target.length && (stage.kind === 'piece' || i >= from) ? 'hit' : 'wait'));
    // without a recording: the notes I sang, on the synthesizer, at the stretch's places
    const sung = read.notes.flatMap((x, i): [number, number, number][] => {
      const bar = phraseNotes[from + i];
      return x.dev == null || !bar ? [] : [[(bar.t0 - pieceStart) / speed, bar.len / speed, target[i] + shift + x.dev]];
    });
    return (
      <CompareView notes={phraseNotes} mine={{ marks, devs }} want={{ marks: want }} line={diffLine(read, said?.focus ?? -1)}
        mp3={take.result.mp3} sung={sung} playhead={playhead} wantPlaying={player.playing} stopWant={player.stop}
        onWant={() => (player.playing ? player.stop() : void player.listen(range.s0, range.s1, 'mine'))}
        onAgain={() => { setComparing(false); void take.start(); }} />
    );
  }

  let teacher: React.ReactNode;
  if (said) teacher = said.say;
  else if (stage.kind === 'piece') {
    const n = target.length;
    teacher = stage.i === 0 ? `ჯერ პირველი ${n} ნოტი. მოუსმინე და გაიმეორე.` : `ახლა შემდეგი ${n} ნოტი. მოუსმინე და გაიმეორე.`;
    if (stage.i === splitAt && !shares.length) teacher = splitLine(n, speed < 1);
  } else if (stage.kind === 'together') teacher = score.voices.length > 2 ? 'ახლა ყველა ერთად. ორი ხმა შენ გელოდება.' : 'ახლა ერთად. მეორე ხმა შენ გელოდება.';
  else teacher = review ? 'ეს ფრაზა ადრე ისწავლე. ერთხელ იმღერე — გავიხსენოთ.' : 'ახლა მარტო — მთელი ფრაზა.';
  if (review && !said && rec?.[phrase.part]?.at) teacher = `ეს ფრაზა ${lastSeenWord(rec[phrase.part].at, today).replace('ბოლოს ', '')} ისწავლე. ერთხელ იმღერე — გავიხსენოთ.`;

  const wayAt = stage.kind === 'piece' ? 0 : stage.kind === 'together' ? 1 : 2;
  const listenWho = 'mine' as const;

  // the bottom buttons
  let bottom: React.ReactNode;
  if (stage.kind === 'together') {
    bottom = player.playing || player.counting
      ? <Button full icon={<Square fill="currentColor" />} onClick={singAlong}>დასრულება</Button>
      : <Button full icon={<Users />} onClick={singAlong}>{rounds > 0 ? 'გააგრძელე ერთად' : 'დაიწყე ერთად'}</Button>;
  } else if (singing) {
    bottom = <Button full icon={<Square fill="currentColor" />} disabled={phase === 'scoring'} onClick={take.start}>{phase === 'cue' ? 'ისმის პირველი ნოტი…' : 'დასრულება'}</Button>;
  } else if (said?.passed || (said && (said.move === 'later'))) {
    const learnedPhrase = stage.kind === 'alone';
    const go = () => {
      window.clearTimeout(autoTimer.current);
      if (stage.kind === 'piece') nextStage();
      else onDone(learnedPhrase && !review && said?.passed === true && !timeUp());
    };
    bottom = <Button full icon={<ChevronRight />} onClick={go}>გავაგრძელოთ</Button>;
  } else if (said && !said.passed && (timeUp() || (review && shares.length >= REVIEW_TRIES))) {
    bottom = <Button full icon={<ChevronRight />} onClick={() => onDone(false)}>გავაგრძელოთ</Button>;
  } else {
    const hearNote = said && said.focus >= 0 && target[said.focus] != null;
    bottom = (
      <Duo>
        {hearNote
          ? <Button kind="ghost" icon={<Headphones />} onClick={() => player.note(target[said!.focus])}>ის ნოტი</Button>
          : <Button kind="ghost" icon={player.playing ? <Square fill="currentColor" /> : <Headphones />}
              onClick={() => (player.playing ? player.stop() : player.listen(range.s0, range.s1, listenWho))}>
              {player.playing ? 'გაჩერება' : 'მოვუსმენ'}
            </Button>}
        <Button icon={<Mic />} onClick={take.start}>{said ? 'კიდევ ვცდი' : review || stage.kind === 'alone' ? 'ვმღერი' : 'ვიმეორებ'}</Button>
      </Duo>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {!review && <Way on={wayAt} />}
        {stage.kind === 'together' ? (
          <>
            {score.voices.slice(0, 3).map((_, i) => <Lane key={i} n={i} me={i === vi} on={player.playing} />)}
          </>
        ) : (
          <PhraseCard caption={caption} picture={picture}>
            <LiveRoll notes={phraseNotes} marks={marks} devs={devs} focus={focusBar} trace={singing || phase === 'done' ? take.trace : undefined}
              offset={take.offset} playhead={playhead} traceSpan={[pieceStart, pieceStart + (range.s1 - range.s0)]} />
          </PhraseCard>
        )}
        {phase === 'singing' ? (
          <div className="shrink-0 pt-2 text-center">
            <div className={cx('text-hero font-bold', take.word === 'ზუსტად' ? 'text-leaf-ink' : 'text-gold-ink')}>
              {take.word ? `${take.word}${take.word === 'ოდნავ მაღლა' ? ' ↑' : take.word === 'ოდნავ დაბლა' ? ' ↓' : ''}` : '…'}
            </div>
            <div className="mt-1 text-body text-mut">გისმენ… ოქროსფერი ხაზი შენი ხმაა</div>
          </div>
        ) : cmd.heard ? (
          <VoiceHeardCard heard={cmd.heard} />
        ) : (
          <TeacherSays text={typeof teacher === 'string' ? teacher : undefined}
            sub={canCompare ? <CompareLink onClick={() => { player.stop(); setComparing(true); }} /> : undefined}>{teacher}</TeacherSays>
        )}
        {take.error && <p className="px-1.5 text-meta text-gold-ink">{take.error}</p>}
        {/* AI step 4: the commands' quiet line and „ჰკითხე მასწავლებელს“ */}
        {voiceCommands && !cmd.heard && !singing && <VoiceListenLine state={cmd.state} error={cmd.error} />}
        {onAsk && !singing && <AskLink onClick={() => { player.stop(); onAsk(); }} />}
        {stage.kind === 'alone' && !review && said?.passed && (
          <Card pad="none" className="px-[18px] py-3.5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-body font-bold">ეს საგალობელი</span>
              <span className="text-meta text-mut">{parts.length} ფრაზიდან {learnedAll} იცი</span>
            </div>
            <Bar value={parts.length ? learnedAll / parts.length : 0} h={8} />
          </Card>
        )}
      </div>
      <Bottom>{bottom}</Bottom>
      {!review && (
        <TheoryNote phrase={phrase} hold={take.busy || player.playing || player.counting} playing={player.playing} stop={player.stop}
          play={(a, b, who) => void player.listen(a, b, who)} />
      )}
    </>
  );
};

/** The quiet link under the teacher's words after a try that did not pass. */
const CompareLink: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Press onClick={onClick}
    className="-my-2.5 inline-flex h-tap cursor-pointer items-center gap-1.5 rounded-full font-bold text-wine underline decoration-wine/35 underline-offset-[3px] [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60">
    <Ear aria-hidden="true" />შეადარე ყურით
  </Press>
);

/** A voice's lane in „ერთად“: whose it is and its marks; mine is tinted, with the microphone. */
const Lane: React.FC<{ n: number; me: boolean; on: boolean }> = ({ n, me, on }) => (
  <div className={cx('flex shrink-0 items-center gap-2.5 rounded-tile p-3.5', me ? 'bg-tint' : 'bg-surf')}>
    <div className="w-[92px] shrink-0">
      <div className="text-body font-bold">{['I', 'II', 'III'][n]} ხმა</div>
      <div className="text-meta text-mut">{me ? 'შენ' : 'AI მღერის'}</div>
    </div>
    <div aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
      {[26, 18, 34, 22, 26].map((w, i) => (
        <span key={i} className={cx('h-2.5 shrink-0 rounded-full', me ? 'bg-wine' : 'bg-dim', on && !me && 'animate-pulse')} style={{ width: w }} />
      ))}
    </div>
    <span className={cx('shrink-0 [&_svg]:size-[18px]', me ? 'text-wine' : 'text-mut')}>{me ? <Mic /> : <Volume2 />}</span>
  </div>
);

/** „მიკროფონის შემოწმება“: three seconds of listening, then one sentence. */
const MicCheck: React.FC = () => {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'quiet' | 'off'>('idle');
  const check = async () => {
    setState('busy');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let peak = 0;
      const t0 = performance.now();
      await new Promise<void>(res => {
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          for (const v of buf) peak = Math.max(peak, Math.abs(v));
          if (performance.now() - t0 > 3000) res(); else requestAnimationFrame(tick);
        };
        tick();
      });
      stream.getTracks().forEach(t => t.stop());
      ctx.close().catch(() => undefined);
      setState(peak > 0.05 ? 'ok' : 'quiet');
    } catch { setState('off'); }
  };
  const word = { idle: '', busy: 'ილაპარაკე ან იმღერე — გისმენ…', ok: 'მიკროფონი გისმენს.', quiet: 'მიკროფონი ძალიან ჩუმად ისმის.', off: 'მიკროფონს ნება არ აქვს.' }[state];
  return (
    <>
      <Button kind="ghost" full disabled={state === 'busy'} onClick={check}>მიკროფონის შემოწმება</Button>
      {word && <p className="text-center text-meta text-mut" aria-live="polite">{word}</p>}
    </>
  );
};
