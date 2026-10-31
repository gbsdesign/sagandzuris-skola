import React from 'react';
import { Check, Info, ListChecks } from 'lucide-react';
import { hangiPool } from '../../../data/hangiPool';
import { OTKHI_QUESTIONS } from '../../../data/otkhiQuestions';
import { OTKHI_CLIP, OTKHI_LETTERS, drawOtkhi, type OtkhiQ } from '../../../utils/otkhi';
import type { PublicQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { openQ, type RoundFace } from '../rounds/face';
import { readMine, readSeen, readTopics, rememberAsked } from './store';
import { activeTopics, topicLabel, topicList } from './topics';
import { Topics } from './Topics';
import { MineEditor } from './MineEditor';

// „ოთხიდან ერთი“ (2026-10-31, like Kahoot) over the quick games' screens: the question in words, four answers to tap, at the
// reveal the right one in green and how many picked each. Rules utils/otkhi.ts, questions data/otkhiQuestions.ts.

const q$ = (q: PublicQ) => openQ<OtkhiQ>(q);

/** each answer's colour, the same on every screen (a team writes the letter down) */
const LOOK = [
  { dot: 'bg-[#7a2028]', on: 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]', ink: 'text-[#7a2028]' },
  { dot: 'bg-[#2b5f8a]', on: 'bg-[#2b5f8a]/[0.07] ring-2 ring-[#2b5f8a]', ink: 'text-[#2b5f8a]' },
  { dot: 'bg-[#8a5a22]', on: 'bg-[#8a5a22]/[0.07] ring-2 ring-[#8a5a22]', ink: 'text-[#8a5a22]' },
  { dot: 'bg-[#5b3f8c]', on: 'bg-[#5b3f8c]/[0.07] ring-2 ring-[#5b3f8c]', ink: 'text-[#5b3f8c]' },
] as const;

const Letter: React.FC<{ i: number; size?: 'md' | 'sm'; plain?: boolean }> = ({ i, size = 'md', plain }) => (
  <span
    aria-hidden="true"
    className={`shrink-0 rounded-full flex items-center justify-center font-serif-ge font-bold ${size === 'sm' ? 'w-8 h-8 text-[15px]' : 'w-9 h-9 text-[17px]'} ${plain ? 'bg-white text-[#2f7d4f]' : `${LOOK[i].dot} text-white`}`}
  >
    {OTKHI_LETTERS[i]}
  </span>
);

/** the question, and for the host's and the teams' screen the four answers to read out */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.topic && <Pill>{topicLabel(o.topic)}</Pill>}
      <p className="mt-2.5 font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.q}</p>
      {who !== 'player' && o.options && (
        <ul className="mt-3.5 space-y-2">
          {o.options.map((text, i) => (
            <li key={i} className="flex items-center gap-3">
              <Letter i={i} size="sm" />
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const Pick: RoundFace['Pick'] = ({ q, pick, onPick }) => {
  const o = q$(q);
  return (
    <ul className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="პასუხები">
      {(o.options ?? []).map((text, i) => {
        const on = pick === i;
        return (
          <li key={i}>
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { triggerHaptic(8); onPick(i); }}
              className={`w-full h-full min-h-14 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,transform] active:scale-[0.99] cursor-pointer ${on ? LOOK[i].on : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
            >
              <Letter i={i} />
              <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{text}</span>
              {on && <Check className={`w-5 h-5 shrink-0 ${LOOK[i].ink}`} aria-hidden="true" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/** the reveal: the right answer in green, how many picked each, my own pick */
const Reveal: RoundFace['Reveal'] = ({ q, picks, mine }) => {
  const o = q$(q);
  if (o.right === undefined || !o.options) return null;
  const counts = picks ? o.options.map((_, i) => picks.filter(p => p === i).length) : null;
  const answered = counts ? counts.reduce((a, b) => a + b, 0) : 0;
  return (
    <ul className="space-y-2" aria-label="პასუხები">
      {o.options.map((text, i) => {
        const right = i === o.right;
        const isMine = mine === i;
        const look = right ? 'bg-[#2f7d4f] text-white' : isMine ? 'bg-white ring-2 ring-[#c0392b]/55 text-[#4a3426]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]';
        return (
          <li key={i} className={`rounded-2xl px-3 py-2.5 ${look}`}>
            <div className="flex items-center gap-3">
              <Letter i={i} size="sm" plain={right} />
              <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug [overflow-wrap:anywhere]">
                {text}
                {isMine && <span className={`ml-1.5 text-[12.5px] ${right ? 'text-[#d9f0e0]' : 'text-[#c0392b]'}`}>· შენ</span>}
              </span>
              {counts && <span className="shrink-0 min-w-[1.5rem] text-right text-[15px] font-bold tabular-nums">{counts[i]}</span>}
              {right && <Check className="w-5 h-5 shrink-0" aria-label="სწორი პასუხი" />}
            </div>
            {counts && answered > 0 && (
              <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${right ? 'bg-white/25' : 'bg-[#f1e8d9]'}`}>
                <div className={`h-full rounded-full ${right ? 'bg-white' : LOOK[i].dot}`} style={{ width: `${Math.round((counts[i] / answered) * 100)}%` }} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** the question once more, and the note on its answer */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.q) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.q}</p>
      {o.note && <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a] [overflow-wrap:anywhere]"><Info className="w-4 h-4 shrink-0 mt-px" />{o.note}</p>}
    </section>
  );
};

const nameOf = (q: PublicQ, pick: number) => {
  const text = q$(q).options?.[pick];
  return text ? `${OTKHI_LETTERS[pick]} · ${text}` : OTKHI_LETTERS[pick] ?? '';
};

export const OTKHI_FACE: RoundFace = {
  game: 'otkhi',
  title: 'ოთხიდან ერთი',
  Icon: ListChecks,
  intro: 'კითხვა და ოთხი პასუხი — ერთია სწორი. კითხვები სკოლის თემებზეა: წმინდანები, საღმრთო ისტორია, დღესასწაულები, გალობა, სიმღერა, მწერლობა, სამოსი, მუსიკის ანბანი; ზოგი ჩანაწერის მოსმენით. სწორი პასუხი მაშინვე 1000 ქულაა, ბოლო წამს — 500.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. კითხვა და პასუხები ყველას თავის ტელეფონზე უჩანს — სახლიდანაც; ვინც სწორს უფრო მალე მონიშნავს, მეტ ქულას იღებს.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი კითხვასა და ოთხ პასუხს ხმამაღლა კითხულობს, გუნდები ბჭობენ და სწორის ასოს (ა, ბ, გ, დ) ფურცელზე წერენ; მერე ტელეფონი სწორს აჩენს და წამყვანი მონიშნავს, ვინ გამოიცნო. ქულებს ტელეფონი ითვლის.',
  draw: count => {
    const pool = hangiPool();
    const mine = readMine();
    const topics = activeTopics(readTopics(), topicList(pool.length > 0, mine).map(t => t.id));
    return drawOtkhi({ bank: [...OTKHI_QUESTIONS, ...mine], topics, count, seen: readSeen(), pool });
  },
  remember: rounds => rememberAsked(rounds.map(r => r.id)),
  askHost: 'მოთამაშეები პასუხს თავის ტელეფონზე ნიშნავენ.',
  askPlayer: 'მონიშნე სწორი პასუხი.',
  askTeams: 'წაიკითხე ხმამაღლა. გუნდები სწორის ასოს ფურცელზე წერენ.',
  clip: q => (q.url ? { url: q.url, from: typeof q.from === 'number' ? q.from : 0.2 } : null),
  clipSeconds: OTKHI_CLIP,
  Ask,
  Options: Topics,
  Extra: MineEditor,
  Pick,
  pickName: nameOf,
  confirm: (_, pick) => (pick === null ? 'მონიშნე პასუხი' : `${OTKHI_LETTERS[pick]} — გაგზავნა`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: 'სწორია!' };
    return { tone: 'wrong', text: `არა — სწორი იყო ${OTKHI_LETTERS[o.right]}` };
  },
  marks: [{ points: 1, label: 'სწორი' }, { points: 0, label: 'ვერა' }],
  empty: 'არჩეულ თემებში კითხვა ვერ მოიძებნა — აირჩიე სხვა თემებიც.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
