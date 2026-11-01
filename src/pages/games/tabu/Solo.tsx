import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Flag, Play, Share2, Shuffle, Trophy, X } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { TABU_CARDS, TABU_THEMES, type TabuEntry } from '../../../data/tabuCards';
import {
  CLUES, DAY_CARDS, MAX_DAY_POINTS, cardOver, dayDeal, finishedTabuDay, giveUp, isWord, moreClue, newTabuRun, nextCard, parseTabuRun, pointsOf,
  ptsSquare, runOver, runScore, tabuShareText, tabuStats, tryWord, type TabuRun,
} from '../../../utils/tabu';
import { shuffle } from '../../../utils/otkheuli';
import { dayNumber, tbilisiToday } from '../../../utils/hangi';
import { MONTHS_GE } from '../../../utils/dateNames';
import { Btn, Card, Stat } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { triggerHaptic } from '../../../utils/haptics';
import { ClueChips, LetterBoxes, ThemeChip, ThemePicker, useLetterKeys } from './parts';

// „ნუ იტყვი!“ alone (the hub's „ონლაინ“, 2026-11-01): the card turned round — its five forbidden words come one by one as
// clues, the vaguest first, and the word is typed into its boxes. Guessed after one clue = 5 points, after all five = 1; a
// wrong word opens the next clue, „+ მინიშნება“ too. Twenty cards a day, the same for the whole school (utils/tabu.ts
// `dayDeal`), the day's points the record; the run on the way stays on the device (`sg-tabu-now`). Then the free game of
// any themes, as long as one likes.

const RUN_KEY = 'sg-tabu-now';
const THEMES_KEY = 'sg-tabu-themes';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const loadRun = (iso: string) => parseTabuRun(readJson(RUN_KEY), iso) ?? newTabuRun(iso);
const readThemes = (): string[] => { const v = readJson(THEMES_KEY); return Array.isArray(v) ? v.filter((x): x is string => TABU_THEMES.some(t => t.id === x)) : []; };
const cardById = (id: number | undefined) => TABU_CARDS.find(c => c.id === id);

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;
const verdictOf = (score: number, max: number) => {
  const s = score / max;
  return s >= 0.8 ? 'ბრწყინვალე! თითქმის ყველა პირველივე მინიშნებით.' : s >= 0.6 ? 'ძალიან კარგია!' : s >= 0.4 ? 'კარგია — ხვალ უფრო მეტს გამოიცნობ.' : 'ხვალ ახალი ოცი ბარათია — სცადე ისევ!';
};

