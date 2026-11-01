import React from 'react';
import { Check, Puzzle } from 'lucide-react';
import { hangebiPuzzles } from '../../../data/hangebiPool';
import { HANGEBI_MARKS, HANGEBI_WORDS, PIECE_SECONDS, drawHangebi, hangebiPuzzleOf, type HangebiQ } from '../../../utils/hangebi';
import type { PublicQ } from '../../../utils/roundGames';
import { openQ, type RoundFace } from '../rounds/face';
import { PlayDot, useSampler } from '../rounds/samples';
import { Bank, Shape, Tiles } from './Bank';
import { HangebiOptions } from './Options';
import { readLevel, readSeen, rememberAsked } from './store';

// „ოთხი ჰანგი, ერთი სიტყვა“ (2026-11-01, like 4 Pics 1 Word) over the quick games' screens: four clues — words, or four pieces
// of one region's songs — and the one word they share, built from a bank of letters (Bank.tsx). On one phone the teams write
// it on paper: the screen shows the clues, the boxes and the letters. Rules utils/hangebi.ts, puzzles data/hangebiPool.ts.

const q$ = (q: PublicQ) => openQ<HangebiQ>(q);
const word = (pick: number) => HANGEBI_WORDS[pick] ?? '';

/** each clue's colour, the same on every screen */
const TINT = ['bg-[#7a2028]/[0.07] text-[#7a2028]', 'bg-[#2b5f8a]/[0.08] text-[#2b5f8a]', 'bg-[#8a5a22]/[0.09] text-[#7a4c18]', 'bg-[#5b3f8c]/[0.08] text-[#5b3f8c]'];

const Clues: React.FC<{ clues: string[] }> = ({ clues }) => (
  <ul className="grid grid-cols-2 gap-2" aria-label="ოთხი სიტყვა">
    {clues.map((c, i) => (
      <li key={i} className={`min-h-[4.25rem] rounded-2xl px-2.5 py-2 flex items-center justify-center text-center ${TINT[i]}`}>
        <span className="font-serif-ge text-[17px] sm:text-[18px] font-bold leading-snug [overflow-wrap:anywhere]">{c}</span>
      </li>
    ))}
  </ul>
);

/** the four pieces, each its own ▶ (one sounds at a time) */
const Pieces: React.FC<{ clips: { url: string; from: number }[] }> = ({ clips }) => {
  const s = useSampler(PIECE_SECONDS);
  return (
    <ul className="grid grid-cols-2 gap-2" aria-label="ოთხი ნაწყვეტი">
      {clips.map((c, i) => (
        <li key={i} className={`rounded-2xl px-2.5 py-2.5 flex items-center gap-2.5 ${TINT[i]}`}>
          <PlayDot busy={s.isOn(i)} load={s.isLoading(i)} label={`ნაწყვეტი ${i + 1}`} onTap={() => s.tap(i, { url: c.url, from: c.from, seconds: PIECE_SECONDS })} />
          <span className="min-w-0 font-serif-ge text-[16px] font-bold leading-tight">ნაწყვეტი {i + 1}</span>
        </li>
      ))}
    </ul>
  );
};

const Ask: NonNullable<RoundFace['Ask']> = ({ q, who }) => {
  const o = q$(q);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-3.5 py-4 sm:px-5 space-y-3.5">
      <p className="text-center text-[13px] font-bold text-[#75685a]">
        {o.level === 'ear' ? 'ოთხი სიმღერა ერთი კუთხისაა — რომლის?' : 'რა აერთიანებს ოთხივეს?'}
      </p>
      {o.clips ? <Pieces clips={o.clips} /> : o.clues && <Clues clues={o.clues} />}
      {who !== 'player' && o.shape && (
        <div className="space-y-3 pt-1">
          <Shape shape={o.shape} />
          {who === 'teams' && o.tiles && <Tiles tiles={o.tiles} />}
        </div>
      )}
    </section>
  );
};

const Pick: RoundFace['Pick'] = ({ q, onPick }) => {
  const o = q$(q);
  if (!o.shape || !o.tiles || !o.id) return null;
  return <Bank id={o.id} shape={o.shape} tiles={o.tiles} onPick={onPick} />;
};

