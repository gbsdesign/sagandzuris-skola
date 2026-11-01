import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Dices, Eye, Flame, Share2, Timer } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { BADE_THEMES } from '../../../data/badeThemes';
import {
  LEVELS, LEVEL_IDS, badeShareText, badeStats, clock, foundOf, gaveUp, gridOfDay, indexCells, isLevel, randomGrid, timeOf, withFound, withTime,
  wordOnLine, type BadeGrid as Grid, type LevelId,
} from '../../../utils/bade';
import { dayNumber, emptyDay, tbilisiToday, type HangiDay } from '../../../utils/hangi';
import { SCRIPT_BY, SCRIPT_LABEL, isScript, toScript, type Script } from '../../../utils/oldScripts';
import { Btn, Card, Stat, askConfirm } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { MONTHS_GE } from '../../../utils/dateNames';
import { useNow } from '../rounds/parts';
import { BadeGrid, WORD_TINTS, type Mark } from './Grid';
import { AlphabetKey, ScriptChips, WordList } from './parts';

// „ასოების ბადე“ alone (the hub's „ონლაინ“, 2026-11-01): one grid a day for the whole school — its time and the words found
// are the day's record (utils/bade.ts) — and more grids at random on three levels, not saved. The clock starts at the first
// touch and stops while the page is away. Any grid can be shown in nuskhuri or asomtavruli: the words to find stay in today's
// letters, the alphabet's key sits under the grid — so the old letters are learnt by playing.

const SCRIPT_KEY = 'sg-bade-script';
const LEVEL_KEY = 'sg-bade-level';
const readKey = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeKey = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;
const WAYS: Record<LevelId, string> = {
  easy: 'მარჯვნივ ან ქვევით',
  mid: 'მარჯვნივ, ქვევით ან დიაგონალზე',
  hard: 'ნებისმიერი მიმართულებით, უკუღმაც',
};

