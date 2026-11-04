import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lightbulb, MessageCircle, Share2, Shuffle, X } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { UTSKHO_PLACES, utskhoPlace } from '../../../data/utskhoPlaces';
import {
  ANSWERS, HINTS, HINT_CUT, MAX_WRONG, START_POINTS, dayDeal, freeDeal, soloDeal, soloOver, soloStars, soloStep, soloView,
  utskhoDay, utskhoShare, type USolo, type USoloView,
} from '../../../utils/utskho';
import { mulberry32 } from '../../../utils/otkheuli';
import { dayNumber, hangiStats, hash32, tbilisiToday, type HangiDay } from '../../../utils/hangi';
import { MONTHS_GE } from '../../../utils/dateNames';
import { Btn, Card, Stat, askConfirm } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { Answers, PlaceBadge, PlaceGrid, PlaceTile, Stars, StrangerIcon, type PlaceLook } from './parts';
import { Steps } from '../../../components/games/HowTo';

// „უცხო სოფელში“ alone (the hub's „ონლაინ“, 2026-11-01): I am the stranger. The villagers' answers come one by one („რა
// სუნია?“ — „ცოტა მჟავე…“); I find the place on a board of 25. Ten points: an answer more −1, a hint (four places crossed
// out) −1, a wrong guess −2, three wrong guesses lose. One place a day for the whole school (`useDailyRecord('utskho')`, the
// steps kept after each), then free games (`sg-utskho-free`).

const FREE_KEY = 'sg-utskho-free';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

/** the day's game as the record left it (a record of another place, from before a change of the list, goes on with it) */
const dayFrom = (iso: string, record: HangiDay | undefined): { d: USolo; acts: string[] } => {
  const d = dayDeal(iso, UTSKHO_PLACES);
  if (!record) return { d, acts: [] };
  if (record.id === d.place) return { d, acts: record.guesses };
  if (!utskhoPlace(record.id)) return { d, acts: [] };
  return { d: soloDeal(record.id, UTSKHO_PLACES, mulberry32(hash32(`utskho-board|${iso}`))), acts: record.guesses };
};

const Misses: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex items-center gap-1" aria-label={`შეცდომა ${n} ${MAX_WRONG}-დან`}>
    {Array.from({ length: MAX_WRONG }, (_, i) => (
      <span key={i} className={`w-3 h-3 rounded-full ${i < MAX_WRONG - n ? 'bg-[#7a2028]' : 'bg-[#e6dccb]'}`} />
    ))}
  </span>
);

const verdictOf = (v: USoloView) =>
  !v.won ? 'სამი შეცდომა — სოფლელებმა უცხო იცნეს. ხვალ ახალი ადგილია!'
  : v.points >= 9 ? 'ბრწყინვალე! თითქმის პირველივე პასუხით მიხვდი.'
  : v.points >= 7 ? 'ძალიან კარგია — ნამდვილი უცხო ხარ!'
  : v.points >= 5 ? 'კარგია! შემდეგ ჯერზე ცოტა ადრე სცადე.'
  : 'მიხვდი! ხვალ ნაკლები მინიშნებით სცადე.';

