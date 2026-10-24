import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Cloud, CloudCheck, CloudDownload, CloudOff, HardDrive, Headphones, Library, Loader2, Zap } from 'lucide-react';
import { Bar, Btn, Card, Empty, Sheet, Switch, Tabs, Toggle } from '../components/ui/kit';
import { BOOK_NAMES } from '../data/chantLookup';
import { recordingGroups, type RecGroup, type RecItem, type RecSection } from '../data/offlineRecordings';
import { useAccess } from '../hooks/useAccess';
import {
  isAutoPack, isKept, offlineStatus, runPercent, setGroup, setItem, setPacks, syncNow, trackEstimate, useOffline,
  type OfflineState, type PackInfo,
} from '../utils/offlineFiles';

// „ოფლაინ რეჟიმი“ (opened from the header's cloud): what the app keeps on the device (utils/offlineFiles.ts).
// One card on top: the state, the space used by kind and the automatic part (folded). Then the chant books' page
// pictures, the recordings by section (tabs) and group (a group opens into its recordings) and the saints' lives.
// Turning off what is already on the device asks first.

const MB = 1024 * 1024;
const size = (b: number) => (b >= 1024 * MB ? `${(b / (1024 * MB)).toFixed(1)} გბ` : `${Math.max(1, Math.round(b / MB))} მბ`);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
const CARD = '!p-3.5 sm:!p-4';
const TILE = 'w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]';

const AUTO: { ids: string[]; label: string; hint: string }[] = [
  { ids: ['auto-notes', 'auto-thumbs'], label: 'სინთეზატორი ყველა გალობისთვის', hint: 'ნოტების მონაცემები და სიის სურათები' },
  { ids: ['auto-prayers'], label: 'ლოცვები', hint: 'ლოცვანი, აკათისტოები, ახალი აღთქმა' },
  { ids: ['auto-hymn'], label: 'ჰიმნოგრაფიის ნახატები', hint: 'ნოტების თავსა და ბოლოში' },
  { ids: ['auto-mtkmeli'], label: 'მთქმელის ტექსტები', hint: 'ნაწარმოებები სრულად' },
];

const SECTIONS: [RecSection, string][] = [
  ['galoba', 'გალობა'], ['albums', 'ალბომები'], ['simghera', 'სიმღერა'], ['abituri', 'აბიტურიენტს'],
];

const SPACE = [
  { id: 'app', label: 'აპი' }, { id: 'books', label: 'წიგნები' }, { id: 'rec', label: 'ჩანაწერები' }, { id: 'lives', label: 'ცხოვრებანი' },
] as const;

const TONE = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  muted: 'bg-[#f1e8d9] text-[#75685a]',
  wine: 'bg-[#7a2028]/[0.08] text-[#7a2028]',
};

const BOOK_ORDER = Object.keys(BOOK_NAMES);
const bookOf = (p: PackInfo) => p.id.slice('notes-'.length);

const whatLabel = (what: string) =>
  what === 'rec' ? 'ჩანაწერები'
    : what === 'lives' ? 'წმიდანთა ცხოვრებანი'
    : what.startsWith('notes-') ? BOOK_NAMES[what.slice(6)] ?? 'ნოტების წიგნი'
    : 'ავტომატური ნაწილი';

const missing = (s: OfflineState) => s.recMissing > 0 || s.packs.some(p => isKept(s, p.id) && !s.stored[p.id]?.complete);

/** Turning off what is already on the device asks first (recording sizes are estimates, hence `about`). */
const sureToRemove = (what: string, bytes: number, about = false) =>
  bytes <= 0 || window.confirm(`${what} — ${about ? '≈ ' : ''}${size(bytes)} წაიშლება ტელეფონიდან. გავაგრძელო?`);

