import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Heart, Play, Share2, Trophy, X } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { KHAZI_CARDS, khaziCard } from '../../../data/khaziCards';
import {
  DAY_CARDS, LIVES, PICK_LABEL, dealDeck, dealOfDay, finishedDay, fits, isPick, khaziShareText, khaziStats, resultsOf, rightOf, sortLine,
  type KhaziCard, type KhaziPick, type Placed,
} from '../../../utils/khazi';
import { dayNumber, tbilisiToday } from '../../../utils/hangi';
import { Btn, Card, Stat } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { MONTHS_GE } from '../../../utils/dateNames';
import { HandCard, PickChips, TimeLine, type Reveal } from './parts';

// „დროის ხაზი“ alone (the hub's „ონლაინ“, 2026-11-01): the day's line — ten cards for the whole school, nine to place, its
// right and wrong ones the day's record (utils/khazi.ts) — and the endless game of one deck with three lives, its best kept on
// this device. The day's line on the way stays on the device too (`sg-khazi-now`), so a reload goes on.

const RUN_KEY = 'sg-khazi-now';
const PICK_KEY = 'sg-khazi-pick';
const BEST_KEY = 'sg-khazi-best';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

const loadRes = (iso: string): string => {
  const o = readJson(RUN_KEY) as { key?: unknown; res?: unknown } | null;
  return o && o.key === iso && typeof o.res === 'string' ? o.res.replace(/[^01]/g, '').slice(0, DAY_CARDS - 1) : '';
};
const readBest = (): Partial<Record<KhaziPick, number>> => {
  const o = readJson(BEST_KEY);
  return o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k, v]) => isPick(k) && typeof v === 'number')) : {};
};

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;
const cardsOf = (deal: KhaziCard[], res: string): Placed[] =>
  deal.length ? [{ id: deal[0].id, ok: null }, ...[...res].map((c, i) => ({ id: deal[i + 1].id, ok: c === '1' }))] : [];

