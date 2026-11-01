import React, { useEffect, useRef, useState } from 'react';
import { Heart, Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import { MELODY_POOL } from '../../../data/melodyPool';
import {
  MPRINAVI_LIVES, NOTE_NAMES, flightAnswer, flightNotes, flightSeconds, newFlight, staffPos, stepOf, type FlyNote, type Flight, type NameKind,
} from '../../../utils/mprinavi';
import { betterRun } from '../../../utils/soloRun';
import { tbilisiToday } from '../../../utils/hangi';
import { lessonAudioReady, playLessonNotes } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Btn, Card } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { readSoloBest, setSoloBest, useSoloBest } from '../rounds/soloStore';
import { sound } from '../eqo/Keys';
import { NameButtons } from './Names';
import { MprinaviOptions } from './Options';
import { CLEF_END, NoteMark, Staff, yOf } from './Staff';
import { BEST, CLASS_BEST, clefs, names, readSeen, rememberAsked } from './store';

// „მფრინავი ნოტები“'s flight (like Staff Wars): the notes of the app's melodies, one after another in their order, fly across the
// staff from the right towards the clef; a tap on its name before it gets there names it (and it sounds), a wrong name or a
// note that gets there costs one of three lives. After every four named right they fly a little faster (utils/mprinavi.ts).
// Alone: my record, on this phone. Round the circle on one phone: a note each in the circle's order — the phone passed on,
// „მზად ვარ“ starts each one's note — three lives for the whole class, the class's record and who named how many.

const W = 340;
const X_START = W - 34;
const X_END = CLEF_END - 2;

type Phase = 'wait' | 'fly' | 'hit' | 'miss' | 'over';
interface Result { right: number; ms: number }

