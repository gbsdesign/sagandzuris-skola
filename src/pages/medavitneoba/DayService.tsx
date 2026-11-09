import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Church, Music, Search, TriangleAlert, X } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { Sheet, Tabs } from '../../components/ui/kit';
import { PROSE } from '../../components/views/PrayerText';
import {
  addDays, dayMonthGe, fromIso, loadCalendarYearDays, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe,
} from '../../data/churchCalendar';
import { useMembership } from '../../utils/memberAccess';
import { triggerHaptic } from '../../utils/haptics';
import { toneName } from '../../utils/dayReadings';
import {
  RANKS, PATRON_PRESETS, WHO_LABEL, buildServices, greatFeastOf, guessRank, hymnsOf, oldMD, patronDay, periodOf, rankLabel,
  weekTone, type DayInput, type Extra, type Hymn, type Patron, type Rank, type ServiceId, type Step,
} from '../../utils/dayService';
import { useTemplePatron } from '../../hooks/useTemplePatron';
import { FEAST_RULES } from '../../data/churchFeasts';
import { ApostleText } from './DayCard';
import { ToneSheet } from './ToneSheet';

// „დღის მსახურება“ (the user, 2026-11-09; plan doc „დღის მსახურების გეგმა“, stage 1): the church day from the eve's
// vespers to the liturgy's dismissal, step by step (utils/dayService.ts). The day moves with ‹ ›, the rank is guessed and
// can be changed (kept per date on the device, `sg-day-rank`), the reader's temple is picked from a list (useTemplePatron).
// A step's number marks „აქ ვარ“ (`sg-day-at`). Book texts open only for admins, like the books themselves (the
// monastery's permission); the psalter, the prayers and the Apostle open for everyone.

const CARD = 'rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)]';
const CHIP = 'inline-flex items-center gap-1.5 min-h-10 py-2 px-3.5 rounded-full text-left leading-snug text-[13px] font-bold cursor-pointer transition active:scale-[0.97] [&>svg]:shrink-0';

// ---------- small stores on the device ----------
const readMap = (key: string): Record<string, string> => {
  try { const v = JSON.parse(localStorage.getItem(key) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
};
const writeMap = (key: string, map: Record<string, string>, keep = 40) => {
  const entries = Object.entries(map).slice(-keep);
  try { localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries))); } catch { /* private window */ }
};
const RANK_KEY = 'sg-day-rank';
const AT_KEY = 'sg-day-at';

// ---------- the books' texts (troparia) ----------
type Section = [string, string[]];
type BookFile = { t: string; c: { l: string; s: Section[] }[] };
const files = new Map<string, Promise<BookFile>>();
const loadBook = (coll: string, n: number) => {
  const url = `/wignebi/${coll}/${String(n).padStart(2, '0')}.json`;
  let p = files.get(url);
  if (!p) {
    p = fetch(url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<BookFile>; });
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return p;
};
/** the month files of ჟამნი: September = 13 … August = 24 */
const monthFile = (month: number) => ((month - 9 + 12) % 12) + 13;
type Text = { head: string; paras: string[] };
/** the troparia and kontakia of one old-style day in ჟამნი's month */
const saintTexts = async (month: number, day: number): Promise<{ tr: Text[]; ko: Text[] }> => {
  const f = await loadBook('jamni', monthFile(month));
  const s = f.c[0]?.s ?? [];
  const isDate = (h: string) => /^ძვ\.?\s*სტ\.?\s*\d+/.test(h);
  const at = s.findIndex(([h]) => new RegExp(`^ძვ\\.?\\s*სტ\\.?\\s*${day}\\s`).test(h));
  const out = { tr: [] as Text[], ko: [] as Text[] };
  if (at < 0) return out;
  for (let i = at + 1; i < s.length && !isDate(s[i][0]); i++) {
    const [head, paras] = s[i];
    if (/კონდაკ/.test(head)) out.ko.push({ head, paras });
    else if (/ტროპარ|ტროაპრ/.test(head)) out.tr.push({ head, paras });
  }
  return out;
};
const EVE = ['კვირას', 'ორშაბათსა', 'სამშაბათსა', 'ოთხშაბათსა', 'ხუთშაბათსა', 'პარასკევსა'];
/** a weekday's troparion and kontakion (ჟამნი „ტროპარნი და კონდაკნი მსგეფსისანი“, written under the evening before) */
const weekdayTexts = async (dow: number): Promise<{ tr: Text[]; ko: Text[] }> => {
  const out = { tr: [] as Text[], ko: [] as Text[] };
  if (dow === 0) return out;
  const f = await loadBook('jamni', 28);
  const s = f.c[0]?.s ?? [];
  const start = s.findIndex(([h]) => h.includes(`${EVE[dow - 1]} მწუხრად`));
  if (start < 0) return out;
  let kont = false;
  for (let i = start; i < s.length && (i === start || !/მწუხრად/.test(s[i][0])); i++) {
    const [head, paras] = s[i];
    if (i > start && /კონდაკ/.test(head)) kont = true;
    (kont ? out.ko : out.tr).push({ head: i === start ? 'ტროპარი' + (head.match(/,?\s*ხმა\s*\d+/)?.[0] ?? '') : head, paras });
  }
  return out;
};

