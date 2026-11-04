import React from 'react';
import { Brain, Info } from 'lucide-react';
import { hangiPool } from '../../../data/hangiPool';
import { RSR_QUESTIONS } from '../../../data/raSadRodisQuestions';
import { SNIPPET, drawGame, listenQuestion, toRsrRound, type RsrPlay, type RsrQ } from '../../../utils/raSadRodis';
import type { PublicQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { readConf, readMine, readSeen, rememberAsked } from './store';
import { activeTopics, topicLabel, topicRows } from './topics';
import { RsrTopics } from './Topics';
import { RsrMineEditor } from './MineEditor';

// „რა? სად? როდის?“ online (2026-11-04) over the quick games' screens (pages/games/rounds/): a class's room, the host reads
// the question out in the room's call (it is on every phone too), every player writes the answer on their own phone within
// the minute; at the reveal the app has judged the words (utils/raSadRodis.ts `rsrMatch`) and the host judges again
// whatever it got wrong. One point a right answer. The one-phone game of teams with paper slips is rsr/Table.tsx.

const q$ = (q: PublicQ) => openQ<RsrQ>(q);

/** the question, on every screen while it is asked */
const Ask: NonNullable<RoundFace['Ask']> = ({ q }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      {o.topic && <Pill>{topicLabel(o.topic)}</Pill>}
      <p className="mt-2.5 font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{o.q}</p>
    </section>
  );
};

/** the answer, big, with its note and the question under it */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (!o.a) return null;
  return (
    <section className="rounded-3xl bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20 px-4 py-4 sm:px-5">
      <p className="text-[12px] font-bold text-[#9a8b7b]">პასუხი</p>
      <p className="mt-1 font-serif-ge text-[24px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{o.a}</p>
      {o.note && <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a] [overflow-wrap:anywhere]"><Info className="w-4 h-4 shrink-0 mt-px" />{o.note}</p>}
      {o.q && <p className="mt-2.5 pt-2.5 border-t border-[#7a2028]/10 text-[13px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{o.q}</p>}
    </section>
  );
};

/** the game's rounds: the topics chosen (both tabs share them), the unasked first, a recording's piece for „მოისმინე“ */
const draw = (count: number): RsrQ[] => {
  const pool = hangiPool();
  const mine = readMine();
  const topics = activeTopics(readConf().settings.topics, topicRows(pool.length, mine).map(t => t.id));
  const listen = (used: Set<string>): RsrPlay | null => {
    const rest = pool.filter(p => !used.has(`l:${p.id}`));
    return rest.length ? listenQuestion(rest[Math.floor(Math.random() * rest.length)]) : null;
  };
  return drawGame({ bank: [...RSR_QUESTIONS, ...mine], topics, count, seen: readSeen(), listen }).map(p => toRsrRound(p));
};

export const RSR_FACE: RoundFace = {
  game: 'rsr',
  // `sg-rsr` holds the one-phone game's settings
  store: 'sg-rsr-klasi',
  title: 'რა? სად? როდის?',
  Icon: Brain,
  intro: 'ვიქტორინა ჩვენი თემებით: ისტორია და გმირები, მწერლობა, კინო, ცეკვა, სუფრა, ძეგლები, ბუნება, სპორტი, წმინდანები, გალობა და სიმღერა; ზოგი ჩანაწერის მოსმენით. ერთი კითხვა, ერთი წუთი ფიქრისთვის, სწორი პასუხი — ერთი ქულა.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. კითხვა ყველას თავის ტელეფონზე უჩანს — სახლიდანაც — და ყველა წუთში პასუხს თავის ტელეფონზე წერს. მერე აპი პასუხებს ამოწმებს, წამყვანი კი რასაც საჭიროა, შეასწორებს.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი კითხვას ხმამაღლა კითხულობს, გუნდები ბჭობენ და წუთში პასუხს ფურცელზე წერენ; ზარის მერე ტელეფონი პასუხს აჩენს და წამყვანი მონიშნავს, ვინ გამოიცნო. ქულებს ტელეფონი ითვლის.',
  draw,
  remember: rounds => rememberAsked(rounds.flatMap(r => (r.kind === 'rsr' ? [r.id] : []))),
  askHost: 'წაიკითხე კითხვა ხმამაღლა. მოთამაშეები პასუხს თავის ტელეფონზე წერენ.',
  askPlayer: 'დაწერე პასუხი.',
  askTeams: 'წაიკითხე ხმამაღლა. გუნდები პასუხს ფურცელზე წერენ.',
  clip: q => { const o = q$(q); return o.url ? { url: o.url, from: typeof o.from === 'number' ? o.from : 0.2 } : null; },
  clipSeconds: SNIPPET,
  Ask,
  Options: RsrTopics,
  Extra: RsrMineEditor,
  typed: { placeholder: 'მაგ.: ფარნავაზი' },
  // answered in words: the shared screens give the field, the verdict and everybody's answers
  Pick: () => null,
  pickName: () => '',
  confirm: () => 'პასუხის გაგზავნა',
  Reveal: () => null,
  Answer,
  verdict: () => ({ tone: 'none', text: '' }),
  marks: [{ points: 1, label: 'სწორი' }, { points: 0, label: 'ვერა' }],
  empty: 'არჩეულ თემებში კითხვა ვერ მოიძებნა — აირჩიე სხვა თემებიც.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით: წამყვანი კითხვას ხმამაღლა წაიკითხავს. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას წერს.',
};