/** ✓ on the device · the share while downloading · an empty ring while waiting. */
const Mark: React.FC<{ done: boolean; pct?: number }> = ({ done, pct }) =>
  done ? (
    <span className="w-6 h-6 shrink-0 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 flex items-center justify-center" aria-label="ჩამოწერილია">
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    </span>
  ) : pct !== undefined ? (
    <span className="min-w-6 text-right text-[12px] font-bold text-[#7a2028] tabular-nums">{pct}%</span>
  ) : (
    <span className="w-6 h-6 shrink-0 rounded-full ring-1 ring-inset ring-[#e0d0b6]" aria-label="ჯერ არ ჩამოწერილა" />
  );

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

/** A card's head: icon, name, one line under it and something on the right. */
const SectionHead: React.FC<{ icon: React.ReactNode; title: string; line: React.ReactNode; right?: React.ReactNode; className?: string }> = ({ icon, title, line, right, className }) => (
  <div className={cx('flex items-center gap-3', className ?? 'pb-2')}>
    <span className={TILE}>{icon}</span>
    <div className="min-w-0 flex-1">
      <h2 className="font-serif-ge text-[16px] font-bold text-[#4a3426] leading-snug">{title}</h2>
      {line}
    </div>
    {right}
  </div>
);

/** The space used and what still fits; when there is more than the app, by kind: books, lives and recordings by
 *  what is stored, the app (with its automatic part) the rest. */
const Space: React.FC<{ s: OfflineState }> = ({ s }) => {
  const est = useMemo(() => trackEstimate(s.sizes), [s.sizes]);
  if (s.usage === null) return null;
  const stored = (f: (id: string) => boolean) => s.packs.filter(p => f(p.id)).reduce((a, p) => a + (s.stored[p.id]?.bytes ?? 0), 0);
  const books = stored(id => id.startsWith('notes-'));
  const lives = stored(id => id === 'lives');
  let rec = 0;
  for (const t of s.tracks) rec += est(t);
  const bytes = { app: Math.max(0, s.usage - books - lives - rec), books, rec, lives };
  const parts = SPACE.filter(p => bytes[p.id] > 0);
  const free = s.quota !== null && s.quota > s.usage ? s.quota - s.usage : null;
  return (
    <div className="mt-2.5 text-[12.5px] text-[#8a7a6a] leading-snug">
      <p className="flex items-center gap-1.5">
        <HardDrive className="w-3.5 h-3.5 shrink-0" />
        <span>
          ტელეფონზე უკავია <b className="text-[#4a3426] tabular-nums">{size(s.usage)}</b>
          {free !== null && <> · კიდევ დაეტევა ≈ <span className="tabular-nums">{size(free)}</span></>}
        </span>
      </p>
      {parts.length > 1 && (
        <p className="mt-0.5 pl-5 text-[12px] tabular-nums">{parts.map(p => `${p.label} ${size(bytes[p.id])}`).join(' · ')}</p>
      )}
    </div>
  );
};

