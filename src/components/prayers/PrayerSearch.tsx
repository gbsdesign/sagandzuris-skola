import React, { useMemo, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  AKATHISTS, ANDREW_CANON, APOSTLE, CONFESSION_PRAYERS, GOSPELS, KATHISMAS, MORNING_EVENING, PARAKLISES, PRAYER_HOURS, PSALTER_RULE,
  VARIOUS_PRAYERS, bibleChapterId, hourClock, prayerTitle,
} from '../../data/prayers';
import { kathismaOfPsalm, matchScore, psalmNumber, searchNormalize, splitTrailingNumber } from '../../utils/searchMatch';
import { triggerHaptic } from '../../utils/haptics';

// „ძებნა ლოცვანში“ (2026-11-06, the user's pick): one field over the book that looks through every prayer, akathist, kanon
// and chapter at once — a word of a title („ღვთისმშობ“), a psalm („ფს 50“ → its kanon), a chapter („მათე 5“), an hour
// („09:00“). While something is typed the groups step aside and the matches stand in their place.

type Hit = { id: string; title: string; sub: string; score: number };

const KIND = {
  daily: 'ყოველდღიური', scripture: 'წმინდა წერილი', akathist: 'დაუჯდომელი', special: 'განსაკუთრებული', psalter: 'ფსალმუნები',
};

// every single prayer the book opens, with the group it stands in
const ALL: { id: string; title: string; sub: string }[] = [
  ...MORNING_EVENING.map(p => ({ id: p.id, title: p.title, sub: KIND.daily })),
  ...PRAYER_HOURS.map(h => ({ id: h.id, title: `${hourClock(h)} · ${h.label}`, sub: `შვიდგზის ლოცვა · ${KIND.daily}` })),
  ...VARIOUS_PRAYERS.map(p => ({ id: p.id, title: p.title, sub: KIND.special })),
  ...PARAKLISES.map(p => ({ id: p.id, title: p.title, sub: `პარაკლისი · ${KIND.special}` })),
  ...CONFESSION_PRAYERS.map(p => ({ id: p.id, title: prayerTitle(p.id), sub: `აღსარება და ზიარება · ${KIND.special}` })),
  ...ANDREW_CANON.map(p => ({ id: p.id, title: `ანდრია კრიტელის კანონი — ${p.title}`, sub: KIND.special })),
  ...AKATHISTS.map(p => ({ id: p.id, title: p.title, sub: KIND.akathist })),
  ...KATHISMAS.map(k => ({ id: k.id, title: `კანონი ${k.n}`, sub: `ფსალმუნები ${k.psalms} · ${KIND.psalter}` })),
  { id: PSALTER_RULE.id, title: PSALTER_RULE.title, sub: KIND.psalter },
];
const NORM = ALL.map(x => searchNormalize(x.title));
const BOOKS = [...GOSPELS.map(b => ({ b, gospel: true })), ...APOSTLE.map(b => ({ b, gospel: false }))];
const BOOK_NORM = BOOKS.map(x => searchNormalize(x.b.title));
const MAX_HITS = 24;

export const searchPrayers = (raw: string): Hit[] => {
  const q = searchNormalize(raw);
  if (q.length < 2) return [];
  const hits: Hit[] = [];
  // a psalm's number → the kanon it is read in
  const ps = psalmNumber(raw);
  if (ps) {
    const n = kathismaOfPsalm(ps, KATHISMAS.map(k => k.psalms));
    if (n) hits.push({ id: `kathisma-${n}`, title: `კანონი ${n}`, sub: `${ps}-ე ფსალმუნი აქ იკითხება · ${KIND.psalter}`, score: -1 });
  }
  // a book with a chapter („მათე 5“), or a book alone (its first chapter)
  const bc = splitTrailingNumber(raw);
  const bookQ = bc ? searchNormalize(bc.words) : q;
  BOOKS.forEach(({ b, gospel }, i) => {
    const sc = matchScore(BOOK_NORM[i], bookQ);
    if (sc === null) return;
    const ch = bc ? bc.n : 1;
    if (ch < 1 || ch > b.chapters) return;
    hits.push({ id: bibleChapterId(b.id, ch), title: `${b.title} · თავი ${ch}`, sub: `${gospel ? 'სახარება' : 'სამოციქულო'} · ${KIND.scripture}`, score: sc + (bc ? -0.5 : 0.5) });
  });
  ALL.forEach((x, i) => {
    const sc = matchScore(NORM[i], q);
    if (sc !== null) hits.push({ ...x, score: sc });
  });
  return hits.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, 'ka')).slice(0, MAX_HITS);
};

/** The field and, while something is typed, the matches; `onQuery` tells the book whether to step aside. */
export const PrayerSearch: React.FC<{ onOpen: (id: string) => void; onQuery: (active: boolean) => void }> = ({ onOpen, onQuery }) => {
  const [q, setQ] = useState('');
  const hits = useMemo(() => searchPrayers(q), [q]);
  const active = searchNormalize(q).length >= 2;
  const set = (v: string) => { setQ(v); onQuery(searchNormalize(v).length >= 2); };
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#b5a48c]" />
        <input
          type="search"
          value={q}
          onChange={e => set(e.target.value)}
          placeholder="ძებნა ლოცვანში — ლოცვა, ფსალმუნი, თავი…"
          aria-label="ძებნა ლოცვანში"
          className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/35 outline-none text-[16px] text-[#2a2017] placeholder:text-[14px] placeholder:text-[#b5a48c] [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => set('')} aria-label="გასუფთავება"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#a89886] hover:text-[#4a3426] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {active && (
        hits.length ? (
          <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#f1e8d9] overflow-hidden sg-in">
            {hits.map(h => (
              <li key={h.id}>
                <button type="button" onClick={() => { triggerHaptic(8); onOpen(h.id); }}
                  className="w-full min-h-12 px-3.5 py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-[#7a2028]/[0.04]">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-bold leading-snug text-[#2a2017]">{h.title}</span>
                    <span className="block text-[12px] text-[#8a7a6a] leading-snug">{h.sub}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c]" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 text-[13px] text-[#8a7a6a]">ვერაფერი მოიძებნა — სცადე სხვა სიტყვა ან ფსალმუნის ნომერი.</p>
        )
      )}
    </div>
  );
};
