import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Dices, Eye, Flame, Lightbulb, ScrollText, Share2, Timer, TriangleAlert } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { TS_LINES } from '../../../data/tsartseraLines';
import {
  KIND_LABEL, TS_SCRIPTS, assign, clearGuess, clock, dayId, finished, givenLetters, givenOfDay, hintFor, isFull, isMode, isSolved, lettersOf,
  lineOfDay, nextOpen, randomLine, readKnown, shownOf, timeOf, tsShareText, tsStats, withKnown, wrongOf, type Guesses, type Known, type TsMode,
} from '../../../utils/tsartsera';
import { dayNumber, tbilisiToday } from '../../../utils/hangi';
import { mulberry32 } from '../../../utils/otkheuli';
import { SCRIPT_BY, isScript, type Script } from '../../../utils/oldScripts';
import { LATIN_TO_GEORGIAN, LETTERS, type Mark } from '../../../utils/sitqva';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { Btn, Card, Stat, askConfirm } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { MONTHS_GE } from '../../../utils/dateNames';
import { useNow } from '../rounds/parts';
import { AlphabetKey, ScriptChips } from '../bade/parts';
import { TsBoard, type Tone } from './Board';
import { KnownAlphabet, ModeChips } from './parts';

// „ხუცური წარწერა“ alone (the hub's „ონლაინ“, 2026-11-01): one line a day for the whole school — its time and hints are the
// day's record (utils/tsartsera.ts) — and more lines at random, not saved. The board on the way stays on this device
// (`sg-tsartsera-now`), so a reload goes on. The old letters a player reads themself are kept as their own alphabet.

const SCRIPT_KEY = 'sg-tsartsera-script';
const MODE_KEY = 'sg-tsartsera-mode';
const RUN_KEY = 'sg-tsartsera-now';
const KNOWN_KEY = 'sg-tsartsera-known';
const readKey = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeKey = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } };
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };

/** a board on the way: the guesses, the letters a hint opened, the hints spent, the seconds so far, its end */
interface Run { key: string; guesses: Guesses; hinted: string[]; hints: number; secs: number; end: 'won' | 'lost' | null }
const freshRun = (key: string): Run => ({ key, guesses: {}, hinted: [], hints: 0, secs: 0, end: null });
const loadRun = (key: string): Run => {
  const o = readJson(RUN_KEY) as Partial<Run> | null;
  if (!o || o.key !== key || !o.guesses || typeof o.guesses !== 'object' || !Array.isArray(o.hinted)) return freshRun(key);
  const guesses = Object.fromEntries(Object.entries(o.guesses).filter(([k, v]) => LETTERS.includes(k) && typeof v === 'string' && LETTERS.includes(v)));
  return {
    key, guesses, hinted: o.hinted.filter(c => typeof c === 'string' && LETTERS.includes(c)), hints: Number(o.hints) || 0, secs: Number(o.secs) || 0,
    end: o.end === 'won' || o.end === 'lost' ? o.end : null,
  };
};

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

