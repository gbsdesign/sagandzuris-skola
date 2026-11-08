import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, CloudDownload, CloudOff, HardDrive, Search } from 'lucide-react';
import { askConfirm, Bar, Btn, Sheet, Switch } from '../ui/kit';
import { BOOK_NAMES } from '../../data/chantLookup';
import { recordingGroups, type RecGroup, type RecItem, type RecSection } from '../../data/offlineRecordings';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../context';
import {
  isAutoPack, isKept, offlineStatus, runPercent, setGroup, setItem, setPacks, syncNow, trackEstimate, useOffline,
  type OfflineState, type PackInfo,
} from '../../utils/offlineFiles';

// „ოფლაინ რეჟიმი“ split by list (2026-11-08, the user: „ჩამოტვირთვის ლოგო დავშალოთ … სიების თავში ღრუბლის ლოგოზე
// დაჭერისას ამომხტარ ფანჯარაში კომპაქტურად“): a list's round ☁ (OfflineButton.tsx) opens this window with only that
// list's part — the chant page: the books' pages + the chants' recordings; the songs; the admission program; the
// library: the saints' lives + the chant albums. The automatic part (app, notes' data, prayers…) is no longer shown
// anywhere: it downloads by itself in the background (startOffline in main.tsx). Turning off what is on the phone asks.

export type OfflineKind = 'galoba' | 'simghera' | 'abituri' | 'library';

export const KIND_TITLE: Record<OfflineKind, string> = {
  galoba: 'ოფლაინ: ნოტები და გალობა',
  simghera: 'ოფლაინ: სიმღერები',
  abituri: 'ოფლაინ: აბიტურიენტს',
  library: 'ოფლაინ: ბიბლიოთეკა',
};

const MB = 1024 * 1024;
// a no-break space keeps the unit beside its number (and „≈“ beside the size)
const size = (b: number) => (b >= 1024 * MB ? `${(b / (1024 * MB)).toFixed(1)} გბ` : `${Math.max(1, Math.round(b / MB))} მბ`);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const BOOK_ORDER = Object.keys(BOOK_NAMES);
const bookOf = (p: PackInfo) => p.id.slice('notes-'.length);

/** Turning off what is already on the device asks first (recording sizes are estimates, hence `about`). */
const sureToRemove = async (what: string, bytes: number, about = false): Promise<boolean> =>
  bytes <= 0 || askConfirm({ title: `${what} — ${about ? '≈ ' : ''}${size(bytes)} წაიშლება ტელეფონიდან.`, ok: 'წაშლა', danger: true });