/** one card: its clues, the boxes, the keyboard; once over, the verdict and the way on */
const CardPlay: React.FC<{
  card: TabuEntry;
  run: TabuRun;
  setRun: (r: TabuRun) => void;
  total: number;
  onNext: () => void;
  nextLabel: string;
}> = ({ card, run, setRun, total, onNext, nextLabel }) => {
  const [typed, setTyped] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const shakeT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(shakeT.current), []);
  useEffect(() => { setTyped(''); setNote(null); }, [card.id]);
  const over = cardOver(run);
  const got = over ? run.pts[run.at] ?? 0 : 0;
  const n = [...card.w].length;
  const nudge = () => {
    setShake(false);
    window.requestAnimationFrame(() => setShake(true));
    window.clearTimeout(shakeT.current);
    shakeT.current = window.setTimeout(() => setShake(false), 450);
  };
  const letter = (ch: string) => { if (!over) { setNote(null); setTyped(t => ([...t].length >= n ? t : t + ch)); } };
  const back = () => { if (!over) setTyped(t => [...t].slice(0, -1).join('')); };
  const check = () => {
    if (over) { onNext(); return; }
    if ([...typed].length < n) { nudge(); triggerHaptic(25); setNote('ჯერ ყველა უჯრა შეავსე'); return; }
    const after = tryWord(run, typed, card);
    if (isWord(typed, card.w)) triggerHaptic(20);
    else { nudge(); triggerHaptic(45); setNote(cardOver(after) ? null : `„${typed}“ არ არის — აი, კიდევ ერთი მინიშნება`); }
    setTyped('');
    setRun(after);
  };
  useLetterKeys(true, { letter, back, enter: check });

  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <ThemeChip theme={card.theme} />
          <span className="text-[13px] font-bold tabular-nums text-[#75685a]">ბარათი {run.at + 1}/{total}</span>
        </div>
        <ClueChips clues={card.no} shown={run.shown} over={over} onMore={over ? undefined : () => setRun(moreClue(run))} />
        {run.wrong.length > 0 && (
          <p className="text-[13px] leading-snug text-[#9a8b7b]">
            არა: {run.wrong.map((w, i) => <React.Fragment key={i}>{i > 0 && ' · '}<s>{w}</s></React.Fragment>)}
          </p>
        )}
      </Card>
      <LetterBoxes word={card.w} typed={typed} state={over ? (got > 0 ? 'right' : 'lost') : 'play'} shake={shake} />
      {!over && (
        <div className="flex items-center gap-3">
          <p className={`min-w-0 flex-1 text-[13.5px] leading-snug ${note ? 'font-bold text-[#b23a48]' : 'text-[#75685a]'}`} role="status" aria-live="polite">
            {note ?? <>ახლა გამოცნობა: <b className="text-[#7a2028]">{CLUES + 1 - run.shown} ქულა</b> · {n} ასო</>}
          </p>
          <Btn kind="ghost" size="sm" icon={<Flag />} onClick={() => setRun(giveUp(run))}>არ ვიცი</Btn>
        </div>
      )}
      <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70">
        {over ? (
          <div className="space-y-2">
            <p
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[16px] font-bold ${got > 0 ? 'bg-[#e6f2e9] text-[#2f7d4f]' : 'bg-[#fde8e8] text-[#b23a48]'}`}
              role="status"
            >
              {got > 0 ? <Check className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />}
              {got >= CLUES ? `პირველივე მინიშნებით! +${got} ქულა` : got > 0 ? `სწორია! +${got} ქულა` : `ესაა „${card.w}“`}
            </p>
            <Btn size="lg" full icon={<Play />} onClick={onNext} className="!h-12">{nextLabel}</Btn>
          </div>
        ) : (
          <GeoKeyboard marks={{}} onKey={letter} onBack={back} onEnter={check} />
        )}
      </div>
    </div>
  );
};

interface Free { themes: string[]; order: number[]; run: TabuRun }

export const TabuSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('tabu');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);

  // ---- the day's twenty ----
  const deal = useMemo(() => dayDeal(today), [today]);
  const record = days[today];
  const [run, setRunState] = useState(() => loadRun(today));
  useEffect(() => { setRunState(loadRun(today)); }, [today]);
  const setRun = (r: TabuRun) => { setRunState(r); writeJson(RUN_KEY, r); };
  // the twentieth card ends the day: its record (also when a reload finds the run full but unsaved)
  useEffect(() => { if (loaded && !record?.done && run.pts.length >= DAY_CARDS) save(today, finishedTabuDay(today, run.pts)); }, [loaded, record, run, today, save]);
  const showResult = runOver(run) || (!!record?.done && run.pts.length < DAY_CARDS);
  const dayPts = record?.done ? pointsOf(record) : run.pts;
  const dayScore = runScore({ pts: dayPts });

  // ---- the free game ----
  const [themes, setThemesState] = useState(readThemes);
  const setThemes = (t: string[]) => { setThemesState(t); writeJson(THEMES_KEY, t); };
  const [free, setFree] = useState<Free | null>(null);
  const startFree = () => {
    const pool = TABU_CARDS.filter(c => !themes.length || themes.includes(c.theme));
    triggerHaptic(10);
    setFree({ themes, order: shuffle(pool.map(c => c.id), Math.random), run: newTabuRun('free') });
    window.scrollTo({ top: 0 });
  };

  const share = async () => {
    if (!record?.done) return;
    const msg = tabuShareText(dayNumber(today), record);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };
  const stats = useMemo(() => tabuStats(days, today), [days, today]);

  if (free) {
    const total = free.order.length;
    const card = cardById(free.order[free.run.at]);
    const done = runOver(free.run, total);
    const score = runScore(free.run);
    const label = free.themes.length ? free.themes.map(id => TABU_THEMES.find(t => t.id === id)?.label).filter(Boolean).join(', ') : 'ყველა თემა';
    return (
      <div className="space-y-3">
        <Card className="!p-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[#75685a] line-clamp-2">{label} · ქულა <b className="text-[#7a2028]">{score}</b></p>
            </div>
            <button type="button" onClick={() => setFree(null)} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
              <X className="w-5 h-5" />
            </button>
          </div>
        </Card>
        {done || !card ? (
          <Card tone="paper" className="!p-4 space-y-3">
            <p className="font-serif-ge text-[18px] font-bold text-[#7a2028] flex items-center gap-2"><Trophy className="w-5 h-5" /> ყველა ბარათი ითამაშე!</p>
            <p className="text-[15px] text-[#4a3426]">{total} ბარათი · <b>{score}</b> ქულა {total * CLUES}-დან</p>
            <div className="flex flex-wrap gap-2">
              <Btn icon={<Shuffle />} onClick={startFree} className="flex-1 min-w-[150px]">თავიდან</Btn>
              <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setFree(null)} className="flex-1 min-w-[150px]">დღის ბარათები</Btn>
            </div>
          </Card>
        ) : (
          <CardPlay
            card={card}
            run={free.run}
            setRun={r => setFree({ ...free, run: r })}
            total={total}
            onNext={() => setFree({ ...free, run: nextCard(free.run) })}
            nextLabel={free.run.at + 1 >= total ? 'შედეგი' : 'შემდეგი ბარათი'}
          />
        )}
      </div>
    );
  }

  const card = !showResult ? deal[run.at] : undefined;
  const fresh = run.at === 0 && run.shown === 1 && !run.pts.length && !run.wrong.length;
  return (
    <div className="space-y-4">
      <Card className="!p-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center shrink-0"><CalendarDays className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის ბარათები №{dayNumber(today)} · {dateLabel(today)}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
              {showResult ? `დასრულდა: ${dayScore}/${MAX_DAY_POINTS} ქულა` : `ერთი და იგივე ${DAY_CARDS} ბარათი მთელი სკოლისთვის · ქულა ${runScore(run)}`}
            </p>
          </div>
        </div>
        {!showResult && (
          <div className="mt-3 flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: DAY_CARDS }, (_, i) => {
              const p = run.pts[i];
              const bg = p === undefined ? (i === run.at ? 'bg-[#7a2028]/40' : 'bg-[#f1e8d9]') : p >= 4 ? 'bg-[#2f7d4f]' : p >= 2 ? 'bg-[#d9a21b]' : p === 1 ? 'bg-[#cf7428]' : 'bg-[#4a3426]/60';
              return <span key={i} className={`h-2 flex-1 rounded-full ${bg}`} />;
            })}
          </div>
        )}
        {fresh && !showResult && (
          <p className="mt-3 text-[13.5px] leading-snug text-[#4a3426]">
            ბარათის ამხსნელს ხუთი სიტყვა ეკრძალება — აქ ისინი მინიშნებებია და სათითაოდ ჩნდება. გამოიცანი სიტყვა: პირველივე მინიშნებით
            5 ქულაა, ყოველი შემდეგით ერთით ნაკლები.
          </p>
        )}
      </Card>

      {loaded && card && (
        <CardPlay
          card={card}
          run={run}
          setRun={setRun}
          total={DAY_CARDS}
          onNext={() => setRun(nextCard(run))}
          nextLabel={run.at + 1 >= DAY_CARDS ? 'შედეგი' : 'შემდეგი ბარათი'}
        />
      )}

      {showResult && (
        <Card tone="paper" className="!p-4 space-y-3">
          <p className="font-serif-ge text-[20px] font-bold text-[#7a2028]">{dayScore}/{MAX_DAY_POINTS} ქულა</p>
          <p className="text-[20px] leading-[1.4] tracking-[2px]" aria-hidden="true">
            {dayPts.slice(0, 10).map(ptsSquare).join('')}<br />{dayPts.slice(10).map(ptsSquare).join('')}
          </p>
          <p className="text-[14px] leading-snug text-[#4a3426]">{verdictOf(dayScore, MAX_DAY_POINTS)}</p>
          <ul className="flex flex-wrap gap-1.5" aria-label="დღის სიტყვები">
            {deal.map((c, i) => {
              const p = dayPts[i];
              return (
                <li key={c.id} className="h-9 pl-3 pr-1.5 rounded-full bg-white ring-1 ring-[#e8dcc8] inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#4a3426]">
                  {c.w}
                  <span className={`min-w-6 h-6 px-1.5 rounded-full text-[12px] inline-flex items-center justify-center ${p ? 'bg-[#2f7d4f]/12 text-[#2f7d4f]' : 'bg-[#f1e8d9] text-[#9a8b7b]'}`}>{p ?? '–'}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[13px] leading-snug text-[#75685a]">ხვალ ახალი ოცი ბარათია. მანამდე სცადე თავისუფალი თამაში ქვემოთ.</p>
          {record?.done && <Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        </Card>
      )}

      {showResult && (
        <>
          <Card className="!p-4 space-y-3">
            <div>
              <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">აირჩიე თემები — ბარათები მიყოლებით, რამდენიც გინდა. არაფერი ინახება.</p>
            </div>
            <ThemePicker value={themes} onChange={setThemes} />
            <Btn icon={<Play />} onClick={startFree} full>დაწყება</Btn>
          </Card>

          <Card className="!p-4">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={stats.played} label="ნათამაშები დღე" />
              <Stat value={stats.streak} label="სერია" tone="wine" />
              <Stat value={stats.average ?? '–'} label={`საშუალო / ${MAX_DAY_POINTS}`} />
              <Stat value={stats.best} label="საუკეთესო" tone="green" />
            </div>
          </Card>
        </>
      )}

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        ბარათები Claude-მა დაწერა სკოლისთვის — თორმეტი თემა, სუფრიდან სპორტამდე. მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
