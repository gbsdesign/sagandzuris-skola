import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Minus, Plus, RotateCcw, SkipForward, Trophy, Users } from 'lucide-react';
import { WORD_CATEGORIES } from '../../data/amikhseniWords';
import {
  DEFAULT_SETTINGS, MAX_TEAMS, SECONDS_CHOICES, TARGET_CHOICES, TEAM_NAMES, buildDeck, clock, nextTeam, totals, turnScore, winnerOf,
  type AliasSettings, type Turn, type TurnWord,
} from '../../utils/amikhseni';
import { Bar, Btn, Card, FIELD, Toggle, askConfirm } from '../../components/ui/kit';
import { TableScreen } from '../../components/games/TableScreen';
import { triggerHaptic } from '../../utils/haptics';

// „ამიხსენი“ (games hub, 2026-10-28, the Alias-like table game, hybrid): the phone is in the explainer's hand — it shows
// the word, the team guesses, „გამოიცნო“ is a point and „გამოტოვება“ costs one; the minute ends with a bell, the phone
// passes to the next team. The rules are utils/amikhseni.ts, the cards data/amikhseniWords.ts, the big screen
// components/games/TableScreen.tsx. Works offline; nothing is saved but the settings.

type Phase = 'setup' | 'ready' | 'play' | 'review' | 'board' | 'end';

const SETTINGS_KEY = 'sg-amikhseni';
const ALL_CATS = WORD_CATEGORIES.map(c => c.id);

const readSettings = (): { settings: AliasSettings; names: string[] } => {
  try {
    const o = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') as { settings?: Partial<AliasSettings>; names?: string[] } | null;
    const s = { ...DEFAULT_SETTINGS, categories: ALL_CATS, ...(o?.settings ?? {}) };
    s.teams = Math.min(MAX_TEAMS, Math.max(2, s.teams | 0));
    s.categories = s.categories.filter(c => ALL_CATS.includes(c));
    if (!s.categories.length) s.categories = ALL_CATS;
    const names = TEAM_NAMES.map((n, i) => (o?.names?.[i] || n).slice(0, 16));
    return { settings: s, names };
  } catch { return { settings: { ...DEFAULT_SETTINGS, categories: ALL_CATS }, names: [...TEAM_NAMES] }; }
};
const writeSettings = (settings: AliasSettings, names: string[]) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ settings, names })); } catch { /* private mode */ }
};

const AudioCtx = () => window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

/** The bell at the end of the minute: three short tones on the context the „წავედით!“ tap opened (a phone lets Web Audio
 *  sound only on a context made or resumed by a touch; the minute ends with no touch). */
const bell = (ctx: AudioContext | null) => {
  try {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => { /* stays silent */ });
    const now = ctx.currentTime;
    [0, 0.2, 0.4].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1046.5 : 784;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      o.start(now + t);
      o.stop(now + t + 0.2);
    });
  } catch { /* no audio: the vibration and the screen say it */ }
};

