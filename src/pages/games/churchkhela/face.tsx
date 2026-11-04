import React, { useEffect } from 'react';
import { Check, Flame, Hand, Music2 } from 'lucide-react';
import { hangiPool } from '../../../data/hangiPool';
import { KIND_LABEL, TASKS } from '../../../utils/churchkhela';
import {
  BURN_MAX, BURN_MIN, CHURCHKHELA_CLIP, drawChurchkhela, isSafe, releasePick, releasedMs, secondsText, taskSeats, type ChurchkhelaQ,
} from '../../../utils/churchkhelaRounds';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import { openQ, type RoundFace } from '../rounds/face';
import { Churchkhela, useHeat } from './parts';

// „ცხელი ჩურჩხელა“ online (2026-11-04) over the quick games' screens (pages/games/rounds/): everybody holds the churchkhela on
// their own phone while the school's recording plays there; it stops at a moment nobody knows (6–24 s) and whoever still holds
// it then is burnt and does the round's task in the call. The later one lets go, the more (up to 1000). Each phone times the
// round by its own music (parts.tsx `useHeat`), the rules are utils/churchkhelaRounds.ts. The one phone in the circle is
// Table.tsx.

const q$ = (q: PublicQ) => openQ<ChurchkhelaQ>(q);
const SEEN = 'sg-churchkhela-klasi-seen';
const readSeen = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(SEEN) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};
const rememberSeen = (urls: string[]) => {
  try { localStorage.setItem(SEEN, JSON.stringify([...readSeen().filter(u => !urls.includes(u)), ...urls].slice(-60))); } catch { /* private mode */ }
};
/** the cards that work in a call: not the ones for the one beside you in the circle */
const ONLINE_TASKS = TASKS.filter(t => t.id !== 'fun-teach' && t.id !== 'fun-kind').map(t => ({ text: t.text, kind: KIND_LABEL[t.kind] }));

const secs = (pick: number) => secondsText(releasedMs(pick));

/** the churchkhela in my hand: let go before the music stops */
const Pick: RoundFace['Pick'] = ({ q, pick, onPick, locked }) => {
  const o = q$(q);
  const { burnt, held } = useHeat(o.id ?? '', o.burn ?? 0);
  // still held when it burnt: that is the answer, and it goes by itself
  useEffect(() => { if (burnt && !locked && pick === null) onPick(0); }, [burnt]); // eslint-disable-line react-hooks/exhaustive-deps
  const letGo = () => {
    if (burnt || locked || pick !== null) return;
    triggerHaptic(25);
    onPick(releasePick(held()));
  };
  // let go: on its way (the room's echo turns it into `Sent`)
  const gone = pick !== null && pick > 0;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 pt-3 pb-4 flex flex-col items-center gap-3 text-center [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:py-3 [@media(max-height:500px)]:gap-5">
      <Churchkhela look={gone ? 'cool' : burnt ? 'burnt' : 'hot'} className="h-[150px] w-auto shrink-0 [@media(max-height:500px)]:h-[100px]" />
      <div className="flex-1 min-w-0 w-full flex flex-col items-center gap-3">
      {gone ? (
        <p className="font-serif-ge text-[19px] font-bold text-[#24603d] inline-flex items-center gap-1.5" role="status"><Check className="w-5 h-5" />გაუშვი {secs(pick)} წამზე</p>
      ) : burnt ? (
        <p className="font-serif-ge text-[19px] font-bold text-[#b3261e]" role="status">დაიწვი!</p>
      ) : (
        <>
          <button
            type="button"
            onClick={letGo}
            className="h-16 w-full max-w-sm rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-[19px] font-bold inline-flex items-center justify-center gap-2 shadow-[0_10px_22px_-12px_rgba(122,32,40,0.9)] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <Hand className="w-6 h-6" />გაუშვი!
          </button>
          <Hint>რაც უფრო გვიან, მით მეტი ქულა — მაგრამ თუ მუსიკა გაჩერდა და ჯერ ისევ გიჭირავს, დაიწვი.</Hint>
        </>
      )}
      </div>
    </section>
  );
};

/** my card once the answer is in: let go (and then, at the stop, safe) or burnt */
const Sent: NonNullable<RoundFace['Sent']> = ({ q, pick, answered, total }) => {
  const o = q$(q);
  const { burnt } = useHeat(o.id ?? '', o.burn ?? 0);
  const safe = isSafe({ burn: o.burn ?? 0 }, pick);
  return (
    <section className={`rounded-3xl px-4 pt-3 pb-4 flex flex-col items-center gap-2 text-center ring-1 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:py-3 [@media(max-height:500px)]:gap-5 ${safe ? 'bg-[#2f7d4f]/[0.07] ring-[#2f7d4f]/25' : 'bg-[#b3261e]/[0.06] ring-[#b3261e]/25'}`} role="status">
      <Churchkhela look={safe ? 'cool' : 'burnt'} className="h-[130px] w-auto shrink-0 [@media(max-height:500px)]:h-[96px]" />
      <div className="flex-1 min-w-0 w-full flex flex-col items-center gap-2">
      {safe ? (
        <>
          <p className="font-serif-ge text-[19px] font-bold text-[#24603d] inline-flex items-center gap-1.5"><Check className="w-5 h-5" />გაუშვი {secs(pick)} წამზე</p>
          <p className="text-[13px] leading-snug text-[#4a3426]">{burnt ? 'მუსიკა გაჩერდა — შენ გადარჩი!' : 'მუსიკა ჯერ უკრავს: ვის შერჩება ხელში?'}</p>
        </>
      ) : (
        <>
          <p className="font-serif-ge text-[19px] font-bold text-[#b3261e] inline-flex items-center gap-1.5"><Flame className="w-5 h-5" />დაიწვი!</p>
          <p className="text-[13px] leading-snug text-[#4a3426]">ჩურჩხელა ხელში შეგრჩა — დავალებას მალე ნახავ.</p>
        </>
      )}
      <Hint>უკვე გადაწყვიტა: {answered} / {total}.</Hint>
      </div>
    </section>
  );
};

