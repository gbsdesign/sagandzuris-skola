import React, { useEffect, useRef, useState } from 'react';
import { Check, Delete, Ear, Repeat, RotateCcw } from 'lucide-react';
import { MELODY_POOL } from '../../../data/melodyPool';
import {
  EQO_MARKS, checkTaps, decodeTaps, drawEqo, encodeTaps, eqoTimed, pitchName, rightFromStart, type EqoQ,
} from '../../../utils/eqo';
import type { PublicQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import { openQ, type RoundFace } from '../rounds/face';
import { KEY_TINT, Keys, Taps, useLit } from './Keys';
import { EqoOptions } from './Options';
import { lights, readSeen, rememberPlayed } from './store';

// „ექო“ (2026-11-01, like Simon) over the quick games' screens: one melody a game, each round a note longer; the phrase
// sounds (on every phone, or only on the host's), every player taps it back on their own phone and sends it. Rules
// utils/eqo.ts, the keyboard Keys.tsx; alone and the circle on one phone are Solo.tsx and Circle.tsx.

const q$ = (q: PublicQ) => openQ<EqoQ>(q);
const tapsOf = (pick: number | null) => (pick === null ? [] : decodeTaps(pick) ?? []);
const namesOf = (keys: readonly number[], taps: readonly number[]) => taps.map(k => pitchName(keys[k] ?? 0)).join(' · ');

/** the round in words: how long its phrase is; the host's phone shows the keys lighting as it sounds */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  const lit = useLit();
  if (!o.notes || !o.keys) return null;
  const at = o.lights && lit.midi !== null ? o.keys.indexOf(lit.midi) : -1;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3.5 space-y-3">
      <p className="flex items-center justify-center gap-2 text-center text-[14px] font-bold text-[#4a3426]">
        <Ear className="w-4.5 h-4.5 text-[#7a2028]" />
        {who === 'player' ? `მოუსმინე და გაიმეორე · ${o.notes.length} ნოტი` : `ფრაზა · ${o.notes.length} ნოტი`}
      </p>
      {who !== 'player' && <Keys keys={o.keys} lit={at} size="sm" />}
    </section>
  );
};

const Answering: React.FC<{ notes: number[]; keys: number[]; glow: boolean; onPick: (p: number | null) => void }> = ({ notes, keys, glow, onPick }) => {
  const [taps, setTaps] = useState<number[]>([]);
  const lit = useLit();
  const sent = useRef<number | null>(null);
  useEffect(() => {
    const p = taps.length ? encodeTaps(taps) : null;
    if (p !== sent.current) { sent.current = p; onPick(p); }
  }, [taps, onPick]);
  const at = glow && lit.midi !== null ? keys.indexOf(lit.midi) : -1;
  const full = taps.length >= notes.length;
  return (
    <div className="space-y-3.5">
      <p className="min-h-[1.25rem] text-center text-[13px] font-bold text-[#7a2028]" role="status">
        {lit.on ? 'მოუსმინე…' : full ? 'ყველა ნოტი აკრეფილია — გაგზავნე' : `ნოტი ${taps.length + 1} / ${notes.length}`}
      </p>
      <Keys keys={keys} lit={at} disabled={lit.on || full} onTap={i => setTaps(t => (t.length < notes.length ? [...t, i] : t))} />
      <Taps keys={keys} taps={taps} length={notes.length} />
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => { triggerHaptic(5); setTaps(t => t.slice(0, -1)); }} disabled={!taps.length} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-default">
          <Delete className="w-4 h-4" />წაშლა
        </button>
        <button type="button" onClick={() => { triggerHaptic(8); setTaps([]); }} disabled={!taps.length} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-default">
          <RotateCcw className="w-4 h-4" />თავიდან
        </button>
      </div>
    </div>
  );
};

const Pick: RoundFace['Pick'] = ({ q, onPick }) => {
  const o = q$(q);
  if (!o.notes || !o.keys) return null;
  return <Answering key={`${o.id}|${o.notes.length}`} notes={o.notes} keys={o.keys} glow={!!o.lights} onPick={onPick} />;
};

