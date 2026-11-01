import React, { useEffect, useRef, useState } from 'react';
import { Bird, Check, Delete, RotateCcw } from 'lucide-react';
import { MELODY_POOL } from '../../../data/melodyPool';
import { decodeTaps, encodeTaps } from '../../../utils/eqo';
import {
  MPRINAVI_MARKS, MPRINAVI_SECONDS, NOTE_NAMES, drawMprinavi, namedRight, stepOf, type MprinaviQ, type NameKind,
} from '../../../utils/mprinavi';
import type { PublicQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import { openQ, type RoundFace } from '../rounds/face';
import { SampleBtn } from '../rounds/samples';
import { NameButtons } from './Names';
import { MprinaviOptions } from './Options';
import { StillNotes, type NoteTone } from './Staff';
import { clefs, names, readSeen, rememberAsked } from './store';

// „მფრინავი ნოტები“ in a class's room (2026-11-01): four notes of a melody stand on the staff, every player names them on their
// own phone, in order, and sends them; at the reveal the names, the melody and its four notes to hear. Rules
// utils/mprinavi.ts; the flight alone and round the circle is Flight.tsx.

const q$ = (q: PublicQ) => openQ<MprinaviQ>(q);
const tapsOf = (pick: number | null) => (pick === null ? [] : decodeTaps(pick) ?? []);
const nameOf = (kind: NameKind | undefined, step: number) => NOTE_NAMES[kind ?? 'syl'][step] ?? '';
const clefName = (q: Partial<MprinaviQ>) => (q.clef === 'bass' ? 'ფას გასაღები' : 'სოლის გასაღები');

/** the host's phone: the four notes */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  if (!o.notes || !o.clef) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3.5 space-y-1">
      <p className="text-center text-[13px] font-bold text-[#75685a]">{who === 'player' ? 'დაასახელე ოთხივე, მარცხნიდან' : clefName(o)}</p>
      {who !== 'player' && <StillNotes clef={o.clef} notes={o.notes} />}
    </section>
  );
};

const Answering: React.FC<{ q: Partial<MprinaviQ>; onPick: (p: number | null) => void }> = ({ q, onPick }) => {
  const notes = q.notes!;
  const [taps, setTaps] = useState<number[]>([]);
  const sent = useRef<number | null>(null);
  useEffect(() => {
    const p = taps.length ? encodeTaps(taps) : null;
    if (p !== sent.current) { sent.current = p; onPick(p); }
  }, [taps, onPick]);
  const full = taps.length >= notes.length;
  const tones: NoteTone[] = notes.map((_, i) => (i === taps.length ? 'now' : 'plain'));
  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3 pt-2 pb-3">
        <p className="text-center text-[12.5px] font-bold text-[#75685a]">{clefName(q)}</p>
        <StillNotes clef={q.clef!} notes={notes} tones={tones} labels={notes.map((_, i) => (taps[i] === undefined ? null : nameOf(q.names, taps[i])))} />
      </section>
      <NameButtons kind={q.names ?? 'syl'} disabled={full} onName={s => setTaps(t => (t.length < notes.length ? [...t, s] : t))} />
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
  if (!o.notes || !o.clef) return null;
  return <Answering key={`${o.id}|${o.notes.join('.')}`} q={o} onPick={onPick} />;
};

/** the notes named, the melody, and the four to hear (the top voice sounds an octave under its treble staff) */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.notes || !o.clef) return null;
  const sounding = o.notes.map(n => (o.clef === 'treble' ? n - 12 : n));
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3.5">
      <StillNotes clef={o.clef} notes={o.notes} tones={o.notes.map(() => 'right')} labels={o.notes.map(n => nameOf(o.names, stepOf(n) ?? 0))} />
      {o.title && <p className="mt-2 text-center font-serif-ge text-[16px] font-bold leading-snug text-[#1e4d31] [overflow-wrap:anywhere]">„{o.title}“</p>}
      {o.ref && <p className="text-center text-[12.5px] text-[#75685a]">{o.ref}</p>}
      <SampleBtn clip={{ notes: sounding.map((m, i): [number, number, number] => [i * 0.55, 0.5, m]) }} label="ოთხივე ნოტის მოსმენა" seconds={4} />
    </section>
  );
};