export const TsartseraDaily: React.FC = () => {
  const { days, loaded, save, member } = useDailyRecord('tsartsera');
  const [today, setToday] = useState(tbilisiToday);
  const [script, setScriptState] = useState<Script>(() => { const s = readKey(SCRIPT_KEY); return isScript(s) && s !== 'mkhedruli' ? s : 'asomtavruli'; });
  const setScript = (s: Script) => { setScriptState(s); writeKey(SCRIPT_KEY, s); };
  const [mode, setModeState] = useState<TsMode>(() => { const m = readKey(MODE_KEY); return isMode(m) ? m : 'secret'; });
  const [extra, setExtra] = useState<number | null>(null);
  const [known, setKnown] = useState<Known>(() => readKnown(readJson(KNOWN_KEY)));
  const [sel, setSel] = useState<string | null>(null);
  const [showWrong, setShowWrong] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // the day turns at midnight in Georgia, even with the page open
  useEffect(() => {
    const t = setInterval(() => setToday(tbilisiToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dayLine = useMemo(() => lineOfDay(TS_LINES, today), [today]);
  const line = useMemo(() => (extra !== null ? randomLine(TS_LINES, extra, dayLine ? [dayLine.id] : []) : dayLine), [extra, dayLine]);
  const isDay = extra === null;
  const saved = line && isDay ? days[today] : undefined;
  const record = saved && line && saved.id === dayId(today, line) ? saved : undefined;
  const given = useMemo(() => {
    if (!line || mode === 'key') return [];
    return extra === null ? givenOfDay(line, today) : givenLetters(line.text, mulberry32(extra));
  }, [line, mode, extra, today]);
  const runKey = line ? (isDay ? `${dayId(today, line)}|${mode}` : `x|${line.id}|${extra}|${mode}`) : '';

  const [run, setRunState] = useState<Run>(() => (isDay ? loadRun(runKey) : freshRun(runKey)));
  const setRun = useCallback((r: Run) => {
    setRunState(r);
    if (r.key.startsWith('x|')) return;
    writeKey(RUN_KEY, JSON.stringify(r));
  }, []);

  const open = useMemo(() => [...given, ...run.hinted], [given, run.hinted]);
  const done = isDay ? !!record?.done || !!run.end : !!run.end;
  const won = isDay ? (record?.done ? record.won : run.end === 'won') : run.end === 'won';

  // the clock: seconds kept so far + this stretch since the first letter (or the page's return)
  const [base, setBase] = useState(0);
  const [runFrom, setRunFrom] = useState<number | null>(null);
  const running = runFrom !== null && !done;
  const now = useNow(running);
  const elapsed = useCallback(() => base + (runFrom !== null ? Math.max(0, (Date.now() - runFrom) / 1000) : 0), [base, runFrom]);
  const shown = base + (running && runFrom !== null ? Math.max(0, (now - runFrom) / 1000) : 0);

  // a new board: its stored way so far, the clock back to it, the first empty letter picked
  useEffect(() => {
    if (!line) return;
    const r = isDay ? loadRun(runKey) : freshRun(runKey);
    setRunState(r);
    setBase(record?.done ? timeOf(record) : r.secs);
    setRunFrom(null);
    setShowWrong(false);
    setSel(record?.done || r.end ? null : nextOpen(line.text, r.guesses, [...given, ...r.hinted], null));
  }, [runKey, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // the page away: the clock stops and the board keeps its time; back: it goes on
  const live = useRef({ run, running, elapsed, setRun });
  live.current = { run, running, elapsed, setRun };
  const paused = useRef(false);
  useEffect(() => {
    const vis = () => {
      const l = live.current;
      if (document.visibilityState === 'hidden' && l.running) {
        const secs = l.elapsed();
        setBase(secs);
        setRunFrom(null);
        paused.current = true;
        l.setRun({ ...l.run, secs });
      } else if (document.visibilityState === 'visible' && paused.current) {
        paused.current = false;
        setRunFrom(Date.now());
      }
    };
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      const l = live.current;
      if (l.running) l.setRun({ ...l.run, secs: l.elapsed() });
    };
  }, []);

  const touch = () => { if (!done && runFrom === null) setRunFrom(Date.now()); };

  const finish = (r: Run, ok: boolean) => {
    if (!line) return;
    const secs = elapsed();
    setBase(secs);
    setRunFrom(null);
    setSel(null);
    setShowWrong(false);
    setRun({ ...r, secs, end: ok ? 'won' : 'lost' });
    if (isDay) save(today, finished(dayId(today, line), ok, secs, r.hints, script, mode));
    if (ok) {
      const mine = lettersOf(line.text).filter(c => !given.includes(c) && !r.hinted.includes(c));
      const next = withKnown(known, script, mine);
      setKnown(next);
      writeKey(KNOWN_KEY, JSON.stringify(next));
      triggerHaptic(30);
    }
  };

  const flashLetter = (c: string) => {
    setFlash(c);
    triggerHaptic(20);
    window.setTimeout(() => setFlash(f => (f === c ? null : f)), 450);
  };

  const type = (g: string) => {
    if (!line || done || !sel || open.includes(sel)) return;
    touch();
    // a letter already open stands elsewhere; in „გასაღებით“ only the right one goes in
    if (open.includes(g) || (mode === 'key' && g !== sel)) { flashLetter(sel); return; }
    const guesses = assign(run.guesses, sel, g);
    const next = { ...run, guesses };
    if (isSolved(line.text, guesses, open)) { finish(next, true); return; }
    setRun(next);
    setShowWrong(false);
    setSel(nextOpen(line.text, guesses, open, sel) ?? sel);
  };

  const back = () => {
    if (!line || done || !sel || open.includes(sel)) return;
    if (run.guesses[sel]) { setRun({ ...run, guesses: clearGuess(run.guesses, sel) }); setShowWrong(false); }
  };

  const order = useMemo(() => (line ? lettersOf(line.text).filter(c => !open.includes(c)) : []), [line, open]);
  const move = (by: number) => {
    if (!order.length) return;
    const i = sel ? order.indexOf(sel) : -1;
    setSel(order[(i + by + order.length) % order.length]);
  };
  const skip = () => { if (line) setSel(nextOpen(line.text, run.guesses, open, sel) ?? (order.length ? order[(order.indexOf(sel ?? '') + 1) % order.length] : null)); };

  const hint = () => {
    if (!line || done) return;
    const c = hintFor(line.text, run.guesses, open, sel);
    if (!c) return;
    touch();
    triggerHaptic(10);
    const guesses = Object.fromEntries(Object.entries(clearGuess(run.guesses, c)).filter(([, v]) => v !== c));
    const next = { ...run, guesses, hinted: [...run.hinted, c], hints: run.hints + 1 };
    const nowOpen = [...open, c];
    if (isSolved(line.text, guesses, nowOpen)) { finish(next, true); return; }
    setRun(next);
    setSel(nextOpen(line.text, guesses, nowOpen, c) ?? null);
  };

  const showMistakes = () => {
    if (!line || done || showWrong) return;
    setRun({ ...run, hints: run.hints + 1 });
    setShowWrong(true);
  };

  const giveUp = async () => {
    if (!line || done) return;
    const ok = await askConfirm({ title: 'პასუხი გამოჩნდეს?', text: isDay ? 'დღის წარწერა დასრულდება ამოუხსნელად.' : 'ეს წარწერა დასრულდება.', ok: 'ჩვენება' });
    if (ok) finish(run, false);
  };

  const setMode = async (m: TsMode) => {
    if (m === mode) return;
    const started = !done && (Object.keys(run.guesses).length > 0 || run.hints > 0);
    if (started && !(await askConfirm({ title: 'თავიდან დაიწყოს?', text: 'სხვა გზაზე გადასვლისას ეს წარწერა თავიდან იწყება.', ok: 'თავიდან' }))) return;
    if (started && isDay) writeKey(RUN_KEY, null);
    setModeState(m);
    writeKey(MODE_KEY, m);
  };

  // a physical keyboard: Georgian letters, or the Latin layout's keys as the standard Georgian layout maps them; arrows move
  useEffect(() => {
    if (!line || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (window.history.state?.sgFind) return;
      if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); back(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); move(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); skip(); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); type(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const share = async () => {
    if (!record) return;
    const msg = tsShareText(dayNumber(today), record);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  const stats = useMemo(() => tsStats(days, today), [days, today]);

  if (!loaded) return <div className="w-full max-w-2xl px-1 py-6 text-center text-[13px] text-[#8a7a6a]">იტვირთება…</div>;
  if (!line) return null;

  const wrong = showWrong ? wrongOf(line.text, run.guesses, open) : [];
  const full = !done && isFull(line.text, run.guesses, open);
  const wrongCount = full ? wrongOf(line.text, run.guesses, open).length : 0;
  const shownLetter = (c: string) => (done ? c : shownOf(c, run.guesses, open));
  const toneOf = (c: string): Tone => {
    if (done) return won || shownOf(c, run.guesses, open) === c ? 'won' : 'open';
    if (open.includes(c)) return 'open';
    return wrong.includes(c) ? 'wrong' : 'plain';
  };
  const marks: Record<string, Mark> = {};
  for (const v of Object.values(run.guesses)) marks[v] = mode === 'key' ? 'hit' : 'miss';
  for (const c of open) marks[c] = 'hit';
  const hints = record?.done ? Number(record.guesses.find(g => g.startsWith('h:'))?.slice(2)) || 0 : run.hints;
  const learnt = (s: Script) => known[s] ?? [];

  return (
    <div className="space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug">{isDay ? `ხუცური წარწერა · №${dayNumber(today)}` : 'ხუცური წარწერა · კიდევ ერთი'}</p>
            <p className="mt-0.5 text-[13px] text-[#fbf6ec]/85">{isDay ? dateLabel(today) : 'დამატებითი წარწერა — შედეგი არ ინახება'}</p>
          </div>
          {isDay && (
            <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 px-3 h-9 text-[13px] font-bold tabular-nums" title="სერია">
              <Flame className="w-4 h-4" /> {stats.streak}
            </div>
          )}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {mode === 'secret'
            ? 'სტრიქონი ძველი ასოებითაა დაწერილი და გასაღები არ გაქვს. შეეხე ასოს და აკრიფე, რომელი ასო გგონია — ყველა მისნაირი ერთად შეივსება. ნაცნობი სიტყვები გზას გაჩვენებს.'
            : 'შეეხე ასოს, გასაღებში მოძებნე და აკრიფე — ყველა მისნაირი ერთად შეივსება. არასწორ ასოს უჯრა არ მიიღებს.'}
        </p>
      </Card>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ScriptChips value={script} onChange={setScript} only={TS_SCRIPTS} />
        <ModeChips value={mode} onChange={m => { void setMode(m); }} />
      </div>

      {/* the board with its keys: the keys stay at the screen's foot only while the board is in sight */}
      <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#4a3426]">
          <ScrollText className="w-4 h-4 shrink-0 text-[#7a2028]" /> <span className="truncate">{KIND_LABEL[line.kind]}</span>
        </p>
        <p className="shrink-0 inline-flex items-center gap-1.5 text-[14px] font-bold tabular-nums text-[#7a2028]" role="timer">
          <Timer className="w-4 h-4" /> {clock(shown)}{hints ? ` · 💡${hints}` : ''}
        </p>
      </div>

      <Card className="!px-3 !py-5 sm:!px-5">
        <TsBoard
          text={line.text}
          script={script}
          shown={shownLetter}
          toneOf={toneOf}
          selected={done ? null : sel}
          onPick={done ? undefined : c => { if (!open.includes(c)) { touch(); setSel(c); } }}
          flash={flash}
          label={`წარწერა ${SCRIPT_BY[script]}`}
        />
      </Card>

      {mode === 'key' && !done && <AlphabetKey script={script} />}

      {!done ? (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70 space-y-2">
          {full && wrongCount > 0 && (
            <p className="px-1 text-[13px] font-bold leading-snug text-[#b23a48]" role="status">
              ყველა უჯრა შევსებულია, მაგრამ {wrongCount} ასო არ ემთხვევა{showWrong ? ' — წითლად ჩანს.' : '.'}
            </p>
          )}
          <div className="flex gap-1.5">
            <Btn kind="ghost" icon={<Lightbulb />} onClick={hint} className="flex-1 !px-2">მინიშნება</Btn>
            {mode === 'secret' && (
              <Btn kind="ghost" icon={<TriangleAlert />} onClick={showMistakes} disabled={showWrong || !Object.keys(run.guesses).length} className="flex-1 !px-2">შეცდომები</Btn>
            )}
            <Btn kind="ghost" icon={<Eye />} onClick={() => { void giveUp(); }} className="flex-1 !px-2">პასუხი</Btn>
          </div>
          <GeoKeyboard marks={marks} onKey={type} onBack={back} onEnter={skip} enterLabel="შემდეგი ასო" />
        </div>
      ) : (
        <Card tone="paper" className="!p-4 space-y-3">
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">
            {won ? `ამოიკითხე — ${clock(isDay && record ? timeOf(record) : base)}! 🎉` : 'ეს იყო:'}
          </p>
          <blockquote className="border-l-[3px] border-[#c9a24a] pl-3">
            <p className="font-serif-ge text-[18px] leading-snug text-[#2f2018] whitespace-pre-line">{line.text}</p>
            <p className="mt-1.5 text-[13px] font-bold text-[#7a2028]">— {line.by}{line.from ? <span className="font-normal text-[#75685a]">, „{line.from}“</span> : null}</p>
          </blockquote>
          {won && <p className="text-[13px] text-[#75685a]">{SCRIPT_BY[script]}{mode === 'key' ? ', გასაღებით' : ''} · {hints ? `მინიშნება ${hints}` : 'მინიშნების გარეშე'}</p>}
          <div className="flex flex-wrap gap-2">
            {isDay && record && <Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
            {!isDay && <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setExtra(null)}>დღის წარწერა</Btn>}
          </div>
          {isDay && <p className="text-[12.5px] leading-snug text-[#9a8b7b]">ხვალ ახალი წარწერა იქნება. {member ? 'შედეგი შენს ჩანაწერშია.' : 'შედეგი ამ ტელეფონზე ინახება.'}</p>}
        </Card>
      )}
      </div>

      <Card className="!p-4 space-y-3">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">კიდევ ერთი წარწერა</p>
        <p className="text-[12.5px] leading-snug text-[#75685a]">შემთხვევითი სტრიქონი იმავე დამწერლობით და იმავე გზით. შედეგი არ ინახება.</p>
        <div className="flex flex-wrap gap-2">
          <Btn icon={<Dices />} onClick={() => setExtra(Math.floor(Math.random() * 2 ** 31))} className="flex-1 min-w-[150px]">ახალი წარწერა</Btn>
          {!isDay && !done && <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setExtra(null)} className="flex-1 min-w-[150px]">დღის წარწერა</Btn>}
        </div>
      </Card>

      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი ანბანი</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ასოები, რომლებიც ამოხსნილ წარწერებში თავად ამოიცანი — მინიშნებით გახსნილი არ ითვლება. ინახება ამ ტელეფონზე.</p>
        </div>
        {TS_SCRIPTS.map(s => <KnownAlphabet key={s} script={s} known={learnt(s)} />)}
      </Card>

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.fastest !== null ? clock(stats.fastest) : '–'} label="საუკეთესო დრო" />
          <Stat value={stats.clean} label="უმინიშნებოდ" tone="green" />
        </div>
      </Card>

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        ლექსები აპის ტექსტებიდანაა, მამათა სიტყვები — მთავარი გვერდის გამონათქვამებიდან. ანდაზები Claude-მა ჩაწერა და მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