const FlightScreen: React.FC<{
  notes: FlyNote[]; kind: NameKind; circle: boolean; who: string[]; best: number | null; onEnd: (r: Result) => void; onClose: () => void;
  onAgain: () => void; record: boolean; title: string;
}> = ({ notes, kind, circle, who, best, onEnd, onClose, onAgain, record, title }) => {
  const [f, setF] = useState<Flight>(newFlight);
  const [phase, setPhase] = useState<Phase>('wait');
  const [mark, setMark] = useState<{ step: number; ok: boolean } | null>(null);
  const [tally, setTally] = useState<number[]>(() => who.map(() => 0));
  const t0 = useRef(Date.now());
  const g = useRef<SVGGElement | null>(null);
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);
  const note = notes[f.at];
  const turn = who.length ? f.at % who.length : -1;

  const after = (ok: boolean, ms: number) => {
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => {
      const n = flightAnswer(f, ok, notes.length);
      setF(n);
      setMark(null);
      if (n.over) { setPhase('over'); onEnd({ right: n.right, ms: Date.now() - t0.current }); return; }
      setPhase(circle ? 'wait' : 'fly');
    }, ms);
  };
  // the note flies: its x moved each frame (no render), its time over is a miss
  useEffect(() => {
    if (phase !== 'fly' || !note) return;
    const secs = flightSeconds(f.right);
    const start = performance.now();
    let raf = 0;
    const step = () => {
      const p = (performance.now() - start) / (secs * 1000);
      g.current?.setAttribute('transform', `translate(${X_START - Math.min(1, p) * (X_START - X_END)} 0)`);
      if (p >= 1) { triggerHaptic(30); setPhase('miss'); after(false, 1100); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, f.at]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => {
    // the first tap lets the synthesizer sound
    if (!lessonAudioReady()) void playLessonNotes([]);
    triggerHaptic(10);
    if (f.at === 0) t0.current = Date.now();
    setPhase('fly');
  };
  const name = (s: number) => {
    if (phase !== 'fly' || !note) return;
    const ok = s === stepOf(note.midi);
    setMark({ step: s, ok });
    sound(note.clef === 'treble' ? note.midi - 12 : note.midi);
    if (ok) {
      triggerHaptic(10);
      if (turn >= 0) setTally(t => t.map((x, i) => (i === turn ? x + 1 : x)));
      setPhase('hit');
      after(true, 380);
    } else {
      triggerHaptic(30);
      setPhase('miss');
      after(false, 1100);
    }
  };

  if (phase === 'over') {
    const order = who.map((_, i) => i).sort((a, b) => tally[b] - tally[a] || a - b);
    return (
      <TableScreen
        title={title}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ხელახლა</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4 text-center">
          <Trophy className="w-10 h-10 mx-auto text-[#c9a227]" />
          <p className="font-serif-ge text-[30px] font-bold tabular-nums text-[#4a3426]">{f.right} ნოტი</p>
          <Hint>{circle ? 'ამდენი ნოტი დაასახელა კლასმა ერთად' : 'ამდენი ნოტი დაასახელე სწორად'}</Hint>
          {record && <p className="inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]">{circle ? 'კლასის ახალი რეკორდი!' : 'ახალი რეკორდი!'}</p>}
          {who.length > 0 && (
            <ol className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 space-y-1 text-left">
              {order.map(i => (
                <li key={i} className="flex items-center justify-between gap-3 text-[14px] font-bold text-[#4a3426]">
                  <span className="min-w-0 truncate">{who[i]}</span>
                  <span className="shrink-0 tabular-nums text-[#7a2028]">{tally[i]}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </TableScreen>
    );
  }

  const lives = Array.from({ length: MPRINAVI_LIVES }, (_, i) => i < f.lives);
  const level = Math.floor(f.right / 4) + 1;
  const tone = phase === 'hit' ? 'right' : phase === 'miss' ? 'wrong' : 'now';
  const right = note ? NOTE_NAMES[kind][stepOf(note.midi) ?? 0] : '';
  return (
    <TableScreen title={title} onClose={onClose} footer={phase === 'wait' ? <Btn size="lg" full onClick={go} icon={<Play />} className="!h-14 !text-[16px]">{circle && f.at > 0 ? 'მზად ვარ' : 'დაწყება'}</Btn> : undefined}>
      <div className="py-2 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1" aria-label={`სიცოცხლე: ${f.lives}`}>
            {lives.map((on, i) => <Heart key={i} className={`w-5 h-5 ${on ? 'fill-[#b23a48] text-[#b23a48]' : 'text-[#d9c9ae]'}`} />)}
          </span>
          <span className="text-[13px] font-bold tabular-nums text-[#4a3426]">{f.right} ნოტი · დონე {level}</span>
          {best !== null && <span className="text-[12.5px] font-bold tabular-nums text-[#8a6d12]">რეკორდი: {best}</span>}
        </div>
        {circle && (
          <p className="text-center font-serif-ge text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">
            {turn < 0 ? (phase === 'wait' && f.at > 0 ? 'გადაეცი შემდეგს' : '') : phase === 'wait' ? `ახლა: ${who[turn]}` : who[turn]}
          </p>
        )}
        <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-2 pt-2 pb-1">
          <p className="px-2 text-[12px] font-bold leading-snug text-[#75685a] truncate">{note ? `„${note.title}“-ის ნოტები · ${note.clef === 'treble' ? 'სოლის გასაღები' : 'ფას გასაღები'}` : ''}</p>
          <div className="relative">
            <Staff clef={note?.clef ?? 'treble'} width={W}>
              {note && phase !== 'wait' && (
                <g ref={g} transform={`translate(${X_START} 0)`}>
                  <NoteMark midi={note.midi} clef={note.clef} x={0} tone={tone} />
                  {phase === 'miss' && (
                    <text x={30} y={yOf(staffPos(note.midi, note.clef)) + 6} className="font-serif-ge" fontSize={17} fontWeight={700} fill="#9a3412">{right}</text>
                  )}
                </g>
              )}
            </Staff>
          </div>
        </section>
        <p className={`min-h-[1.5rem] text-center text-[14px] font-bold ${phase === 'hit' ? 'text-[#2f7d4f]' : phase === 'miss' ? 'text-[#9a3412]' : 'text-[#75685a]'}`} role="status">
          {phase === 'hit' ? `სწორია — ${right}` : phase === 'miss' ? `${mark ? 'არა' : 'ვერ მოასწარი'} — ეს ${right} იყო` : phase === 'wait' ? (circle ? 'გამოართვი ტელეფონი და დააჭირე, როცა მზად იქნები' : 'ნოტი მარჯვნიდან მოფრინავს — დაასახელე, სანამ გასაღებამდე მიაღწევს') : ''}
        </p>
        <NameButtons kind={kind} disabled={phase !== 'fly'} onName={name} mark={mark} />
      </div>
    </TableScreen>
  );
};

/** a new flight's notes: the clef and the names as chosen now, the melodies not asked lately first */
const makeNotes = () => {
  const list = flightNotes(MELODY_POOL, clefs.read(), readSeen());
  rememberAsked([...new Set(list.slice(0, 120).map(n => n.melody))]);
  return list;
};

export const MprinaviSolo: React.FC = () => {
  const best = useSoloBest(BEST);
  const [game, setGame] = useState<{ notes: FlyNote[]; kind: NameKind; n: number } | null>(null);
  const [record, setRecord] = useState(false);
  const start = () => { setRecord(false); setGame(g => ({ notes: makeNotes(), kind: names.read(), n: (g?.n ?? 0) + 1 })); };
  if (game) {
    return (
      <FlightScreen
        key={game.n}
        notes={game.notes}
        kind={game.kind}
        circle={false}
        who={[]}
        best={best?.score ?? null}
        record={record}
        title="მფრინავი ნოტები"
        onEnd={r => {
          const rec = r.right > 0 && betterRun({ score: r.right, ms: r.ms }, best);
          if (rec) setSoloBest(BEST, { score: r.right, right: r.right, ms: r.ms, at: tbilisiToday() });
          setRecord(rec);
        }}
        onClose={() => setGame(null)}
        onAgain={start}
      />
    );
  }
  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">რამდენ ნოტს დაასახელებ?</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
          შენ მარტო: ნოტები ერთმანეთის მიყოლებით მიფრინავენ — ნამდვილი საგალობლებისა და სიმღერების მელოდიებიდან. დაასახელე თითოეული, სანამ გასაღებამდე მიაღწევს. სამი შეცდომა და თამაში მთავრდება; ყოველ ოთხ სწორზე უფრო ჩქარა მიფრინავენ.
        </p>
      </div>
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Timer className="w-4 h-4 shrink-0" />შენი რეკორდი: {best.score} ნოტი
        </p>
      )}
      <MprinaviOptions />
      <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
    </Card>
  );
};

export const MprinaviCircle: React.FC = () => {
  const who = useCircleNames();
  const best = useSoloBest(CLASS_BEST);
  const [game, setGame] = useState<{ notes: FlyNote[]; kind: NameKind; who: string[]; n: number } | null>(null);
  const [record, setRecord] = useState(false);
  const start = () => { setRecord(false); setGame(g => ({ notes: makeNotes(), kind: names.read(), who: [...(g?.who ?? who)], n: (g?.n ?? 0) + 1 })); };
  if (game) {
    return (
      <FlightScreen
        key={game.n}
        notes={game.notes}
        kind={game.kind}
        circle
        who={game.who}
        best={best?.score ?? null}
        record={record}
        title="მფრინავი ნოტები"
        onEnd={r => {
          const old = readSoloBest(CLASS_BEST);
          const rec = r.right > 0 && (!old || r.right > old.score);
          if (rec) setSoloBest(CLASS_BEST, { score: r.right, right: r.right, ms: r.ms, at: tbilisiToday() });
          setRecord(rec);
        }}
        onClose={() => setGame(null)}
        onAgain={start}
      />
    );
  }
  return (
    <Card className="!p-4 space-y-4">
      <CircleNames hint="ჩაწერე, ვინ ზის წრეში — ყველა თავის ჯერზე ერთ ნოტს დაასახელებს. სახელების გარეშეც შეიძლება: ტელეფონი უბრალოდ შემდეგს გადაეცი." />
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Trophy className="w-4 h-4 shrink-0" />კლასის რეკორდი: {best.score} ნოტი
        </p>
      )}
      <MprinaviOptions />
      <Btn size="lg" full onClick={() => { setGame(null); start(); }} icon={<Play />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
    </Card>
  );
};