/** the host's own view of the round: when it burns, the heat so far (the music on this phone stops at the burn too) */
const Secret: NonNullable<RoundFace['Secret']> = ({ q }) => {
  const o = q as Partial<ChurchkhelaQ>;
  const { burnt } = useHeat(o.id ?? '', o.burn ?? 0);
  return (
    <section className={`rounded-3xl px-4 py-3.5 space-y-1.5 ${burnt ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-[#7a2028] text-[#fbf6ec]'}`}>
      <p className="text-[12px] font-bold text-[#fbf6ec]/70">მხოლოდ შენ ხედავ</p>
      <div className="flex items-center gap-3">
        <span className="shrink-0 rounded-2xl bg-[#fbf6ec]/90 px-1.5 py-1"><Churchkhela look={burnt ? 'burnt' : 'hot'} className="h-[60px] w-auto" /></span>
        <div className="min-w-0">
          <p className="font-serif-ge text-[20px] font-bold leading-tight">{burnt ? 'დაიწვა!' : `დაიწვება ${secondsText(o.burn ?? 0)} წამზე`}</p>
          {o.title && <p className="mt-0.5 text-[12.5px] text-[#fbf6ec]/80 [overflow-wrap:anywhere]">{o.title}{o.sub ? ` · ${o.sub}` : ''}</p>}
          {o.task && <p className="mt-1 text-[12.5px] leading-snug text-[#fbf6ec]/90"><b>დავალება:</b> {o.task}</p>}
        </div>
      </div>
    </section>
  );
};