/** the phrase, note by note in its keys' colours, and the melody it opens */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.notes || !o.keys) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 text-center">
      <p className="text-[12.5px] font-bold text-[#75685a]">ფრაზა · {o.notes.length} ნოტი</p>
      <ol className="mt-2 flex flex-wrap justify-center gap-1">
        {o.notes.map((n, i) => {
          const k = o.keys!.indexOf(n);
          return <li key={i} className="h-8 min-w-8 px-1.5 rounded-full flex items-center justify-center font-serif-ge text-[12px] font-bold text-white" style={{ background: KEY_TINT[k % KEY_TINT.length] }}>{pitchName(n)}</li>;
        })}
      </ol>
      {o.title && <p className="mt-3 font-serif-ge text-[18px] font-bold leading-snug text-[#1e4d31] [overflow-wrap:anywhere]">„{o.title}“-ის დასაწყისი</p>}
      {o.ref && <p className="mt-0.5 text-[12.5px] text-[#75685a]">{o.ref}</p>}
    </section>
  );
};

/** online: how many got it all; my own taps against it */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  if (!o.notes || !o.keys) return null;
  const whole = (p: number | null) => p !== null && checkTaps(o.notes!, o.keys!, tapsOf(p)) === 'done';
  const my = mine === undefined || mine === null ? null : tapsOf(mine);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
      {picks && (
        <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#24603d]"><Check className="w-5 h-5 shrink-0" />მთლიანად გაიმეორა: {picks.filter(whole).length} / {picks.length}</p>
      )}
      {my && (
        <div className="space-y-1.5">
          <p className="text-[12.5px] font-bold text-[#75685a]">შენ აკრიფე</p>
          <Taps keys={o.keys} taps={my} length={Math.max(my.length, 1)} wrongFrom={rightFromStart(o.notes, o.keys, my)} />
        </div>
      )}
    </section>
  );
};

export const EQO_FACE: RoundFace = {
  game: 'eqo',
  title: 'ექო',
  Icon: Repeat,
  intro: 'ტელეფონი ცნობილი საგალობლის ან სიმღერის დასაწყისს უკრავს — ჯერ სამ ნოტს, მერე ოთხს, ხუთს… — შენ კი ის კლავიშებზე უნდა გაიმეორო. კლავიშები ამ მელოდიის ბგერებია, დაბლიდან მაღლისკენ: დო, რე, მი… პირველ დონეზე კლავიში ნათდება, როცა მისი ნოტი ჟღერს; მეორეზე მხოლოდ ყური გეხმარება.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. მთელ თამაშში ერთი მელოდიაა, ყოველი რაუნდი ერთი ნოტით გრძელია. ყოველი სწორი ნოტი თავიდან 100 ქულაა, მთელი ფრაზა სწორად — ორმაგი.',
  hybrid: 'ჰიბრიდული: კლასი წრეში ზის, ტელეფონი ხელიდან ხელში გადადის. ყველა თავის ჯერზე ისმენს და იმეორებს — კლავიშებზე ან ხმით; ვინც შეცდება, თამაშიდან გადის. როცა წრე შემოივლის, ფრაზა ერთი ნოტით იზრდება. ბოლოს დარჩენილი იგებს.',
  draw: count => drawEqo({ melodies: MELODY_POOL, count, lights: lights.read(), seen: readSeen() }),
  remember: rounds => rememberPlayed([...new Set(rounds.flatMap(r => (r.kind === 'eqo' ? [r.id] : [])))]),
  askHost: 'მოთამაშეები ფრაზას თავის ტელეფონზე იმეორებენ.',
  askPlayer: 'მოუსმინე და გაიმეორე.',
  askTeams: 'მოუსმინეთ და გაიმეორეთ.',
  clip: q => { const o = q$(q); return o.notes ? { notes: eqoTimed(o.notes) } : null; },
  clipSeconds: 12,
  Ask,
  Options: EqoOptions,
  Pick,
  pickName: (q, pick) => { const o = q$(q); return o.keys ? namesOf(o.keys, tapsOf(pick)) : ''; },
  confirm: (q, pick) => {
    const o = q$(q);
    const n = tapsOf(pick).length;
    return n ? `${n} / ${o.notes?.length ?? n} ნოტი — გაგზავნა` : 'დააჭირე კლავიშებს';
  },
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || !o.notes || !o.keys) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    const k = rightFromStart(o.notes, o.keys, tapsOf(pick));
    if (k === o.notes.length) return { tone: 'right', text: 'მთელი ფრაზა სწორად!' };
    if (k > 0) return { tone: 'near', text: `${k} ნოტი სწორად, მე-${k + 1} სხვა იყო` };
    return { tone: 'wrong', text: 'პირველივე ნოტი სხვა იყო' };
  },
  marks: EQO_MARKS,
  empty: 'მელოდიები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. ფრაზას ხმამაღლა ნუ იმღერებთ, სანამ ყველა არ გაგზავნის.',
};
