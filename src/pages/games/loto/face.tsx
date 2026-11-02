import React from 'react';
import { Gem, MapPin, Mic2, Music2, TicketCheck } from 'lucide-react';
import { BOOK_NAMES } from '../../../data/chantLookup';
import {
  LINE_POINTS, LOTO_CLIP, LOTO_ROUNDS, NOT_MINE, cardOf, lineCells, lineNews, lotoRounds, marksAfter, toLine, type LotoQ,
} from '../../../utils/loto';
import type { PublicQ } from '../../../utils/roundGames';
import { Pill } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { openQ, type RoundFace } from '../rounds/face';
import { LotoCard, NotMine } from './Card';
import { DECK_HINT, DECK_LABEL, makeDeck, openDecks } from './decks';
import { decks } from './store';

// „საგალობო ლოტო“ (2026-11-01, like Bingo) over the quick games' screens: each player's own card on their phone (from the
// game's seed and their seat), the piece of the round, a tap on its name — or „not on my card“ — and at the reveal the card
// with the new mark, the lines lit gold, „საგანძური!“ for whoever closed one. Rules utils/loto.ts, decks ./decks.ts.

const q$ = (q: PublicQ) => openQ<LotoQ>(q);
const nameOf = (o: Partial<LotoQ>, i: number | null | undefined) => (i !== null && i !== undefined && i >= 0 ? o.names?.[i] ?? '' : '');

/** „საგანძური!“: a line closed (the first of the game says so) */
export const Treasure: React.FC<{ first?: boolean; lines?: number; sub?: string }> = ({ first, lines = 1, sub }) => (
  <div className="loto-glow rounded-3xl bg-gradient-to-br from-[#f3d36b] to-[#d9a520] px-4 py-3.5 text-center text-[#3b2a10]" role="status">
    <p className="flex items-center justify-center gap-2 font-serif-ge text-[24px] font-bold leading-tight">
      <Gem className="h-6 w-6 shrink-0" />{first ? 'პირველი საგანძური!' : 'საგანძური!'}
    </p>
    <p className="mt-0.5 text-[13.5px] font-bold">{sub ?? (lines > 1 ? `${lines} ხაზი ერთად!` : 'ხაზი შეიკრა')}</p>
  </div>
);

const Pick: RoundFace['Pick'] = ({ q, pick, onPick, seat, locked }) => {
  const o = q$(q);
  if (!o.names || o.seed === undefined || seat === undefined) return null;
  const card = cardOf(o.seed, seat, o.names.length);
  const marks = o.marks?.[seat] ?? [];
  const need = toLine(card, marks);
  return (
    <div className="space-y-3">
      <LotoCard
        names={o.names}
        card={card}
        marked={marks}
        lines={lineCells(card, marks)}
        pending={pick}
        onTap={locked ? undefined : i => onPick(pick === i ? null : i)}
      />
      {!locked && <NotMine on={pick === NOT_MINE} onClick={() => onPick(pick === NOT_MINE ? null : NOT_MINE)} />}
      <p className="text-center text-[12.5px] font-bold text-[#9a8b7b]">
        {need === 0 ? `ხაზები: ${o.lines?.[seat] ?? 0} — კიდევ შეკარი!` : need === 1 ? 'ხაზამდე ერთიღა გაკლია!' : `მონიშნული: ${marks.length} / 9`}
      </p>
    </div>
  );
};