/** the word, and what the four were */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  if (o.answer === undefined) return null;
  const four = o.names ?? o.clues ?? [];
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 text-center">
      <p className="text-[12.5px] font-bold text-[#75685a]">{o.level === 'ear' ? 'ოთხივე სიმღერა აქედანაა' : 'ოთხივეს საერთო'}</p>
      <p className="mt-1 font-serif-ge text-[26px] font-bold leading-tight text-[#1e4d31] [overflow-wrap:anywhere]">{word(o.answer)}</p>
      {four.length > 0 && (
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
          {four.map((t, i) => <li key={i} className={`rounded-full px-3 py-1.5 text-[13px] font-bold leading-snug ${TINT[i]}`}>{o.names ? `„${t}“` : t}</li>)}
        </ul>
      )}
    </section>
  );
};

/** online: how many built it, and the words built instead */
const Reveal: RoundFace['Reveal'] = ({ q, picks }) => {
  const o = q$(q);
  if (!picks || o.answer === undefined) return null;
  const sent = picks.filter((p): p is number => p !== null);
  const right = sent.filter(p => p === o.answer).length;
  const wrong = [...sent.filter(p => p !== o.answer).reduce((m, p) => m.set(p, (m.get(p) ?? 0) + 1), new Map<number, number>())].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-2">
      <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#24603d]"><Check className="w-5 h-5 shrink-0" />სწორად ააწყო: {right} / {picks.length}</p>
      {wrong.length > 0 && (
        <p className="text-[13px] leading-snug text-[#75685a]">სხვა სიტყვები: {wrong.map(([p, n]) => `„${word(p)}“${n > 1 ? ` · ${n}` : ''}`).join(', ')}</p>
      )}
    </section>
  );
};

export const HANGEBI_FACE: RoundFace = {
  game: 'hangebi',
  title: 'ოთხი ჰანგი, ერთი სიტყვა',
  Icon: Puzzle,
  intro: 'ოთხი სიტყვა — მტკვარი, რიონი, არაგვი, ალაზანი — და ერთი საერთო: მდინარე. ან ოთხი ხალხური სიმღერის ნაწყვეტი — რომელი კუთხისაა? პასუხს ქვემოთ მოცემული ასოებით აწყობ, უჯრები ასოების რაოდენობას გეუბნება. სწორი სიტყვა მაშინვე 1000 ქულაა, ბოლო წამს — 500. თემები ყველგანაა: ბუნება, სუფრა, ისტორია, კინო, სიმღერა და გალობა.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ყველა თავის ტელეფონზე ხედავს ოთხ სიტყვას (ან ნაწყვეტს თვითონ უსმენს) და სიტყვას თავისი ასოებით აწყობს — ვინც უფრო მალე, მეტი ქულა.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი წამყვანს უჭირავს, კლასი გუნდებადაა. ეკრანზე ოთხი სიტყვა, უჯრები და ასოებია (ნაწყვეტებს წამყვანი რიგრიგობით უკრავს). გუნდები საერთო სიტყვას ფურცელზე წერენ, მერე ტელეფონი პასუხს აჩენს და წამყვანი თითო გუნდს მონიშნავს.',
  draw: count => {
    const level = readLevel();
    const puzzles = hangebiPuzzles();
    const rounds = drawHangebi({ puzzles, count, levels: level === 'both' ? undefined : [level], seen: readSeen() });
    return rounds.length ? rounds : drawHangebi({ puzzles, count, seen: readSeen() });
  },
  remember: rounds => rememberAsked(rounds.flatMap(r => (r.kind === 'hangebi' ? [hangebiPuzzleOf(r)] : []))),
  askHost: 'მოთამაშეები სიტყვას თავის ტელეფონზე აწყობენ.',
  askPlayer: 'რა აერთიანებს ოთხივეს? ააწყე სიტყვა.',
  askTeams: 'გუნდებო, საერთო სიტყვა ფურცელზე დაწერეთ.',
  clipSeconds: PIECE_SECONDS,
  Ask,
  Options: HangebiOptions,
  Pick,
  pickName: (_, pick) => `„${word(pick)}“`,
  confirm: (_, pick) => (pick === null ? 'ააწყე სიტყვა' : `„${word(pick)}“ — გაგზავნა`),
  Reveal,
  Answer,
  verdict: (q, pick) => {
    const o = q$(q);
    if (pick === null || o.answer === undefined) return { tone: 'none', text: 'პასუხი ვერ მოასწარი' };
    if (pick === o.answer) return { tone: 'right', text: 'სწორია!' };
    return { tone: 'wrong', text: `არა — სწორი იყო „${word(o.answer)}“` };
  },
  marks: HANGEBI_MARKS,
  empty: 'თავსატეხები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. პასუხს ხმამაღლა ნუ იტყვით — ყველა თავისას აწყობს.',
};