/** the temple's own hymns among a day's: by its feast's words (data/churchFeasts) or its name's longest word; none found — all */
const GENERIC = /^(?:წმიდ|წმინდ|მოწამ|ღირს|მღვდელ|დიდ|მოციქულ|მართალ|ნეტარ|ქალწულ|აღმსარებ|მთავარ|ეპისკოპოს|ხსენებ|დღესასწაულ)/;
const onlyTemple = (p: Patron, all: { tr: Text[]; ko: Text[] }) => {
  const rule = p.id ? FEAST_RULES.find(f => f.id === p.id)?.re : undefined;
  const word = p.name.split(/[\s,.;:()]+/).filter(w => w.length >= 5 && !GENERIC.test(w)).sort((a, b) => b.length - a.length)[0];
  const re = rule ?? (word ? new RegExp(word.slice(0, Math.max(4, word.length - 3))) : null);
  if (!re) return all;
  const pick = (list: Text[]) => { const own = list.filter(t => re.test(t.head) || re.test(t.paras.join(' '))); return own.length ? own : list; };
  return { tr: pick(all.tr), ko: pick(all.ko) };
};

// ---------- pieces ----------
const WhoPills: React.FC<{ who: Step['who'] }> = ({ who }) => (
  <span className="flex flex-wrap gap-1">
    {who.map(w => (
      <span key={w} className={`inline-flex items-center h-6 px-2 rounded-full text-[12px] font-bold ${
        w === 'reader' ? 'bg-[#7a2028] text-[#fbf6ec]' : w === 'choir' ? 'bg-[#a0703c]/15 text-[#7a4f20]' : 'bg-[#f1e8d9] text-[#6b5c4d]'
      }`}>{WHO_LABEL[w]}</span>
    ))}
  </span>
);

const TextBlock: React.FC<{ t: Text }> = ({ t }) => (
  <div className="mt-2">
    <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{t.head.replace(/\.\s*$/, '')}</p>
    <div className={`${PROSE} mt-1`}>{t.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
  </div>
);

const HymnRow: React.FC<{ h: Hymn; texts?: Text[] }> = ({ h, texts }) => {
  const [open, setOpen] = useState(false);
  const has = !!texts?.length;
  return (
    <li className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8]">
      <button type="button" disabled={!has} onClick={() => { triggerHaptic(8); setOpen(o => !o); }} aria-expanded={has ? open : undefined}
        className={`w-full min-h-12 px-3.5 py-2 flex items-center gap-3 text-left ${has ? 'cursor-pointer' : 'cursor-default'}`}>
        <span className="min-w-0 flex-1">
          {h.glory && <span className="block text-[12px] font-black text-[#a0703c]">{h.glory === 'glory' ? 'დიდება…' : 'აწდა…'}</span>}
          <span className="block text-[15px] font-semibold leading-snug text-[#2a2017]">{h.label}</span>
        </span>
        {has && <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && texts && <div className="px-4 pb-3.5 sg-in">{texts.map((t, i) => <TextBlock key={i} t={t} />)}</div>}
    </li>
  );
};

