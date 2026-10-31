import React from 'react';
import { Info, ListChecks } from 'lucide-react';
import { hangiPool } from '../../../data/hangiPool';
import { OTKHI_QUESTIONS } from '../../../data/otkhiQuestions';
import { OTKHI_CLIP, OTKHI_LETTERS, drawOtkhi, type OtkhiQ } from '../../../utils/otkhi';
import type { PublicQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, OptionList, fourConfirm, fourName } from '../rounds/four';
import { readMine, readSeen, readTopics, rememberAsked } from './store';
import { activeTopics, topicLabel, topicList } from './topics';
import { Topics } from './Topics';
import { MineEditor } from './MineEditor';

// „ოთხიდან ერთი“ (2026-10-31, like Kahoot) over the quick games' screens: the question in words, four answers to tap
// (rounds/four.tsx), at the reveal the right one in green and how many picked each. Rules utils/otkhi.ts, questions
// data/otkhiQuestions.ts.

const q$ = (q: PublicQ) => openQ<OtkhiQ>(q);

/** the question, and for the host's and the teams' screen the four answers to read out */
const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.topic && <Pill>{topicLabel(o.topic)}</Pill>}
      <p className="mt-2.5 font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.q}</p>
      {who !== 'player' && <OptionList q={q} className="mt-3.5" />}
    </section>
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
  clip: q => { const o = q$(q); return o.url ? { url: o.url, from: typeof o.from === 'number' ? o.from : 0.2 } : null; },
  clipSeconds: OTKHI_CLIP,
  Ask,
  Options: Topics,
  Extra: MineEditor,
  Pick: FourPick,
  pickName: fourName,
  confirm: fourConfirm,
  Reveal: FourReveal,
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