/** online: how many named all four; my own names against them */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  if (!o.notes) return null;
  const all = (p: number | null) => p !== null && namedRight(o.notes!, tapsOf(p)) === o.notes!.length;
  const my = mine === undefined || mine === null ? null : tapsOf(mine);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
      {picks && <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#24603d]"><Check className="w-5 h-5 shrink-0" />ოთხივე სწორად: {picks.filter(all).length} / {picks.length}</p>}
      {my && (
        <p className="text-[13.5px] font-bold text-[#4a3426]">
          შენ: {o.notes.map((n, i) => {
            const t = my[i];
            const ok = t === stepOf(n);
            return <span key={i} className={`mx-0.5 ${t === undefined ? 'text-[#9a8b7b]' : ok ? 'text-[#24603d]' : 'text-[#9a3412] line-through'}`}>{t === undefined ? '—' : nameOf(o.names, t)}</span>;
          })}
        </p>
      )}
    </section>
  );
};

export const MPRINAVI_FACE: RoundFace = {
  game: 'mprinavi',
  title: 'მფრინავი ნოტები',
  Icon: Bird,
  intro: 'ნამდვილი საგალობლებისა და სიმღერების ნოტები ხაზზე მიფრინავს — დაასახელე, სანამ გასაღებამდე მიაღწევს: დო, რე, მი… ან C, D, E (H = სი). ზედა ხმა სოლის გასაღებზეა, ბანი — ფას გასაღებზე. ყოველ ოთხ სწორზე ნოტები უფრო ჩქარა მიფრინავენ; სამი შეცდომა და თამაში მთავრდება.',
  online: `ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ყოველ რაუნდში ხაზზე ოთხი ნოტი დგას: ყველა თავის ტელეფონზე ასახელებს მათ მარცხნიდან. ყოველი სწორი ნოტი 250 ქულაა, ${MPRINAVI_SECONDS} წამის ბოლოს — ნახევარი.`,
  hybrid: 'ჰიბრიდული: კლასი წრეში ზის, ტელეფონი ხელიდან ხელში გადადის — ყველა თავის ჯერზე ერთ მფრინავ ნოტს ასახელებს. სიცოცხლე მთელ კლასს სამი აქვს; ითვლება, რამდენ ნოტს დაასახელებთ ერთად, და კლასის რეკორდი რჩება.',
  draw: count => drawMprinavi({ melodies: MELODY_POOL, count, clefs: clefs.read(), names: names.read(), seen: readSeen() }),
  remember: rounds => rememberAsked([...new Set(rounds.flatMap(r => (r.kind === 'mprinavi' ? [r.id] : [])))]),
  askHost: 'მოთამაშეები ნოტებს თავის ტელეფონზე ასახელებენ.',
  askPlayer: 'დაასახელე ოთხივე ნოტი.',
  askTeams: 'დაასახელეთ ოთხივე ნოტი.',
  clipSeconds: 4,
  Ask,
  Options: MprinaviOptions,
  Pick,
  pickName: (q, pick) => { const o = q$(q); return tapsOf(pick).map(s => nameOf(o.names, s)).join(' · '); },
  confirm: (q, pick) => {
    const n = tapsOf(pick).length;
    const all = q$(q).notes?.length ?? 4;
    return n ? `${n} / ${all} — გაგზავნა` : 'დაასახელე ნოტები';
  },
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || !o.notes) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    const k = namedRight(o.notes, tapsOf(pick));
    if (k === o.notes.length) return { tone: 'right', text: 'ოთხივე სწორად!' };
    if (k > 0) return { tone: 'near', text: `${k} / ${o.notes.length} სწორად` };
    return { tone: 'wrong', text: 'ვერცერთი — შეხედე პასუხს' };
  },
  marks: MPRINAVI_MARKS,
  empty: 'ნოტები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. ნოტებს ხმამაღლა ნუ დაასახელებთ, სანამ ყველა არ გაგზავნის.',
};
