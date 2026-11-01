import React, { useEffect, useState } from 'react';
import { Check, ChevronRight, Mic, Play, RotateCcw, Trophy, Volume2, X } from 'lucide-react';
import { MELODY_POOL } from '../../../data/melodyPool';
import {
  checkTaps, eqoLine, eqoTimed, keysOf, newRing, pickMelody, ringAnswer, ringWinners, type EqoRing,
} from '../../../utils/eqo';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { useSnippet } from '../rounds/useSnippet';
import { Keys, Taps, useLit } from './Keys';
import { EqoOptions } from './Options';
import { CIRCLE_GAME, lights, load, readSeen, rememberPlayed, save, sing } from './store';

// „ექო“ on one phone (the plan's hybrid: „the phone plays, the children in a circle sing in turn, who misses is out"): the
// names of the circle in their order (components/games/CircleNames.tsx); each in their turn hears the phrase and gives it back —
// on the keys, the phone passed to them, or by singing, the host judging — a miss puts them out; once everyone still in has had
// a turn the phrase grows by a note (utils/eqo.ts `ringAnswer`). The last one in wins. The game is kept on this phone after every
// turn, so ✕ only pauses it.

type Phase = 'ready' | 'listen' | 'answer' | 'verdict';
interface Game {
  v: 1;
  ring: EqoRing;
  melody: { id: string; title: string; ref: string };
  line: number[];
  keys: number[];
  glow: boolean;
  sing: boolean;
  phase: Phase;
  taps: number[];
  /** the turn just judged: who, and whether they got it */
  last: { seat: number; right: boolean; len: number; taps: number[] } | null;
}

const isNums = (v: unknown, n = 0): v is number[] => Array.isArray(v) && v.length >= n && v.every(x => Number.isInteger(x));
const parseGame = (raw: unknown): Game | null => {
  const g = raw as Partial<Game> | null;
  const r = g?.ring;
  if (!g || g.v !== 1 || !r || !Array.isArray(r.names) || r.names.length < 2 || !Array.isArray(r.alive) || r.alive.length !== r.names.length) return null;
  if (!isNums(g.line, 3) || !isNums(g.keys, 2) || !g.melody || typeof g.melody.title !== 'string') return null;
  if (!Number.isInteger(r.at) || r.at < 0 || r.at >= r.names.length || !Number.isInteger(r.len) || r.len < 1) return null;
  return { ...g, phase: g.phase === 'verdict' ? 'verdict' : 'ready', taps: [] } as Game;
};