/** The state under a name: green with ✓ once on the device. */
const StateLine: React.FC<{ done?: boolean; children: React.ReactNode }> = ({ done, children }) => (
  <span className={cx('flex items-center gap-1 text-[12.5px] leading-snug mt-0.5', done ? 'text-emerald-700' : 'text-[#8a7a6a]')}>
    {done && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
    <span className="min-w-0">{children}</span>
  </span>
);

const RowText: React.FC<{ title: React.ReactNode; line: React.ReactNode; done?: boolean }> = ({ title, line, done }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-[14.5px] font-semibold text-[#2a2017] leading-snug">{title}</span>
    <StateLine done={done}>{line}</StateLine>
  </span>
);

/** A part's small heading inside the window. */
const Part: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-4 first:mt-0">
    <h4 className="px-0.5 mb-1 text-[12.5px] font-bold text-[#8a7a6a]">{title}</h4>
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 divide-y divide-[#efe5d4]">{children}</div>
  </section>
);

const recState = (s: OfflineState) =>
  s.run?.what === 'rec' ? 'ჩამოიწერება' : !s.online ? 'დაელოდება ინტერნეტს' : s.failed && !s.run ? 'შეფერხდა' : 'რიგშია';

const itemDone = (s: OfflineState, it: RecItem) => it.tracks.every(t => s.tracks.has(t));

const groupStats = (s: OfflineState, g: RecGroup, est: (url: string) => number) => {
  const whole = s.choice.groups.includes(g.id);
  const chosen = g.items.filter(it => whole || s.choice.items.includes(it.id));
  let total = 0, kept = 0, chosenKept = 0;
  for (const t of new Set(g.items.flatMap(it => it.tracks))) {
    total += est(t);
    if (s.tracks.has(t)) kept += est(t);
  }
  for (const t of new Set(chosen.flatMap(it => it.tracks))) if (s.tracks.has(t)) chosenKept += est(t);
  return {
    whole,
    chosen: chosen.length,
    chosenDone: chosen.filter(it => itemDone(s, it)).length,
    done: g.items.filter(it => itemDone(s, it)).length,
    total,
    kept,
    chosenKept, // what turning the chosen ones off would remove
  };
};

/** One optional pack (a book's pages, the lives): its switch, size and progress; a book also carries its recordings. */
const PackRow: React.FC<{ s: OfflineState; p: PackInfo; title: string; count?: string; recs?: RecGroup; est: (url: string) => number }> = ({ s, p, title, count, recs, est }) => {
  const on = isKept(s, p.id);
  const st = s.stored[p.id];
  const done = on && !!st?.complete;
  const active = s.run?.what === p.id;
  const pct = p.b ? Math.min(99, Math.floor(((st?.bytes ?? 0) / p.b) * 100)) : 0;
  const line = !on ? [count, size(p.b)].filter(Boolean).join(' · ')
    : done ? `ჩამოწერილია · ${size(p.b)}`
    : active ? `ჩამოიწერება · ${pct}%`
    : !s.online ? `დაელოდება ინტერნეტს · ${pct}%`
    : s.failed && !s.run ? `შეფერხდა · ${pct}%`
    : `რიგშია · ${size(p.b)}`;
  // a book with recordings: on = its pages and its recordings (the whole book); off = both
  const rs = recs ? groupStats(s, recs, est) : null;
  const turn = async (v: boolean) => {
    if (!v && !await sureToRemove(`„${title}“`, (st?.bytes ?? 0) + (rs?.chosenKept ?? 0), !!rs?.chosenKept)) return;
    void setPacks([p.id], v);
    if (recs && (v || rs?.chosen)) void setGroup(recs, v);
  };
  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <RowText title={title} line={line} done={done} />
        <Switch on={on} onChange={turn} label={`${title} — ოფლაინ`} />
      </div>
      {on && !done && (active || pct > 0) && <div className="mt-1.5"><Bar value={pct} max={100} /></div>}
    </div>
  );
};

/** A group of recordings: its switch = all of them; the name unfolds its recordings, each with its own switch. */
const GroupRow: React.FC<{ s: OfflineState; g: RecGroup; est: (url: string) => number }> = ({ s, g, est }) => {
  const [open, setOpen] = useState(false);
  const st = groupStats(s, g, est);
  const n = g.items.length;
  const ok = st.chosen > 0 && st.chosenDone === st.chosen;
  const line = st.chosen === 0
    ? (st.done ? `${n} ჩანაწერი · ${st.done} უკვე ტელეფონზეა` : `${n} ჩანაწერი · ≈ ${size(st.total)}`)
    : ok
      ? `ჩამოწერილია · ${size(st.kept)}`
      : `${recState(s)} · ${st.chosenDone} / ${st.chosen}`;
  const turn = async (v: boolean) => { if (v || await sureToRemove(`„${g.title}“`, st.chosenKept, true)) void setGroup(g, v); };
  return (
    <div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="min-w-0 flex-1 flex items-center gap-2 py-2 text-left cursor-pointer group">
          <RowText title={<span className="group-hover:text-[#7a2028] transition-colors">{g.title}</span>} line={line} done={ok} />
          {st.chosen > 0 && !st.whole && (
            <span className="h-6 px-2 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[11.5px] font-bold tabular-nums flex items-center" title="არჩეული ჩანაწერები">
              {st.chosen}/{n}
            </span>
          )}
          <ChevronDown className={cx('w-4 h-4 shrink-0 text-[#b3a594] transition-transform', open && 'rotate-180')} />
        </button>
        <Switch on={st.whole} onChange={turn} label={`${g.title} — ყველა ჩანაწერი ოფლაინ`} />
      </div>
      {open && (
        <ul className="ml-1 mb-2 pl-3 border-l-2 border-[#efe5d4] sg-in">
          {g.items.map(it => {
            const on = st.whole || s.choice.items.includes(it.id);
            const done = itemDone(s, it);
            const bytes = it.tracks.reduce((a, t) => a + est(t), 0);
            return (
              <li key={it.id} className="flex items-center gap-3 py-1.5">
                <RowText
                  title={it.title}
                  line={[it.sub, done ? size(bytes) : `≈ ${size(bytes)}`, on && !done ? recState(s) : ''].filter(Boolean).join(' · ')}
                  done={done}
                />
                <Switch on={on} onChange={v => void setItem(g, it.id, v)} label={`${it.title} — ოფლაინ`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** Groups of one kind; a long list (the albums) gets a search line. */
const Groups: React.FC<{ s: OfflineState; groups: RecGroup[]; est: (url: string) => number }> = ({ s, groups, est }) => {
  const [q, setQ] = useState('');
  const query = q.trim().toLocaleLowerCase('ka');
  const shown = query ? groups.filter(g => g.title.toLocaleLowerCase('ka').includes(query)) : groups;
  return (
    <>
      {groups.length > 12 && (
        <label className="flex items-center gap-2 py-2">
          <Search className="w-4 h-4 shrink-0 text-[#b3a594]" aria-hidden />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ძებნა"
            aria-label="ძებნა"
            className="min-w-0 flex-1 h-9 bg-transparent text-[14px] text-[#2a2017] placeholder:text-[#b3a594] outline-none"
          />
        </label>
      )}
      {shown.map(g => <GroupRow key={g.id} s={s} g={g} est={est} />)}
      {query && shown.length === 0 && <p className="py-3 text-[13px] text-[#8a7a6a]">ვერაფერი მოიძებნა</p>}
    </>
  );
};

/** The download's state, only while it is worth saying: going, no internet, or something did not come. */
const StateNote: React.FC<{ s: OfflineState }> = ({ s }) => {
  const status = offlineStatus(s);
  const pct = runPercent(s);
  // the background part does not count here: the window speaks only of what the person turned on
  const mine = s.run && !isAutoPack(s.run.what);
  if (status === 'run' && mine) {
    return (
      <div className="mb-3 rounded-2xl bg-[#7a2028]/[0.06] px-3.5 py-2.5">
        <p className="flex items-center gap-2 text-[13px] font-bold text-[#7a2028]"><CloudDownload className="w-4 h-4 shrink-0" />ჩამოიწერება · {pct}%</p>
        <div className="mt-2"><Bar value={pct} max={100} /></div>
      </div>
    );
  }
  if (status === 'offline') {
    return (
      <p className="mb-3 flex items-center gap-2 rounded-2xl bg-[#f1e8d9] px-3.5 py-2.5 text-[13px] text-[#75685a] leading-snug">
        <CloudOff className="w-4 h-4 shrink-0" />ინტერნეტი არ არის — ჩართული ჩამოიწერება, როცა დაბრუნდება.
      </p>
    );
  }
  if (s.failed && !s.run) {
    return (
      <div className="mb-3 flex items-center gap-3 rounded-2xl bg-amber-50 px-3.5 py-2.5">
        <p className="flex-1 text-[13px] text-amber-800 leading-snug">ნაწილი ვერ ჩამოიწერა.</p>
        <Btn size="sm" onClick={() => syncNow(true)}>თავიდან ცდა</Btn>
      </div>
    );
  }
  return null;
};

/** The space the app takes on the phone and what still fits, in one quiet line. */
const SpaceLine: React.FC<{ s: OfflineState }> = ({ s }) => {
  if (s.usage === null) return null;
  const free = s.quota !== null && s.quota > s.usage ? s.quota - s.usage : null;
  return (
    <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-[#8a7a6a]">
      <HardDrive className="w-3.5 h-3.5 shrink-0" />
      <span>ტელეფონზე უკავია <b className="text-[#4a3426] tabular-nums">{size(s.usage)}</b>{free !== null && <> · კიდევ დაეტევა ≈&nbsp;<span className="tabular-nums">{size(free)}</span></>}</span>
    </p>
  );
};

const SECTION_OF: Record<Exclude<OfflineKind, 'library'>, RecSection> = { galoba: 'galoba', simghera: 'simghera', abituri: 'abituri' };

export const OfflineSheet: React.FC<{ kind: OfflineKind; onClose: () => void }> = ({ kind, onClose }) => {
  const s = useOffline();
  const access = useAccess();
  const { isAdmin } = useAuth();
  const est = useMemo(() => trackEstimate(s.sizes), [s.sizes]);
  // each opening takes a fresh look at the server's list and the chosen recordings
  useEffect(() => { syncNow(); }, []);
  const hears = access.can('recordings');
  const groups = useMemo(() => (hears ? recordingGroups() : []), [hears]);

  const body = (() => {
    if (!s.supported) return <p className="text-[14px] text-[#75685a] leading-relaxed">ამ ბრაუზერში ოფლაინ რეჟიმი ვერ იმუშავებს. სცადეთ Chrome-ის ან Safari-ის ახალი ვერსია.</p>;
    if (kind === 'library') {
      const lives = s.packs.find(p => p.id === 'lives');
      // „დასაზუსტებელი“ is the admins' sorting box, not a list for members (as on the library's shelf)
      const albums = groups.filter(g => g.section === 'albums' && (g.id !== 'a:unsure' || isAdmin));
      return (
        <>
          {lives && (
            <Part title="წიგნები">
              <PackRow s={s} p={lives} title="წმიდანთა ცხოვრებანი" count="ცხოვრებანი და ხატები" est={est} />
            </Part>
          )}
          {albums.length > 0 && <Part title="ჩანაწერები · ალბომები"><Groups s={s} groups={albums} est={est} /></Part>}
        </>
      );
    }
    const recs = groups.filter(g => g.section === SECTION_OF[kind]);
    if (kind === 'galoba') {
      const books = s.packs
        .filter(p => p.id.startsWith('notes-'))
        .sort((a, b) => (BOOK_ORDER.indexOf(bookOf(a)) + 1 || 99) - (BOOK_ORDER.indexOf(bookOf(b)) + 1 || 99));
      const bookRecs = groups.filter(g => g.section === 'books');
      const allOn = books.length > 0 && books.every(p => isKept(s, p.id));
      const total = books.reduce((a, p) => a + p.b, 0);
      const toggleAll = async (v: boolean) => {
        const kept = books.reduce((a, p) => a + (s.stored[p.id]?.bytes ?? 0), 0);
        if (v || await sureToRemove('ყველა წიგნის გვერდები', kept)) void setPacks(books.map(p => p.id), v);
      };
      return (
        <>
          {books.length > 0 && (
            <Part title="ნოტების წიგნები">
              <div className="flex items-center gap-3 py-2">
                <RowText title="ყველა წიგნი" line={`${books.length} წიგნი · ${size(total)}`} done={allOn && books.every(p => s.stored[p.id]?.complete)} />
                <Switch on={allOn} onChange={toggleAll} label="ყველა წიგნი — ოფლაინ" />
              </div>
              {books.map(p => (
                <PackRow key={p.id} s={s} p={p} title={BOOK_NAMES[bookOf(p)] ?? bookOf(p)} count={p.c ? `${p.c} გალობა` : undefined}
                  recs={bookRecs.find(g => g.id === `b:${bookOf(p)}`)} est={est} />
              ))}
            </Part>
          )}
          {recs.length > 0 && <Part title="ჩანაწერები · წესის მიხედვით"><Groups s={s} groups={recs} est={est} /></Part>}
          {!books.length && !recs.length && <p className="text-[14px] text-[#75685a]">სია იტვირთება…</p>}
        </>
      );
    }
    return recs.length > 0
      ? <Part title="ჩანაწერები"><Groups s={s} groups={recs} est={est} /></Part>
      : <p className="text-[14px] text-[#75685a]">აქ ჩამოსაწერი ჩანაწერები ჯერ არ არის.</p>;
  })();

  return (
    <Sheet open onClose={onClose} title={KIND_TITLE[kind]}>
      <p className="-mt-1 mb-3 text-[13px] text-[#8a7a6a] leading-snug">ჩართე, რაც ინტერნეტის გარეშეც გინდა.</p>
      {s.supported && <StateNote s={s} />}
      {body}
      {s.supported && <SpaceLine s={s} />}
    </Sheet>
  );
};

export default OfflineSheet;
