import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, CloudDownload, CloudOff, HardDrive, Search } from 'lucide-react';
import { askConfirm } from '../ui/kit';
import { Bar, Button, Rows, SectionLabel, Sheet, Toggle, ToggleRow } from '../ui2';
import { cx } from '../ui2/cx';
import { BOOK_NAMES, canOpenNotes } from '../../data/chantLookup';
import { recordingGroups, type RecGroup, type RecItem, type RecSection } from '../../data/offlineRecordings';
import { useAccess } from '../../hooks/useAccess';
import { useAuth, useNavigation } from '../../context';
import {
  isAutoPack, isKept, offlineStatus, runPercent, setGroup, setItem, setPacks, syncNow, trackEstimate, useOffline,
  type OfflineState, type PackInfo,
} from '../../utils/offlineFiles';
import { estimateMb, offlineCount, onOfflineChange, saveOffline } from '../../utils/offlineNotes';
import { triggerHaptic } from '../../utils/haptics';
import { SECTIONS } from '../../pages/galoba/ServiceTabs';
import { SERVICE_CHANTS } from '../../pages/galoba/chantSearch';
import { useRecordingTools } from '../../hooks/useRecordingTools';

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

const BOOK_ORDER = Object.keys(BOOK_NAMES);
const bookOf = (p: PackInfo) => p.id.slice('notes-'.length);

/** Turning off what is already on the device asks first (recording sizes are estimates, hence `about`). */
const sureToRemove = async (what: string, bytes: number, about = false): Promise<boolean> =>
  bytes <= 0 || askConfirm({ title: `${what} — ${about ? '≈ ' : ''}${size(bytes)} წაიშლება ტელეფონიდან.`, ok: 'წაშლა', danger: true });

