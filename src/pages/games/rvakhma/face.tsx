import React from 'react';
import { Check, Waves } from 'lucide-react';
import { HEIRMOI } from '../../../data/rvakhmaPool';
import {
  RVAKHMA_MARKS, RVAKHMA_TOP, TONE_LETTERS, drawRvakhmaRounds, modelOf, rememberHeirmoi, rvakhmaPiece, toneName, type RvakhmaQ,
} from '../../../utils/rvakhma';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { StepRow } from '../rounds/steps';
import { PlayDot, SampleBtn, useSampler } from '../rounds/samples';

// „რვა ხმა“ (2026-11-01, like Functional Ear Trainer) over the quick games' screens: a heirmos of vol. VIII on the synthesizer
// from its book notes — its first phrase, then more — and the eight tones to name it by, each its own button with the book's
// letter and its number (a team in the one-phone game shows the number on its fingers). The answer's card plays the tone's
// model to compare; under the tabs the eight models to learn first. Rules utils/rvakhma.ts, the heirmoi data/rvakhmaPool.ts.

const q$ = (q: PublicQ) => openQ<RvakhmaQ>(q);

const SEEN = 'sg-rvakhma-seen';
const readSeen = (): number[] => {
  try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []; } catch { return []; }
};

/** a tone's model as a piece: its heirmos from the start, all three voices */
const modelClip = (num: number) => ({ score: { book: 'v8', num }, voices: 0, seconds: 16 });

const STEP_NAMES = ['პირველი ფრაზა', 'მეტი'];

const Ask: NonNullable<RoundFace['Ask']> = ({ who, step }) => (
  <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
    <p className="font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426]">რომელი ხმაა?</p>
    <StepRow
      names={STEP_NAMES}
      worth={who === 'teams' ? RVAKHMA_MARKS.slice(0, 2).map(m => `${m.points} ქულა`) : RVAKHMA_TOP.map(p => `${p}-მდე`)}
      step={step}
    />
    <p className="mt-2.5 text-[13px] leading-snug text-[#75685a]">ისმის {rvakhmaPiece(step)} წამი · VIII ტომის ძლისპირი</p>
  </section>
);

/** one tone's face on a button and at the reveal: the book's letter, its number */
const ToneFace: React.FC<{ t: number; light?: boolean }> = ({ t, light }) => (
  <>
    <span className={`font-serif-ge text-[22px] font-bold leading-none ${light ? '' : 'text-[#4a3426]'}`}>{TONE_LETTERS[t]}</span>
    <span className={`mt-1 text-[11.5px] font-bold tabular-nums ${light ? 'text-white/80' : 'text-[#9a8b7b]'}`}>{t + 1}</span>
  </>
);

