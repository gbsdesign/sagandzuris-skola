import React from 'react';
import { AudioLines, Music2 } from 'lucide-react';
import { knownChants } from '../../../data/chantGamePool';
import { BOOK_NAMES } from '../../../data/chantLookup';
import {
  CHANT_STEPS, KHMEBI_CLIP, KHMEBI_FROM, KHMEBI_MARKS, NOTEBI_CUTS, NOTEBI_MARKS, STEP_TOP, drawChantRounds, rememberChants,
  type ChantGame, type ChantRoundQ,
} from '../../../utils/chantRounds';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, OptionList, fourConfirm, fourName } from '../rounds/four';

// „ხმა-ხმად“ (like Bandle) and „სამ ნოტში!“ (like Name That Tune), 2026-10-31, over the quick games' screens: a well-known
// chant on the synthesizer from its book notes, a little more at each of three steps — the bass alone, then with the middle
// voice, then all three; or the top voice's first three notes, then six, then its first phrase — and four names to pick
// from (rounds/four.tsx). Rules utils/chantRounds.ts, the chants data/chantGamePool.ts.

const q$ = (q: PublicQ) => openQ<ChantRoundQ>(q);

interface Look {
  game: ChantGame;
  title: string;
  Icon: RoundFace['Icon'];
  /** each step's name on the bar, and as „…ით გამოიცანი“ */
  steps: readonly string[];
  by: readonly string[];
  marks: RoundFace['marks'];
  intro: string;
  online: string;
  hybrid: string;
  nextLabel: string;
  clip: (q: Partial<ChantRoundQ>, step: number) => ReturnType<NonNullable<RoundFace['clip']>>;
}

const at = (step: number) => Math.min(CHANT_STEPS, Math.max(1, step)) - 1;
const score = (o: Partial<ChantRoundQ>) => (o.book && o.num ? { book: o.book, num: o.num } : null);