export const BadeDaily: React.FC = () => {
  const { days, loaded, save, member } = useDailyRecord('bade');
  const [today, setToday] = useState(tbilisiToday);
  const [script, setScriptState] = useState<Script>(() => { const s = readKey(SCRIPT_KEY); return isScript(s) ? s : 'mkhedruli'; });
  const setScript = (s: Script) => { setScriptState(s); writeKey(SCRIPT_KEY, s); };
  const [level, setLevelState] = useState<LevelId>(() => { const l = readKey(LEVEL_KEY); return isLevel(l) ? l : 'easy'; });
  const setLevel = (l: LevelId) => { setLevelState(l); writeKey(LEVEL_KEY, l); };
  // an extra grid (null = the day's); its words and end live only here
  const [extra, setExtra] = useState<{ level: LevelId; seed: number } | null>(null);
  const [extraFound, setExtraFound] = useState<string[]>([]);
  const [extraOver, setExtraOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // the day turns at midnight in Georgia, even with the page open
  useEffect(() => {
    const t = setInterval(() => setToday(tbilisiToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dayGrid = useMemo(() => gridOfDay(BADE_THEMES, today), [today]);
  const grid: Grid | undefined = useMemo(
    () => (extra ? randomGrid(BADE_THEMES, extra.level, extra.seed, dayGrid ? [dayGrid.theme.id] : []) : dayGrid),
    [extra, dayGrid],
  );
  const isDay = !extra;
  const saved = days[today];
  const day: HangiDay = grid && isDay && saved && saved.id === grid.key ? saved : emptyDay(grid?.key ?? '');
  const found = isDay ? foundOf(day) : extraFound;
  const won = !!grid && grid.placed.every(p => found.includes(p.word));
  const over = isDay ? day.done : won || extraOver;

  // the clock: seconds kept so far + this run since the first touch (or the page's return)
  const [base, setBase] = useState(0);
  const [runFrom, setRunFrom] = useState<number | null>(null);
  const running = runFrom !== null && !over;
  const now = useNow(running);
  const elapsed = useCallback(() => base + (runFrom !== null ? Math.max(0, (Date.now() - runFrom) / 1000) : 0), [base, runFrom]);
  const shown = base + (running && runFrom !== null ? Math.max(0, (now - runFrom) / 1000) : 0);

  // a new grid, or the day's record loaded: the clock goes back to what the record holds
  const restored = isDay ? timeOf(day) : 0;
  useEffect(() => { setBase(restored); setRunFrom(null); }, [grid?.key, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // the page away: the clock stops (the day keeps its time), back: it goes on
  const live = useRef({ isDay, over, day, running, elapsed, script, save, today });
  live.current = { isDay, over, day, running, elapsed, script, save, today };
  const paused = useRef(false);
  useEffect(() => {
    const vis = () => {
      const l = live.current;
      if (document.visibilityState === 'hidden' && l.running) {
        const secs = l.elapsed();
        setBase(secs);
        setRunFrom(null);
        paused.current = true;
        if (l.isDay && !l.over) l.save(l.today, withTime(l.day, secs, l.script));
      } else if (document.visibilityState === 'visible' && paused.current) {
        paused.current = false;
        setRunFrom(Date.now());
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      // leaving the game half-way keeps the day's time
      const l = live.current;
      if (l.running && l.isDay && !l.over) l.save(l.today, withTime(l.day, l.elapsed(), l.script));
    };
  }, []);

  const touch = () => { if (!over && runFrom === null) setRunFrom(Date.now()); };

  const onLine = (cells: number[]) => {
    if (!grid || over) return false;
    const i = wordOnLine(grid, cells);
    if (i < 0) return false;
    const w = grid.placed[i].word;
    if (found.includes(w)) return true;
    const secs = elapsed();
    const last = grid.placed.every(p => p.word === w || found.includes(p.word));
    if (isDay) save(today, withFound(day, grid, w, secs, script));
    else setExtraFound([...found, w]);
    if (last) { setBase(secs); setRunFrom(null); triggerHaptic(30); }
    return true;
  };

  const giveUp = async () => {
    if (!grid || over) return;
    const ok = await askConfirm({ title: 'სიტყვები გამოჩნდეს?', text: isDay ? 'დღის ბადე დასრულდება — ნაპოვნი სიტყვები ჩაგეთვლება.' : 'ეს ბადე დასრულდება.', ok: 'ჩვენება' });
    if (!ok) return;
    const secs = elapsed();
    setBase(secs);
    setRunFrom(null);
    if (isDay) save(today, gaveUp(day, secs, script)); else setExtraOver(true);
  };

  const share = async () => {
    if (!grid) return;
    const msg = badeShareText(dayNumber(today), grid, day);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  const another = () => { setExtraFound([]); setExtraOver(false); setExtra({ level, seed: Math.floor(Math.random() * 2 ** 31) }); };
  const backToDay = () => { setExtraFound([]); setExtraOver(false); setExtra(null); };

  const stats = useMemo(() => badeStats(days, today), [days, today]);

  if (!loaded) return <div className="w-full max-w-2xl px-1 py-6 text-center text-[13px] text-[#8a7a6a]">იტვირთება…</div>;
  if (!grid) return null;

  const letters = grid.cells.map(c => toScript(c, script));
  const tintOf = (w: string) => WORD_TINTS[found.indexOf(w) % WORD_TINTS.length];
  const marks: Mark[] = grid.placed.flatMap(p => {
    if (found.includes(p.word)) return [{ cells: indexCells(p, grid.size), color: tintOf(p.word) }];
    return over ? [{ cells: indexCells(p, grid.size), color: '#9a8b7b', dashed: true }] : [];
  });
  const items = grid.placed.map(p => ({ word: p.word, color: found.includes(p.word) ? tintOf(p.word) : undefined, missed: over && !found.includes(p.word) }));
  const total = grid.placed.length;

  return (
    <div className="space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug">{isDay ? `ასოების ბადე · №${dayNumber(today)}` : `ასოების ბადე · ${LEVELS[grid.level].label}`}</p>
            <p className="mt-0.5 text-[13px] text-[#fbf6ec]/85">{isDay ? dateLabel(today) : 'დამატებითი ბადე — შედეგი არ ინახება'}</p>
          </div>
          {isDay && (
            <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 px-3 h-9 text-[13px] font-bold tabular-nums" title="სერია">
              <Flame className="w-4 h-4" /> {stats.streak}
            </div>
          )}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          ბადეში {total} სიტყვა იმალება — {WAYS[grid.level]}. თითი გაატარე სიტყვის პირველი ასოდან ბოლომდე, ან შეეხე პირველს და მერე ბოლოს.
        </p>
      </Card>

      <div className="space-y-2">
        <ScriptChips value={script} onChange={setScript} />
        {script !== 'mkhedruli' && <p className="px-1 text-[12.5px] leading-snug text-[#75685a]">{SCRIPT_LABEL[script]} ძველი ქართული ასოებია. სიტყვები მხედრულად წერია, ბადე — {SCRIPT_BY[script]}: ბადის ქვეშ გასაღები გეხმარება.</p>}
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-[14px] font-bold text-[#4a3426] truncate">თემა: {grid.theme.title}</p>
        <p className="shrink-0 inline-flex items-center gap-1.5 text-[14px] font-bold tabular-nums text-[#7a2028]" role="timer">
          <Timer className="w-4 h-4" /> {clock(shown)} · {found.length}/{total}
        </p>
      </div>

      <div className="mx-auto w-full max-w-[520px]">
        <BadeGrid size={grid.size} letters={letters} marks={marks} onLine={over ? undefined : onLine} onTouch={touch} label={`ასოების ბადე ${grid.size}×${grid.size}, თემა: ${grid.theme.title}`} />
      </div>

      <WordList items={items} />
      <AlphabetKey script={script} />

      {!over ? (
        <div className="flex flex-wrap gap-2">
          <Btn kind="ghost" icon={<Eye />} onClick={() => { void giveUp(); }} className="flex-1 min-w-[150px]">სიტყვების ჩვენება</Btn>
          {!isDay && <Btn kind="ghost" icon={<CalendarDays />} onClick={backToDay} className="flex-1 min-w-[150px]">დღის ბადე</Btn>}
        </div>
      ) : (
        <Card tone="paper" className="!p-4">
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">
            {won ? `ყველა სიტყვა იპოვე — ${clock(isDay ? timeOf(day) : base)}! 🎉` : `იპოვე ${found.length} სიტყვა ${total}-დან`}
          </p>
          {won && script !== 'mkhedruli' && <p className="mt-1 text-[13px] text-[#75685a]">{SCRIPT_BY[script]} — ყოჩაღ!</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {isDay && <Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
            {!isDay && <Btn kind="ghost" icon={<CalendarDays />} onClick={backToDay}>დღის ბადე</Btn>}
          </div>
          {isDay && <p className="mt-3 text-[12.5px] leading-snug text-[#9a8b7b]">ხვალ ახალი ბადე იქნება. {member ? 'შედეგი შენს ჩანაწერშია.' : 'შედეგი ამ ტელეფონზე ინახება.'}</p>}
        </Card>
      )}

      <Card className="!p-4 space-y-3">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">კიდევ ერთი ბადე</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="სიძნელე">
          {LEVEL_IDS.map(l => <Chip key={l} on={level === l} onClick={() => setLevel(l)}>{LEVELS[l].label}</Chip>)}
        </div>
        <p className="text-[12.5px] leading-snug text-[#75685a]">{LEVELS[level].note}, {LEVELS[level].words} სიტყვა. თემა შემთხვევითია, შედეგი არ ინახება.</p>
        <Btn icon={<Dices />} onClick={another} full>ახალი ბადე</Btn>
      </Card>

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები" />
          <Stat value={stats.played ? `${Math.round((stats.won / stats.played) * 100)}%` : '–'} label="ყველა ნაპოვნი" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.fastest !== null ? clock(stats.fastest) : '–'} label="საუკეთესო დრო" />
        </div>
      </Card>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
