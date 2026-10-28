import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Flame, Lightbulb, Search, Share2 } from 'lucide-react';
import { useDailyRecord } from '../../hooks/useDailyRecord';
import { loadCalendarYearDays, type CalendarDay } from '../../data/churchCalendar';
import { openSaintLife } from '../../data/saintLives';
import { ANSWER_BANK, ANSWER_WORDS } from '../../data/sitqvaAnswers';
import { loadSitqvaWords } from '../../utils/sitqvaDictionary';
import {
  KIND_HINT, LATIN_TO_GEORGIAN, LETTERS, MAX_TRIES, afterTry, candidatesOfDay, dayIndex, isGeorgian, keyMarks, scoreGuess, sitqvaShareText, wordOfDay,
  type Mark,
} from '../../utils/sitqva';
import { dayBefore, emptyDay, hangiStats, tbilisiToday, type HangiDay } from '../../utils/hangi';
import { GeoKeyboard } from '../../components/games/GeoKeyboard';
import { Btn, Card, Stat } from '../../components/ui/kit';
import { Toast } from '../../components/ui/Toast';
import { triggerHaptic } from '../../utils/haptics';
import { openSearch } from '../../utils/searchOpen';
import { MONTHS_GE } from '../../utils/dateNames';

// „დღის სიტყვა“ (games hub, 2026-10-28): one hidden word a day for the whole school, six tries, Wordle's colours. The word
// comes from the church calendar's day (its feast or a saint's name) or from the bank of church words and places; the
// hint says which. The rules and the pick are utils/sitqva.ts, the record hooks/useDailyRecord.ts ('sitqva'), the
// keyboard components/games/GeoKeyboard.tsx. A physical keyboard types too (Georgian or the Latin layout).

const TILE: Record<Mark, string> = {
  hit: 'bg-[#2f7d4f] text-white',
  near: 'bg-[#d9a21b] text-white',
  miss: 'bg-[#a89c8a] text-white',
};

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