const Reveal: RoundFace['Reveal'] = ({ q, picks, mine, seat, names }) => {
  const o = q$(q);
  if (o.right === undefined || !o.names || o.seed === undefined) return null;
  const full = o as LotoQ;
  const all = picks ?? (names ?? []).map(() => null);
  const { news, first } = lineNews(full, all);
  const who = (list: { seat: number }[]) => list.map(x => names?.[x.seat] ?? '').filter(Boolean).join(', ');
  if (seat !== undefined) {
    const card = cardOf(o.seed, seat, o.names.length);
    const after = marksAfter(full, seat, mine);
    const myNews = news.find(x => x.seat === seat);
    const others = news.filter(x => x.seat !== seat);
    return (
      <div className="space-y-3">
        {myNews && <Treasure first={first} lines={myNews.gained} sub={`+${myNews.gained * LINE_POINTS} · ${myNews.gained > 1 ? `${myNews.gained} ხაზი ერთად` : 'ხაზი შეკარი'}`} />}
        <LotoCard
          names={o.names}
          card={card}
          marked={after}
          lines={lineCells(card, after)}
          right={o.right}
          wrong={mine !== null && mine !== undefined && mine >= 0 && mine !== o.right ? mine : undefined}
          fresh={after.length > (o.marks?.[seat]?.length ?? 0) ? o.right : undefined}
        />
        {others.length > 0 && (
          <p className="flex items-center justify-center gap-1.5 text-center text-[13.5px] font-bold text-[#9a6a10]">
            <Gem className="h-4 w-4 shrink-0" />{first && !myNews ? 'პირველი საგანძური' : 'საგანძური'}: {who(others)}
          </p>
        )}
      </div>
    );
  }
  // the host: who had it, who marked it, who is one name from a line
  const seats = all.map((_, s) => s);
  const had = seats.filter(s => cardOf(o.seed!, s, o.names!.length).includes(o.right!));
  const marked = had.filter(s => all[s] === o.right);
  const near = seats.filter(s => {
    const card = cardOf(o.seed!, s, o.names!.length);
    const m = marksAfter(full, s, all[s]);
    return toLine(card, m) === 1;
  });
  return (
    <div className="space-y-3">
      {news.length > 0 && <Treasure first={first} sub={who(news)} />}
      <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 text-[14px] leading-snug text-[#4a3426]">
        <p><b>ბარათზე ჰქონდა:</b> {had.length} / {seats.length} · <b>მონიშნა:</b> {marked.length}</p>
        {near.length > 0 && <p className="mt-1 text-[13px] text-[#75685a]"><b>ხაზამდე ერთი აკლია:</b> {near.map(s => names?.[s] ?? '').filter(Boolean).join(', ')}</p>}
      </section>
    </div>
  );
};

/** the piece: its name, and where it comes from */
const Answer: RoundFace['Answer'] = ({ q }) => {
  const o = q$(q);
  const name = nameOf(o, o.right);
  if (!name) return null;
  return (
    <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
      {o.service && <Pill>{o.service}</Pill>}
      {o.deck === 'regions' ? (
        <>
          <p className="flex items-center gap-1.5 font-serif-ge text-[20px] font-bold leading-snug text-[#2f7d4f]"><MapPin className="h-5 w-5 shrink-0" />{name}</p>
          {o.song && <p className="mt-1 font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">„{o.song}“{o.place ? <span className="text-[13px] font-bold text-[#75685a]"> · {o.place}</span> : null}</p>}
        </>
      ) : (
        <>
          <p className={`${o.service ? 'mt-2' : ''} font-serif-ge text-[20px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]`}>„{name}“</p>
          {o.book && o.num && <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{BOOK_NAMES[o.book] ?? o.book} · №{o.num}</p>}
          {o.place && <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold text-[#2f7d4f]"><MapPin className="h-4 w-4 shrink-0" />{o.place}</p>}
        </>
      )}
      {o.who && <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]"><Mic2 className="mt-px h-4 w-4 shrink-0" />{o.who}</p>}
    </section>
  );
};

/** the host's phone while a piece sounds: what it is */
const Secret: NonNullable<RoundFace['Secret']> = ({ q }) => {
  const o = q as LotoQ;
  if (o.kind !== 'loto') return null;
  return (
    <p className="flex items-center gap-2 rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13.5px] font-bold text-[#4a3426]">
      <Music2 className="h-4 w-4 shrink-0" />
      <span className="min-w-0">ჟღერს: „{o.deck === 'regions' ? `${o.song ?? ''}` : o.names[o.right]}“{o.deck === 'regions' ? ` · ${o.names[o.right]}` : ''} <span className="font-normal text-[#75685a]">(მხოლოდ შენ ხედავ)</span></span>
    </p>
  );
};

/** the deck, in the room's lobby (the host's): what sounds */
export const LotoOptions: React.FC = () => {
  const deck = decks.use();
  const open = openDecks();
  const cur = open.includes(deck) ? deck : 'chants';
  return (
    <div className="space-y-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">რა ჟღერს</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="რა ჟღერს">
        {open.map(d => <Chip key={d} on={cur === d} onClick={() => decks.set(d)}>{DECK_LABEL[d]}</Chip>)}
      </div>
      <p className="text-[12.5px] leading-snug text-[#9a8b7b]">{DECK_HINT[cur]}</p>
    </div>
  );
};

export const LOTO_FACE: RoundFace = {
  game: 'loto',
  title: 'საგალობო ლოტო',
  Icon: TicketCheck,
  intro: 'ლოტოა, ოღონდ რიცხვების ნაცვლად საგალობლები ჟღერს. ყველას აქვს ბარათი ცხრა სახელით (3 × 3). ნაწყვეტი რომ ჟღერს, ცნობ და ბარათზე ნიშნავ. სამი მონიშნული ერთ რიგში, სვეტში ან დიაგონალზე ხაზია — დაიძახე: „საგანძური!“ შეიძლება ხალხური სიმღერებით ან კუთხეებითაც.',
  online: 'ონლაინ: წამყვანი ოთახს ხსნის და კლასს იწვევს, თვითონ არ თამაშობს. ყველას თავის ტელეფონზე საკუთარი ბარათი აქვს. ცამეტი ნაწყვეტიდან თითო ერთხელ ჟღერს — სახლიდან ყველას ტელეფონზე, ერთ ოთახში მხოლოდ წამყვანისაზე. მონიშვნა 100–200 ქულაა (რაც უფრო მალე, მით მეტი), ყოველი შეკრული ხაზი — კიდევ 300.',
  hybrid: 'ჰიბრიდული: ერთი ტელეფონი მასწავლებელს უჭირავს და ნაწყვეტებს დინამიკით უკრავს. ბავშვებს ქაღალდის ბარათები აქვთ — ამობეჭდილი (1–30) ან თავად დახატული — და ლობიოს მარცვლით ნიშნავენ. ვინც „საგანძური!“ დაიძახებს, მის ბარათს ტელეფონი ამოწმებს.',
  draw: (_count, program) => {
    const open = openDecks();
    const deck = open.includes(decks.read()) ? decks.read() : 'chants';
    const d = makeDeck(deck, LOTO_ROUNDS, program);
    return d ? lotoRounds(deck, d.names, d.pieces) : [];
  },
  remember: () => {},
  askHost: 'ნაწყვეტი ჟღერს — მოთამაშეები თავის ბარათზე ნიშნავენ.',
  askPlayer: 'მოისმინე: შენს ბარათზეა? მონიშნე.',
  askTeams: 'მოისმინეთ და ბარათზე მონიშნეთ.',
  clip: q => {
    const o = q$(q);
    if (o.book && o.num) return { score: { book: o.book, num: o.num }, voices: 0, seconds: LOTO_CLIP };
    return o.url ? { url: o.url, from: typeof o.from === 'number' ? o.from : 0.2, seconds: LOTO_CLIP } : null;
  },
  clipSeconds: LOTO_CLIP,
  fixedRounds: LOTO_ROUNDS,
  Options: LotoOptions,
  Secret,
  Pick,
  keepPick: true,
  pickName: (q, pick) => (pick === NOT_MINE ? 'ჩემს ბარათზე არ არის' : nameOf(q$(q), pick)),
  confirm: (q, pick) => (pick === null ? 'მონიშნე სახელი — ან „არ არის“' : pick === NOT_MINE ? 'არ არის · გაგზავნა' : `მონიშვნა · ${nameOf(q$(q), pick)}`),
  Reveal,
  Answer,
  verdict: (q, pick, _step, seat) => {
    const o = q$(q);
    const name = nameOf(o, o.right);
    if (o.right === undefined || o.seed === undefined || !o.names || seat === undefined) return { tone: 'none', text: name ? `ჟღერდა „${name}“` : 'პასუხი ვერ მოასწარი' };
    const had = cardOf(o.seed, seat, o.names.length).includes(o.right);
    if (pick === o.right && had) return { tone: 'right', text: 'მონიშნე!' };
    if (pick === null || pick === NOT_MINE) return had ? { tone: 'wrong', text: `შენ გქონდა — „${name}“` } : { tone: pick === null ? 'none' : 'near', text: 'შენს ბარათზე არ იყო' };
    return { tone: 'wrong', text: `არა — ჟღერდა „${name}“` };
  },
  marks: [{ points: 1, label: 'ხაზი' }, { points: 0, label: 'ვერა' }],
  empty: 'ამ ბარათისთვის ნაწყვეტები ვერ მოიძებნა.',
  callHint: 'ზარში ერთმანეთს ხედავთ და გესმით. ხაზს რომ შეკრავ, დაიძახე „საგანძური!“ — მაგრამ რა ჟღერს, ხმამაღლა ნუ იტყვი.',
};