const Chip: React.FC<{ on: boolean; onClick: () => void; children: React.ReactNode }> = ({ on, onClick, children }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(5); onClick(); }}
    aria-pressed={on}
    className={`h-10 px-3.5 rounded-full text-[13px] font-bold ring-1 transition cursor-pointer active:scale-[0.97] ${on ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
  >
    {children}
  </button>
);

const TimerRing: React.FC<{ left: number; total: number }> = ({ left, total }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  const frac = total ? left / total : 0;
  const urgent = left <= 10;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1e8d9" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={urgent ? '#c0392b' : '#7a2028'} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-serif-ge text-[28px] font-bold tabular-nums ${urgent ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>{clock(left)}</div>
    </div>
  );
};

const AmikhseniGame: React.FC = () => {
  const [{ settings, names }, setConf] = useState(readSettings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [deck, setDeck] = useState<string[]>([]);
  const [at, setAt] = useState(0);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [words, setWords] = useState<TurnWord[]>([]);
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(0);
  const audioCtx = useRef<AudioContext | null>(null);
  useEffect(() => () => { audioCtx.current?.close().catch(() => { /* gone */ }); audioCtx.current = null; }, []);

  const set = (patch: Partial<AliasSettings>) => setConf(c => { const next = { settings: { ...c.settings, ...patch }, names: c.names }; writeSettings(next.settings, next.names); return next; });
  const rename = (i: number, name: string) => setConf(c => { const n = [...c.names]; n[i] = name.slice(0, 16); writeSettings(c.settings, n); return { settings: c.settings, names: n }; });

  const teamNames = names.slice(0, settings.teams);
  const scores = useMemo(() => totals(turns, settings.teams, settings.penalty), [turns, settings.teams, settings.penalty]);
  const team = nextTeam(turns.length, settings.teams);
  const winner = winnerOf(scores, settings.target, turns.length);
  const cardCount = useMemo(() => buildDeck(WORD_CATEGORIES, settings.categories, () => 0.5).length, [settings.categories]);

  const freshDeck = () => { setDeck(buildDeck(WORD_CATEGORIES, settings.categories)); setAt(0); };
  const start = () => {
    freshDeck();
    setTurns([]);
    setWords([]);
    setPhase('ready');
  };
  const go = () => {
    triggerHaptic(20);
    // the tap that starts the minute also opens (or wakes) the sound, so the bell may ring when the minute ends
    try {
      if (!audioCtx.current) audioCtx.current = new (AudioCtx())();
      if (audioCtx.current.state === 'suspended') audioCtx.current.resume().catch(() => { /* stays silent */ });
    } catch { /* no Web Audio: the vibration and the screen say it */ }
    setWords([]);
    setEndAt(Date.now() + settings.seconds * 1000);
    setLeft(settings.seconds);
    setPhase('play');
  };

  // the minute counts from a fixed end time, so a throttled tab stays honest
  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => {
      const ms = endAt - Date.now();
      const s = Math.max(0, Math.ceil(ms / 1000));
      setLeft(prev => { if (s === 10 && prev !== 10) triggerHaptic(30); return s; });
      if (ms <= 0) { clearInterval(t); bell(audioCtx.current); triggerHaptic(150); setPhase('review'); }
    }, 200);
    return () => clearInterval(t);
  }, [phase, endAt]);

  const word = deck[at] ?? '';
  const mark = (ok: boolean) => {
    if (phase !== 'play' || !word) return;
    triggerHaptic(ok ? 15 : 8);
    setWords(w => [...w, { word, ok }]);
    if (at + 1 >= deck.length) { setDeck(buildDeck(WORD_CATEGORIES, settings.categories)); setAt(0); } else setAt(at + 1);
  };
  const flip = (i: number) => { triggerHaptic(5); setWords(w => w.map((x, j) => (j === i ? { ...x, ok: !x.ok } : x))); };

  const confirmTurn = () => {
    triggerHaptic(10);
    const next = [...turns, { team, words }];
    setTurns(next);
    setWords([]);
    const w = winnerOf(totals(next, settings.teams, settings.penalty), settings.target, next.length);
    setPhase(w === null ? 'board' : 'end');
  };

  const quit = async () => {
    if (phase === 'end' || phase === 'ready' && turns.length === 0 || (await askConfirm('თამაში შეწყდეს? ქულები წაიშლება.'))) setPhase('setup');
  };

  const ok = words.filter(w => w.ok).length;
  const skipped = words.length - ok;

  if (phase === 'setup') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <Card tone="wine" className="!p-4 sm:!p-5">
          <p className="font-serif-ge text-[17px] font-bold leading-snug">ამიხსენი</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
            ერთი ტელეფონი მაგიდაზე. ამხსნელი ეკრანზე სიტყვას ხედავს და გუნდს სხვა სიტყვებით უხსნის — თვითონ სიტყვას (და მის ნაწილს) ვერ იტყვის.
            გამოიცნო — ქულა, გამოტოვება — მინუსი. წუთის ბოლოს ზარი დარეკავს და ტელეფონი შემდეგ გუნდს გადაეცემა.
          </p>
        </Card>

        <Card className="!p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები</p>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="ნაკლები გუნდი" disabled={settings.teams <= 2} onClick={() => { triggerHaptic(5); set({ teams: settings.teams - 1 }); }} className="w-10 h-10 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] disabled:opacity-40 cursor-pointer"><Minus className="w-4 h-4" /></button>
                <span className="w-8 text-center font-serif-ge text-[17px] font-bold tabular-nums">{settings.teams}</span>
                <button type="button" aria-label="მეტი გუნდი" disabled={settings.teams >= MAX_TEAMS} onClick={() => { triggerHaptic(5); set({ teams: settings.teams + 1 }); }} className="w-10 h-10 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] disabled:opacity-40 cursor-pointer"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {teamNames.map((n, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-6 text-center text-[12px] font-bold tabular-nums text-[#9a8b7b]">{i + 1}</span>
                  <input value={n} onChange={e => rename(i, e.target.value)} aria-label={`გუნდი ${i + 1}`} className={FIELD} maxLength={16} />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#4a3426]">ერთი სვლა</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SECONDS_CHOICES.map(s => <Chip key={s} on={settings.seconds === s} onClick={() => set({ seconds: s })}>{s} წამი</Chip>)}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#4a3426]">თამაში მიდის</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TARGET_CHOICES.map(t => <Chip key={t} on={settings.target === t} onClick={() => set({ target: t })}>{t} ქულამდე</Chip>)}
            </div>
          </div>

          <Toggle on={settings.penalty} onChange={v => set({ penalty: v })} label="გამოტოვება −1 ქულა" hint="გამორთე პატარებისთვის — გამოტოვება უბრალოდ არ ჩაითვლება" />

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#4a3426]">ბარათები</p>
              <span className="text-[12px] tabular-nums text-[#9a8b7b]">{cardCount} სიტყვა</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip on={settings.categories.length === ALL_CATS.length} onClick={() => set({ categories: settings.categories.length === ALL_CATS.length ? [ALL_CATS[0]] : ALL_CATS })}>ყველა</Chip>
              {WORD_CATEGORIES.map(c => {
                const on = settings.categories.includes(c.id);
                return (
                  <Chip
                    key={c.id}
                    on={on}
                    onClick={() => {
                      const next = on ? settings.categories.filter(x => x !== c.id) : [...settings.categories, c.id];
                      if (next.length) set({ categories: next });
                    }}
                  >
                    {c.label} <span className={`tabular-nums ${on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{c.words.length}</span>
                  </Chip>
                );
              })}
            </div>
          </div>

          <Btn size="lg" full onClick={start} icon={<ChevronRight />}>დაწყება</Btn>
        </Card>
      </div>
    );
  }

  const title = phase === 'end' ? 'ამიხსენი · დასასრული' : `ამიხსენი · ${teamNames[team]}`;

  return (
    <div className="w-full max-w-2xl">
      <TableScreen
        title={title}
        onClose={quit}
        right={phase !== 'end' ? <span className="text-[12px] tabular-nums text-[#9a8b7b] px-1">{settings.target} ქულამდე</span> : undefined}
        footer={
          phase === 'ready' ? <Btn size="lg" full onClick={go} className="!h-14 !text-[16px]">წავედით!</Btn>
          : phase === 'play' ? (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => mark(false)} className="h-16 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer">
                <SkipForward className="w-5 h-5" /> გამოტოვება
              </button>
              <button type="button" onClick={() => mark(true)} className="h-16 rounded-2xl bg-[#2f7d4f] text-white font-bold text-[17px] flex items-center justify-center gap-2 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer">
                <Check className="w-6 h-6" /> გამოიცნო
              </button>
            </div>
          )
          : phase === 'review' ? <Btn size="lg" full onClick={confirmTurn} icon={<Check />}>დადასტურება · {turnScore({ team, words }, settings.penalty)} ქულა</Btn>
          : phase === 'board' ? <Btn size="lg" full onClick={() => { triggerHaptic(10); setPhase('ready'); }} icon={<ChevronRight />}>შემდეგი: {teamNames[team]}</Btn>
          : (
            <div className="grid grid-cols-2 gap-3">
              <Btn kind="ghost" size="lg" onClick={() => setPhase('setup')}>მორჩა</Btn>
              <Btn size="lg" onClick={start} icon={<RotateCcw />}>თავიდან</Btn>
            </div>
          )
        }
      >
        {phase === 'ready' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
            <p className="text-[13px] font-bold text-[#9a8b7b]">ჯერია</p>
            <p className="font-serif-ge text-[36px] font-bold leading-tight text-[#7a2028] break-words max-w-full">{teamNames[team]}</p>
            <p className="text-[13px] tabular-nums text-[#75685a]">ქულა: {scores[team]} · სვლა {Math.floor(turns.length / settings.teams) + 1}</p>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-[#75685a]">
              ამხსნელმა აიღოს ტელეფონი. სიტყვას სხვა სიტყვებით უხსნის — თვითონ სიტყვას და მის ნაწილს არ ამბობს. {settings.seconds} წამის ბოლოს ზარი დარეკავს.
            </p>
          </div>
        )}

        {phase === 'play' && (
          <div className="flex-1 flex flex-col gap-4 py-2">
            <TimerRing left={left} total={settings.seconds} />
            <div className="flex-1 flex items-center justify-center rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-5 py-8 min-h-[160px]">
              <p className="font-serif-ge text-[34px] sm:text-[40px] font-bold leading-tight text-center text-[#4a3426] break-words max-w-full">{word}</p>
            </div>
            <p className="text-center text-[13px] tabular-nums text-[#75685a]">
              <span className="text-[#2f7d4f] font-bold">✓ {ok}</span> · <span className="text-[#8a4a2a] font-bold">− {skipped}</span> · დარჩა {Math.max(0, deck.length - at)} ბარათი
            </p>
          </div>
        )}

        {phase === 'review' && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            <div className="text-center">
              <p className="text-[13px] font-bold text-[#9a8b7b]">დრო ამოიწურა</p>
              <p className="font-serif-ge text-[28px] font-bold leading-tight text-[#7a2028]">{teamNames[team]}: {turnScore({ team, words }, settings.penalty)} ქულა</p>
              <p className="mt-1 text-[12.5px] text-[#9a8b7b]">შეცდომით დააჭირე? შეეხე სიტყვას და გასწორდება.</p>
            </div>
            {words.length ? (
              <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
                {words.map((w, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => flip(i)} className="w-full flex items-center gap-3 px-3 min-h-12 py-2 text-left cursor-pointer hover:bg-[#fbf6ec]">
                      <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold ${w.ok ? 'bg-[#2f7d4f]/10 text-[#2f7d4f]' : 'bg-[#8a4a2a]/10 text-[#8a4a2a]'}`}>{w.ok ? '✓' : '−'}</span>
                      <span className="text-[15px] text-[#4a3426]">{w.word}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-center text-[13px] text-[#9a8b7b]">არც ერთი სიტყვა არ ჩაითვალა.</p>}
          </div>
        )}

        {(phase === 'board' || phase === 'end') && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            {phase === 'end' && winner !== null && (
              <div className="text-center py-3">
                <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" />
                <p className="mt-2 text-[13px] font-bold text-[#9a8b7b]">გამარჯვებულია</p>
                <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#7a2028]">{teamNames[winner]}</p>
                <p className="mt-1 text-[12.5px] text-[#75685a]">წაგებულმა გამარჯვებულს მიულოცოს — ასეა წესი.</p>
              </div>
            )}
            <ul className="space-y-2.5">
              {teamNames.map((n, i) => (
                <li key={i} className={`rounded-2xl bg-white ring-1 px-3 py-2.5 ${phase === 'board' && i === team ? 'ring-[#7a2028]/50' : 'ring-[#e8dcc8]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-serif-ge text-[15px] font-bold text-[#4a3426] truncate">{n}</span>
                    <span className="text-[15px] font-bold tabular-nums text-[#7a2028]">{scores[i]}</span>
                  </div>
                  <div className="mt-1.5"><Bar value={Math.max(0, scores[i])} max={settings.target} tone={phase === 'end' && i === winner ? 'green' : 'wine'} /></div>
                </li>
              ))}
            </ul>
            {phase === 'board' && <p className="text-center text-[12.5px] text-[#9a8b7b]">სვლა {Math.floor(turns.length / settings.teams) + 1} · {settings.target} ქულამდე; ვინც ყველა გუნდის სვლის ბოლოს მეტს დააგროვებს, იგებს.</p>}
          </div>
        )}
      </TableScreen>
    </div>
  );
};

export default AmikhseniGame;
