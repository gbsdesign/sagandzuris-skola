import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Church, Music, ScrollText, Search, Settings2, TriangleAlert, X } from 'lucide-react';
import { useNavigation } from '../../context';
import { Sheet, Tabs } from '../../components/ui/kit';
import { PROSE } from '../../components/views/PrayerText';
import {
  addDays, dayMonthGe, fromIso, loadCalendarYearDays, oldDayMonthGe, openChurchCalendar, todayIso, useCalendarDay, weekdayGe,
} from '../../data/churchCalendar';
import { useMembership } from '../../utils/memberAccess';
import { triggerHaptic } from '../../utils/haptics';
import { toneName } from '../../utils/dayReadings';
import {
  DEFAULT_ORDER, RANKS, PATRON_PRESETS, WHO_LABEL, buildServices, isOrder, greatFeastOf, guessRank, hymnsOf, nowPart, nowWord, oldMD, patronDay, periodOf,
  rankLabel, seasonOf, serviceAfter, serviceNow, weekTone, type DayInput, type Extra, type Hymn, type Patron, type Rank, type Read, type ServiceId, type Step,
  type TempleOrder,
} from '../../utils/dayService';
import { useTemplePatron } from '../../hooks/useTemplePatron';
import { FEAST_RULES } from '../../data/churchFeasts';
import { ApostleText } from './DayCard';
import { octoechos, sliceOf, type TextSrc } from '../../utils/serviceTexts';
import { splitHymns, triodionSrc } from '../../utils/triodion';
import { foodOf, type FeastWeight } from '../../utils/fasting';
import { dayText } from '../../utils/dayReadings';
import { SERVICE_LISTS, hasBookNotes } from '../../data/chantLookup';
import { bookOf, versionTone } from '../../utils/toneChants';
import { useNotes } from '../../context/NotesContext';
import { ToneSheet } from './ToneSheet';
import { useKhutsuri } from '../../components/views/ReadingTools';
import { bookUrl, dayFiles, daySignature, monthFile } from '../../utils/dayOffline';
import { canKeepAwake, useScreenAwake } from '../../hooks/useScreenAwake';

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
// the temple's own order (Saturday evening, a weekday's evening), the priest's texts and the old script — kept on the device
const ORDER_KEY = 'sg-day-order';
const PRIEST_KEY = 'sg-day-priest';
const OLD_KEY = 'sg-day-khutsuri';
const AWAKE_KEY = 'sg-day-awake';
const SAVED_KEY = 'sg-day-saved';
const readOrder = (): TempleOrder => {
  try { const v = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'); return isOrder(v) ? v : DEFAULT_ORDER; } catch { return DEFAULT_ORDER; }
};
const readFlag = (key: string) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
/** a switch that is on until turned off */
const readOn = (key: string) => { try { return localStorage.getItem(key) !== '0'; } catch { return true; } };
const writeFlag = (key: string, on: boolean) => { try { localStorage.setItem(key, on ? '1' : '0'); } catch { /* private window */ } };

// ---------- the books' texts (troparia) ----------
type Section = [string, string[]];
type BookFile = { t: string; c: { l: string; s: Section[] }[] };
const files = new Map<string, Promise<BookFile>>();
const loadBook = (coll: string, n: number) => {
  const url = bookUrl(coll, n);
  let p = files.get(url);
  if (!p) {
    p = fetch(url).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<BookFile>; });
    p.catch(() => files.delete(url));
    files.set(url, p);
  }
  return p;
};
export type Text = { head: string; paras: string[] };
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

/** a movable day's troparia and kontakia (ჟამნი 25, utils/triodion) */
const movableTexts = async (e: number): Promise<{ tr: Text[]; ko: Text[] }> => {
  const src = triodionSrc(e);
  if (!src) return { tr: [], ko: [] };
  const f = await loadBook(src.coll, src.n);
  const { tr, ko } = splitHymns(sliceOf(f.c[src.part]?.s ?? [], src));
  const T = (xs: Section[]) => xs.map(([head, paras]) => ({ head, paras }));
  return { tr: T(tr), ko: T(ko) };
};
/** a fixed feast's own troparion and kontakion (its old-style day in ჟამნი's month — the first of each) */
const feastTexts = async (md: string): Promise<{ tr: Text[]; ko: Text[] }> => {
  const all = await saintTexts(Number(md.slice(0, 2)), Number(md.slice(3, 5)));
  // the book names the Transfiguration's troparion „კონდაკი“ too: no troparion and two kontakia — the first is the troparion
  if (!all.tr.length && all.ko.length >= 2) return { tr: [{ ...all.ko[0], head: 'ტროპარი' }], ko: all.ko.slice(1, 2) };
  return { tr: all.tr.slice(0, 1), ko: all.ko.slice(0, 1) };
};

/** a source's sections as texts (utils/serviceTexts) */
export const loadSlice = async (src: TextSrc): Promise<Text[]> => {
  const f = await loadBook(src.coll, src.n);
  return sliceOf(f.c[src.part]?.s ?? [], src).map(([head, paras]) => ({ head, paras }));
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

const HymnRow: React.FC<{ h: Hymn; texts?: Text[]; shown?: boolean }> = ({ h, texts, shown }) => {
  const [open, setOpen] = useState(!!shown);
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
      {texts && !has && (
        <p className="px-3.5 pb-2.5 -mt-1 text-[13px] leading-snug text-[#8a7a6a] text-pretty">
          {h.role === 'saint' ? 'საკუთარი ტექსტი ჟამნში არ აქვს — იკითხება საზიარო, წმიდანის დასის მიხედვით (თვენი)' : 'ტექსტი აპში ჯერ არ არის'}
        </p>
      )}
      {open && texts && <div className="px-4 pb-3.5 sg-in font-serif-ge">{texts.map((t, i) => <TextBlock key={i} t={t} />)}</div>}
    </li>
  );
};