const TonePick: RoundFace['Pick'] = ({ pick, onPick }) => (
  <div>
    <p className="mb-2 text-[13px] font-bold text-[#75685a]">ხმა</p>
    <ul className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="ხმები">
      {TONE_LETTERS.map((_, t) => {
        const on = pick === t;
        return (
          <li key={t}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={toneName(t)}
              onClick={() => { triggerHaptic(8); onPick(t); }}
              className={`relative w-full h-16 rounded-2xl flex flex-col items-center justify-center transition-[background-color,transform] active:scale-[0.97] cursor-pointer ${on ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
            >
              <ToneFace t={t} />
              {on && <Check className="absolute top-1.5 right-1.5 w-4 h-4 text-[#7a2028]" aria-hidden="true" />}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);

/** the reveal: the right tone in green, how many picked each, my own pick */
const ToneReveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  if (o.right === undefined) return null;
  const counts = picks ? TONE_LETTERS.map((_, t) => picks.filter(p => p === t).length) : null;
  return (
    <ul className="grid grid-cols-4 gap-2" aria-label="ხმები">
      {TONE_LETTERS.map((_, t) => {
        const right = t === o.right;
        const isMine = mine === t;
        const look = right ? 'bg-[#2f7d4f] text-white' : isMine ? 'bg-white ring-2 ring-[#c0392b]/55' : 'bg-white ring-1 ring-[#e8dcc8]';
        return (
          <li key={t} className={`relative h-[4.5rem] rounded-2xl flex flex-col items-center justify-center ${look}`} aria-label={`${toneName(t)}${right ? ' — სწორი' : ''}${counts ? `, ${counts[t]}` : ''}`}>
            <ToneFace t={t} light={right} />
            {counts && <span className={`absolute top-1 right-2 text-[12.5px] font-bold tabular-nums ${right ? 'text-white' : 'text-[#75685a]'}`}>{counts[t] || ''}</span>}
            {isMine && <span className={`absolute bottom-0.5 text-[10.5px] font-bold ${right ? 'text-[#d9f0e0]' : 'text-[#c0392b]'}`}>შენ</span>}
          </li>
        );
      })}
    </ul>
  );
};

/** the heirmos: its tone, ode and words, and the tone's model to compare */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (o.right === undefined) return null;
  const model = modelOf(HEIRMOI, o.right, o.num);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <Pill>{toneName(o.right)} · {o.right + 1}</Pill>
      <p className="mt-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.words ? `„${o.words}“` : o.name}</p>
      <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{o.name}, {toneName(o.right)} · რვახმა საცისკრო ძლისპირები, VIII ტომი{o.page ? `, გვ. ${o.page}` : ''}</p>
      {model && <SampleBtn clip={modelClip(model.num)} label={`შეადარე: ${toneName(o.right)}-ის სხვა ძლისპირი`} seconds={16} />}
    </section>
  );
};

/** the eight models under the tabs: listen first, then play */
const Models: React.FC = () => {
  const s = useSampler(16);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 sm:px-5">
      <h2 className="font-serif-ge text-[17px] font-bold text-[#4a3426]">რვა ხმის ნიმუშები</h2>
      <p className="mt-1 text-[13px] leading-snug text-[#75685a]">ჯერ მოუსმინე თითო ხმას — ყოველი ხმის პირველ ძლისპირს, დასაწყისს. ხმას თავისი სვლა და თავისი დასასრული აქვს.</p>
      <ul className="mt-3 grid gap-x-4 sm:grid-cols-2 divide-y divide-[#efe5d4] sm:divide-y-0">
        {TONE_LETTERS.map((letter, t) => {
          const h = modelOf(HEIRMOI, t);
          if (!h) return null;
          return (
            <li key={t} className="flex items-center gap-3 py-2.5">
              <PlayDot busy={s.isOn(t)} load={s.isLoading(t)} label={`${toneName(t)} — მოსმენა`} onTap={() => s.tap(t, modelClip(h.num))} size="sm" />
              <span className="w-8 shrink-0 text-center font-serif-ge text-[20px] font-bold text-[#7a2028]">{letter}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-snug text-[#4a3426]">{toneName(t)} <span className="font-normal text-[#9a8b7b] tabular-nums">· {t + 1}</span></span>
                <span className="block text-[12.5px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{h.words ? `„${h.words}“` : h.name}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const RVAKHMA_FACE: RoundFace = {
  game: 'rvakhma',
  title: 'რვა ხმა',
  Icon: Waves,
  intro: 'VIII ტომის ძლისპირი, წიგნის ნოტებით, სინთეზატორზე ჟღერს — ჯერ პირველი ფრაზა, მერე მეტი. უნდა გამოიცნო, რომელი ხმაა რვიდან: ა, ბ, გ, დ, ე, ვ, ზ თუ ჱ. რაც ადრე მიხვდები, მით მეტი ქულა. ქვემოთ რვავე ხმის ნიმუშია — ჯერ მათ მოუსმინე.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ძლისპირი ყველას თავის ტელეფონზე ჟღერს — სახლიდანაც (ერთ ოთახში მხოლოდ წამყვანისაზე). პასუხს რაუნდში ერთხელ ნიშნავ: პირველ ფრაზაზე მიხვდები — 1000-მდე ქულაა, მეტზე — 500-მდე. პასუხის მერე ამავე ხმის სხვა ძლისპირს შეადარებ.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი ძლისპირს რთავს; გუნდი ფურცელზე ხმის ნომერს (1–8) და ნაბიჯს წერს, ან თითებით აჩვენებს. მერე ტელეფონი სწორს აჩენს და წამყვანი თითო გუნდს უნიშნავს: პირველ ფრაზაზე — 2 ქულა, მეტით — 1.',
  draw: count => drawRvakhmaRounds(HEIRMOI, count, readSeen()),
  remember: (rounds: RoundQ[]) => {
    const nums = rounds.filter((r): r is RvakhmaQ => r.kind === 'rvakhma').map(r => r.num);
    try { localStorage.setItem(SEEN, JSON.stringify(rememberHeirmoi(readSeen(), nums))); } catch { /* private mode */ }
  },
  askHost: 'მოთამაშეები ხმას თავის ტელეფონზე ნიშნავენ.',
  askPlayer: 'მოისმინე და მონიშნე, რომელი ხმაა.',
  askTeams: 'გუნდები ხმის ნომერს (1–8) და ნაბიჯს წერენ, ან თითებით აჩვენებენ.',
  clip: (q, step) => { const o = q$(q); return o.book && o.num ? { score: { book: o.book, num: o.num }, voices: 0, seconds: rvakhmaPiece(step) } : null; },
  clipSeconds: rvakhmaPiece(2),
  nextLabel: 'მეტი',
  Ask,
  Extra: Models,
  Pick: TonePick,
  pickName: (_, pick) => toneName(pick),
  confirm: (_, pick) => (pick === null ? 'მონიშნე ხმა' : `${toneName(pick)} — გაგზავნა`),
  Reveal: ToneReveal,
  Answer,
  verdict: (q, pick, step) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: step && step > 1 ? 'სწორია! მეტის მოსმენით მიხვდი' : 'სწორია! პირველ ფრაზაზე მიხვდი' };
    return { tone: 'wrong', text: `არა — ${toneName(o.right)} იყო` };
  },
  marks: RVAKHMA_MARKS,
  empty: 'ძლისპირები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