const Troparia: React.FC<{ inp: DayInput; at: 'vespers' | 'matins' | 'hours' | 'liturgy'; canText: boolean }> = ({ inp, at, canText }) => {
  const { troparia, kontakia } = useMemo(() => hymnsOf(inp, at), [inp, at]);
  const [saint, setSaint] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const [temple, setTemple] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const [week, setWeek] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const dow = fromIso(inp.iso).getDay();
  useEffect(() => {
    if (!canText) return;
    let alive = true;
    const o = oldMD(inp.iso);
    saintTexts(o.month, o.day).then(v => alive && setSaint(v), () => {});
    weekdayTexts(dow).then(v => alive && setWeek(v), () => {});
    const p = inp.patron;
    if (p?.md) { const t = oldMD(patronDay(p, inp.iso)); saintTexts(t.month, t.day).then(v => alive && setTemple(onlyTemple(p, v)), () => {}); }
    else setTemple(null);
    return () => { alive = false; };
  }, [canText, inp.iso, inp.patron, dow]);
  const textOf = (h: Hymn, k: 'tr' | 'ko') =>
    h.role === 'saint' ? saint?.[k] : h.role === 'temple' ? temple?.[k] : h.role === 'day' ? week?.[k] : h.role === 'feast' ? saint?.[k] : undefined;
  return (
    <div className="mt-2.5 space-y-3 sg-in">
      <div>
        <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">ტროპარნი</p>
        <ul className="mt-1 space-y-1.5">{troparia.map((h, i) => <HymnRow key={i} h={h} texts={textOf(h, 'tr')} />)}</ul>
      </div>
      {kontakia.length > 0 && (
        <div>
          <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">კონდაკნი</p>
          <ul className="mt-1 space-y-1.5">{kontakia.map((h, i) => <HymnRow key={i} h={h} texts={textOf(h, 'ko')} />)}</ul>
        </div>
      )}
      {!canText && <p className="text-[13px] leading-snug text-[#8a7a6a]">ტექსტები წიგნებთან ერთად გაიხსნება.</p>}
    </div>
  );
};