/** a service's troparia and kontakia with their texts as they load (the old page's Troparia and the new look's) */
export const useTroparia = (today: DayInput, at: 'vespers' | 'matins' | 'hours' | 'liturgy', prev?: boolean) => {
  // the ninth hour still belongs to the day before: its saint's troparion and kontakion
  const inp = useMemo(() => (prev ? { ...today, iso: addDays(today.iso, -1), day: null } : today), [today, prev]);
  const { troparia, kontakia } = useMemo(() => hymnsOf(inp, at), [inp, at]);
  const [saint, setSaint] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const [temple, setTemple] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const [week, setWeek] = useState<{ tr: Text[]; ko: Text[] } | null>(null);
  const [res, setRes] = useState<Text[] | null>(null);
  const [own, setOwn] = useState<Record<string, { tr: Text[]; ko: Text[] }>>({});
  const dow = fromIso(inp.iso).getDay();
  // the movable days' and the fixed feasts' own hymns (stage 4): load each source once
  const keyOf = (h: Hymn) => (h.e !== undefined ? `e${h.e}` : h.md ? `m${h.md}` : '');
  const ownKeys = [...troparia, ...kontakia].map(keyOf).filter(Boolean);
  const ownSig = [...new Set(ownKeys)].join(',');
  useEffect(() => {
    let alive = true;
    for (const k of ownSig ? ownSig.split(',') : []) {
      (k[0] === 'e' ? movableTexts(Number(k.slice(1))) : feastTexts(k.slice(1))).then(v => alive && setOwn(o => ({ ...o, [k]: v })), () => {});
    }
    return () => { alive = false; };
  }, [ownSig]);
  useEffect(() => {
    let alive = true;
    const r = octoechos(inp.tone, 6, 'troparion');
    if (r) loadSlice(r).then(v => alive && setRes(v), () => {});
    const o = oldMD(inp.iso);
    saintTexts(o.month, o.day).then(v => alive && setSaint(v), () => {});
    weekdayTexts(dow).then(v => alive && setWeek(v), () => {});
    const p = inp.patron;
    if (p?.md) { const t = oldMD(patronDay(p, inp.iso)); saintTexts(t.month, t.day).then(v => alive && setTemple(onlyTemple(p, v)), () => {}); }
    else setTemple(null);
    return () => { alive = false; };
  }, [inp.iso, inp.patron, inp.tone, dow]);
  // „აწდა“ after the last troparion: the resurrection's dismissal hymn to the Theotokos in that troparion's tone
  // (პარაკლიტონი, Saturday evening: the section after the troparion; tone 8 prints it as the section's second paragraph)
  const baseText = (h: Hymn, k: 'tr' | 'ko') =>
    keyOf(h) ? own[keyOf(h)]?.[k] : h.role === 'saint' ? saint?.[k] : h.role === 'temple' ? temple?.[k] : h.role === 'day' ? week?.[k] : h.role === 'feast' ? saint?.[k] : h.role === 'resurrection' && k === 'tr' ? res ?? undefined : undefined;
  const theoAt = troparia.findIndex(h => h.role === 'theotokion' && /აღდგომის განსატევებელი/.test(h.label));
  const before = theoAt > 0 ? troparia[theoAt - 1] : null;
  const beforeHead = before ? baseText(before, 'tr')?.slice(-1)[0]?.head ?? '' : '';
  const theoTone = !before ? null : before.role === 'resurrection' ? inp.tone : Number(beforeHead.match(/ხმა\s*(\d)/)?.[1] ?? 0) || null;
  const [theo, setTheo] = useState<Text[] | undefined>(undefined);
  useEffect(() => {
    setTheo(undefined);
    const r = octoechos(theoTone, 6, 'troparion');
    if (!r) return;
    let alive = true;
    loadSlice(r).then(v => {
      if (!alive) return;
      const rest = v.slice(1);
      const second = v[0]?.paras.slice(1) ?? [];
      const found = rest.length ? rest : second.length ? [{ head: '', paras: second }] : [];
      setTheo(found.map(t => ({ head: `ღვთისმშობლისა, ხმა ${theoTone}`, paras: t.paras })));
    }, () => {});
    return () => { alive = false; };
  }, [theoTone]);
  const textOf = (h: Hymn, k: 'tr' | 'ko') => (h.role === 'theotokion' ? (k === 'tr' ? theo : undefined) : baseText(h, k));
  return { troparia, kontakia, textOf };
};

const Troparia: React.FC<{ inp: DayInput; at: 'vespers' | 'matins' | 'hours' | 'liturgy'; only?: 'tr' | 'ko'; prev?: boolean; shown?: boolean }> = ({ inp, at, only, prev, shown }) => {
  const { troparia, kontakia, textOf } = useTroparia(inp, at, prev);
  return (
    <div className="mt-2.5 space-y-3 sg-in">
      {only !== 'ko' && <div>
        <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{troparia.length > 1 ? 'ტროპარნი' : 'ტროპარი'}</p>
        <ul className="mt-1 space-y-1.5">{troparia.map((h, i) => <HymnRow key={`${i}-${!!textOf(h, 'tr')?.length}`} h={h} texts={textOf(h, 'tr')} shown={shown} />)}</ul>
      </div>}
      {only !== 'tr' && kontakia.length > 0 && (
        <div>
          <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{kontakia.length > 1 ? 'კონდაკნი' : 'კონდაკი'}</p>
          <ul className="mt-1 space-y-1.5">{kontakia.map((h, i) => <HymnRow key={`${i}-${!!textOf(h, 'ko')?.length}`} h={h} texts={textOf(h, 'ko')} shown={shown} />)}</ul>
        </div>
      )}
    </div>
  );
};

