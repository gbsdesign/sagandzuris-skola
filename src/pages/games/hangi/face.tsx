import React, { useMemo, useSyncExternalStore } from 'react';
import { Headphones } from 'lucide-react';
import { hangiPool } from '../../../data/hangiPool';
import { SNIPPETS } from '../../../utils/hangi';
import {
  HANGI_KINDS, HANGI_MARKS, HANGI_TOP, drawHangiRounds, hangiPiece, type HangiKinds, type HangiQ,
} from '../../../utils/hangiRounds';
import { rememberChants } from '../../../utils/chantRounds';
import { OTKHI_LETTERS } from '../../../utils/otkhi';
import { useMembership } from '../../../utils/memberAccess';
import type { PublicQ, RoundQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { openQ, type RoundFace } from '../rounds/face';
import { FourPick, FourReveal, OptionList, fourConfirm, fourName } from '../rounds/four';

// „დღის ჰანგი“ with the class (2026-11-01) over the quick games' screens: a recording of the school from its start — 1
// second, then 2, 4, 7, 11 and 16 — and four names to pick from (rounds/four.tsx). Rules utils/hangiRounds.ts; the daily
// game itself stays pages/games/HangiGame.tsx, whose page shows these two variants as its other tabs.

const q$ = (q: PublicQ) => openQ<HangiQ>(q);

// kept on this phone (the daily game's record has `sg-hangi` itself): what sounds, and the takes asked lately
const STEM = 'sg-hangi-klasi';
const SEEN = `${STEM}-seen`;
const KINDS = `${STEM}-kinds`;
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const readSeen = (): string[] => { const v = load(SEEN); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };

let kinds: HangiKinds | null = null;
const subs = new Set<() => void>();
const readKinds = (): HangiKinds => (kinds ??= HANGI_KINDS.find(k => k === load(KINDS)) ?? 'all');
const setKinds = (k: HangiKinds) => {
  kinds = k;
  try { localStorage.setItem(KINDS, JSON.stringify(k)); } catch { /* private mode */ }
  subs.forEach(f => f());
};
const useKinds = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, readKinds);

const KIND_LABEL: Record<HangiKinds, string> = { all: 'ორივე', chant: 'საგალობლები', song: 'ხალხური სიმღერები' };

/** what sounds: the lobby's choice (the host's) and the one-phone setup's */
const Kinds: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const pool = useMemo(() => hangiPool(), [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const count = (k: HangiKinds) => new Set(pool.filter(t => k === 'all' || t.kind === k).map(t => t.title)).size;
  const on = useKinds();
  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">რა ჟღერდეს</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="რა ჟღერდეს">
        {HANGI_KINDS.map(k => (
          <Chip key={k} on={on === k} onClick={() => setKinds(k)}>
            {KIND_LABEL[k]}
            <span className={`ml-1 tabular-nums ${on === k ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{count(k)}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
};

/** the ladder: how much sounds now, what each step still earns */
const Ladder: React.FC<{ step: number; teams: boolean }> = ({ step, teams }) => {
  const now = Math.min(SNIPPETS.length, Math.max(1, step)) - 1;
  const worth = teams ? `${HANGI_MARKS[now].points} ქულა` : `${HANGI_TOP[now]}-მდე ქულა`;
  return (
    <div className="mt-3">
      <ol className="grid grid-cols-6 gap-1" aria-label="ნაბიჯები">
        {SNIPPETS.map((s, i) => (
          <li
            key={s}
            aria-current={i === now ? 'step' : undefined}
            className={`h-9 rounded-xl flex items-center justify-center text-[14px] font-bold tabular-nums ${i === now ? 'bg-[#7a2028] text-white' : i < now ? 'bg-[#7a2028]/[0.08] text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}
          >
            {s}
          </li>
        ))}
      </ol>
      <p className="mt-1.5 text-[13px] font-bold leading-snug text-[#75685a]">ისმის {hangiPiece(step)} წამი · {worth}</p>
    </div>
  );
};

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who, step }) => (
  <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-4 py-4 sm:px-5">
    <p className="font-serif-ge text-[20px] sm:text-[22px] font-bold leading-snug text-[#4a3426]">რომელია?</p>
    <Ladder step={step} teams={who === 'teams'} />
    {who !== 'player' && <OptionList q={q} className="mt-3.5" />}
  </section>
);