/** The state under a name: green with ✓ once on the device. */
const StateLine: React.FC<{ done?: boolean; children: React.ReactNode }> = ({ done, children }) => (
  <span className={cx('flex items-center gap-1 text-meta leading-snug', done ? 'text-leaf-ink' : 'text-mut')}>
    {done && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
    <span className="min-w-0">{children}</span>
  </span>
);

const RowText: React.FC<{ title: React.ReactNode; line: React.ReactNode; done?: boolean }> = ({ title, line, done }) => (
  <span className="min-w-0 flex-1">
    <span className="block text-lead font-bold wrap-break-word">{title}</span>
    <StateLine done={done}>{line}</StateLine>
  </span>
);

/** A part: its small grey heading over a card of rows. */
const Part: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-1.5">
    <SectionLabel label={title} />
    <Rows>{children}</Rows>
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
    <div className="py-2 pr-3 pl-4">
      <div className="flex min-h-12 items-center gap-2.5">
        <RowText title={title} line={line} done={done} />
        <Toggle on={on} onChange={turn} label={`${title} — ოფლაინ`} />
      </div>
      {on && !done && (active || pct > 0) && <Bar value={pct / 100} className="mt-1 mb-1" />}
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
      <div className="flex items-center gap-1 pr-3">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex min-h-14 min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 pl-4 text-left active:bg-soft">
          <RowText title={g.title} line={line} done={ok} />
          {st.chosen > 0 && !st.whole && (
            <span className="flex h-6 shrink-0 items-center rounded-full bg-tint px-2 text-cap font-bold text-wine tabular-nums" title="არჩეული ჩანაწერები">
              {st.chosen}/{n}
            </span>
          )}
          <ChevronDown className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />
        </button>
        <Toggle on={st.whole} onChange={turn} label={`${g.title} — ყველა ჩანაწერი ოფლაინ`} />
      </div>
      {open && (
        <ul className="sg-in mr-3 mb-2 ml-5 border-l-2 border-line pl-3">
          {g.items.map(it => {
            const on = st.whole || s.choice.items.includes(it.id);
            const done = itemDone(s, it);
            const bytes = it.tracks.reduce((a, t) => a + est(t), 0);
            return (
              <li key={it.id} className="flex items-center gap-2 py-1">
                <RowText
                  title={it.title}
                  line={[it.sub, done ? size(bytes) : `≈ ${size(bytes)}`, on && !done ? recState(s) : ''].filter(Boolean).join(' · ')}
                  done={done}
                />
                <Toggle on={on} onChange={v => void setItem(g, it.id, v)} label={`${it.title} — ოფლაინ`} />
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
        <label className="flex min-h-12 items-center gap-2 px-4">
          <Search className="size-[18px] shrink-0 text-mut" aria-hidden />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="ძებნა"
            aria-label="ძებნა"
            className="h-11 min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint"
          />
        </label>
      )}
      {shown.map(g => <GroupRow key={g.id} s={s} g={g} est={est} />)}
      {query && shown.length === 0 && <p className="px-4 py-3 text-meta text-mut">ვერაფერი მოიძებნა</p>}
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
      <div className="shrink-0 rounded-tile bg-tint px-4 py-3">
        <p className="flex items-center gap-2 text-body font-bold text-wine"><CloudDownload className="size-[18px] shrink-0" />ჩამოიწერება · {pct}%</p>
        <Bar value={pct / 100} className="mt-2" />
      </div>
    );
  }
  if (status === 'offline') {
    return (
      <p className="flex shrink-0 items-center gap-2 rounded-tile bg-surf px-4 py-3 text-meta leading-snug text-mut">
        <CloudOff className="size-[18px] shrink-0" />ინტერნეტი არ არის — ჩართული ჩამოიწერება, როცა დაბრუნდება.
      </p>
    );
  }
  if (s.failed && !s.run) {
    return (
      <div className="flex shrink-0 items-center gap-3 rounded-tile bg-gold-tint px-4 py-2">
        <p className="flex-1 text-meta leading-snug text-gold-ink">ნაწილი ვერ ჩამოიწერა.</p>
        <Button kind="soft" size="md" onClick={() => syncNow(true)}>თავიდან ცდა</Button>
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
    <p className="mt-1 flex items-center justify-center gap-1.5 text-cap text-mut">
      <HardDrive className="size-3.5 shrink-0" />
      <span>ტელეფონზე უკავია <b className="text-ink tabular-nums">{size(s.usage)}</b>{free !== null && <> · კიდევ დაეტევა ≈&nbsp;<span className="tabular-nums">{size(free)}</span></>}</span>
    </p>
  );
};

/** „ეს მსახურება“: keeps every version of the open service on the phone (the logic of the old ServiceDownload). */
const ServiceRow: React.FC = () => {
  const { selectedService } = useNavigation();
  const chants = selectedService ? SERVICE_CHANTS[selectedService] : undefined;
  const ids = useMemo(
    () => (chants ?? []).flatMap(c => (c.variants ?? []).filter(v => canOpenNotes(c, v)).map(v => v.id)),
    [chants],
  );
  const [, bump] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => onOfflineChange(() => bump(x => x + 1)), []);
  if (!selectedService || !ids.length) return null;
  const name = SECTIONS.find(x => x.service === selectedService)?.title ?? String(selectedService);
  const saved = offlineCount(ids);
  const all = saved === ids.length;
  const run = async () => {
    triggerHaptic(10);
    setProgress({ done: 0, total: ids.length - saved });
    await saveOffline(ids, (done, total) => setProgress({ done, total }));
    setProgress(null);
  };
  const sub = progress
    ? `ჩამოიწერება · ${progress.done}/${progress.total}`
    : all
      ? <span className="flex items-center gap-1 text-leaf-ink"><Check className="size-3.5 shrink-0" strokeWidth={3} />ჩამოწერილია · ინტერნეტის გარეშეც გაიხსნება</span>
      : `${chants?.filter(c => (c.variants ?? []).some(v => canOpenNotes(c, v))).length ?? 0} საგალობელი · ≈ ${estimateMb(ids)} მბ`;
  return (
    <Rows>
      <ToggleRow
        title={`ეს მსახურება: ${name}`}
        sub={sub}
        on={all || !!progress}
        disabled={all || !!progress}
        onChange={on => { if (on) void run(); }}
      />
      {progress && <div className="px-4 pb-3"><Bar value={progress.total ? progress.done / progress.total : 0} /></div>}
    </Rows>
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
  // an admin may hide the recordings' offline for members (⚙ „სკოლა“ → „ჩანაწერების ოფლაინი“): the books' pages stay
  const tools = useRecordingTools();
  const hears = access.can('recordings') && tools.offline;
  const groups = useMemo(() => (hears ? recordingGroups() : []), [hears]);

  const body = (() => {
    if (!s.supported) return <p className="text-body leading-relaxed text-mut">ამ ბრაუზერში ოფლაინ რეჟიმი ვერ იმუშავებს. სცადეთ Chrome-ის ან Safari-ის ახალი ვერსია.</p>;
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
              <div className="flex min-h-14 items-center gap-2.5 py-2 pr-3 pl-4">
                <RowText title="ყველა წიგნი" line={`${books.length} წიგნი · ${size(total)}`} done={allOn && books.every(p => s.stored[p.id]?.complete)} />
                <Toggle on={allOn} onChange={toggleAll} label="ყველა წიგნი — ოფლაინ" />
              </div>
              {books.map(p => (
                <PackRow key={p.id} s={s} p={p} title={BOOK_NAMES[bookOf(p)] ?? bookOf(p)} count={p.c ? `${p.c} გალობა` : undefined}
                  recs={bookRecs.find(g => g.id === `b:${bookOf(p)}`)} est={est} />
              ))}
            </Part>
          )}
          {recs.length > 0 && <Part title="ჩანაწერები · წესის მიხედვით"><Groups s={s} groups={recs} est={est} /></Part>}
          {!books.length && !recs.length && <p className="text-body text-mut">სია იტვირთება…</p>}
        </>
      );
    }
    return recs.length > 0
      ? <Part title="ჩანაწერები"><Groups s={s} groups={recs} est={est} /></Part>
      : <p className="text-body text-mut">აქ ჩამოსაწერი ჩანაწერები ჯერ არ არის.</p>;
  })();

  return (
    <Sheet open onClose={onClose} title={KIND_TITLE[kind]}>
      <p className="-mt-1 shrink-0 px-1 text-meta leading-snug text-mut">ჩართე, რაც ინტერნეტის გარეშეც გინდა.</p>
      {s.supported && <StateNote s={s} />}
      {s.supported && kind === 'galoba' && <ServiceRow />}
      {body}
      {s.supported && <SpaceLine s={s} />}
    </Sheet>
  );
};

export default OfflineSheet;