/** the chants asked lately on this phone (version ids), so the next game asks others first */
const seenKey = (game: ChantGame) => `sg-${game}-seen`;
const readSeen = (game: ChantGame): string[] => {
  try { const v = JSON.parse(localStorage.getItem(seenKey(game)) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
};

/** the three steps: the one sounding now, the ones heard, what each still earns */
const StepBar: React.FC<{ look: Look; step: number; teams: boolean }> = ({ look, step, teams }) => (
  <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label="ნაბიჯები">
    {look.steps.map((name, i) => {
      const now = i === step - 1;
      const past = i < step - 1;
      const worth = teams ? `${look.marks[i].points} ქულა` : `${STEP_TOP[i]}-მდე`;
      return (
        <li
          key={i}
          aria-current={now ? 'step' : undefined}
          className={`min-w-0 rounded-2xl px-2 py-1.5 text-center ${now ? 'bg-[#7a2028] text-white' : past ? 'bg-[#7a2028]/[0.08] text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}
        >
          <span className="block text-[13px] font-bold leading-tight [overflow-wrap:anywhere]">{name}</span>
          <span className={`block mt-0.5 text-[11.5px] font-bold tabular-nums ${now ? 'text-white/80' : ''}`}>{worth}</span>
        </li>
      );
    })}
  </ol>
);

const makeFace = (look: Look): RoundFace => {
  const Ask: NonNullable<RoundFace['Ask']> = ({ q, who, step }) => (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
      <p className="font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426]">რომელი საგალობელია?</p>
      <StepBar look={look} step={step} teams={who === 'teams'} />
      {who !== 'player' && <OptionList q={q} className="mt-3.5" />}
    </section>
  );

  /** the chant: its name, its service, where its notes are */
  const Answer: RoundFace['Answer'] = ({ q }) => {
    const o = q$(q);
    const name = o.right !== undefined ? o.options?.[o.right] : undefined;
    if (!name) return null;
    return (
      <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
        {o.service && <Pill>{o.service}</Pill>}
        <p className="mt-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{name}</p>
        {o.book && o.num && <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{BOOK_NAMES[o.book] ?? o.book} · №{o.num}</p>}
      </section>
    );
  };

  return {
    game: look.game,
    title: look.title,
    Icon: look.Icon,
    intro: look.intro,
    online: look.online,
    hybrid: look.hybrid,
    draw: (count, program) => drawChantRounds(look.game, knownChants(program), count, readSeen(look.game)),
    remember: (rounds: RoundQ[]) => {
      const ids = rounds.filter((r): r is ChantRoundQ => r.kind === look.game).map(r => r.id);
      try { localStorage.setItem(seenKey(look.game), JSON.stringify(rememberChants(readSeen(look.game), ids))); } catch { /* private mode */ }
    },
    askHost: 'მოთამაშეები პასუხს თავის ტელეფონზე ნიშნავენ.',
    askPlayer: 'მოისმინე და მონიშნე, რომელი საგალობელია.',
    askTeams: 'წაიკითხე სახელები. გუნდები ასოს და ნაბიჯს წერენ.',
    clip: (q, step) => look.clip(q$(q), step),
    clipSeconds: KHMEBI_CLIP,
    nextLabel: look.nextLabel,
    Ask,
    Pick: FourPick,
    pickName: fourName,
    confirm: fourConfirm,
    Reveal: FourReveal,
    Answer,
    verdict: (q, pick, step) => {
      const o = q$(q);
      if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
      if (pick === o.right) return { tone: 'right', text: step ? `სწორია! ${look.by[at(step)]} გამოიცანი` : 'სწორია!' };
      return { tone: 'wrong', text: `არა — სწორი იყო ${OTKHI_LETTERS[o.right]}` };
    },
    marks: look.marks,
    empty: 'საგალობლები ვერ მოიძებნა.',
    callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
  };
};

const CHANTS = 'საგალობლები: წირვის, მწუხრისა და ცისკრის ყველაზე ცნობილები და კლასის სასწავლო პროგრამა.';

export const KHMEBI_FACE = makeFace({
  game: 'khmebi',
  title: 'ხმა-ხმად',
  Icon: AudioLines,
  steps: ['ბანი', '+ მოძახილი', 'სამივე ხმა'],
  by: ['ბანით', 'ორი ხმით', 'სამივე ხმით'],
  marks: KHMEBI_MARKS,
  intro: `ცნობილი საგალობელი წიგნის ნოტებით, სინთეზატორზე, ხმა-ხმად ჟღერს: ჯერ მარტო ბანი, მერე ბანი და მოძახილი, ბოლოს სამივე ხმა. ოთხი სახელიდან სწორი უნდა აირჩიო — რაც ადრე მიხვდები, მით მეტი ქულა. ${CHANTS}`,
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. საგალობელი ყველას თავის ტელეფონზე ჟღერს — სახლიდანაც (ერთ ოთახში მხოლოდ წამყვანისაზე). პასუხს რაუნდში ერთხელ ნიშნავ: ბანზევე თუ მიხვდები, 1000-მდე ქულაა, ორ ხმაზე — 650-მდე, სამივეზე — 350-მდე.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი საგალობელს რთავს და ოთხ სახელს კითხულობს; გუნდი, რომელიც მიხვდება, ფურცელზე ასოს და ნაბიჯს წერს (1 — ბანით, 2 — ორი ხმით, 3 — სამივეთი). მერე ტელეფონი სწორს აჩენს და წამყვანი თითო გუნდს უნიშნავს; ქულებს ტელეფონი ითვლის.',
  nextLabel: 'შემდეგი ხმა',
  clip: (o, step) => { const s = score(o); return s ? { score: s, voices: KHMEBI_FROM[at(step)], seconds: KHMEBI_CLIP } : null; },
});

export const NOTEBI_FACE = makeFace({
  game: 'notebi',
  title: 'სამ ნოტში!',
  Icon: Music2,
  steps: ['3 ნოტი', '6 ნოტი', 'ფრაზა'],
  by: ['3 ნოტით', '6 ნოტით', 'მთელი ფრაზით'],
  marks: NOTEBI_MARKS,
  intro: `ცნობილი საგალობლის დასაწყისი, ზედა ხმა, წიგნის ნოტებით სინთეზატორზე: ჯერ მხოლოდ სამი ნოტი, მერე ექვსი, ბოლოს მთელი პირველი ფრაზა. ოთხი სახელიდან სწორი აირჩიე — რაც ნაკლებ ნოტში მიხვდები, მით მეტი ქულა. ${CHANTS}`,
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ნოტები ყველას თავის ტელეფონზე ჟღერს — სახლიდანაც (ერთ ოთახში მხოლოდ წამყვანისაზე). პასუხს რაუნდში ერთხელ ნიშნავ: სამ ნოტზე 1000-მდე ქულაა, ექვსზე — 650-მდე, მთელ ფრაზაზე — 350-მდე.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი ნოტებს რთავს და ოთხ სახელს კითხულობს; გუნდი, რომელიც მიხვდება, ფურცელზე ასოს და ნაბიჯს წერს (1 — სამი ნოტით, 2 — ექვსით, 3 — ფრაზით). მერე ტელეფონი სწორს აჩენს და წამყვანი თითო გუნდს უნიშნავს; ქულებს ტელეფონი ითვლის.',
  nextLabel: 'მეტი ნოტი',
  clip: (o, step) => { const s = score(o); return s ? { score: s, ...NOTEBI_CUTS[at(step)] } : null; },
});
