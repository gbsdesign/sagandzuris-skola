import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronDown, ChevronRight, Cloud, CloudCheck, CloudDownload, CloudOff, HardDrive, Headphones, Library, Zap } from 'lucide-react';
import { Bar, Btn, Card, CardTitle, Empty, Sheet, Switch, Toggle } from '../components/ui/kit';
import { BOOK_NAMES } from '../data/chantLookup';
import { recordingGroups, type RecGroup, type RecItem, type RecSection } from '../data/offlineRecordings';
import { useAccess } from '../hooks/useAccess';
import {
  isAutoPack, isKept, offlineStatus, runPercent, setGroup, setItem, setPacks, syncNow, trackEstimate, useOffline,
  type OfflineState, type PackInfo,
} from '../utils/offlineFiles';

// „ოფლაინ რეჟიმი“ (opened from the header's cloud): what the app keeps on the device (utils/offlineFiles.ts).
// On top one card on the state; then the automatic part (folded), the chant books' page pictures one by one,
// the recordings by group (a group opens into its recordings) and the saints' lives.

const MB = 1024 * 1024;
const size = (b: number) => (b >= 1024 * MB ? `${(b / (1024 * MB)).toFixed(1)} გბ` : `${Math.max(1, Math.round(b / MB))} მბ`);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

const AUTO: { ids: string[]; label: string; hint: string }[] = [
  { ids: ['auto-notes', 'auto-thumbs'], label: 'სინთეზატორი ყველა გალობისთვის', hint: 'ნოტების მონაცემები და სიის სურათები' },
  { ids: ['auto-prayers'], label: 'ლოცვები', hint: 'ლოცვანი, აკათისტოები, ახალი აღთქმა' },
  { ids: ['auto-hymn'], label: 'ჰიმნოგრაფიის ნახატები', hint: 'ნოტების თავსა და ბოლოში' },
  { ids: ['auto-mtkmeli'], label: 'მთქმელის ტექსტები', hint: 'ნაწარმოებები სრულად' },
];

const SECTIONS: [RecSection, string][] = [
  ['galoba', 'გალობა'], ['albums', 'გალობის ალბომები'], ['simghera', 'სიმღერა'], ['abituri', 'აბიტურიენტს'],
];

const BOOK_ORDER = Object.keys(BOOK_NAMES);
const bookOf = (p: PackInfo) => p.id.slice('notes-'.length);

const whatLabel = (what: string) =>
  what === 'rec' ? 'ჩანაწერები'
    : what === 'lives' ? 'წმიდანთა ცხოვრებანი'
    : what.startsWith('notes-') ? BOOK_NAMES[what.slice(6)] ?? 'ნოტების წიგნი'
    : 'ავტომატური ნაწილი';

const missing = (s: OfflineState) => s.recMissing > 0 || s.packs.some(p => isKept(s, p.id) && !s.stored[p.id]?.complete);

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

const Head: React.FC<{ s: OfflineState }> = ({ s }) => {
  const status = offlineStatus(s);
  const pct = runPercent(s);
  const autoWaits = s.saveData && s.packs.some(p => isAutoPack(p.id) && !s.stored[p.id]?.complete);
  const now = (text: string) => (
    <Btn icon={<CloudDownload />} onClick={() => syncNow(true)} className="w-full sm:w-auto">{text}</Btn>
  );
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
      default: return {
        Icon: Cloud, tone: 'wine', title: 'ოფლაინ რეჟიმი მზადდება',
        text: 'აპი პირველად იწერება ტელეფონზე — ცოტა ხანში დასრულდება.',
      };
    }
  })() as { Icon: React.ComponentType<{ className?: string }>; tone: string; title: string; text: string; action?: React.ReactNode };
  return (
    <Card className="!p-4">
      <div className="flex items-start gap-3">
        <span className={cx(
          'w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center',
          view.tone === 'green' && 'bg-emerald-50 text-emerald-700',
          view.tone === 'amber' && 'bg-amber-50 text-amber-700',
          view.tone === 'muted' && 'bg-[#f1e8d9] text-[#75685a]',
          view.tone === 'wine' && 'bg-[#7a2028]/[0.08] text-[#7a2028]',
        )}>
          <view.Icon className="w-[22px] h-[22px]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="font-serif-ge text-[17px] font-bold text-[#4a3426] leading-snug">{view.title}</h2>
          <p className="text-[13px] text-[#8a7a6a] leading-snug mt-0.5">{view.text}</p>
        </div>
      </div>
      {status === 'run' && <div className="mt-3.5"><Bar value={pct} max={100} /></div>}
      {view.action && <div className="mt-3.5">{view.action}</div>}
      {s.usage !== null && (
        <p className="mt-3.5 pt-3 border-t border-[#efe5d4] text-[12.5px] text-[#8a7a6a] flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 shrink-0" />
          აპს ტელეფონზე უკავია <b className="text-[#4a3426] tabular-nums">{size(s.usage)}</b>
        </p>
      )}
    </Card>
  );
};