/** The light part every phone keeps by itself; folded, it shows only its total and state. */
const AutoPart: React.FC<{ s: OfflineState }> = ({ s }) => {
  const [open, setOpen] = useState(false);
  const packs = s.packs.filter(p => isAutoPack(p.id));
  const total = packs.reduce((a, p) => a + p.b, 0);
  const share = (ids: string[]) => {
    const list = packs.filter(p => ids.includes(p.id));
    const b = list.reduce((a, p) => a + p.b, 0);
    const have = list.reduce((a, p) => a + (s.stored[p.id]?.complete ? p.b : Math.min(p.b, s.stored[p.id]?.bytes ?? 0)), 0);
    return { b, done: list.length > 0 && list.every(p => s.stored[p.id]?.complete), pct: b ? Math.min(99, Math.floor((have / b) * 100)) : 0 };
  };
  const all = share(packs.map(p => p.id));
  const busy = !!s.run && isAutoPack(s.run.what);
  return (
    <div className="border-t border-[#efe5d4]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full min-h-12 flex items-center gap-3 px-3.5 sm:px-4 py-2 text-left cursor-pointer hover:bg-[#7a2028]/[0.03] transition-colors"
      >
        <span className="w-10 shrink-0 flex justify-center text-[#7a2028]"><Zap className="w-[18px] h-[18px]" /></span>
        <RowText title="ავტომატურად" line={`მსუბუქი ნაწილი, თავისით${total ? ` · ${size(total)}` : ''}`} />
        {packs.length
          ? <Mark done={all.done && s.appReady} pct={!all.done && (busy || all.pct > 0) ? all.pct : undefined} />
          : s.online && !s.failed && <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#b3a594]" aria-label="იტვირთება" />}
        <ChevronDown className={cx('w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mx-3.5 sm:mx-4 mb-1 divide-y divide-[#efe5d4] border-t border-[#efe5d4] sg-in">
          <li className="flex items-center gap-3 py-2">
            <RowText title="აპი და დიზაინი" line="ყველა გვერდი, სურათი, შრიფტი და კალენდარი" />
            <Mark done={s.appReady} />
          </li>
          {AUTO.map(row => {
            const r = share(row.ids);
            if (!r.b) return null;
            const active = !!s.run && row.ids.includes(s.run.what);
            return (
              <li key={row.label} className="flex items-center gap-3 py-2">
                <RowText title={row.label} line={`${row.hint} · ${size(r.b)}`} />
                <Mark done={r.done} pct={!r.done && (active || r.pct > 0) ? r.pct : undefined} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const StatusCard: React.FC<{ s: OfflineState }> = ({ s }) => {
  const status = offlineStatus(s);
  const pct = runPercent(s);
  const autoWaits = s.saveData && s.packs.some(p => isAutoPack(p.id) && !s.stored[p.id]?.complete);
  const now = (text: string) => <Btn size="sm" icon={<CloudDownload />} onClick={() => syncNow(true)}>{text}</Btn>;
  const view = (() => {
    switch (status) {
      case 'run': return {
        Icon: CloudDownload, tone: 'wine', title: `ჩამოწერა · ${pct}%`,
        text: `${whatLabel(s.run?.what ?? '')}. აპით სარგებლობა ამასობაში ჩვეულებრივ შეგიძლიათ.`,
      };
      case 'offline': return {
        Icon: CloudOff, tone: 'muted', title: 'ინტერნეტი არ არის',
        text: missing(s) ? 'აპი მუშაობს ტელეფონზე ჩამოწერილით. დანარჩენი ჩამოიწერება, როცა ინტერნეტი დაბრუნდება.' : 'აპი მუშაობს ტელეფონზე ჩამოწერილით.',
      };
      case 'pending': return autoWaits
        ? { Icon: Cloud, tone: 'amber', title: 'ავტომატური ჩამოწერა შეჩერებულია', text: 'ტელეფონზე „მონაცემების დაზოგვა“ ჩართულია.', action: now('მაინც ჩამოწერა') }
        : s.failed
          ? { Icon: Cloud, tone: 'amber', title: 'ნაწილი ვერ ჩამოიწერა', text: 'სერვერმა ზოგი ფაილი ვერ გასცა — სცადეთ ცოტა ხანში.', action: now('თავიდან ცდა') }
          : { Icon: Cloud, tone: 'amber', title: 'ნაწილი ჯერ არ ჩამოწერილა', text: 'ჩამოწერა თავისით დაიწყება.', action: now('ახლავე ჩამოწერა') };
      case 'ready': return {
        Icon: CloudCheck, tone: 'green', title: 'აპი ინტერნეტის გარეშეც იმუშავებს',
        text: 'ჩართული ფაილები თავისით განახლდება, როცა ახალი ვერსია გამოვა.',
      };
      // the list of files never came: without this the card would say „მზადდება“ for ever
      default: return !s.packs.length && s.failed
        ? { Icon: Cloud, tone: 'amber', title: 'სერვერს ვერ დავუკავშირდით', text: 'ფაილების სია ვერ ჩამოვიდა — სცადეთ ცოტა ხანში.', action: now('თავიდან ცდა') }
        : { Icon: Cloud, tone: 'wine', title: 'ოფლაინ რეჟიმი მზადდება', text: 'აპი პირველად იწერება ტელეფონზე — ცოტა ხანში დასრულდება.' };
    }
  })() as { Icon: React.ComponentType<{ className?: string }>; tone: keyof typeof TONE; title: string; text: string; action?: React.ReactNode };
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <span className={cx('w-10 h-10 shrink-0 rounded-xl flex items-center justify-center', TONE[view.tone])}>
            <view.Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif-ge text-[16px] font-bold text-[#4a3426] leading-snug">{view.title}</h2>
            <p className="text-[12.5px] text-[#8a7a6a] leading-snug mt-0.5">{view.text}</p>
          </div>
        </div>
        {status === 'run' && <div className="mt-3"><Bar value={pct} max={100} /></div>}
        {view.action && <div className="mt-3">{view.action}</div>}
        <Space s={s} />
      </div>
      <AutoPart s={s} />
    </Card>
  );
};

/** One optional pack (a book's pages, the lives): its switch, size and progress; with `icon` it is a card's head. */
const PackRow: React.FC<{ s: OfflineState; p: PackInfo; title: string; count?: string; icon?: React.ReactNode }> = ({ s, p, title, count, icon }) => {
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
  const turn = (v: boolean) => { if (v || sureToRemove(`„${title}“`, st?.bytes ?? 0)) void setPacks([p.id], v); };
  const sw = <Switch on={on} onChange={turn} label={`${title} — ოფლაინ`} />;
  return (
    <div className={icon ? '' : 'py-0.5'}>
      {icon ? (
        <SectionHead icon={icon} title={title} line={<StateLine done={done}>{line}</StateLine>} right={sw} className="" />
      ) : (
        <div className="flex items-center gap-3">
          <RowText title={title} line={line} done={done} />
          {sw}
        </div>
      )}
      {on && !done && (active || pct > 0) && <div className="mt-1 mb-1.5"><Bar value={pct} max={100} /></div>}
    </div>
  );
};

/** The chant books, folded: under the head only the books turned on; open, every book with „ყველა წიგნი“ on top. */
const BooksCard: React.FC<{ s: OfflineState; books: PackInfo[] }> = ({ s, books }) => {
  const [open, setOpen] = useState(false);
  const on = books.filter(p => isKept(s, p.id));
  const allOn = on.length === books.length;
  const total = books.reduce((a, p) => a + p.b, 0);
  const allDone = allOn && books.every(p => s.stored[p.id]?.complete);
  const toggleAll = (v: boolean) => {
    const kept = books.reduce((a, p) => a + (s.stored[p.id]?.bytes ?? 0), 0);
    if (v || sureToRemove('ყველა წიგნის გვერდები', kept)) void setPacks(books.map(p => p.id), v);
  };
  const line = allDone ? `ყველა ჩამოწერილია · ${size(total)}`
    : on.length ? `ჩართულია ${on.length} / ${books.length} · სულ ${size(total)}`
    : `${books.length} წიგნი · ${size(total)} · აირჩიეთ`;
  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-3.5 sm:p-4 text-left cursor-pointer hover:bg-[#7a2028]/[0.03] transition-colors"
      >
        <span className={TILE}><BookOpen /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif-ge text-[16px] font-bold text-[#4a3426] leading-snug">ნოტების წიგნები</span>
          <StateLine done={allDone}>{line}</StateLine>
        </span>
        <ChevronDown className={cx('w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform', open && 'rotate-180')} />
      </button>
      {(open || on.length > 0) && (
        <div className="mx-3.5 sm:mx-4 mb-1.5 divide-y divide-[#efe5d4] border-t border-[#efe5d4]">
          {open && (
            <div className="flex items-center gap-3 py-0.5 sg-in">
              <RowText title="ყველა წიგნი" line={`${books.length} წიგნი · ${size(total)}`} />
              <Switch on={allOn} onChange={toggleAll} label="ყველა წიგნი — ოფლაინ" />
            </div>
          )}
          {(open ? books : on).map(p => (
            <PackRow key={p.id} s={s} p={p} title={BOOK_NAMES[bookOf(p)] ?? bookOf(p)} count={p.c ? `${p.c} გალობა` : undefined} />
          ))}
        </div>
      )}
    </Card>
  );
};

const itemDone = (s: OfflineState, it: RecItem) => it.tracks.every(t => s.tracks.has(t));
const picked = (s: OfflineState, g: RecGroup) => s.choice.groups.includes(g.id) || g.items.some(it => s.choice.items.includes(it.id));

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

const recState = (s: OfflineState) =>
  s.run?.what === 'rec' ? 'ჩამოიწერება' : !s.online ? 'დაელოდება ინტერნეტს' : s.failed && !s.run ? 'შეფერხდა' : 'რიგშია';

const GroupRow: React.FC<{ s: OfflineState; g: RecGroup; est: (url: string) => number; onOpen: () => void }> = ({ s, g, est, onOpen }) => {
  const st = groupStats(s, g, est);
  const n = g.items.length;
  const ok = st.chosen > 0 && st.chosenDone === st.chosen;
  const line = st.chosen === 0
    ? (st.done ? `${n} ჩანაწერი · ${st.done} უკვე ტელეფონზეა` : `${n} ჩანაწერი · ≈ ${size(st.total)}`)
    : ok
      ? `ჩამოწერილია · ${size(st.kept)}`
      : `${recState(s)} · ${st.chosenDone} / ${st.chosen}`;
  const turn = (v: boolean) => { if (v || sureToRemove(`„${g.title}“`, st.chosenKept, true)) void setGroup(g, v); };
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 flex items-center gap-2 py-2 text-left cursor-pointer group">
        <RowText title={<span className="group-hover:text-[#7a2028] transition-colors">{g.title}</span>} line={line} done={ok} />
        {st.chosen > 0 && !st.whole && (
          <span className="h-6 px-2 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[11.5px] font-bold tabular-nums flex items-center" title="არჩეული ჩანაწერები">
            {st.chosen}/{n}
          </span>
        )}
        <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a594]" />
      </button>
      <Switch on={st.whole} onChange={turn} label={`${g.title} — ყველა ჩანაწერი ოფლაინ`} />
    </div>
  );
};

const GroupSheet: React.FC<{ s: OfflineState; g: RecGroup; est: (url: string) => number; onClose: () => void }> = ({ s, g, est, onClose }) => {
  const st = groupStats(s, g, est);
  const turnAll = (v: boolean) => { if (v || sureToRemove('ყველა ჩანაწერი', st.chosenKept, true)) void setGroup(g, v); };
  return (
    <Sheet open onClose={onClose} title={g.title}>
      <Toggle on={st.whole} onChange={turnAll} label="ყველა ჩანაწერი" hint={`${g.items.length} ჩანაწერი · ახლებიც თავისით დაემატება`} />
      <div className="mt-1 divide-y divide-[#efe5d4] border-t border-[#efe5d4]">
        {g.items.map(it => {
          const on = st.whole || s.choice.items.includes(it.id);
          const done = itemDone(s, it);
          const bytes = it.tracks.reduce((a, t) => a + est(t), 0);
          return (
            <div key={it.id} className="flex items-center gap-3 py-1">
              <RowText
                title={it.title}
                line={[it.sub, done ? size(bytes) : `≈ ${size(bytes)}`, on && !done ? recState(s) : ''].filter(Boolean).join(' · ')}
                done={done}
              />
              <Switch on={on} onChange={v => void setItem(g, it.id, v)} label={`${it.title} — ოფლაინ`} />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};

/** The recordings, one section at a time; a tab's number is how many of its groups have something turned on. */
const RecordingsCard: React.FC<{ s: OfflineState; groups: RecGroup[] }> = ({ s, groups }) => {
  const sections = SECTIONS.filter(([id]) => groups.some(g => g.section === id));
  const [tab, setTab] = useState<RecSection>(() => (sections.find(([id]) => groups.some(g => g.section === id && picked(s, g))) ?? sections[0])?.[0] ?? 'galoba');
  const [openId, setOpenId] = useState<string | null>(null);
  const est = useMemo(() => trackEstimate(s.sizes), [s.sizes]);
  const current = sections.some(([id]) => id === tab) ? tab : sections[0]?.[0];
  const open = groups.find(g => g.id === openId);
  const cols = sections.length >= 4 ? 4 : sections.length === 3 ? 3 : 2;
  return (
    <Card className={CARD}>
      <SectionHead icon={<Headphones />} title="ჩანაწერები" line={<StateLine>ჩართეთ მთელი ჯგუფი, ან გახსენით და აირჩიეთ ცალკეული</StateLine>} />
      {sections.length > 1 && current && (
        <div className="mb-1">
          <Tabs
            items={sections.map(([id, label]) => ({ id, label, count: groups.filter(g => g.section === id && picked(s, g)).length || undefined }))}
            value={current}
            onChange={setTab}
            cols={cols}
          />
        </div>
      )}
      <div className="divide-y divide-[#efe5d4]">
        {groups.filter(g => g.section === current).map(g => <GroupRow key={g.id} s={s} g={g} est={est} onOpen={() => setOpenId(g.id)} />)}
      </div>
      {open && <GroupSheet s={s} g={open} est={est} onClose={() => setOpenId(null)} />}
    </Card>
  );
};

export const OfflinePage: React.FC = () => {
  const s = useOffline();
  const access = useAccess();
  // each visit takes a fresh look at the server's list and the chosen recordings
  useEffect(() => { syncNow(); }, []);
  const hears = access.can('recordings');
  const sees = {
    galoba: access.section('galoba') !== 'hidden',
    simghera: access.section('simghera') !== 'hidden',
    abituri: access.page('abituri') === 'open',
    library: access.section('biblioteka') === 'open',
  };
  const groups = useMemo(
    () => recordingGroups().filter(g => (g.section === 'simghera' ? sees.simghera : g.section === 'abituri' ? sees.abituri : sees.galoba)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hears, access.member, sees.galoba, sees.simghera, sees.abituri],
  );

  if (!s.supported) {
    return (
      <div className="w-full max-w-2xl mx-auto px-1">
        <Empty icon={<CloudOff />} title="ოფლაინ რეჟიმი ამ ბრაუზერში ვერ იმუშავებს" text="სცადეთ Chrome-ის ან Safari-ის ახალი ვერსია." />
      </div>
    );
  }
  const books = s.packs
    .filter(p => p.id.startsWith('notes-'))
    .sort((a, b) => (BOOK_ORDER.indexOf(bookOf(a)) + 1 || 99) - (BOOK_ORDER.indexOf(bookOf(b)) + 1 || 99));
  const lives = s.packs.find(p => p.id === 'lives');
  return (
    <div className="w-full max-w-2xl mx-auto px-1 pb-10 space-y-3">
      <StatusCard s={s} />
      {books.length > 0 && <BooksCard s={s} books={books} />}
      {groups.length > 0 && <RecordingsCard s={s} groups={groups} />}
      {lives && sees.library && (
        <Card className={CARD}>
          <PackRow s={s} p={lives} title="წმიდანთა ცხოვრებანი" count="ცხოვრებანი და ხატები" icon={<Library />} />
        </Card>
      )}
      <p className="px-3 pt-1 text-center text-[12px] text-[#8a7a6a] leading-relaxed">
        ერთხელ გახსნილი გალობის ნოტები ისედაც ინახება. წიგნები და ჩანაწერები ბევრ ადგილს იკავებს — ჩართეთ მხოლოდ საჭირო;
        გამორთვისას ტელეფონიდან მაშინვე იშლება.
      </p>
    </div>
  );
};