/** the recording: its name, where it is from */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  const name = o.right !== undefined ? o.options?.[o.right] : undefined;
  if (!name) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      <Pill>{o.song ? 'ხალხური სიმღერა' : 'საგალობელი'}</Pill>
      <p className="mt-2 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{name}</p>
      {o.sub && <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{o.sub}</p>}
    </section>
  );
};

export const HANGI_FACE: RoundFace = {
  game: 'hangi',
  store: STEM,
  title: 'დღის ჰანგი',
  Icon: Headphones,
  intro: 'სკოლის ჩანაწერი თავიდან ჟღერს: ჯერ 1 წამი, მერე 2, 4, 7, 11 და 16. ოთხი სახელიდან სწორი უნდა აირჩიო — რაც ადრე მიხვდები, მით მეტი ქულა. ჩანაწერები: აპის საგალობლები და ხალხური სიმღერები.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ჩანაწერი ყველას თავის ტელეფონზე ჟღერს — სახლიდანაც (ერთ ოთახში მხოლოდ წამყვანისაზე). პასუხს რაუნდში ერთხელ ნიშნავ: 1 წამზე 1000-მდე ქულაა, ყოველ ნაბიჯზე ცოტა ნაკლები, 16 წამზე — 250-მდე.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. წამყვანი ჩანაწერს რთავს და ოთხ სახელს კითხულობს; გუნდი, რომელიც მიხვდება, ფურცელზე ასოს და წამს წერს (1, 2, 4, 7, 11 ან 16). მერე ტელეფონი სწორს აჩენს და წამყვანი თითო გუნდს უნიშნავს: 1 წამით — 6 ქულა, 16 წამით — 1.',
  draw: count => drawHangiRounds(hangiPool(), count, readSeen(), readKinds()),
  remember: (rounds: RoundQ[]) => {
    const ids = rounds.filter((r): r is HangiQ => r.kind === 'hangi').map(r => r.id);
    try { localStorage.setItem(SEEN, JSON.stringify(rememberChants(readSeen(), ids, 300))); } catch { /* private mode */ }
  },
  askHost: 'მოთამაშეები პასუხს თავის ტელეფონზე ნიშნავენ.',
  askPlayer: 'მოისმინე და მონიშნე, რომელია.',
  askTeams: 'წაიკითხე სახელები. გუნდები ასოს და წამს წერენ.',
  clip: (q, step) => { const o = q$(q); return o.url ? { url: o.url, from: 0, seconds: hangiPiece(step) } : null; },
  clipSeconds: SNIPPETS[SNIPPETS.length - 1],
  nextLabel: 'მეტი წამი',
  Ask,
  Options: Kinds,
  Pick: FourPick,
  pickName: fourName,
  confirm: fourConfirm,
  Reveal: FourReveal,
  Answer,
  verdict: (q, pick, step) => {
    const o = q$(q);
    if (pick === null || o.right === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.right) return { tone: 'right', text: step ? `სწორია! ${hangiPiece(step)} წამში გამოიცანი` : 'სწორია!' };
    return { tone: 'wrong', text: `არა — სწორი იყო ${OTKHI_LETTERS[o.right]}` };
  },
  marks: HANGI_MARKS,
  empty: 'ჩანაწერები ვერ მოიძებნა: ან ჯერ არ გაქვს ჩართული (მათ სკოლის ადმინისტრატორი რთავს), ან არჩეულში ცოტაა — აირჩიე „ორივე“.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას ნიშნავს.',
};