/** The light part every phone keeps by itself; folded, it shows only its total and state. */
const AutoCard: React.FC<{ s: OfflineState }> = ({ s }) => {
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
  const ready = all.done && s.appReady;
  return (
    <Card className="!p-0 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center gap-3 p-4 text-left cursor-pointer">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Zap className="w-5 h-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif-ge text-[17px] font-bold text-[#4a3426] leading-snug">ავტომატურად</span>
          <span className="block text-[13px] text-[#8a7a6a] leading-snug mt-0.5">ყველა მსუბუქი ნაწილი, თავისით{total ? ` · ${size(total)}` : ''}</span>
        </span>
        <Mark done={ready} pct={all.done ? undefined : all.pct} />
        <ChevronDown className={cx('w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="mx-4 mb-1.5 divide-y divide-[#efe5d4] border-t border-[#efe5d4] sg-in">
          <li className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-[#2a2017] leading-snug">აპი და დიზაინი</span>
              <span className="block text-[13px] text-[#8a7a6a] leading-snug">ყველა გვერდი, სურათი, შრიფტი და კალენდარი</span>
            </span>
            <Mark done={s.appReady} />
          </li>
          {AUTO.map(row => {
            const r = share(row.ids);
            if (!r.b) return null;
            const active = !!s.run && row.ids.includes(s.run.what);
            return (
              <li key={row.label} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-[#2a2017] leading-snug">{row.label}</span>
                  <span className="block text-[13px] text-[#8a7a6a] leading-snug">{row.hint} · {size(r.b)}</span>
                </span>
                <Mark done={r.done} pct={!r.done && (active || r.pct > 0) ? r.pct : undefined} />
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

/** One optional pack (a book's pages, the lives): its switch, size and progress. */
const PackRow: React.FC<{ s: OfflineState; p: PackInfo; title: string; count?: string }> = ({ s, p, title, count }) => {
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
  return (
    <div className="py-1">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#2a2017] leading-snug">{title}</p>
          <p className={cx('text-[13px] leading-snug mt-0.5 flex items-center gap-1', done ? 'text-emerald-700' : 'text-[#8a7a6a]')}>
            {done && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
            {line}
          </p>
        </div>
        <Switch on={on} onChange={v => void setPacks([p.id], v)} label={`${title} — ოფლაინ`} />
      </div>
      {on && !done && (active || pct > 0) && <div className="mt-1 mb-1.5"><Bar value={pct} max={100} /></div>}
    </div>
  );
};

const BooksCard: React.FC<{ s: OfflineState; books: PackInfo[] }> = ({ s, books }) => {
  const allOn = books.every(p => isKept(s, p.id));
  const total = books.reduce((a, p) => a + p.b, 0);
  const allDone = allOn && books.every(p => s.stored[p.id]?.complete);
  const toggleAll = (on: boolean) => {
    const ids = books.map(p => p.id);
    if (on) void setPacks(ids, true);
    else if (window.confirm('ყველა წიგნის გვერდები ტელეფონიდან წაიშლება. გავაგრძელო?')) void setPacks(ids, false);
  };
  return (
    <Card>
      <CardTitle
        icon={<BookOpen />}
        title="ნოტების წიგნები"
        hint="გვერდების სურათები, რომ ნოტები ინტერნეტის გარეშე გაიხსნას. ერთხელ გახსნილი გალობა ისედაც ინახება."
      />
      <div className="divide-y divide-[#efe5d4]">
        <div className="flex items-center gap-3 py-1">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-[#4a3426] leading-snug">ყველა წიგნი</p>
            <p className={cx('text-[13px] leading-snug mt-0.5 flex items-center gap-1', allDone ? 'text-emerald-700' : 'text-[#8a7a6a]')}>
              {allDone && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
              {books.length} წიგნი · {size(total)}
            </p>
          </div>
          <Switch on={allOn} onChange={toggleAll} label="ყველა წიგნი — ოფლაინ" />
        </div>
        {books.map(p => (
          <PackRow key={p.id} s={s} p={p} title={BOOK_NAMES[bookOf(p)] ?? bookOf(p)} count={p.c ? `${p.c} გალობა` : undefined} />
        ))}
      </div>
    </Card>
  );
};

const itemDone = (s: OfflineState, it: RecItem) => it.tracks.every(t => s.tracks.has(t));

const groupStats = (s: OfflineState, g: RecGroup, est: (url: string) => number) => {
  const whole = s.choice.groups.includes(g.id);
  const chosen = g.items.filter(it => whole || s.choice.items.includes(it.id));
  let total = 0, kept = 0;
  for (const t of new Set(g.items.flatMap(it => it.tracks))) {
    total += est(t);
    if (s.tracks.has(t)) kept += est(t);
  }
  return {
    whole,
    chosen: chosen.length,
    chosenDone: chosen.filter(it => itemDone(s, it)).length,
    done: g.items.filter(it => itemDone(s, it)).length,
    total,
    kept,
  };
};

const GroupRow: React.FC<{ s: OfflineState; g: RecGroup; est: (url: string) => number; onOpen: () => void }> = ({ s, g, est, onOpen }) => {
  const st = groupStats(s, g, est);
  const n = g.items.length;
  const ok = st.chosen > 0 && st.chosenDone === st.chosen;
  const line = st.chosen === 0
    ? (st.done ? `${n} ჩანაწერი · ${st.done} უკვე ტელეფონზეა` : `${n} ჩანაწერი · ≈ ${size(st.total)}`)
    : ok
      ? (st.whole ? `ჩამოწერილია · ${size(st.kept)}` : `${st.chosen} / ${n} ჩამოწერილია · ${size(st.kept)}`)
      : `${s.online ? 'ჩამოიწერება' : 'დაელოდება ინტერნეტს'} · ${st.chosenDone} / ${st.chosen}`;
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 flex items-center gap-2 py-2 text-left cursor-pointer group">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-[#2a2017] leading-snug group-hover:text-[#7a2028]">{g.title}</span>
          <span className={cx('flex items-center gap-1 text-[13px] leading-snug mt-0.5', ok ? 'text-emerald-700' : 'text-[#8a7a6a]')}>
            {ok && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
            {line}
          </span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a594]" />
      </button>
      <Switch on={st.whole} onChange={v => void setGroup(g, v)} label={`${g.title} — ყველა ჩანაწერი ოფლაინ`} />
    </div>
  );
};

const GroupSheet: React.FC<{ s: OfflineState; g: RecGroup; est: (url: string) => number; onClose: () => void }> = ({ s, g, est, onClose }) => {
  const whole = s.choice.groups.includes(g.id);
  return (
    <Sheet open onClose={onClose} title={g.title}>
      <Toggle on={whole} onChange={v => void setGroup(g, v)} label="ყველა ჩანაწერი" hint={`${g.items.length} ჩანაწერი · ახლებიც თავისით დაემატება`} />
      <div className="mt-1 divide-y divide-[#efe5d4] border-t border-[#efe5d4]">
        {g.items.map(it => {
          const on = whole || s.choice.items.includes(it.id);
          const done = itemDone(s, it);
          const bytes = it.tracks.reduce((a, t) => a + est(t), 0);
          return (
            <div key={it.id} className="flex items-center gap-3 py-0.5">
              <div className="min-w-0 flex-1 py-1.5">
                <p className="text-[14.5px] font-semibold text-[#2a2017] leading-snug">{it.title}</p>
                <p className={cx('flex items-center gap-1 text-[12.5px] leading-snug mt-0.5', done ? 'text-emerald-700' : 'text-[#8a7a6a]')}>
                  {done && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={3} />}
                  <span className="min-w-0">
                    {[it.sub, done ? size(bytes) : `≈ ${size(bytes)}`, on && !done ? (s.online ? 'რიგშია' : 'დაელოდება ინტერნეტს') : ''].filter(Boolean).join(' · ')}
                  </span>
                </p>
              </div>
              <Switch on={on} onChange={v => void setItem(g, it.id, v)} label={`${it.title} — ოფლაინ`} />
            </div>
          );
        })}
      </div>
    </Sheet>
  );
};

const RecordingsCard: React.FC<{ s: OfflineState; groups: RecGroup[] }> = ({ s, groups }) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const est = useMemo(() => trackEstimate(s.sizes), [s.sizes]);
  const open = groups.find(g => g.id === openId);
  const sections = SECTIONS.map(([id, label]) => [label, groups.filter(g => g.section === id)] as const).filter(([, list]) => list.length);
  return (
    <Card>
      <CardTitle icon={<Headphones />} title="ჩანაწერები" hint="ჩართეთ მთელი ჯგუფი, ან გახსენით და აირჩიეთ ცალკეული ჩანაწერები." />
      {sections.map(([label, list], i) => (
        <div key={label} className={i ? 'mt-4' : ''}>
          <h3 className="text-[12px] font-bold text-[#8a7a6a] tracking-wide">{label}</h3>
          <div className="divide-y divide-[#efe5d4]">
            {list.map(g => <GroupRow key={g.id} s={s} g={g} est={est} onOpen={() => setOpenId(g.id)} />)}
          </div>
        </div>
      ))}
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
    <div className="w-full max-w-2xl mx-auto px-1 pb-10 space-y-4">
      <Head s={s} />
      <AutoCard s={s} />
      {books.length > 0 && <BooksCard s={s} books={books} />}
      {groups.length > 0 && <RecordingsCard s={s} groups={groups} />}
      {lives && sees.library && (
        <Card>
          <CardTitle icon={<Library />} title="ბიბლიოთეკა" className="!mb-1" />
          <PackRow s={s} p={lives} title="წმიდანთა ცხოვრებანი" count="ცხოვრებანი და ხატები" />
        </Card>
      )}
      <p className="px-3 text-center text-[12.5px] text-[#8a7a6a] leading-relaxed">
        წიგნები და ჩანაწერები ტელეფონზე ბევრ ადგილს იკავებს — ჩართეთ მხოლოდ ის, რაც გჭირდებათ. გამორთვისას ტელეფონიდან მაშინვე იშლება.
      </p>
    </div>
  );
};