const StepExtras: React.FC<{ step: Step; inp: DayInput; isAdmin: boolean; onTone: () => void }> = ({ step, inp, isAdmin, onTone }) => {
  const { openPrayer, openMapItem } = useNavigation();
  const [open, setOpen] = useState<number | null>(null);
  const [showHymns, setShowHymns] = useState(false);
  const buttons: React.ReactNode[] = [];
  const blocks: React.ReactNode[] = [];
  (step.extras ?? []).forEach((x: Extra, i) => {
    if (x.kind === 'kathisma') buttons.push(
      <button key={i} type="button" onClick={() => { triggerHaptic(8); openPrayer(`kathisma-${x.n}`); }}
        className={`${CHIP} bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]`}><BookOpen className="w-4 h-4" />კანონი {x.n}</button>);
    else if (x.kind === 'prayer') buttons.push(
      <button key={i} type="button" onClick={() => { triggerHaptic(8); openPrayer(x.id); }}
        className={`${CHIP} bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]`}><BookOpen className="w-4 h-4" />{x.label}</button>);
    else if (x.kind === 'book' && isAdmin) buttons.push(
      <button key={i} type="button" onClick={() => { triggerHaptic(8); openMapItem(`w:c:${x.coll}:${x.n}${x.part !== undefined ? `:${x.part}` : ''}`); }}
        className={`${CHIP} bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-[#4a3426]`}><BookOpen className="w-4 h-4 text-[#a0703c]" />{x.label}</button>);
    else if (x.kind === 'tone' && inp.tone) buttons.push(
      <button key={i} type="button" onClick={() => { triggerHaptic(8); onTone(); }}
        className={`${CHIP} bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]`}><Music className="w-4 h-4" />{toneName(inp.tone)} — ნოტები</button>);
    else if (x.kind === 'troparia') {
      buttons.push(
        <button key={i} type="button" aria-expanded={showHymns} onClick={() => { triggerHaptic(8); setShowHymns(s => !s); }}
          className={`${CHIP} ${showHymns ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]'}`}>
          რიგი და ტექსტები<ChevronDown className={`w-4 h-4 transition-transform ${showHymns ? 'rotate-180' : ''}`} />
        </button>);
      if (showHymns) blocks.push(<Troparia key={`t${i}`} inp={inp} at={x.at} canText={isAdmin} />);
    } else if (x.kind === 'readings') {
      x.items.forEach((r, j) => {
        if (!r.apostle) return;
        const id = i * 10 + j;
        buttons.push(
          <button key={`${i}-${j}`} type="button" aria-expanded={open === id} onClick={() => { triggerHaptic(8); setOpen(o => (o === id ? null : id)); }}
            className={`${CHIP} ${open === id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]'}`}>
            <BookOpen className="w-4 h-4" />{x.items.filter(y => y.apostle).length > 1 ? `წაიკითხე · ${r.name} ${r.ref}` : 'წაიკითხე და ჩაიწერე'}
          </button>);
        if (open === id) blocks.push(<ApostleText key={`a${id}`} r={r} iso={inp.iso} />);
      });
    }
  });
  if (!buttons.length) return null;
  return (
    <>
      <div className="mt-2.5 flex flex-wrap gap-2">{buttons}</div>
      {blocks}
    </>
  );
};