/** the line and the card waiting under it, stuck to the screen's foot; after a placement the verdict and „შემდეგი“ */
const Board: React.FC<{
  placed: Placed[];
  hand: KhaziCard | null;
  reveal: Reveal;
  onGap: (gap: number) => void;
  onNext: () => void;
  nextLabel: string;
}> = ({ placed, hand, reveal, onGap, onNext, nextLabel }) => {
  const line = sortLine(placed, khaziCard);
  const shown = reveal ? khaziCard(reveal.id) : null;
  const placing = !!hand && !reveal;
  return (
    <div className="space-y-3">
      <TimeLine line={line} card={khaziCard} onGap={placing ? onGap : undefined} reveal={reveal} />
      {(placing || shown) && (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70">
          {placing && hand ? (
            <HandCard card={hand} hint={hand.deck === 'tsirva' ? 'სად ჩაჯდება? შეეხე „აქ ჩასვი“-ს — ზემოთ წირვის დასაწყისია, ქვემოთ დასასრული.' : 'სად ჩაჯდება? შეეხე „აქ ჩასვი“-ს ხაზზე — ზემოთ ადრეა, ქვემოთ გვიან.'} />
          ) : shown && reveal ? (
            <div className="space-y-2">
              <p
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[16px] font-bold ${reveal.ok ? 'bg-[#e6f2e9] text-[#2f7d4f]' : 'bg-[#fde8e8] text-[#b23a48]'}`}
                role="status"
              >
                {reveal.ok ? <Check className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />}
                {reveal.ok ? `სწორია! ${shown.label}` : `არა — ${shown.label}. ბარათი თავის ადგილზე დადგა.`}
              </p>
              <Btn size="lg" full icon={<Play />} onClick={onNext} className="!h-12">{nextLabel}</Btn>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

interface Free { pick: KhaziPick; order: string[]; at: number; placed: Placed[]; lives: number }

export const KhaziSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('khazi');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);

  // ---- the day's line ----
  const deal = useMemo(() => dealOfDay(KHAZI_CARDS, today), [today]);
  const record = days[today];
  const [res, setRes] = useState(() => loadRes(today));
  useEffect(() => { setRes(loadRes(today)); }, [today]);
  const dayRes = record?.done ? resultsOf(record) : res;
  const dayDone = !!record?.done || dayRes.length >= DAY_CARDS - 1;
  const [dayReveal, setDayReveal] = useState<Reveal>(null);

  const placeDay = (gap: number) => {
    const hand = deal[dayRes.length + 1];
    if (!hand || dayDone) return;
    const line = sortLine(cardsOf(deal, dayRes), khaziCard).map(p => khaziCard(p.id)).filter((c): c is KhaziCard => !!c);
    const ok = fits(line, gap, hand);
    const next = dayRes + (ok ? '1' : '0');
    triggerHaptic(ok ? 20 : 45);
    setRes(next);
    writeJson(RUN_KEY, { key: today, res: next });
    setDayReveal({ id: hand.id, ok });
  };
  // the ninth card ends the day: its record (also when a reload finds the line full but unsaved)
  useEffect(() => { if (loaded && !record?.done && res.length >= DAY_CARDS - 1) save(today, finishedDay(today, res)); }, [loaded, record, res, today, save]);

  // ---- the endless game ----
  const [pick, setPickState] = useState<KhaziPick>(() => { const p = readJson(PICK_KEY); return isPick(p) ? p : 'all'; });
  const setPick = (p: KhaziPick) => { setPickState(p); writeJson(PICK_KEY, p); };
  const [best, setBest] = useState(readBest);
  const [free, setFree] = useState<Free | null>(null);
  const [freeReveal, setFreeReveal] = useState<Reveal>(null);
  const startFree = (p: KhaziPick) => {
    const order = dealDeck(KHAZI_CARDS, p, Math.floor(Math.random() * 2 ** 31)).map(c => c.id);
    triggerHaptic(10);
    setFreeReveal(null);
    setFree({ pick: p, order, at: 1, placed: [{ id: order[0], ok: null }], lives: LIVES });
    window.scrollTo({ top: 0 });
  };
  const freeScore = free ? free.placed.filter(p => p.ok).length : 0;
  const freeOver = !!free && (free.lives <= 0 || free.at >= free.order.length);
  const placeFree = (gap: number) => {
    if (!free || freeOver) return;
    const hand = khaziCard(free.order[free.at]);
    if (!hand) return;
    const line = sortLine(free.placed, khaziCard).map(p => khaziCard(p.id)).filter((c): c is KhaziCard => !!c);
    const ok = fits(line, gap, hand);
    triggerHaptic(ok ? 20 : 45);
    const after: Free = { ...free, at: free.at + 1, placed: [...free.placed, { id: hand.id, ok }], lives: free.lives - (ok ? 0 : 1) };
    setFree(after);
    setFreeReveal({ id: hand.id, ok });
    const score = after.placed.filter(p => p.ok).length;
    if ((after.lives <= 0 || after.at >= after.order.length) && score > (best[after.pick] ?? 0)) {
      const b = { ...best, [after.pick]: score };
      setBest(b);
      writeJson(BEST_KEY, b);
    }
  };

  const share = async () => {
    if (!record?.done) return;
    const msg = khaziShareText(dayNumber(today), record);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };
  const stats = useMemo(() => khaziStats(days, today), [days, today]);

  if (free) {
    const hand = !freeOver ? khaziCard(free.order[free.at]) ?? null : null;
    return (
      <div className="space-y-3">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი თამაში · {PICK_LABEL[free.pick]}</p>
              <p className="mt-0.5 text-[13px] text-[#75685a]">ხაზზე სწორად: <b className="text-[#2f7d4f]">{freeScore}</b>{best[free.pick] ? ` · რეკორდი ${best[free.pick]}` : ''}</p>
            </div>
            <span className="flex items-center gap-0.5" aria-label={`სიცოცხლე: ${free.lives}`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart key={i} className={`w-5 h-5 ${i < free.lives ? 'fill-[#c8504a] text-[#c8504a]' : 'text-[#d9c9ad]'}`} aria-hidden="true" />
              ))}
            </span>
            <button type="button" onClick={() => setFree(null)} className="w-9 h-9 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
              <X className="w-5 h-5" />
            </button>
          </div>
        </Card>
        {freeOver && !freeReveal && (
          <Card tone="paper" className="!p-4 space-y-3">
            <p className="font-serif-ge text-[18px] font-bold text-[#7a2028] flex items-center gap-2">
              <Trophy className="w-5 h-5" /> {free.at >= free.order.length && free.lives > 0 ? 'ყველა ბარათი ჩასვი!' : 'სიცოცხლე ამოიწურა'}
            </p>
            <p className="text-[15px] text-[#4a3426]">სწორად ჩასმული: <b>{freeScore}</b>{freeScore >= (best[free.pick] ?? 0) && freeScore > 0 ? ' — ახალი რეკორდი!' : ` · რეკორდი ${best[free.pick] ?? 0}`}</p>
            <div className="flex flex-wrap gap-2">
              <Btn icon={<Play />} onClick={() => startFree(free.pick)} className="flex-1 min-w-[150px]">თავიდან</Btn>
              <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setFree(null)} className="flex-1 min-w-[150px]">დღის ხაზი</Btn>
            </div>
          </Card>
        )}
        <Board
          placed={free.placed}
          hand={hand}
          reveal={freeReveal}
          onGap={placeFree}
          onNext={() => setFreeReveal(null)}
          nextLabel={freeOver ? 'შედეგი' : 'შემდეგი ბარათი'}
        />
      </div>
    );
  }

  const dayHand = !dayDone ? deal[dayRes.length + 1] ?? null : null;
  const right = rightOf(dayRes);
  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის ხაზი №{dayNumber(today)} · {dateLabel(today)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
              {dayDone ? `დასრულდა: ${right}/${DAY_CARDS - 1} სწორად` : `ერთი და იგივე ათი ბარათი მთელი სკოლისთვის · ჩასმულია ${dayRes.length}/${DAY_CARDS - 1}`}
            </p>
          </div>
        </div>
      </Card>

      {loaded && (
        <Board
          placed={cardsOf(deal, dayRes)}
          hand={dayHand}
          reveal={dayReveal}
          onGap={placeDay}
          onNext={() => setDayReveal(null)}
          nextLabel={dayDone ? 'შედეგი' : 'შემდეგი ბარათი'}
        />
      )}

      {dayDone && !dayReveal && (
        <Card tone="paper" className="!p-4 space-y-3">
          <p className="font-serif-ge text-[19px] font-bold text-[#7a2028]">{right === DAY_CARDS - 1 ? 'უშეცდომოდ! ' : ''}{right}/{DAY_CARDS - 1} სწორად</p>
          <p className="text-[20px] tracking-[2px]" aria-hidden="true">{[...dayRes].map(c => (c === '1' ? '🟩' : '🟥')).join('')}</p>
          <p className="text-[13px] leading-snug text-[#75685a]">ხვალ ახალი ხაზია. მანამდე სცადე თავისუფალი თამაში ქვემოთ.</p>
          {record?.done && <Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        </Card>
      )}

      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ბარათები ერთმანეთის მიყოლებით, სანამ სამი სიცოცხლე არ დაგრჩება. „წირვის რიგში“ წლის ნაცვლად წირვის ნაწილის ადგილია.</p>
        </div>
        <PickChips value={pick} onChange={setPick} />
        <Btn icon={<Play />} onClick={() => startFree(pick)} full>დაწყება{best[pick] ? ` · რეკორდი ${best[pick]}` : ''}</Btn>
      </Card>

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები დღე" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.average ?? '–'} label={`საშუალო / ${DAY_CARDS - 1}`} />
          <Stat value={stats.perfect} label="უშეცდომოდ" tone="green" />
        </div>
      </Card>

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        მწერლებისა და მგალობლების წლები აპის მონაცემებიდანაა, წირვის რიგი — აპის წირვის საგალობლებიდან. ისტორიისა და კულტურის ბარათები
        Claude-მა დაწერა და მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