const StepExtras: React.FC<{ step: Step; inp: DayInput; onTone: () => void }> = ({ step, inp, onTone }) => {
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
    else if (x.kind === 'book') buttons.push(
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
      if (showHymns) blocks.push(<Troparia key={`t${i}`} inp={inp} at={x.at} />);
    } else if (x.kind === 'text') {
      const id = 1000 + i;
      buttons.push(
        <button key={i} type="button" aria-expanded={open === id} onClick={() => { triggerHaptic(8); setOpen(o => (o === id ? null : id)); }}
          className={`${CHIP} ${open === id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028]'}`}>
          <ScrollText className="w-4 h-4" />{x.label}<ChevronDown className={`w-4 h-4 transition-transform ${open === id ? 'rotate-180' : ''}`} />
        </button>);
      if (open === id) blocks.push(<SliceText key={`x${i}`} src={x.src} />);
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

const SliceText: React.FC<{ src: TextSrc }> = ({ src }) => {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadSlice(src).then(v => alive && setTexts(v), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [src]);
  return (
    <div className="mt-2.5 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] px-4 py-3.5 sg-in">
      <p className="text-[12px] font-bold text-[#8a7a6a]">{src.label}</p>
      {texts ? (texts.length ? texts.map((t, i) => <TextBlock key={i} t={t} />) : <p className="mt-1 text-[14px] text-[#8a7a6a]">ამ დღისთვის წიგნში ტექსტი ვერ ვიპოვე.</p>)
        : <p className="mt-1 text-[14px] text-[#8a7a6a]">{failed ? 'ჩატვირთვა ვერ მოხერხდა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>}
    </div>
  );
};

/** a run of book sections as plain reading text: a heading is the book's own rubric or opening words */
const Sections: React.FC<{ src: TextSrc; speakers?: boolean }> = ({ src, speakers }) => {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadSlice(src).then(v => alive && setTexts(v), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [src]);
  if (!texts) return <p className="text-[14px] text-[#8a7a6a] font-sans">{failed ? 'ჩატვირთვა ვერ მოხერხდა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>;
  if (!texts.length) return <p className="text-[14px] text-[#8a7a6a] font-sans">ეს ტექსტი წიგნში ვერ ვიპოვე — გახსენი წიგნი ქვემოთ.</p>;
  return (
    <>
      {texts.map((t, i) => (
        <div key={i} className={i ? 'mt-2.5' : ''}>
          {t.head && <p className={speakers ? 'text-[12px] font-black tracking-wide text-[#a0703c] font-sans' : 'text-[14px] font-bold leading-snug text-[#a3272f]'}>{t.head}</p>}
          {t.paras.length > 0 && <div className={`${PROSE} ${t.head ? 'mt-0.5' : ''}`}>{t.paras.map((p, j) => <p key={j}>{p}</p>)}</div>}
        </div>
      ))}
    </>
  );
};

/** a kathisma of the psalter, whole (დავითნი) */
/** a kanon of დავითნი; `glory` 1 — only up to its first „დიდებაი“ (what a feast's eve sings) */
export const kathismaSrc = (n: number, glory?: number): TextSrc => glory === 1
  ? { coll: 'davitni', n, part: 0, from: /^\d/, to: /^დიდებაი/, label: `დავითნი · კანონი ${n}, პირველი დიდება` }
  : { coll: 'davitni', n, part: 0, label: `დავითნი · კანონი ${n}` };
/** a whole book (or one part of it) as texts, part by part — what a step's book pill unfolds; [] for a book of page pictures */
export const loadBookParts = async (coll: string, n: number, part?: number): Promise<{ label: string; texts: Text[] }[]> => {
  const f = await loadBook(coll, n);
  const parts = (f.c ?? []).filter((_, i) => part === undefined || i === part);
  return parts.map(p => ({ label: p.l, texts: p.s.map(([head, paras]) => ({ head, paras })) }));
};

/** the reader's text of a step, in order — the page's main line („საკითხავი რიგი“) */
const ReadFlow: React.FC<{ read: Read[]; inp: DayInput; past: boolean }> = ({ read, inp, past }) => {
  // what is already read folds away, so the place „აქ ვარ“ stays near the top
  const [open, setOpen] = useState(!past);
  useEffect(() => setOpen(!past), [past]);
  if (!open) return (
    <button type="button" onClick={() => { triggerHaptic(8); setOpen(true); }}
      className="mt-2 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028] text-[13px] font-bold cursor-pointer">
      <BookOpen className="w-4 h-4" />ტექსტის ჩვენება<ChevronDown className="w-4 h-4" />
    </button>
  );
  return (
    <div className="mt-2.5 -ml-6 rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] border-l-4 border-l-[#7a2028] px-3.5 py-3.5 space-y-3 font-serif-ge">
      {read.map((r, i) => (
        'say' in r ? <div key={i} className={PROSE}><p>{r.say}</p></div>
          : 'src' in r ? <div key={i}><Sections src={r.src} /></div>
          : 'kathisma' in r ? <div key={i}><Sections src={kathismaSrc(r.kathisma)} /></div>
          : <div key={i} className="font-sans"><Troparia inp={inp} at={r.hymns} only={r.only} prev={r.prev} shown /></div>
      ))}
    </div>
  );
};

/** the priest's and the deacon's words with the choir's answers (კონდაკი) */
const PriestText: React.FC<{ list: TextSrc[] }> = ({ list }) => (
  <div className="mt-2.5 -ml-6 rounded-2xl bg-[#f4efe7] ring-1 ring-[#ddd2c0] px-3.5 py-3.5 space-y-3 font-serif-ge">
    {list.map((src, i) => (
      <div key={i}>
        <p className="mb-1 text-[12px] font-bold text-[#8a7a6a] font-sans">{src.label}</p>
        <Sections src={src} speakers />
      </div>
    ))}
  </div>
);

export const SAT_OPTIONS: { id: TempleOrder['sat']; label: string; hint: string }[] = [
  { id: 'apart', label: 'მხოლოდ მწუხრი', hint: 'ცისკარი — კვირა დილით, წირვის წინ' },
  { id: 'vigil', label: 'მწუხრი და ცისკარი ერთად', hint: 'ლიტიისა და პურის კურთხევის გარეშე' },
  { id: 'litya', label: 'ღამისთევა ლიტიით', hint: 'მწუხრი, ლიტია, პურის კურთხევა და ცისკარი' },
];
export const WEEKDAY_OPTIONS: { id: TempleOrder['weekday']; label: string; hint: string }[] = [
  { id: 'apart', label: 'მხოლოდ მწუხრი', hint: 'ცისკარი — დილით, წირვის წინ' },
  { id: 'joined', label: 'მწუხრი და ცისკარი ერთად', hint: 'ორივე საღამოს' },
];
const OrderSheet: React.FC<{ open: boolean; value: TempleOrder; onPick: (o: TempleOrder) => void; onClose: () => void }> = ({ open, value, onPick, onClose }) => {
  const Group = <K extends 'sat' | 'weekday'>({ k, title, items }: { k: K; title: string; items: { id: TempleOrder[K]; label: string; hint: string }[] }) => (
    <section className="mt-4 first:mt-0">
      <p className="text-[12px] font-black uppercase tracking-wide text-[#a0703c]">{title}</p>
      <ul className="mt-1.5 space-y-2">
        {items.map(o => {
          const on = value[k] === o.id;
          return (
            <li key={o.id}>
              <button type="button" aria-pressed={on} onClick={() => { triggerHaptic(10); onPick({ ...value, [k]: o.id }); }}
                className={`w-full min-h-14 px-4 py-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-[#2a2017]'}`}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-bold leading-snug">{o.label}</span>
                  <span className={`block text-[13px] leading-snug ${on ? 'text-[#fbf6ec]/80' : 'text-[#8a7a6a]'}`}>{o.hint}</span>
                </span>
                {on && <Check className="w-5 h-5 shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
  return (
    <Sheet open={open} onClose={onClose} title="ჩემი ტაძრის წესი">
      <p className="text-[14px] leading-relaxed text-[#6b5c4d] text-pretty">ყველა ტაძარში ერთნაირად არ მსახურობენ. აირჩიე, როგორ არის შენთან — რიგი ამის მიხედვით აეწყობა.</p>
      <div className="mt-3">
        {Group({ k: 'sat', title: 'შაბათ საღამოს და დიდი დღესასწაულის წინ', items: SAT_OPTIONS })}
        {Group({ k: 'weekday', title: 'სადაგი დღის საღამოს', items: WEEKDAY_OPTIONS })}
      </div>
    </Sheet>
  );
};

const CHANTS = new Map(SERVICE_LISTS.flatMap(([, list]) => list.map(c => [c.id, c] as const)));
/** a step's chants with their versions that have notes; a step sung in the week's tone shows that tone's first */
export const notesRowsOf = (step: Step | null, tone: number | null) =>
  (step?.chants ?? []).map(id => CHANTS.get(id)).filter(Boolean).map(c => {
    const all = c!.variants.filter(hasBookNotes);
    const inTone = step?.toned && tone ? all.filter(v => versionTone(v.version) === tone) : [];
    return { id: c!.id, title: c!.title.replace(/;\s*$/, ''), versions: (inTone.length ? inTone : all).slice(0, 12), more: (inTone.length ? inTone : all).length - 12, inTone: inTone.length > 0,
      /** the chant as the chant page shows it (a step sung in the week's tone: that tone's versions only) */
      chant: inTone.length ? { ...c!, variants: inTone } : c! };
  }).filter(r => r.versions.length);
const NotesSheet: React.FC<{ step: Step | null; tone: number | null; onClose: () => void }> = ({ step, tone, onClose }) => {
  const { openNotes } = useNotes();
  const rows = notesRowsOf(step, tone);
  const open = (vid: string) => { triggerHaptic(10); onClose(); openNotes(vid, 'bookmark'); };
  return (
    <Sheet open={!!step} onClose={onClose} title={step ? `ნოტები · ${step.title.replace(/[„“]/g, '')}` : ''}>
      {rows.length ? rows.map(r => (
        <section key={r.id} className="mb-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
          <p className="text-[15px] font-bold leading-snug text-[#2a2017]">{r.title}</p>
          {r.inTone && tone && <p className="text-[12px] font-bold text-[#a0703c]">{toneName(tone)}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {r.versions.map(v => (
              <button key={v.id} type="button" onClick={() => open(v.id)}
                className="inline-flex items-center gap-1.5 min-h-10 py-2 px-3.5 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.13] text-[#7a2028] text-[13px] font-bold text-left leading-snug cursor-pointer transition active:scale-[0.97]">
                <Music className="w-4 h-4 shrink-0" />{bookOf(v)}{v.bookNums?.[0] ? ` №${v.bookNums[0]}` : ''}
              </button>
            ))}
          </div>
          {r.more > 0 && <p className="mt-2 text-[13px] text-[#8a7a6a]">და კიდევ {r.more} — „გალობის“ ჩანართში</p>}
        </section>
      )) : <p className="text-[14px] text-[#8a7a6a]">ამ ნაწილის ნოტები ჯერ არ არის.</p>}
    </Sheet>
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

export type Found = { name: string; iso: string };
export const KIND_HEAD: Record<Patron['kind'], string> = { lord: 'უფლის დღესასწაულები', theotokos: 'ღვთისმშობლის დღესასწაულები', saint: 'წმიდანები' };
/** the temple picker's search: the presets by name, then the calendar's saints once three letters are typed */
export const usePatronSearch = (open: boolean) => {
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
  return { q, setQ, all, needle, presets, found };
};
/** a calendar find as a temple */
export const foundPatron = (f: Found): Patron => ({ name: f.name.replace(/\s*\([^)]*\)\s*[*;.]*\s*$/, '').replace(/[;*]+$/, ''), kind: 'saint', md: f.iso.slice(5) });
/** when the temple's day comes, in words */
export const patronWhen = (p: Patron) => (p.md ? dayMonthGe(`2026-${p.md}`) : p.easter === 0 ? 'გარდამავალი დღესასწაული' : `აღდგომიდან ${p.easter}-ე დღე`);
const PatronSheet: React.FC<{ open: boolean; value: Patron | null; onPick: (p: Patron | null) => void; onClose: () => void }> = ({ open, value, onPick, onClose }) => {
  const { q, setQ, all, needle, presets, found } = usePatronSearch(open);
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
  const when = patronWhen;
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
            {found.map(f => <Row key={f.iso + f.name} p={foundPatron(f)} sub={dayMonthGe(f.iso)} />)}
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
  { id: 'vespers', label: 'მწუხრი' }, { id: 'compline', label: 'სერობა' }, { id: 'matins', label: 'ცისკარი' }, { id: 'hours', label: 'ჟამები' }, { id: 'liturgy', label: 'წირვა' },
];
/** the day as the fast sees it: a great feast, the temple's own day — a saint's day relaxes a fast only by ჟამნი's mark
 *  (utils/fasting), not by the rank picked here */
const weightOf = (rank: Rank, temple: boolean): FeastWeight => (rank === 'great' ? 'great' : temple ? 'vigil' : 'none');
const FOOD_TONE: Record<string, string> = {
  free: 'bg-emerald-50 ring-emerald-200 text-emerald-900', meatless: 'bg-emerald-50 ring-emerald-200 text-emerald-900',
  fish: 'bg-sky-50 ring-sky-200 text-sky-900', oil: 'bg-[#fdf4e3] ring-[#e9c98f] text-[#4a3826]',
  dry: 'bg-[#f6ece6] ring-[#e3c8bb] text-[#5a2d22]', strict: 'bg-[#f6ece6] ring-[#e3c8bb] text-[#5a2d22]', none: 'bg-[#f6ece6] ring-[#e3c8bb] text-[#5a2d22]',
};

/** A day as the services need it: its calendar (the Sunday's too, for the tone, and the day before's), the rank — picked or
 *  guessed —, the temple and its order. */
const useDayInput = (iso: string, on: boolean, ranks: Record<string, string>, patron: Patron | null, order: TempleOrder) => {
  const day = useCalendarDay(on ? iso : null);
  const lastSunday = addDays(iso, -fromIso(iso).getDay());
  const sundayDay = useCalendarDay(on && lastSunday !== iso ? lastSunday : null);
  // the day before: in Lent its calendar names the readings of the evening's vespers and whether a liturgy was joined to them
  const prevDay = useCalendarDay(on ? addDays(iso, -1) : null);
  const guessed = guessRank(iso, day ?? null, patron);
  const rank = (RANKS.some(r => r.id === ranks[iso]) ? ranks[iso] : guessed) as Rank;
  const tone = weekTone(day ?? null, lastSunday === iso ? null : sundayDay ?? null);
  const inp: DayInput = useMemo(() => ({ iso, day: day ?? null, prev: prevDay ?? null, tone, rank, patron, order }), [iso, day, prevDay, tone, rank, patron, order]);
  // everything it reads has arrived (a day the calendar does not hold counts too — null)
  const ready = on && day !== undefined && prevDay !== undefined && (lastSunday === iso || sundayDay !== undefined);
  return { day, guessed, rank, tone, inp, ready };
};

// ---------- without internet ----------
const savedNow = new Set<string>();
/** Asks once for every file a day's services read (utils/dayOffline): the service worker keeps what was fetched, so the day
 *  opens in a church with no internet. Once a day and a setting on this device; a file that failed is asked again next time. */
const saveDayTexts = async (inp: DayInput) => {
  let files: string[];
  const sig = daySignature(inp);
  if (savedNow.has(sig) || readMap(SAVED_KEY)[inp.iso] === sig) return;
  try { files = dayFiles(inp); } catch { return; }
  savedNow.add(sig);
  // a file the phone already keeps is not asked for again (most of a day's files are yesterday's too)
  const kept = async (url: string) => { try { return !!(await caches.match(url)); } catch { return false; } };
  const got = await Promise.allSettled(files.map(async url => {
    if (await kept(url)) return;
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    // the worker has kept the whole answer by now — the page itself does not need it
    await r.body?.cancel().catch(() => {});
  }));
  if (got.every(g => g.status === 'fulfilled')) writeMap(SAVED_KEY, { ...readMap(SAVED_KEY), [inp.iso]: sig }, 6);
  else savedNow.delete(sig);
};
/** today's and tomorrow's texts are saved by themselves a moment after the reader's page opens (not on a data-saving phone) */
const useDaySaver = (on: boolean, today: string, ranks: Record<string, string>, patron: Patron | null, order: TempleOrder) => {
  const a = useDayInput(today, on, ranks, patron, order);
  const b = useDayInput(addDays(today, 1), on, ranks, patron, order);
  useEffect(() => {
    if (!a.ready || !b.ready) return;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (nav.onLine === false || nav.connection?.saveData) return;
    const t = setTimeout(() => { void saveDayTexts(a.inp).then(() => saveDayTexts(b.inp)); }, 2500);
    return () => clearTimeout(t);
  }, [a.ready, b.ready, a.inp, b.inp]);
};

/** „ახლა“: the church day and the part of it served at this hour of the phone's clock (utils/dayService nowPart) */
const readNow = (today: string) => { const hour = new Date().getHours(); return { ...nowPart(today, hour), hour }; };

/** The day service's whole state and rules — the old page below and the new look's screen (pages/v2/medavitne) draw it. */
export const useDayService = () => {
  const canCal = useMembership().can('calendar');
  const today = useMemo(todayIso, []);
  // the page opens by itself on what is served now: in the evening on the next day's vespers, in the morning on the day's own
  const start = useMemo(() => readNow(today), [today]);
  const [iso, setIso] = useState(start.iso);
  const { patron, save: savePatron } = useTemplePatron();
  const [ranks, setRanks] = useState(() => readMap(RANK_KEY));
  const [ats, setAts] = useState(() => readMap(AT_KEY));
  // the service the reader chose; none yet — the one served now
  const [picked, setPicked] = useState<ServiceId | null>(null);
  const [sheet, setSheet] = useState<'rank' | 'patron' | 'order' | null>(null);
  const [order, setOrder] = useState(readOrder);
  const [priestOn, setPriestOn] = useState(() => readFlag(PRIEST_KEY));
  const [oldOn, setOldOn] = useState(() => readFlag(OLD_KEY));
  const [awakeOn, setAwakeOn] = useState(() => readOn(AWAKE_KEY));
  const [flowEl, setFlowEl] = useState<HTMLElement | null>(null);
  useKhutsuri(flowEl, oldOn);
  // the phone lies on the lectern between the reader's parts: the screen stays on while this page is open
  useScreenAwake(canCal && awakeOn);
  const { day, guessed, rank, tone, inp } = useDayInput(iso, canCal, ranks, patron, order);
  useDaySaver(canCal, today, ranks, patron, order);
  const [toneOpen, setToneOpen] = useState<number | null>(null);
  const [notesOf, setNotesOf] = useState<Step | null>(null);

  const services = useMemo(() => buildServices(inp), [inp]);
  const tabs = SERVICE_TABS.filter(t => services.some(s => s.id === t.id));
  const nowId = iso === start.iso ? serviceNow(services, start.part, start.hour, id => ats[`${iso}|${id}`] !== undefined) : null;
  const service = services.find(s => s.id === (picked ?? nowId)) ?? services[0];
  const tab = service.id;
  /** this service of this day is the one served now */
  const isNow = nowId !== null && service.id === nowId;
  const after = serviceAfter(services, service.id);
  const great = greatFeastOf(iso);
  const period = periodOf(iso);
  // Holy Week and Bright Week have each day's own order: a rank changes nothing there
  const ownOrder = seasonOf(iso).holyWeek || seasonOf(iso).bright;
  const templeDay = !!patron && patronDay(patron, iso) === iso;
  const food = foodOf(iso, weightOf(rank, templeDay), day ? dayText(day) : '');
  const title = day?.t.replace(/\s*ხმა\s+[IVX]+\.?\s*$/, '').replace(/\.\s*$/, '');
  const saints = (day?.s ?? []).slice(0, 3);
  const atKey = `${iso}|${tab}`;
  const at = ats[atKey] !== undefined ? Number(ats[atKey]) : -1;

  // another day keeps the service the reader is on
  const move = (n: number) => { triggerHaptic(8); setPicked(p => p ?? service.id); setIso(d => addDays(d, n)); };
  const goNow = () => { triggerHaptic(8); setPicked(null); setIso(start.iso); };
  const setRank = (r: Rank | null) => {
    const next = { ...ranks };
    if (r) next[iso] = r; else delete next[iso];
    setRanks(next); writeMap(RANK_KEY, next);
  };
  const saveOrder = (o: TempleOrder) => { setOrder(o); try { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); } catch { /* private window */ } };
  const shown = service.steps.map((s, i) => ({ s, i })).filter(x => priestOn || !x.s.priest);
  const mark = (i: number) => {
    triggerHaptic(10);
    const next = { ...ats };
    if (at === i) delete next[atKey]; else next[atKey] = String(i);
    setAts(next); writeMap(AT_KEY, next, 30);
  };
  // the place is put on a step (the newest mark goes last: the store keeps the latest thirty)
  const place = (id: ServiceId, i: number) => {
    const key = `${iso}|${id}`;
    const next = { ...ats };
    delete next[key];
    next[key] = String(i);
    setAts(next); writeMap(AT_KEY, next, 30);
  };
  /** „შემდეგი“: the place moves to this step */
  const goStep = (i: number) => place(service.id, i);
  /** „შემდეგი მსახურება“: its tab opens, the place on its first step (a place already kept there stays); gives that step */
  const startService = (id: ServiceId): number => {
    const sv = services.find(s => s.id === id);
    if (!sv) return -1;
    setPicked(id);
    const kept = ats[`${iso}|${id}`];
    if (kept !== undefined) return Number(kept);
    const first = sv.steps.findIndex(s => priestOn || !s.priest);
    if (first >= 0) place(id, first);
    return first;
  };
  const flipPriest = () => { const v = !priestOn; setPriestOn(v); writeFlag(PRIEST_KEY, v); };
  const flipOld = () => { const v = !oldOn; setOldOn(v); writeFlag(OLD_KEY, v); };
  const flipAwake = () => { const v = !awakeOn; setAwakeOn(v); writeFlag(AWAKE_KEY, v); };

  return {
    canCal, today, iso, setIso, day, tone, rank, guessed, ownOrder, inp, services, tabs, service, setTab: setPicked, great, period, templeDay, food, title,
    saints, at, mark, move, setRank, order, saveOrder, patron, savePatron, priestOn, flipPriest, oldOn, flipOld, setFlowEl, sheet, setSheet,
    toneOpen, setToneOpen, notesOf, setNotesOf, shown, tab, awakeOn, flipAwake, canAwake: canKeepAwake(),
    nowIso: start.iso, isNow, nowWord: isNow ? nowWord(start.part, service.slot) : null, goNow, goStep, after, startService,
  };
};
export type DayServiceState = ReturnType<typeof useDayService>;

export const DayService: React.FC = () => {
  const {
    canCal, iso, day, tone, rank, guessed, ownOrder, inp, tabs, service, setTab, great, period, templeDay, food, title,
    saints, at, mark, move, setRank, order, saveOrder, patron, savePatron, priestOn, flipPriest, oldOn, flipOld, setFlowEl, sheet, setSheet,
    toneOpen, setToneOpen, notesOf, setNotesOf, shown, tab, nowIso, goNow,
  } = useDayService();

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
            <p className="text-[13px] font-semibold text-[#8a7a6a]">ძვ. სტ. {oldDayMonthGe(iso)}{iso !== nowIso && <> · <button type="button" onClick={goNow} className="font-bold text-[#7a2028] underline underline-offset-2 cursor-pointer">ახლა</button></>}</p>
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

        {/* the day's food (the Typikon's rule; the calendar's own words when it has them) */}
        <div className={`mt-3 rounded-2xl ring-1 px-3.5 py-2.5 ${FOOD_TONE[food.food]}`}>
          <p className="text-[12px] font-black uppercase tracking-wide opacity-75">დღის საზრდო{food.why ? ` · ${food.why}` : ''}</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-pretty">{food.cal ? `${food.cal.replace(/\.$/, '')} — კალენდრით` : food.label}</p>
          {(food.extra || food.cal) && <p className="mt-0.5 text-[13px] font-semibold leading-snug opacity-80 text-pretty">{food.cal ? `ტიბიკონით: ${food.label.toLowerCase()}` : food.extra}</p>}
        </div>

        {/* tone · rank · temple */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" disabled={!tone} onClick={() => { triggerHaptic(8); setToneOpen(tone); }}
            className="min-h-14 px-3 py-2 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] disabled:opacity-60 text-[#fbf6ec] text-left cursor-pointer transition active:scale-[0.98]">
            <span className="block text-[12px] font-bold text-[#fbf6ec]/75">კვირის ხმა</span>
            <span className="flex items-center gap-1.5 text-[16px] font-bold">{tone ? toneName(tone) : '—'}{tone && <Music className="w-4 h-4" />}</span>
          </button>
          <button type="button" disabled={ownOrder} onClick={() => { triggerHaptic(8); setSheet('rank'); }}
            className="min-h-14 px-3 py-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 text-left cursor-pointer disabled:cursor-default transition active:scale-[0.98]">
            <span className="block text-[12px] font-bold text-[#a0703c]">რანგი{!ownOrder && rank !== guessed && ' · შენი'}</span>
            <span className="flex items-center gap-1 text-[16px] font-bold text-[#2a2017]">{ownOrder ? 'საკუთარი წესი' : rankLabel(rank)}{!ownOrder && <ChevronDown className="w-4 h-4 text-[#8a7a6a]" />}</span>
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
        <button type="button" onClick={() => { triggerHaptic(8); setSheet('order'); }}
          className="mt-2 w-full min-h-13 px-3.5 py-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/30 flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99]">
          <Settings2 className="w-5 h-5 shrink-0 text-[#a0703c]" />
          <span className="flex-1 min-w-0">
            <span className="block text-[12px] font-bold text-[#a0703c]">ჩემი ტაძრის წესი</span>
            <span className="block text-[14px] font-bold leading-snug text-[#2a2017]">შაბათ საღამოს — {SAT_OPTIONS.find(o => o.id === order.sat)!.label.toLowerCase()}</span>
            <span className="block text-[14px] font-bold leading-snug text-[#2a2017]">სადაგ დღეს — {WEEKDAY_OPTIONS.find(o => o.id === order.weekday)!.label.toLowerCase()}</span>
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
              {period === 'triodion' ? 'ტრიოდის პერიოდია — მარხვის წესი გათვალისწინებულია.' : 'ზატიკის პერიოდია — აღდგომის წესი გათვალისწინებულია.'} ტრიოდის ტექსტები წიგნებში ნაკლებადაა — გადაამოწმე რეგენტთან.
            </p>
          </div>
        )}
      </section>

      {/* the services */}
      <Tabs cols={tabs.length as 4 | 5} stack items={tabs} value={service.id} onChange={setTab} />

      <section className={`${CARD} p-4 sm:p-5`}>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif-ge text-[20px] font-bold text-[#2a2017]">{service.title}</h3>
          <p className="text-[13px] font-bold text-[#a0703c]">{service.when}</p>
        </div>
        {service.note && <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[#7a2028] text-pretty">{service.note}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([['მღვდლის ტექსტები', priestOn, flipPriest], ['ხუცური', oldOn, flipOld]] as const).map(([label, on, flip]) => (
            <button key={label} type="button" role="switch" aria-checked={on} onClick={() => { triggerHaptic(8); flip(); }}
              className={`min-h-12 px-3 rounded-2xl flex items-center justify-between gap-2 text-left text-[14px] font-bold leading-tight cursor-pointer transition active:scale-[0.98] ${on ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
              <span>{label}</span>
              <span className={`relative w-10 h-6 shrink-0 rounded-full transition ${on ? 'bg-[#fbf6ec]/30' : 'bg-[#d9ccb8]'}`} aria-hidden>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] leading-snug text-[#8a7a6a] text-pretty">{priestOn ? 'ჩანს მღვდლისა და დიაკვნის სიტყვებიც.' : 'ჩანს მხოლოდ ის, რაც მედავითნეს და გუნდს ეხება.'} ნომერს დააჭირე — მოინიშნება, სად ხარ.</p>
        <ol key={`${oldOn}`} ref={setFlowEl} className="mt-3.5 font-sans">
          {shown.map(({ s, i }, n) => {
            const here = at === i;
            const past = at > i;
            return (
              <li key={`${tab}-${i}`} className="relative pl-12 pb-4 last:pb-0">
                {n < shown.length - 1 && <span className={`absolute left-[19px] top-11 bottom-0 w-0.5 ${past || here ? 'bg-[#7a2028]/40' : 'bg-[#efe5d4]'}`} aria-hidden />}
                <button type="button" onClick={() => mark(i)} aria-pressed={here} aria-label={`${n + 1} — აქ ვარ`}
                  className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-black cursor-pointer transition active:scale-[0.94] ${
                    here ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_0_0_5px_rgba(122,32,40,0.14)]'
                      : past ? 'bg-[#7a2028]/15 text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#8a7a6a]'
                  }`}>
                  {past ? <Check className="w-4 h-4" /> : n + 1}
                </button>
                <div className={`min-h-10 pt-1.5 ${here ? '' : ''}`}>
                  <p className={`text-[16px] font-bold leading-snug ${here ? 'text-[#7a2028]' : 'text-[#2a2017]'}`}>{s.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <WhoPills who={s.who} />
                    {s.chants?.length ? (
                      <button type="button" onClick={() => { triggerHaptic(8); setNotesOf(s); }} aria-label={`${s.title} — ნოტები`}
                        className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full ring-1 ring-[#a0703c]/40 text-[#7a4f20] text-[12px] font-bold cursor-pointer hover:bg-[#a0703c]/10 transition active:scale-[0.96]">
                        <Music className="w-3.5 h-3.5" />ნოტები
                      </button>
                    ) : null}
                  </div>
                  {s.note && <p className="mt-1.5 text-[14px] font-semibold leading-snug text-[#7a2028] text-pretty">{s.note}</p>}
                  {s.hint && <p className="mt-1 text-[13px] leading-snug text-[#8a7a6a] text-pretty">{s.hint}</p>}
                  {s.read && <ReadFlow read={s.read} inp={inp} past={past} />}
                  {priestOn && s.pt && <PriestText list={s.pt} />}
                  <StepExtras step={s} inp={inp} onTone={() => setToneOpen(tone)} />
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
      <OrderSheet open={sheet === 'order'} value={order} onPick={saveOrder} onClose={() => setSheet(null)} />
      <PatronSheet open={sheet === 'patron'} value={patron} onPick={savePatron} onClose={() => setSheet(null)} />
      <ToneSheet tone={toneOpen} onClose={() => setToneOpen(null)} />
      <NotesSheet step={notesOf} tone={tone} onClose={() => setNotesOf(null)} />
    </div>
  );
};

/** The way in, on top of the reader's side: the service served now (utils/dayService serviceNow) with its church day's tone
 *  and rank — in the evening that day is tomorrow's. Null without the calendar feature. */
export const useDayBrief = () => {
  const canCal = useMembership().can('calendar');
  const [today] = useState(todayIso);
  const [start] = useState(() => readNow(today));
  const iso = start.iso;
  const { patron } = useTemplePatron();
  const ranks = readMap(RANK_KEY);
  const [order] = useState(readOrder);
  const { rank, tone, inp, ready } = useDayInput(iso, canCal, ranks, patron, order);
  useDaySaver(canCal, today, ranks, patron, order);
  const now = useMemo(() => {
    if (!ready) return null;
    const services = buildServices(inp);
    const ats = readMap(AT_KEY);
    const s = services.find(x => x.id === serviceNow(services, start.part, start.hour, id => ats[`${iso}|${id}`] !== undefined));
    return s ? { title: s.title, word: nowWord(start.part, s.slot) } : null;
  }, [ready, inp, start, iso]);
  if (!canCal) return null;
  // Holy Week and Bright Week have each day's own order — no rank to name
  return { today, iso, rank, tone, great: greatFeastOf(iso), ownOrder: seasonOf(iso).holyWeek || seasonOf(iso).bright, now };
};

export const DayServiceButton: React.FC = () => {
  const { openMapItem } = useNavigation();
  const brief = useDayBrief();
  if (!brief) return null;
  const { iso, rank, tone, great, ownOrder } = brief;
  return (
    <div className="w-full max-w-2xl mx-auto px-1">
      <button type="button" onClick={() => { triggerHaptic(10); openMapItem('day'); }}
        className="w-full min-h-[76px] px-4 py-3 rounded-3xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] flex items-center gap-3.5 text-left cursor-pointer transition active:scale-[0.99] shadow-[0_10px_24px_-14px_rgba(122,32,40,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0703c]">
        <span className="w-12 h-12 rounded-2xl bg-[#fbf6ec]/12 flex items-center justify-center shrink-0"><CalendarDays className="w-6 h-6" /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-[17px] font-bold leading-snug">დღის მსახურება</span>
          <span className="block mt-0.5 text-[13px] font-semibold leading-snug text-[#fbf6ec]/80 text-pretty">
            {dayMonthGe(iso)}{great ? ` · ${great.name}` : ''}{tone ? ` · ${toneName(tone)}` : ''}{ownOrder ? '' : ` · ${rankLabel(rank)}`}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0" />
      </button>
    </div>
  );
};