const SitqvaGame: React.FC = () => {
  const { days, loaded, save, member } = useDailyRecord('sitqva');
  const [today, setToday] = useState(tbilisiToday);
  const [cal, setCal] = useState<Record<string, CalendarDay> | null>(null);
  const [dict, setDict] = useState<Set<string> | null>(null);
  const [typed, setTyped] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  // the day turns at midnight in Georgia, even with the page open
  useEffect(() => {
    const t = setInterval(() => setToday(tbilisiToday()), 60_000);
    return () => clearInterval(t);
  }, []);
  // the calendar decides the word, so the game waits for it; the dictionary only checks guesses (any Georgian word passes without it)
  useEffect(() => {
    let on = true;
    loadCalendarYearDays(today).then(d => { if (on) setCal(d); }).catch(() => { if (on) setCal({}); });
    return () => { on = false; };
  }, [today]);
  useEffect(() => { loadSitqvaWords().then(setDict); }, []);

  const pick = useMemo(() => {
    if (!cal) return undefined;
    const wordOn = (iso: string, skip?: string) => wordOfDay(iso, candidatesOfDay(cal[iso]), ANSWER_BANK, skip)?.word;
    const yesterday = dayBefore(today);
    return wordOfDay(today, candidatesOfDay(cal[today]), ANSWER_BANK, wordOn(yesterday, wordOn(dayBefore(yesterday))));
  }, [cal, today]);

  const saved = days[today];
  const day: HangiDay = pick && saved && saved.id === pick.word ? saved : emptyDay(pick?.word ?? '');
  const len = pick?.word.length ?? 5;
  const stats = useMemo(() => hangiStats(days, today), [days, today]);
  const n = dayIndex(today);
  const marks = useMemo(() => (pick ? keyMarks(day.guesses, pick.word) : {}), [day.guesses, pick]);

  const warn = (msg: string) => { triggerHaptic(40); setToast(msg); setShaking(true); window.setTimeout(() => setShaking(false), 450); };
  const type = (ch: string) => { if (!day.done) setTyped(t => (t.length < len ? t + ch : t)); };
  const back = () => setTyped(t => t.slice(0, -1));
  const submit = () => {
    if (!pick || day.done) return;
    const w = typed;
    if (w.length < len) { warn('ასოები აკლია'); return; }
    if (day.guesses.includes(w)) { warn('ეს სიტყვა უკვე სცადე'); return; }
    const known = w === pick.word || ANSWER_WORDS.has(w) || (dict ? dict.has(w) : isGeorgian(w));
    if (!known) { warn('ასეთი სიტყვა ლექსიკონში არ არის'); return; }
    triggerHaptic(20);
    setTyped('');
    save(today, afterTry(day, w));
  };

  // a physical keyboard: Georgian letters, or the Latin layout's keys as the standard Georgian layout maps them
  useEffect(() => {
    if (!pick || day.done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName))) return;
      if (window.history.state?.sgFind) return;
      if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); back(); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); type(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const share = async () => {
    const msg = sitqvaShareText(n, day);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  if (!loaded || !cal || !pick) return <div className="w-full max-w-2xl px-1 py-6 text-center text-[13px] text-[#8a7a6a]">იტვირთება…</div>;

  const rows = Array.from({ length: MAX_TRIES }, (_, r) => {
    const g = day.guesses[r];
    if (g) return { letters: [...g], marks: scoreGuess(g, pick.word) as (Mark | null)[], current: false };
    const current = r === day.guesses.length && !day.done;
    return { letters: current ? [...typed] : [], marks: null, current };
  });

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug">დღის სიტყვა · №{n}</p>
            <p className="mt-0.5 text-[13px] text-[#fbf6ec]/85">{dateLabel(today)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 px-3 h-9 text-[13px] font-bold tabular-nums" title="სერია">
            <Flame className="w-4 h-4" /> {stats.streak}
          </div>
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          გამოიცანი {len}-ასოიანი სიტყვა ექვს ცდაში. მწვანე ასო თავის ადგილზეა, ყვითელი სიტყვაშია, მაგრამ სხვაგან. ხვალ ახალი სიტყვა იქნება.
        </p>
        <p className="mt-2.5 inline-flex items-start gap-1.5 max-w-full rounded-2xl bg-white/15 px-3 py-1.5 text-[12.5px] font-bold leading-snug">
          <Lightbulb className="w-4 h-4 shrink-0 mt-px" /> <span>მინიშნება: {KIND_HINT[pick.kind]}</span>
        </p>
      </Card>

      <div
        className="mx-auto w-full space-y-1.5"
        style={{ maxWidth: len * 56 + (len - 1) * 6 }}
        role="group"
        aria-label={`ცდა ${day.guesses.length} ${MAX_TRIES}-დან`}
      >
        {rows.map((row, r) => (
          <div key={r} className={`grid gap-1.5 ${row.current && shaking ? 'sg-shake' : ''}`} style={{ gridTemplateColumns: `repeat(${len}, minmax(0, 1fr))` }}>
            {Array.from({ length: len }, (_, c) => {
              const ch = row.letters[c];
              const m = row.marks?.[c];
              const cls = m ? TILE[m]
                : row.current && ch ? 'bg-white ring-2 ring-[#4a3426]/45 text-[#2a2017]'
                : row.current ? 'bg-white ring-2 ring-[#7a2028]/30'
                : 'bg-white/70 ring-1 ring-[#e8dcc8]';
              return (
                <div key={c} className={`aspect-square rounded-xl flex items-center justify-center font-serif-ge text-[24px] font-bold leading-none transition-colors ${cls}`}>
                  {ch ?? ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!day.done ? (
        <GeoKeyboard marks={marks} onKey={type} onBack={back} onEnter={submit} />
      ) : (
        <Card tone="paper" className="!p-4">
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">{day.won ? `გამოიცანი ${day.guesses.length} ცდაში! 🎉` : 'დღეს ვერ გამოიცანი'}</p>
          <p className="mt-1.5 font-serif-ge text-[24px] font-bold leading-snug text-[#7a2028]">{pick.word}</p>
          <p className="text-[12.5px] text-[#75685a]">{KIND_HINT[pick.kind]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pick.life
              ? <Btn kind="ghost" icon={<BookOpen />} onClick={() => openSaintLife(pick.life!)}>წმინდანის ცხოვრება</Btn>
              : <Btn kind="ghost" icon={<Search />} onClick={() => openSearch(pick.word)}>ნახე აპში</Btn>}
            <Btn kind="ghost" icon={<Share2 />} onClick={share}>გაზიარება</Btn>
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-[#9a8b7b]">ხვალ ახალი სიტყვა იქნება. {member ? 'შედეგი შენს ჩანაწერშია.' : 'შედეგი ამ ტელეფონზე ინახება.'}</p>
        </Card>
      )}

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები" />
          <Stat value={stats.played ? `${Math.round((stats.won / stats.played) * 100)}%` : '–'} label="გამოცნობილი" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.best} label="საუკეთესო" />
        </div>
        <p className="mt-3 mb-1.5 text-[12.5px] font-bold text-[#75685a]">რამდენ ცდაში</p>
        <ul className="space-y-1">
          {stats.dist.map((c, i) => {
            const max = Math.max(1, ...stats.dist);
            return (
              <li key={i} className="flex items-center gap-2 text-[12px] tabular-nums text-[#75685a]">
                <span className="w-3 text-right">{i + 1}</span>
                <span className="flex-1 h-3 rounded-full bg-[#f1e8d9] overflow-hidden"><span className="block h-full rounded-full bg-[#7a2028]/70" style={{ width: `${(c / max) * 100}%` }} /></span>
                <span className="w-5 text-right">{c}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default SitqvaGame;