// ---------- sheets ----------
const RankSheet: React.FC<{ open: boolean; value: Rank; guessed: Rank; onPick: (r: Rank | null) => void; onClose: () => void }> = ({ open, value, guessed, onPick, onClose }) => (
  <Sheet open={open} onClose={onClose} title="მსახურების რანგი">
    <p className="text-[14px] leading-relaxed text-[#6b5c4d] text-pretty">აპმა გამოიცნო: <b className="text-[#7a2028]">{rankLabel(guessed)}</b>. თუ შენს ტაძარში სხვაგვარად აღესრულება, აირჩიე.</p>
    <ul className="mt-3 space-y-2">
      {RANKS.map(r => (
        <li key={r.id}>
          <button type="button" onClick={() => { triggerHaptic(10); onPick(r.id === guessed ? null : r.id); onClose(); }}
            className={`w-full min-h-14 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] ${
              value === r.id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-[#2a2017]'
            }`}>
            <span className="flex-1 min-w-0">
              <span className="block text-[15px] font-bold">{r.label}{r.id === guessed && <span className={`ml-2 text-[12px] font-bold ${value === r.id ? 'text-[#fbf6ec]/75' : 'text-[#a0703c]'}`}>აპის არჩევანი</span>}</span>
              <span className={`block text-[13px] ${value === r.id ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{r.hint}</span>
            </span>
            {value === r.id && <Check className="w-5 h-5 shrink-0" />}
          </button>
        </li>
      ))}
    </ul>
  </Sheet>
);

type Found = { name: string; iso: string };
const KIND_HEAD: Record<Patron['kind'], string> = { lord: 'უფლის დღესასწაულები', theotokos: 'ღვთისმშობლის დღესასწაულები', saint: 'წმიდანები' };
const PatronSheet: React.FC<{ open: boolean; value: Patron | null; onPick: (p: Patron | null) => void; onClose: () => void }> = ({ open, value, onPick, onClose }) => {
  const [q, setQ] = useState('');
  const [all, setAll] = useState<Found[] | null>(null);
  useEffect(() => {
    if (!open || all || q.trim().length < 3) return;
    loadCalendarYearDays().then(days => {
      const out: Found[] = [];
      for (const [iso, d] of Object.entries(days)) for (const s of d.s) out.push({ name: s.n, iso });
      setAll(out);
    }, () => setAll([]));
  }, [open, q, all]);
  const needle = q.trim().toLowerCase();
  const presets = PATRON_PRESETS.filter(p => !needle || p.name.toLowerCase().includes(needle));
  const found = needle.length >= 3 && all ? all.filter(f => f.name.toLowerCase().includes(needle)).slice(0, 12) : [];
  const pick = (p: Patron | null) => { triggerHaptic(10); onPick(p); setQ(''); onClose(); };
  const Row: React.FC<{ p: Patron; sub: string }> = ({ p, sub }) => {
    const on = value?.name === p.name;
    return (
      <li>
        <button type="button" onClick={() => pick(p)}
          className={`w-full min-h-13 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] ${
            on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-[#2a2017]'
          }`}>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold leading-snug line-clamp-2">{p.name}</span>
            <span className={`block text-[13px] ${on ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{sub}</span>
          </span>
          {on && <Check className="w-5 h-5 shrink-0" />}
        </button>
      </li>
    );
  };
  const when = (p: Patron) => (p.md ? dayMonthGe(`2026-${p.md}`) : p.easter === 0 ? 'გარდამავალი დღესასწაული' : `აღდგომიდან ${p.easter}-ე დღე`);
  return (
    <Sheet open={open} onClose={onClose} title="ჩემი ტაძრის სახელობა">
      <label className="relative block">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#a0703c]" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="მოძებნე: გიორგი, ნინო…"
          className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 outline-none text-[16px] text-[#2a2017] placeholder:text-[#b3a594]" />
        {q && <button type="button" aria-label="გასუფთავება" onClick={() => setQ('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-[#8a7a6a] cursor-pointer"><X className="w-5 h-5" /></button>}
      </label>
      {(['lord', 'theotokos', 'saint'] as const).map(kind => {
        const list = presets.filter(p => p.kind === kind);
        if (!list.length) return null;
        return (
          <section key={kind} className="mt-4">
            <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{KIND_HEAD[kind]}</p>
            <ul className="mt-1.5 space-y-2">{list.map(p => <Row key={p.name} p={p} sub={when(p)} />)}</ul>
          </section>
        );
      })}
      {found.length > 0 && (
        <section className="mt-4">
          <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">კალენდრიდან</p>
          <ul className="mt-1.5 space-y-2">
            {found.map(f => <Row key={f.iso + f.name} p={{ name: f.name.replace(/\s*\([^)]*\)\s*[*;.]*\s*$/, '').replace(/[;*]+$/, ''), kind: 'saint', md: f.iso.slice(5) }} sub={dayMonthGe(f.iso)} />)}
          </ul>
        </section>
      )}
      {needle.length >= 3 && !all && <p className="mt-4 text-[14px] text-[#8a7a6a]">ვეძებ კალენდარში…</p>}
      {!presets.length && !found.length && all && <p className="mt-4 text-[14px] text-[#8a7a6a]">ვერ ვიპოვე. სცადე სხვა სიტყვა.</p>}
      {value && (
        <button type="button" onClick={() => pick(null)} className="mt-5 w-full h-12 rounded-full ring-1 ring-[#e8dcc8] bg-white text-[#7a2028] text-[15px] font-bold cursor-pointer">
          ტაძრის მოხსნა
        </button>
      )}
    </Sheet>
  );
};

// ---------- the page ----------
const SERVICE_TABS: { id: ServiceId; label: string }[] = [
  { id: 'vespers', label: 'მწუხრი' }, { id: 'matins', label: 'ცისკარი' }, { id: 'hours', label: 'ჟამები' }, { id: 'liturgy', label: 'წირვა' },
];

export const DayService: React.FC = () => {
  const canCal = useMembership().can('calendar');
  const { isAdmin } = useAuth();
  const today = useMemo(todayIso, []);
  const [iso, setIso] = useState(today);
  const day = useCalendarDay(canCal ? iso : null);
  const lastSunday = addDays(iso, -fromIso(iso).getDay());
  const sundayDay = useCalendarDay(canCal && lastSunday !== iso ? lastSunday : null);
  const { patron, save: savePatron } = useTemplePatron();
  const [ranks, setRanks] = useState(() => readMap(RANK_KEY));
  const [ats, setAts] = useState(() => readMap(AT_KEY));
  const [tab, setTab] = useState<ServiceId>('vespers');
  const [sheet, setSheet] = useState<'rank' | 'patron' | null>(null);
  const [toneOpen, setToneOpen] = useState<number | null>(null);

  const guessed = guessRank(iso, day ?? null, patron);
  const rank = (RANKS.some(r => r.id === ranks[iso]) ? ranks[iso] : guessed) as Rank;
  const tone = weekTone(day ?? null, lastSunday === iso ? null : sundayDay ?? null);
  const inp: DayInput = useMemo(() => ({ iso, day: day ?? null, tone, rank, patron }), [iso, day, tone, rank, patron]);
  const services = useMemo(() => buildServices(inp), [inp]);
  const service = services.find(s => s.id === tab)!;
  const great = greatFeastOf(iso);
  const period = periodOf(iso);
  const templeDay = !!patron && patronDay(patron, iso) === iso;
  const title = day?.t.replace(/\s*ხმა\s+[IVX]+\.?\s*$/, '').replace(/\.\s*$/, '');
  const saints = (day?.s ?? []).slice(0, 3);
  const atKey = `${iso}|${tab}`;
  const at = ats[atKey] !== undefined ? Number(ats[atKey]) : -1;

  const move = (n: number) => { triggerHaptic(8); setIso(d => addDays(d, n)); };
  const setRank = (r: Rank | null) => {
    const next = { ...ranks };
    if (r) next[iso] = r; else delete next[iso];
    setRanks(next); writeMap(RANK_KEY, next);
  };
  const mark = (i: number) => {
    triggerHaptic(10);
    const next = { ...ats };
    if (at === i) delete next[atKey]; else next[atKey] = String(i);
    setAts(next); writeMap(AT_KEY, next, 30);
  };

  if (!canCal) return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <p className={`${CARD} p-5 text-[15px] leading-relaxed text-[#6b5c4d]`}>დღის მსახურება საეკლესიო კალენდარს იყენებს — ის შენთვის ჯერ გახსნილი არ არის.</p>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1 flex flex-col gap-4">
      {/* the day */}
      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="წინა დღე" onClick={() => move(-1)}
            className="w-11 h-11 shrink-0 rounded-full bg-[#f4ece0] hover:bg-[#ece0cc] text-[#4a3426] flex items-center justify-center cursor-pointer transition active:scale-[0.95]"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[16px] font-bold leading-tight text-[#2a2017]">{weekdayGe(iso)}, {dayMonthGe(iso)}</p>
            <p className="text-[13px] font-semibold text-[#8a7a6a]">ძვ. სტ. {oldDayMonthGe(iso)}{iso !== today && <> · <button type="button" onClick={() => { triggerHaptic(8); setIso(today); }} className="font-bold text-[#7a2028] underline underline-offset-2 cursor-pointer">დღეს</button></>}</p>
          </div>
          <button type="button" aria-label="შემდეგი დღე" onClick={() => move(1)}
            className="w-11 h-11 shrink-0 rounded-full bg-[#f4ece0] hover:bg-[#ece0cc] text-[#4a3426] flex items-center justify-center cursor-pointer transition active:scale-[0.95]"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {great && <p className="mt-3 text-center font-serif-ge text-[19px] font-bold text-[#7a2028]">{great.name}</p>}
        {title && <p className="mt-2 text-center text-[14px] leading-snug text-[#6b5c4d] text-pretty">{title}</p>}
        {saints.length > 0 && (
          <ul className="mt-3 space-y-1 font-serif-ge text-[15px] leading-snug">
            {saints.map((s, i) => (
              <li key={i} className={`flex gap-2 ${s.b ? 'font-bold text-[#7a2028]' : 'text-[#4a3826]'}`}>
                <span className="mt-[0.55em] w-1.5 h-1.5 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                <span className="line-clamp-2 text-pretty">{s.n}</span>
              </li>
            ))}
          </ul>
        )}
        {day === undefined && <p className="mt-3 text-center text-[14px] text-[#8a7a6a]">იტვირთება…</p>}
        {day === null && <p className="mt-3 text-center text-[14px] text-[#8a7a6a]">ამ დღის კალენდარი ჯერ არ გამოქვეყნებულა — წესი ზოგადად ჩანს.</p>}

        {/* tone · rank · temple */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={!tone} onClick={() => { triggerHaptic(8); setToneOpen(tone); }}
            className="min-h-14 px-3 py-2 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] disabled:opacity-60 text-[#fbf6ec] text-left cursor-pointer transition active:scale-[0.98]">
            <span className="block text-[12px] font-bold text-[#fbf6ec]/75">კვირის ხმა</span>
            <span className="flex items-center gap-1.5 text-[16px] font-bold">{tone ? toneName(tone) : '—'}{tone && <Music className="w-4 h-4" />}</span>
          </button>
          <button type="button" onClick={() => { triggerHaptic(8); setSheet('rank'); }}
            className="min-h-14 px-3 py-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-left cursor-pointer transition active:scale-[0.98]">
            <span className="block text-[12px] font-bold text-[#a0703c]">რანგი{rank !== guessed && ' · შენი'}</span>
            <span className="flex items-center gap-1 text-[16px] font-bold text-[#2a2017]">{rankLabel(rank)}<ChevronDown className="w-4 h-4 text-[#8a7a6a]" /></span>
          </button>
        </div>
        <button type="button" onClick={() => { triggerHaptic(8); setSheet('patron'); }}
          className="mt-2 w-full min-h-13 px-3.5 py-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99]">
          <Church className="w-5 h-5 shrink-0 text-[#a0703c]" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-[#a0703c]">ჩემი ტაძარი</span>
            <span className={`block text-[15px] font-bold leading-snug truncate ${patron ? 'text-[#2a2017]' : 'text-[#7a2028]'}`}>{patron ? patron.name : 'აირჩიე სახელობა'}</span>
          </span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b39c]" />
        </button>

        {templeDay && (
          <p className="mt-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-200 px-3.5 py-2.5 text-[14px] font-semibold leading-snug text-emerald-900">დღეს შენი ტაძრის დღესასწაულია — ღამისთევა.</p>
        )}
        {period !== 'octoechos' && (
          <div role="note" className="mt-3 flex items-start gap-2.5 rounded-2xl bg-[#fdf4e3] ring-1 ring-[#e9c98f] px-3.5 py-2.5">
            <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#b7791f]" />
            <p className="text-[14px] leading-snug text-[#4a3826] text-pretty">
              {period === 'triodion' ? 'ტრიოდის პერიოდია (მარხვა და მისი მოსამზადებელი კვირები).' : 'აღდგომის პერიოდია (ზატიკი).'} ზოგი ნაწილი ამ დღეებში იცვლება — გადაამოწმე რეგენტთან.
            </p>
          </div>
        )}
      </section>

      {/* the services */}
      <Tabs cols={4} stack items={SERVICE_TABS} value={tab} onChange={setTab} />

      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif-ge text-[20px] font-bold text-[#2a2017]">{service.title}</h3>
          <p className="text-[13px] font-bold text-[#a0703c]">{service.when}</p>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-[#8a7a6a]">ნომერს დააჭირე — მოინიშნება, სად ხარ.</p>
        <ol className="mt-3.5">
          {service.steps.map((s, i) => {
            const here = at === i;
            const past = at > i;
            return (
              <li key={`${tab}-${i}`} className="relative pl-12 pb-4 last:pb-0">
                {i < service.steps.length - 1 && <span className={`absolute left-[19px] top-11 bottom-0 w-0.5 ${past || here ? 'bg-[#7a2028]/40' : 'bg-[#efe5d4]'}`} aria-hidden />}
                <button type="button" onClick={() => mark(i)} aria-pressed={here} aria-label={`${i + 1} — აქ ვარ`}
                  className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black cursor-pointer transition active:scale-[0.94] ${
                    here ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_0_0_5px_rgba(122,32,40,0.14)]'
                      : past ? 'bg-[#7a2028]/15 text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#8a7a6a]'
                  }`}>
                  {past ? <Check className="w-4 h-4" /> : i + 1}
                </button>
                <div className={`min-h-10 pt-1.5 ${here ? '' : ''}`}>
                  <p className={`text-[16px] font-bold leading-snug ${here ? 'text-[#7a2028]' : 'text-[#2a2017]'}`}>{s.title}</p>
                  <div className="mt-1"><WhoPills who={s.who} /></div>
                  {s.note && <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[#7a2028] text-pretty">{s.note}</p>}
                  {s.hint && <p className="mt-1 text-[13px] leading-snug text-[#8a7a6a] text-pretty">{s.hint}</p>}
                  <StepExtras step={s} inp={inp} isAdmin={isAdmin} onTone={() => setToneOpen(tone)} />
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <button type="button" onClick={() => openChurchCalendar(iso)}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028] text-[14px] font-bold cursor-pointer transition active:scale-[0.97]">
          <CalendarDays className="w-4 h-4" />სრული განგება კალენდარში
        </button>
      </div>
      <p className="px-1 text-[13px] leading-relaxed text-[#8a7a6a] text-pretty">
        ეს ზოგადი წესია ტიპიკონის მიხედვით. ტაძრებში ცოტათი განსხვავდება — გადაამოწმე მოძღვართან ან რეგენტთან.
      </p>

      <RankSheet open={sheet === 'rank'} value={rank} guessed={guessed} onPick={setRank} onClose={() => setSheet(null)} />
      <PatronSheet open={sheet === 'patron'} value={patron} onPick={savePatron} onClose={() => setSheet(null)} />
      <ToneSheet tone={toneOpen} onClose={() => setToneOpen(null)} />
    </div>
  );
};

/** the way in, on top of the reader's side: today's name, tone and rank in one row */
export const DayServiceButton: React.FC = () => {
  const canCal = useMembership().can('calendar');
  const { openMapItem } = useNavigation();
  const [today] = useState(todayIso);
  const day = useCalendarDay(canCal ? today : null);
  const lastSunday = addDays(today, -fromIso(today).getDay());
  const sundayDay = useCalendarDay(canCal && lastSunday !== today ? lastSunday : null);
  const { patron } = useTemplePatron();
  const ranks = readMap(RANK_KEY);
  if (!canCal) return null;
  const guessed = guessRank(today, day ?? null, patron);
  const rank = (RANKS.some(r => r.id === ranks[today]) ? ranks[today] : guessed) as Rank;
  const tone = weekTone(day ?? null, lastSunday === today ? null : sundayDay ?? null);
  const great = greatFeastOf(today);
  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <button type="button" onClick={() => { triggerHaptic(10); openMapItem('day'); }}
        className="w-full min-h-[76px] px-4 py-3 rounded-3xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] flex items-center gap-3.5 text-left cursor-pointer transition active:scale-[0.99] shadow-[0_10px_24px_-14px_rgba(122,32,40,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0703c]">
        <span className="w-12 h-12 rounded-2xl bg-[#fbf6ec]/12 flex items-center justify-center shrink-0"><CalendarDays className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-bold leading-snug">დღის მსახურება</span>
          <span className="block mt-0.5 text-[13px] font-semibold leading-snug text-[#fbf6ec]/80 text-pretty">
            {dayMonthGe(today)}{great ? ` · ${great.name}` : ''}{tone ? ` · ${toneName(tone)}` : ''} · {rankLabel(rank)}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0" />
      </button>
    </div>
  );
};