/** one game: the answers heard, the board of 25; once over, the place and its note */
const Play$: React.FC<{ d: USolo; acts: string[]; setActs: (a: string[]) => void; head: React.ReactNode; after?: React.ReactNode }> = ({ d, acts, setActs, head, after }) => {
  const v = soloView(d, acts);
  const over = soloOver(v);
  const place = utskhoPlace(d.place);
  const [flash, setFlash] = useState<string | null>(null);
  const boardKey = d.board.join(',');
  useEffect(() => { setFlash(null); }, [d.place, boardKey]);
  if (!place) return null;

  const step = (a: string) => {
    const next = soloStep(d, acts, a);
    if (next.length === acts.length) return false;
    setActs(next);
    return true;
  };
  const more = () => { if (step('a')) { setFlash(null); triggerHaptic(12); } };
  const hint = () => { if (step('h')) { setFlash(`${HINT_CUT} ადგილი წაიშალა.`); triggerHaptic(15); } };
  const guess = async (id: string) => {
    const p = utskhoPlace(id);
    if (!p || over) return;
    const ok = await askConfirm({ title: `„${p.name}“?`, text: 'შეცდომა 2 ქულა ღირს, სამი შეცდომა — წაგება.', ok: 'ვხვდები!' });
    if (!ok || !step(`g:${id}`)) return;
    if (id === d.place) { setFlash(null); triggerHaptic(30); } else { setFlash(`„${p.name}“ — არა. −2 ქულა.`); triggerHaptic(45); }
  };
  const lookOf = (id: string): PlaceLook =>
    id === d.place && v.won ? 'right'
    : id === d.place && over ? 'reveal'
    : v.wrong.includes(id) ? 'wrong'
    : v.cut.includes(id) ? 'cut'
    : over ? 'plain' : 'open';

  return (
    <div className="space-y-3">
      {head}
      {over ? (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className={`font-serif-ge text-[19px] font-bold ${v.won ? 'text-[#2f7d4f]' : 'text-[#7a2028]'}`}>{v.won ? `მიხვდი! ${v.points} ქულა` : 'ვერ მიხვდი'}</p>
            {v.won && <span className="ml-auto"><Stars n={soloStars(v)} /></span>}
          </div>
          <p className="text-[14px] leading-snug text-[#4a3426]">{verdictOf(v)}</p>
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-4 space-y-2.5">
            <div className="flex items-center gap-3">
              <PlaceBadge p={place} size="lg" tone={v.won ? 'green' : 'wine'} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-[#9a8b7b]">სოფლელები იყვნენ აქ:</p>
                <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{place.name}</p>
              </div>
            </div>
            <p className="text-[14px] leading-snug text-[#4a3426]">{place.note}</p>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-bold text-[#4a3426]">სოფლელების ყველა პასუხი</p>
            <Answers answers={place.answers} shown={v.shown} all />
          </div>
          {after}
        </Card>
      ) : (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-bold text-[#9a8b7b]">სოფლელების პასუხები · {v.shown}/{ANSWERS}</p>
            <span className="ml-auto inline-flex items-center gap-2">
              <Misses n={v.wrong.length} />
              <span className="h-7 px-2.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold inline-flex items-center tabular-nums">{v.points} ქულა</span>
            </span>
          </div>
          <Answers answers={place.answers} shown={v.shown} />
          <div className="flex flex-wrap gap-2 pt-1">
            <Btn icon={<MessageCircle />} onClick={more} disabled={v.shown >= ANSWERS} className="flex-1 min-w-[160px]">
              {v.shown >= ANSWERS ? 'პასუხები ამოიწურა' : 'კიდევ ერთი პასუხი · −1'}
            </Btn>
            <Btn kind="ghost" icon={<Lightbulb />} onClick={hint} disabled={v.hints >= HINTS} className="flex-1 min-w-[160px]">
              მინიშნება · −1 <span className="text-[12px] opacity-75">({HINTS - v.hints})</span>
            </Btn>
          </div>
          {flash && <p className="text-[13.5px] font-bold text-[#7a2028]" role="status" aria-live="polite">{flash}</p>}
        </Card>
      )}
      {!over && <p className="px-1 text-[13.5px] font-bold text-[#4a3426]">სად არიან? შეეხე ადგილს</p>}
      <PlaceGrid>
        {d.board.map(id => {
          const p = utskhoPlace(id);
          return p ? <PlaceTile key={id} p={p} look={lookOf(id)} onTap={over ? undefined : () => { void guess(id); }} /> : null;
        })}
      </PlaceGrid>
    </div>
  );
};

interface Free { seed: number; acts: string[] }
const readFree = (): Free | null => {
  const o = readJson(FREE_KEY) as Partial<Free> | null;
  return o && Number.isInteger(o.seed) && Array.isArray(o.acts) ? { seed: o.seed as number, acts: o.acts.filter((x): x is string => typeof x === 'string') } : null;
};

export const UtskhoSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('utskho');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);
  const record = days[today];
  const { d, acts } = useMemo(() => dayFrom(today, record), [today, record]);
  const setActs = (a: string[]) => save(today, utskhoDay(d, a));
  const v = soloView(d, acts);
  const over = soloOver(v);

  const [free, setFreeState] = useState<Free | null>(readFree);
  const setFree = (f: Free | null) => { setFreeState(f); writeJson(FREE_KEY, f); };
  const fd = useMemo(() => (free ? freeDeal(UTSKHO_PLACES, free.seed) : undefined), [free?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const startFree = () => { triggerHaptic(10); setFree({ seed: Math.floor(Math.random() * 2 ** 31), acts: [] }); window.scrollTo({ top: 0 }); };
  const stats = useMemo(() => hangiStats(days, today), [days, today]);

  const share = async () => {
    const msg = utskhoShare(dayNumber(today), d, acts);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  if (free && fd) {
    const fv = soloView(fd, free.acts);
    return (
      <Play$
        d={fd}
        acts={free.acts}
        setActs={a => setFree({ ...free, acts: a })}
        head={(
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">{fv.points} ქულა · არაფერი ინახება</p>
              </div>
              <button type="button" onClick={() => setFree(null)} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
                <X className="w-5 h-5" />
              </button>
            </div>
          </Card>
        )}
        after={(
          <div className="flex flex-wrap gap-2">
            <Btn icon={<Shuffle />} onClick={startFree} className="flex-1 min-w-[150px]">კიდევ ერთი</Btn>
            <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setFree(null)} className="flex-1 min-w-[150px]">დღის სოფელი</Btn>
          </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!loaded ? (
        <Card className="!p-4"><p className="text-[14px] text-[#9a8b7b]">იტვირთება…</p></Card>
      ) : (
        <Play$
          d={d}
          acts={acts}
          setActs={setActs}
          head={(
            <Card className="!p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center shrink-0"><StrangerIcon className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის სოფელი №{dayNumber(today)} · {dateLabel(today)}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
                    {over ? (v.won ? `მიხვდი · ${v.points} ქულა` : 'დღეს ვერ მიხვდი') : 'ერთი და იგივე მთელი სკოლისთვის'}
                  </p>
                </div>
              </div>
              {!acts.length && (
                <Steps steps={[
                  'შენ უცხო ხარ: სოფლელებმა იციან, სად ხართ — შენ არა.',
                  `ისინი ერთმანეთს კითხვებს უსვამენ და პასუხობენ. უსმინე და იპოვე ადგილი ამ ${d.board.length}-დან.`,
                  `გაქვს ${START_POINTS} ქულა: ყოველი ახალი პასუხი −1, მინიშნება (${HINT_CUT} ადგილს შლის) −1, შეცდომა −2.`,
                  'სამი შეცდომა — და სოფელმა გიცნო.',
                ]} />
              )}
            </Card>
          )}
          after={<Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        />
      )}

      {over && (
        <>
          <Card className="!p-4 space-y-3">
            <div>
              <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ახალი ადგილი, ახალი დაფა — რამდენჯერაც გინდა. ხვალ ახალი დღის სოფელია.</p>
            </div>
            <Btn icon={<Shuffle />} onClick={startFree} full>დაწყება</Btn>
          </Card>
          <Card className="!p-4">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={stats.played} label="ნათამაშები დღე" />
              <Stat value={stats.won} label="მიმხვდარი" tone="green" />
              <Stat value={stats.streak} label="სერია" tone="wine" />
              <Stat value={stats.best} label="საუკეთესო სერია" />
            </div>
          </Card>
        </>
      )}

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        ადგილები, როლები და პასუხები Claude-მა დაწერა სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>
      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