/** the circle's game, from its setup to its end */
const CircleGame: React.FC<{ g: Game; setG: (g: Game | null) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const snippet = useSnippet(30);
  const lit = useLit();
  const r = g.ring;
  const phrase = g.line.slice(0, r.len);
  const who = r.names[r.at];
  const hear = () => { triggerHaptic(10); snippet.play({ notes: eqoTimed(phrase) }); setG({ ...g, phase: 'listen', taps: [] }); };
  // the phrase has sounded: the answer
  useEffect(() => {
    if (g.phase === 'listen' && snippet.state === 'done') setG({ ...g, phase: 'answer' });
  }, [snippet.state]); // eslint-disable-line react-hooks/exhaustive-deps
  const judge = (right: boolean, taps: number[]) => {
    triggerHaptic(right ? 12 : 30);
    snippet.stop();
    setG({ ...g, ring: ringAnswer(r, right, g.line.length), phase: 'verdict', taps: [], last: { seat: r.at, right, len: r.len, taps } });
  };
  const tap = (i: number) => {
    if (g.phase !== 'answer') return;
    const taps = [...g.taps, i];
    const res = checkTaps(phrase, g.keys, taps);
    if (res === 'more') { setG({ ...g, taps }); return; }
    judge(res === 'done', taps);
  };

  const circle = (
    <ol className="flex flex-wrap gap-1.5" aria-label="წრე">
      {r.names.map((n, i) => (
        <li
          key={i}
          className={`h-8 px-2.5 rounded-full inline-flex items-center text-[12.5px] font-bold ${!r.alive[i] ? 'bg-[#4a3426]/[0.05] text-[#9a8b7b] line-through' : i === r.at && !r.over && g.phase !== 'verdict' ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}
        >
          {n}
        </li>
      ))}
    </ol>
  );

  if (g.phase === 'verdict' && g.last) {
    const l = g.last;
    const said = g.line.slice(0, l.len);
    const over = r.over;
    return (
      <TableScreen
        title="ექო"
        onClose={onClose}
        footer={<Btn size="lg" full onClick={() => { triggerHaptic(10); setG({ ...g, phase: 'ready', last: over ? l : null }); }} icon={over ? <Trophy /> : <ChevronRight />} className="!h-14 !text-[16px]">{over ? 'შედეგი' : `შემდეგი: ${r.names[r.at]}`}</Btn>}
      >
        <div className="py-2 space-y-4">
          <div className={`rounded-3xl px-4 py-4 flex items-center gap-3 ${l.right ? 'bg-[#2f7d4f] text-white' : 'bg-[#4a3426] text-[#fbf6ec]'}`} role="status">
            {l.right ? <Check className="w-7 h-7 shrink-0" /> : <X className="w-7 h-7 shrink-0" />}
            <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug">{l.right ? `${r.names[l.seat]} — სწორია!` : `${r.names[l.seat]} შეცდა და თამაშიდან გადის`}</p>
          </div>
          <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2 text-center">
            <p className="text-[12.5px] font-bold text-[#75685a]">ფრაზა · {said.length} ნოტი</p>
            <Taps keys={g.keys} taps={said.map(n => g.keys.indexOf(n))} length={said.length} />
            {!g.sing && !l.right && l.taps.length > 0 && (
              <>
                <p className="pt-1 text-[12.5px] font-bold text-[#75685a]">აკრიფა</p>
                <Taps keys={g.keys} taps={l.taps} length={l.taps.length} wrongFrom={l.taps.length - 1} />
              </>
            )}
          </section>
          {circle}
          {!over && r.len > l.len && <p className="rounded-2xl bg-[#c9a227]/12 px-3.5 py-2.5 text-center text-[13.5px] font-bold text-[#6f5610]">წრე შემოიარა — ფრაზას ერთი ნოტი დაემატა: {r.len} ნოტი</p>}
        </div>
      </TableScreen>
    );
  }

  if (r.over) {
    const win = ringWinners(r);
    return (
      <TableScreen
        title="ექო"
        onClose={() => { setG(null); onClose(); }}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={() => { setG(null); onClose(); }} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ხელახლა</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4 text-center">
          <Trophy className="w-10 h-10 mx-auto text-[#c9a227]" />
          <p className="font-serif-ge text-[24px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">
            {win.length === 1 ? `${r.names[win[0]]} იგებს!` : `ერთად იგებენ: ${win.map(i => r.names[i]).join(', ')}`}
          </p>
          <Hint>ყველაზე გრძელი სწორი ფრაზა: {r.best} ნოტი</Hint>
          <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 text-left">
            <ol className="space-y-1">
              {[...win.map(i => ({ i, place: 1 })), ...[...r.outOrder].reverse().map((i, k) => ({ i, place: win.length + k + 1 }))].map(({ i, place }) => (
                <li key={i} className="flex items-center gap-2.5 text-[14px] font-bold text-[#4a3426]">
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[12px] tabular-nums ${place === 1 ? 'bg-[#c9a227] text-white' : 'bg-[#4a3426]/[0.07] text-[#75685a]'}`}>{place}</span>
                  {r.names[i]}
                </li>
              ))}
            </ol>
          </section>
          <p className="font-serif-ge text-[16px] font-bold leading-snug text-[#1e4d31]">„{g.melody.title}“-ის დასაწყისი</p>
          <Hint>{g.melody.ref}</Hint>
        </div>
      </TableScreen>
    );
  }

  const at = g.glow && lit.midi !== null ? g.keys.indexOf(lit.midi) : -1;
  const stuck = g.phase === 'listen' && (snippet.state === 'blocked' || snippet.state === 'error');
  const footer = g.phase === 'ready'
    ? <Btn size="lg" full onClick={hear} icon={<Play />} className="!h-14 !text-[16px]">მოსმენა — {who}</Btn>
    : g.phase === 'answer' && g.sing ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full onClick={() => judge(false, [])} icon={<X />} className="!h-14 !text-[15.5px]">შეცდა</Btn>
        <Btn size="lg" full onClick={() => judge(true, [])} icon={<Check />} className="!h-14 !text-[15.5px]">სწორად იმღერა</Btn>
      </div>
    ) : null;
  return (
    <TableScreen title="ექო" onClose={onClose} footer={footer}>
      <div className="py-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold tabular-nums text-[#a0703c]">ფრაზა · {r.len} ნოტი</p>
          <p className="text-[12.5px] font-bold tabular-nums text-[#75685a]">წრეში: {r.alive.filter(Boolean).length} / {r.names.length}</p>
        </div>
        <p className="text-center font-serif-ge text-[24px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{who}</p>
        <p className="-mt-2 text-center text-[13.5px] font-bold text-[#7a2028]" role="status">
          {g.phase === 'ready' ? (g.sing ? 'მოემზადე: ჯერ მოისმენ, მერე იმღერებ' : 'გამოართვი ტელეფონი და მოუსმინე') : g.phase === 'listen' ? 'მოუსმინე…' : g.sing ? 'იმღერე — წამყვანი შეაფასებს' : 'ახლა გაიმეორე'}
        </p>
        {stuck && <Btn full onClick={hear} icon={<Volume2 />}>მოსმენა</Btn>}
        {g.sing ? (
          <div className="flex justify-center"><Mic className={`w-12 h-12 ${g.phase === 'answer' ? 'text-[#7a2028]' : 'text-[#d9c9ae]'}`} /></div>
        ) : (
          <>
            <Keys keys={g.keys} lit={at} disabled={g.phase !== 'answer'} onTap={tap} />
            <Taps keys={g.keys} taps={g.taps} length={r.len} />
          </>
        )}
        {g.phase === 'answer' && <button type="button" onClick={hear} className="mx-auto flex h-10 px-3.5 rounded-full items-center gap-1.5 text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><Volume2 className="w-4 h-4" />კიდევ მოსმენა</button>}
        {circle}
      </div>
    </TableScreen>
  );
};