/** the reveal: who let go when, who burnt, and whose task it is */
const Reveal: RoundFace['Reveal'] = ({ q, picks, seat, names }) => {
  const o = q$(q);
  const burn = o.burn ?? 0;
  const list = names ?? [];
  const all = list.map((_, i) => picks?.[i] ?? null);
  const doers = taskSeats({ burn }, all);
  const rows = list.map((n, i) => ({ n, i, p: all[i] }))
    .sort((a, b) => (isSafe({ burn }, a.p) ? a.p : 1e9 + a.i) - (isSafe({ burn }, b.p) ? b.p : 1e9 + b.i));
  const burntCount = all.filter(p => !isSafe({ burn }, p)).length;
  return (
    <section className="space-y-3">
      {o.task && (
        <div className="rounded-3xl bg-[#7a2028] text-[#fbf6ec] px-4 py-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold text-[#fbf6ec]/75">დავალება</span>
            {o.taskKind && <span className="rounded-full bg-[#fbf6ec]/15 px-2.5 py-0.5 text-[12px] font-bold">{o.taskKind}</span>}
          </div>
          <p className="font-serif-ge text-[19px] font-bold leading-snug">{o.task}</p>
          {doers.length > 0 && (
            <p className="text-[13.5px] leading-snug">
              {burntCount ? 'ასრულებს' : 'ყველამ დროზე გაუშვა — ასრულებს ყველაზე ფრთხილი'}: <b className="text-[#f0d9a0]">{doers.map(i => (i === seat ? 'შენ' : list[i])).join(', ')}</b>
            </p>
          )}
        </div>
      )}
      <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
        <p className="text-[12.5px] font-bold text-[#9a8b7b]">ვინ როდის გაუშვა</p>
        {rows.map(r => {
          const at = isSafe({ burn }, r.p) ? r.p : null;
          const safe = at !== null;
          const share = at !== null ? Math.max(3, Math.round((100 * releasedMs(at)) / burn)) : 100;
          return (
            <div key={r.i} className="flex items-center gap-2.5">
              <span className={`w-[34%] min-w-0 truncate text-[13.5px] font-bold ${safe ? 'text-[#4a3426]' : 'text-[#b3261e]'}`}>{r.i === seat ? `${r.n} · შენ` : r.n}</span>
              <span className="flex-1 h-2.5 rounded-full bg-[#f1e8d9] overflow-hidden">
                <span className={`block h-full rounded-full ${safe ? 'bg-gradient-to-r from-[#e8b04a] to-[#c2410c]' : 'bg-[#b3261e]'}`} style={{ width: `${share}%` }} />
              </span>
              <span className={`w-[4.6rem] shrink-0 text-right text-[13px] tabular-nums ${safe ? 'text-[#4a3426]' : 'font-bold text-[#b3261e]'}`}>
                {at !== null ? `${secs(at)} წმ` : <span className="inline-flex items-center gap-1"><Flame className="w-3.5 h-3.5" />დაიწვა</span>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/** when it burnt and what played */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.burn) return null;
  return (
    <section className="rounded-3xl bg-[#c2410c]/[0.07] ring-1 ring-[#c2410c]/20 px-4 py-3.5 sm:px-5">
      <p className="text-[12px] font-bold text-[#9a8b7b]">მუსიკა გაჩერდა, ჩურჩხელა დაიწვა</p>
      <p className="mt-0.5 font-serif-ge text-[26px] font-bold leading-tight text-[#b3261e]">{secondsText(o.burn)} წამზე</p>
      {o.title && (
        <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#4a3426]">
          <Music2 className="w-4 h-4 mt-px shrink-0 text-[#7a2028]" /><span className="[overflow-wrap:anywhere]">{o.title}{o.sub ? ` · ${o.sub}` : ''}</span>
        </p>
      )}
    </section>
  );
};

/** the lobby's line */
const Options: React.FC = () => (
  <Hint>
    მუსიკა ყველას თავის ტელეფონზე ჟღერს (ყურსასმენით უკეთესია), ყოველ რაუნდს სხვა ჩანაწერი. გაჩერდება {BURN_MIN / 1000}–{BURN_MAX / 1000} წამში — როდის, არავინ იცის. ვინც დაიწვება, ზარში დავალებას ასრულებს.
  </Hint>
);

export const CHURCHKHELA_FACE: RoundFace = {
  game: 'churchkhela',
  store: 'sg-churchkhela-klasi',
  title: 'ცხელი ჩურჩხელა',
  Icon: Flame,
  intro: 'ჩურჩხელა ხელიდან ხელში გადადის, სანამ მუსიკა უკრავს. მუსიკა მოულოდნელად ჩერდება — ვისაც ხელში დარჩა, ის „დაიწვა“ და დავალებას ასრულებს: იმღერე შემდეგი ფრაზა, დაასახელე საგალობელი, თქვი, რომელი კუთხისაა…',
  online: 'ონლაინ, სახლიდან: მუსიკა ყველას თავის ტელეფონზე ჟღერს და ყველას ხელში ჩურჩხელაა. რაც უფრო გვიან გაუშვებ, მით მეტი ქულა (1000-მდე), მაგრამ თუ მუსიკა გაჩერდა და ჯერ ისევ გიჭირავს — დაიწვი! დამწვრები ზარში დავალებას ასრულებენ.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წრეში დინამიკით უკრავს, ნამდვილი ჩურჩხელა (ან თვითონ ტელეფონი) ხელიდან ხელში გადადის. მუსიკა გაჩერდა, ზარი დარეკა — ვისაც ხელში დარჩა, ის დავალებას ასრულებს.',
  draw: count => drawChurchkhela({ pool: hangiPool(), tasks: ONLINE_TASKS, count, recent: readSeen() }),
  remember: rounds => rememberSeen(rounds.map(r => (r as ChurchkhelaQ).url).filter(Boolean)),
  askHost: 'მუსიკა ყველას ტელეფონზე ჟღერს. ვინც დროზე არ გაუშვებს, დაიწვება.',
  askPlayer: 'გაუშვი, სანამ მუსიკა უკრავს!',
  askTeams: 'ჩურჩხელა ხელიდან ხელში!',
  clip: q => { const o = q$(q); return o.url ? { url: o.url, from: typeof o.from === 'number' ? o.from : 0.2, seconds: CHURCHKHELA_CLIP } : null; },
  clipSeconds: CHURCHKHELA_CLIP,
  everyPhone: true,
  selfTimed: true,
  Secret: Secret as React.FC<{ q: RoundQ }>,
  Options,
  autoSend: () => true,
  Pick,
  Sent,
  pickName: (q, pick) => (isSafe({ burn: q$(q).burn ?? 0 }, pick) ? `${secs(pick)} წამზე გაუშვი` : 'ხელში შეგრჩა'),
  confirm: () => 'გაუშვი!',
  Reveal,
  Answer,
  verdict: (q, pick) => (isSafe({ burn: q$(q).burn ?? 0 }, pick)
    ? { tone: 'right', text: `გადარჩი — ${secs(pick!)} წამზე გაუშვი` }
    : { tone: 'wrong', text: 'დაიწვი — ჩურჩხელა ხელში შეგრჩა!' }),
  marks: [{ points: 1, label: 'შეასრულა' }, { points: 0, label: 'ვერ' }],
  empty: 'ამ თამაშისთვის სკოლის ჩანაწერებია საჭირო, ისინი კი შენთვის ჯერ არ არის გახსნილი.',
  callHint: 'ზარში ერთმანეთს ხედავთ და ისმენთ: დამწვარი დავალებას აქ ასრულებს. მუსიკა ყველას თავის ტელეფონზე ჟღერს.',
};