export const EqoCircle: React.FC = () => {
  const names = useCircleNames();
  const singing = sing.use();
  const [g, setGame] = useState<Game | null>(() => parseGame(load(CIRCLE_GAME)));
  const [open, setOpen] = useState(false);
  const setG = (next: Game | null) => { setGame(next); save(CIRCLE_GAME, next && !next.ring.over ? next : null); };
  const make = (list: string[]): Game | null => {
    const ring = newRing(list);
    const m = pickMelody(MELODY_POOL, readSeen(), 12);
    if (!ring || !m) return null;
    rememberPlayed([m.id]);
    const line = eqoLine(m);
    return { v: 1, ring, melody: { id: m.id, title: m.title, ref: m.ref }, line, keys: keysOf(line), glow: lights.read(), sing: sing.read(), phase: 'ready', taps: [], last: null };
  };
  const start = async () => {
    if (g && !g.ring.over && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const next = make(names);
    if (!next) return;
    setG(next);
    setOpen(true);
  };
  const again = () => { if (g) { const next = make(g.ring.names); if (next) setG(next); } };

  if (open && g) return <CircleGame g={g} setG={setG} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = g && !g.ring.over ? g : null;
  return (
    <div className="space-y-4">
      {paused && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · ფრაზა {paused.ring.len} ნოტი</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">წრეში დარჩა: {paused.ring.names.filter((_, i) => paused.ring.alive[i]).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">როგორ იმეორებენ</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="როგორ იმეორებენ">
            <Chip on={!singing} onClick={() => sing.set(false)}>კლავიშებით</Chip>
            <Chip on={singing} onClick={() => sing.set(true)}>ხმით</Chip>
          </div>
          <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
            {singing ? 'ყველა თავის ჯერზე მღერის, წამყვანი აფასებს: „სწორად იმღერა“ ან „შეცდა“.' : 'ტელეფონი ხელიდან ხელში გადადის: ყველა თავის ჯერზე კლავიშებზე იმეორებს, ტელეფონი თვითონ ამოწმებს.'}
          </p>
        </div>
        {!singing && <EqoOptions />}
        <Btn size="lg" full disabled={names.length < 2} onClick={() => { void start(); }} icon={<Play />} className="!h-14 !text-[16px]">{paused ? 'ახალი თამაში' : 'თამაშის დაწყება'}</Btn>
        {names.length < 2 && <p className="-mt-2 text-center text-[12.5px] text-[#9a8b7b]">ჩაწერე მინიმუმ ორი სახელი.</p>}
      </Card>
    </div>
  );
};
