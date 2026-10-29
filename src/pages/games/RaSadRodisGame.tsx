import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Minus, PenLine, Play, Plus, RotateCcw, Shuffle, Square, Timer, Trash2, Trophy, Users,
} from 'lucide-react';
import { useMembership } from '../../utils/memberAccess';
import { hangiPool } from '../../data/hangiPool';
import { RSR_QUESTIONS, RSR_TOPICS, type RsrQuestion } from '../../data/raSadRodisQuestions';
import {
  A_MAX, COUNT_CHOICES, DEFAULT_SETTINGS, LISTEN, MAX_TEAMS, MINE, MINE_MAX, MIN_TEAMS, Q_MAX, SECONDS, SNIPPET, WARN_AT,
  drawGame, listenQuestion, parseGame, parseMine, placesOf, rememberSeen, scoresOf,
  type RsrAudio, type RsrGame, type RsrPhase, type RsrPlay, type RsrSettings,
} from '../../utils/raSadRodis';
import { TEAM_NAMES, clock } from '../../utils/amikhseni';
import { startOffset } from '../../utils/churchkhela';
import { Bar, Btn, Card, FIELD, IconBtn, Pill, askConfirm, offerUndo } from '../../components/ui/kit';
import { TableScreen } from '../../components/games/TableScreen';
import { Chip } from '../../components/games/Chip';
import { bell, closeAudio, openAudio, tick } from '../../utils/gameSounds';
import { triggerHaptic } from '../../utils/haptics';

// „რა? სად? როდის?“ (games hub, 2026-10-28, live, hybrid): a team quiz in the school's own topics. The host reads a
// question out (a „მოისმინე“ one also plays a 20-second piece of a school recording), every team writes its answer on
// paper within the minute the phone counts, the bell rings, the answer comes up and the host ticks the teams that got it.
// The game is kept on the device after every step, so a closed page goes on where it stopped; the device also remembers
// the questions asked, so the next games ask others first, and keeps the teacher's own questions. Rules
// utils/raSadRodis.ts, questions data/raSadRodisQuestions.ts, recordings data/hangiPool.ts (every <audio> of a Worker URL
// carries crossOrigin, as ChantPlayer does), the big screen components/games/TableScreen.tsx.

const KEY = 'sg-rsr';
const GAME_KEY = 'sg-rsr-game';
const SEEN_KEY = 'sg-rsr-seen';
const MINE_KEY = 'sg-rsr-mine';

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

const readConf = (): { settings: RsrSettings; names: string[] } => {
  const o = load(KEY) as { settings?: Partial<RsrSettings>; names?: unknown[] } | null;
  const s = { ...DEFAULT_SETTINGS, ...(o?.settings ?? {}) };
  s.teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(Number(s.teams)) || DEFAULT_SETTINGS.teams));
  if (!COUNT_CHOICES.includes(s.count)) s.count = DEFAULT_SETTINGS.count;
  s.topics = Array.isArray(s.topics) ? s.topics.filter((t): t is string => typeof t === 'string') : [];
  const names = TEAM_NAMES.map((n, i) => { const v = o?.names?.[i]; return (typeof v === 'string' && v ? v : n).slice(0, 16); });
  return { settings: s, names };
};
const readSeen = (): string[] => { const v = load(SEEN_KEY); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; };
const readGame = () => { const g = parseGame(load(GAME_KEY)); return g && g.phase !== 'end' ? g : null; };

const LISTEN_LABEL = 'მოისმინე';
const MINE_LABEL = 'ჩემი კითხვები';
const topicLabel = (id: string) => RSR_TOPICS.find(t => t.id === id)?.label ?? (id === LISTEN ? LISTEN_LABEL : id === MINE ? MINE_LABEL : '');

type Snip = 'idle' | 'load' | 'play' | 'done' | 'error';
const SNIP_TEXT: Record<Snip, string> = {
  idle: `ნაწყვეტი · ${SNIPPET} წამი`,
  load: 'იტვირთება…',
  play: 'ისმის…',
  done: 'კიდევ ერთხელ',
  error: 'ჩანაწერი ვერ ჩაირთო, სცადე ხელახლა',
};

const TimerRing: React.FC<{ left: number; urgent: boolean }> = ({ left, urgent }) => {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1e8d9" strokeWidth="8" />
        {left > 0 && <circle cx="50" cy="50" r={r} fill="none" stroke={urgent ? '#c0392b' : '#7a2028'} strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / SECONDS)} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />}
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-serif-ge text-[24px] font-bold tabular-nums ${urgent ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>{clock(left)}</div>
    </div>
  );
};

const SnippetBox: React.FC<{ state: Snip; prog: number; onTap: () => void }> = ({ state, prog, onTap }) => {
  const busy = state === 'play' || state === 'load';
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3">
      <button
        type="button"
        onClick={onTap}
        aria-label={busy ? 'გაჩერება' : 'ნაწყვეტის მოსმენა'}
        className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)] active:scale-[0.96] cursor-pointer"
      >
        {busy ? <Square className="w-4 h-4 fill-current" /> : state === 'done' ? <RotateCcw className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-bold leading-snug ${state === 'error' ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>{SNIP_TEXT[state]}</p>
        <div className="mt-1.5 h-1.5 rounded-full bg-[#f1e8d9] overflow-hidden">
          <div className={`h-full rounded-full bg-[#7a2028] ${state === 'load' ? 'animate-pulse' : ''}`} style={{ width: `${Math.round(prog * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

const RaSadRodisGame: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const [{ settings, names }, setConf] = useState(readConf);
  const [mine, setMine] = useState<RsrQuestion[]>(() => parseMine(load(MINE_KEY)));
  const [game, setGame] = useState<RsrGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [run, setRun] = useState<'idle' | 'run' | 'up'>('idle');
  const [endAt, setEndAt] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [snip, setSnip] = useState<{ state: Snip; prog: number }>({ state: 'idle', prog: 0 });
  const [mineOpen, setMineOpen] = useState(false);
  const [draft, setDraft] = useState({ q: '', a: '', note: '' });
  const [showAll, setShowAll] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const lastLeft = useRef(SECONDS);
  const player = useRef<HTMLAudioElement | null>(null);
  const playerOf = useRef('');
  const from = useRef<number | null>(null);

  const dropPlayer = () => {
    const a = player.current;
    if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
    player.current = null;
    playerOf.current = '';
    from.current = null;
  };
  const stopPlayer = () => { dropPlayer(); setSnip({ state: 'idle', prog: 0 }); };
  useEffect(() => () => { dropPlayer(); closeAudio(audioCtx); }, []);

  // the game is kept after every step (a finished one is let go)
  useEffect(() => save(GAME_KEY, game && game.phase !== 'end' ? game : null), [game]);

  // the recordings a member may hear make the „მოისმინე“ questions (none for guests: App.tsx hides them first)
  const pool = useMemo(() => hangiPool(), [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const topics = useMemo(() => [
    ...RSR_TOPICS.map(t => ({ id: t.id, label: t.label, n: RSR_QUESTIONS.filter(q => q.topic === t.id).length })),
    ...(pool.length ? [{ id: LISTEN, label: LISTEN_LABEL, n: pool.length }] : []),
    ...(mine.length ? [{ id: MINE, label: MINE_LABEL, n: mine.length }] : []),
  ], [pool, mine]);
  const allIds = topics.map(t => t.id);
  const chosen = settings.topics.filter(t => allIds.includes(t));
  const active = chosen.length ? chosen : allIds;
  const allOn = active.length === allIds.length;
  const available = topics.filter(t => active.includes(t.id)).reduce((s, t) => s + t.n, 0);

  const set = (patch: Partial<RsrSettings>) => setConf(c => { const next = { settings: { ...c.settings, ...patch }, names: c.names }; save(KEY, next); return next; });
  const rename = (i: number, name: string) => setConf(c => { const n = [...c.names]; n[i] = name.slice(0, 16); const next = { settings: c.settings, names: n }; save(KEY, next); return next; });
  const toggleTopic = (id: string) => {
    const next = active.includes(id) ? active.filter(t => t !== id) : [...active, id];
    if (next.length) set({ topics: next.length === allIds.length ? [] : next });
  };

  const teamNames = names.slice(0, settings.teams);
  const resumable = !!game && game.phase !== 'end';
  const q = game?.questions[game.index];
  const scores = useMemo(() => (game ? scoresOf(game.marks, game.names.length) : []), [game]);

  // a recording's question that is in none of `taken`
  const listenFrom = (taken: Set<string>) => (used: Set<string>): RsrPlay | null => {
    const rest = pool.filter(p => !used.has(`l:${p.id}`) && !taken.has(`l:${p.id}`));
    return rest.length ? listenQuestion(rest[Math.floor(Math.random() * rest.length)]) : null;
  };

  const begin = async () => {
    if (resumable && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const questions = drawGame({ bank: [...RSR_QUESTIONS, ...mine], topics: active, count: settings.count, seen: readSeen(), listen: listenFrom(new Set()) });
    if (!questions.length) return;
    stopPlayer();
    setRun('idle');
    setShowAll(false);
    setGame({ names: teamNames.map((n, i) => n.trim() || TEAM_NAMES[i]), questions, index: 0, marks: questions.map(() => []), phase: 'ask' });
    setOpen(true);
  };
  const resume = () => { triggerHaptic(10); setRun('idle'); setOpen(true); };
  const close = () => { stopPlayer(); setRun('idle'); setOpen(false); if (game?.phase === 'end') setGame(null); };

  const startMinute = () => {
    triggerHaptic(20);
    // the tap that starts the minute also opens the sound, so the bell may ring at its end
    openAudio(audioCtx);
    lastLeft.current = SECONDS;
    setLeft(SECONDS);
    setEndAt(Date.now() + SECONDS * 1000);
    setRun('run');
  };

  // the minute counts from a fixed end time, so a throttled tab stays honest; a tick at ten and at the last three seconds
  useEffect(() => {
    if (run !== 'run') return;
    const t = setInterval(() => {
      const ms = endAt - Date.now();
      const s = Math.max(0, Math.ceil(ms / 1000));
      if (s !== lastLeft.current) {
        lastLeft.current = s;
        setLeft(s);
        if (s === WARN_AT || (s > 0 && s <= 3)) { tick(audioCtx.current); triggerHaptic(30); }
      }
      if (ms <= 0) { clearInterval(t); bell(audioCtx.current); triggerHaptic(150); setRun('up'); }
    }, 200);
    return () => clearInterval(t);
  }, [run, endAt]);

  const step = (index: number, phase: RsrPhase) => {
    if (!game) return;
    triggerHaptic(10);
    stopPlayer();
    setRun('idle');
    setGame({ ...game, index, phase });
  };
  const reveal = () => {
    if (!game || !q) return;
    save(SEEN_KEY, rememberSeen(readSeen(), [q.id]));
    triggerHaptic(10);
    setRun('idle');
    setGame({ ...game, phase: 'answer' });
  };
  const next = () => {
    if (!game) return;
    if (game.index + 1 < game.questions.length) step(game.index + 1, 'ask');
    else step(game.index, 'end');
  };
  const toggleTeam = (team: number) => {
    triggerHaptic(8);
    setGame(g => g && { ...g, marks: g.marks.map((m, i) => (i !== g.index ? m : m.includes(team) ? m.filter(t => t !== team) : [...m, team].sort((a, b) => a - b))) });
  };
  // another question in place of this one: of its topic if one is left, else of the game's topics
  const swap = () => {
    if (!game || !q) return;
    const taken = new Set(game.questions.map(x => x.id));
    const bank = [...RSR_QUESTIONS, ...mine].filter(x => !taken.has(x.id));
    const draw = (topics: string[]) => drawGame({ bank, topics, count: 1, seen: readSeen(), listen: listenFrom(taken) })[0];
    const fresh = draw([q.topic]) ?? draw(active);
    if (!fresh) return;
    triggerHaptic(10);
    stopPlayer();
    setRun('idle');
    setGame({ ...game, questions: game.questions.map((x, i) => (i === game.index ? fresh : x)), marks: game.marks.map((m, i) => (i === game.index ? [] : m)) });
  };

  const playSnippet = (id: string, audio: RsrAudio) => {
    triggerHaptic(10);
    const cur = player.current;
    if (cur && playerOf.current === id && snip.state !== 'error') {
      if (!cur.paused) { cur.pause(); setSnip(s => ({ ...s, state: 'done' })); return; }
      if (from.current !== null) cur.currentTime = from.current;
      setSnip({ state: 'load', prog: 0 });
      cur.play().catch(() => { /* the error event says it */ });
      return;
    }
    dropPlayer();
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.src = audio.url;
    player.current = a;
    playerOf.current = id;
    const isCur = () => player.current === a;
    // a piece from somewhere inside the recording, the same one again on „კიდევ ერთხელ“
    a.addEventListener('loadedmetadata', () => {
      if (!isCur()) return;
      from.current = startOffset(a.duration, SNIPPET, Math.random);
      try { a.currentTime = from.current; } catch { from.current = 0; }
    });
    a.addEventListener('playing', () => { if (isCur()) setSnip(s => ({ ...s, state: 'play' })); });
    a.addEventListener('waiting', () => { if (isCur()) setSnip(s => ({ ...s, state: 'load' })); });
    a.addEventListener('timeupdate', () => {
      if (!isCur() || from.current === null) return;
      const p = (a.currentTime - from.current) / SNIPPET;
      if (p >= 1) { a.pause(); setSnip({ state: 'done', prog: 1 }); } else setSnip(s => ({ ...s, prog: Math.max(0, p) }));
    });
    a.addEventListener('ended', () => { if (isCur()) setSnip({ state: 'done', prog: 1 }); });
    a.addEventListener('error', () => { if (isCur()) setSnip({ state: 'error', prog: 0 }); });
    setSnip({ state: 'load', prog: 0 });
    a.play().catch((e: unknown) => { if (isCur() && (e as Error)?.name !== 'AbortError') setSnip({ state: 'error', prog: 0 }); });
  };

  const writeMine = (list: RsrQuestion[]) => { setMine(list); save(MINE_KEY, list); };
  const addMine = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.q.trim(), answer = draft.a.trim(), note = draft.note.trim();
    if (!text || !answer || mine.length >= MINE_MAX) return;
    triggerHaptic(10);
    writeMine([...mine, { id: `m:${Date.now().toString(36)}`, topic: MINE, q: text.slice(0, Q_MAX), a: answer.slice(0, A_MAX), ...(note ? { note: note.slice(0, Q_MAX) } : {}) }]);
    setDraft({ q: '', a: '', note: '' });
  };
  const removeMine = (id: string) => {
    const before = mine;
    writeMine(mine.filter(x => x.id !== id));
    offerUndo('კითხვა წაიშალა', () => writeMine(before));
  };

  if (!open || !game) {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <Card tone="wine" className="!p-4 sm:!p-5">
          <p className="font-serif-ge text-[17px] font-bold leading-snug">რა? სად? როდის?</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
            გუნდური ვიქტორინა ჩვენი თემებით. წამყვანი კითხვას ხმამაღლა კითხულობს და ყველა გუნდი ერთ წუთში პასუხს ფურცელზე წერს.
            ზარის მერე წამყვანი ფურცლებს აგროვებს, ტელეფონზე პასუხს აჩენს და მონიშნავს, ვინ გამოიცნო. ქულებს ტელეფონი ითვლის.
          </p>
        </Card>

        {resumable && (
          <Card className="!p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-52">
                <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · კითხვა {game.index + 1} / {game.questions.length}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{game.names.map((n, i) => `${n} ${scores[i]}`).join(' · ')}</p>
              </div>
              <Btn onClick={resume} icon={<Play />}>გაგრძელება</Btn>
            </div>
          </Card>
        )}

        <Card className="!p-4 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები</p>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="ნაკლები გუნდი" disabled={settings.teams <= MIN_TEAMS} onClick={() => { triggerHaptic(5); set({ teams: settings.teams - 1 }); }} className="w-10 h-10 rounded-full ring-1 ring-[#e8dcc8] bg-white flex items-center justify-center text-[#7a2028] disabled:opacity-40 cursor-pointer"><Minus className="w-4 h-4" /></button>
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
            <p className="text-[13px] font-bold text-[#4a3426]">რამდენი კითხვა</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COUNT_CHOICES.map(c => <Chip key={c} on={settings.count === c} onClick={() => set({ count: c })}>{c} კითხვა</Chip>)}
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-[#9a8b7b]">თითო კითხვას ერთი წუთი აქვს; {settings.count} კითხვა დაახლოებით {Math.round(settings.count / 3) * 5} წუთია.</p>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#4a3426]">თემები</p>
              <span className="text-[12px] tabular-nums text-[#9a8b7b]">{available} კითხვა</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip on={allOn} onClick={() => set({ topics: allOn ? [allIds[0]] : [] })}>ყველა</Chip>
              {topics.map(t => {
                const on = active.includes(t.id);
                return (
                  <Chip key={t.id} on={on} onClick={() => toggleTopic(t.id)}>
                    {t.label} <span className={`tabular-nums ${on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{t.n}</span>
                  </Chip>
                );
              })}
            </div>
            {pool.length > 0 && (
              <p className="mt-2 text-[12.5px] leading-snug text-[#9a8b7b]">
                „მოისმინე“: ტელეფონი სკოლის ჩანაწერის {SNIPPET}-წამიან ნაწყვეტს უკრავს. რომელი საგალობელია, რომელი დღესასწაულის, რომელი კუთხის სიმღერა?
              </p>
            )}
          </div>

          <Btn size="lg" full onClick={begin} disabled={!available} icon={<ChevronRight />}>{resumable ? 'ახალი თამაში' : 'დაწყება'}</Btn>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <button type="button" onClick={() => { triggerHaptic(5); setMineOpen(o => !o); }} aria-expanded={mineOpen} className="w-full flex items-center gap-3 px-4 min-h-14 py-3 text-left cursor-pointer hover:bg-[#fbf6ec]/60">
            <PenLine className="w-5 h-5 shrink-0 text-[#7a2028]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold text-[#4a3426]">ჩემი კითხვები</span>
              <span className="block text-[12.5px] leading-snug text-[#9a8b7b]">{mine.length ? `${mine.length} კითხვა · თამაშში თემად ჩანს` : 'დაწერე შენი კითხვები შენი კლასისთვის'}</span>
            </span>
            <ChevronDown className={`w-5 h-5 shrink-0 text-[#9a8b7b] transition ${mineOpen ? 'rotate-180' : ''}`} />
          </button>
          {mineOpen && (
            <div className="px-4 pb-4 pt-3 space-y-3 border-t border-[#f1e8d9]">
              {mine.length > 0 && (
                <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
                  {mine.map(x => (
                    <li key={x.id} className="flex items-start gap-2 pl-3 pr-1.5 py-2">
                      <span className="min-w-0 flex-1 py-0.5">
                        <span className="block text-[14px] leading-snug text-[#4a3426] break-words">{x.q}</span>
                        <span className="mt-0.5 block text-[13px] font-bold leading-snug text-[#7a2028] break-words">{x.a}</span>
                      </span>
                      <IconBtn label="კითხვის წაშლა" tone="danger" onClick={() => removeMine(x.id)}><Trash2 /></IconBtn>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={addMine} className="space-y-2">
                <textarea value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))} rows={3} maxLength={Q_MAX} placeholder="კითხვა" aria-label="კითხვა" className={`${FIELD} !h-auto py-2.5 leading-snug resize-none`} />
                <input value={draft.a} onChange={e => setDraft(d => ({ ...d, a: e.target.value }))} maxLength={A_MAX} placeholder="პასუხი" aria-label="პასუხი" className={FIELD} />
                <input value={draft.note} onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} maxLength={Q_MAX} placeholder="განმარტება (არასავალდებულო)" aria-label="განმარტება" className={FIELD} />
                <Btn type="submit" full icon={<Plus />} disabled={!draft.q.trim() || !draft.a.trim() || mine.length >= MINE_MAX}>დამატება</Btn>
              </form>
              <p className="text-[12px] leading-snug text-[#9a8b7b]">ინახება მხოლოდ ამ მოწყობილობაზე.</p>
            </div>
          )}
        </Card>

        <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
          კითხვები აპის ტექსტებიდან (კალენდარი, წმინდანთა ცხოვრება, საღმრთო ისტორია, სიმღერების არქივი…) ხელოვნურმა ინტელექტმა შეადგინა და მასწავლებელს ჯერ არ შეუმოწმებია.
          ტელეფონს ახსოვს უკვე დასმული კითხვები, ამიტომ შემდეგ თამაშში ჯერ ახლები მოვა.
        </p>
      </div>
    );
  }

  const n = game.questions.length;
  const marks = game.marks[game.index] ?? [];
  const title = game.phase === 'end' ? 'რა? სად? როდის? · შედეგები' : `რა? სად? როდის? · ${game.index + 1} / ${n}`;
  const urgent = run === 'up' || (run === 'run' && left <= WARN_AT);
  const best = Math.max(0, ...scores);
  const places = placesOf(scores);
  const order = game.names.map((_, i) => i).sort((a, b) => scores[b] - scores[a] || a - b);
  const winners = best > 0 ? game.names.filter((_, i) => scores[i] === best) : [];

  return (
    <div className="w-full max-w-2xl">
      <TableScreen
        title={title}
        onClose={close}
        footer={
          game.phase === 'ask' ? (
            run === 'idle' ? (
              <div className="flex gap-3">
                <Btn kind="ghost" size="lg" onClick={reveal} icon={<Eye />} className="!h-14 !px-5">პასუხი</Btn>
                <Btn size="lg" onClick={startMinute} icon={<Timer />} className="!h-14 !text-[16px] flex-1">წუთი!</Btn>
              </div>
            ) : <Btn kind={run === 'up' ? 'primary' : 'ghost'} size="lg" full onClick={reveal} icon={<Eye />} className="!h-14 !text-[16px]">პასუხის ჩვენება</Btn>
          )
          : game.phase === 'answer' ? (
            <Btn size="lg" full onClick={next} icon={game.index + 1 < n ? <ChevronRight /> : <Trophy />} className="!h-14 !text-[16px]">{game.index + 1 < n ? 'შემდეგი კითხვა' : 'შედეგები'}</Btn>
          )
          : (
            <div className="grid grid-cols-2 gap-3">
              <Btn kind="ghost" size="lg" onClick={close}>მორჩა</Btn>
              <Btn size="lg" onClick={begin} icon={<RotateCcw />}>თავიდან</Btn>
            </div>
          )
        }
      >
        {game.phase === 'ask' && q && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            {run !== 'idle' && (
              <div className="flex items-center gap-4 rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3">
                <TimerRing left={left} urgent={urgent} />
                <div className="min-w-0">
                  <p className={`font-serif-ge text-[20px] font-bold leading-tight ${urgent ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>{run === 'up' ? 'დრო!' : urgent ? 'ბოლო წამები!' : 'გუნდები ფიქრობენ'}</p>
                  <p className="mt-1 text-[13px] leading-snug text-[#75685a]">{run === 'up' ? 'ფურცლები წამყვანს მიაწოდეთ' : 'პასუხი ფურცელზე დაწერეთ'}</p>
                </div>
              </div>
            )}
            <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-5 py-5">
              <Pill>{topicLabel(q.topic)}</Pill>
              <p className="mt-3 font-serif-ge text-[21px] sm:text-[24px] font-bold leading-snug text-[#4a3426] break-words">{q.q}</p>
            </div>
            {q.audio && <SnippetBox state={snip.state} prog={snip.prog} onTap={() => q.audio && playSnippet(q.id, q.audio)} />}
            {run === 'idle' && (
              <p className="px-1 text-[13px] leading-relaxed text-[#75685a]">
                {q.audio ? 'წაიკითხე კითხვა ხმამაღლა და ჩართე ნაწყვეტი, მერე დააჭირე „წუთი!“.' : 'წაიკითხე კითხვა ხმამაღლა, მერე დააჭირე „წუთი!“.'} გუნდები პასუხს ფურცელზე წერენ.
              </p>
            )}
            {run === 'idle' && (
              <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-1">
                {game.index > 0 ? (
                  <button type="button" onClick={() => step(game.index - 1, 'answer')} className="inline-flex items-center gap-1 h-10 px-2 -ml-2 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
                    <ChevronLeft className="w-4 h-4" /> წინა პასუხი
                  </button>
                ) : <span />}
                <button type="button" onClick={swap} className="inline-flex items-center gap-1.5 h-10 px-2 -mr-2 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
                  <Shuffle className="w-4 h-4" /> სხვა კითხვა
                </button>
              </div>
            )}
          </div>
        )}

        {game.phase === 'answer' && q && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            <p className="px-1 text-[13px] leading-snug text-[#75685a] break-words"><span className="font-bold text-[#9a8b7b]">{topicLabel(q.topic)}.</span> {q.q}</p>
            <div className="rounded-3xl bg-[#7a2028]/[0.06] ring-1 ring-[#7a2028]/20 px-5 py-4">
              <p className="text-[12px] font-bold text-[#9a8b7b]">პასუხი</p>
              <p className="mt-1 font-serif-ge text-[26px] font-bold leading-tight text-[#7a2028] break-words">{q.a}</p>
              {q.note && <p className="mt-1.5 text-[13px] leading-snug text-[#75685a] break-words">{q.note}</p>}
            </div>
            {q.audio && <SnippetBox state={snip.state} prog={snip.prog} onTap={() => q.audio && playSnippet(q.id, q.audio)} />}
            <p className="mt-1 px-1 text-[13px] font-bold text-[#4a3426]">ვინ გამოიცნო?</p>
            <div className="grid grid-cols-2 gap-2">
              {game.names.map((name, i) => {
                const on = marks.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleTeam(i)}
                    aria-pressed={on}
                    className={`min-h-14 rounded-2xl px-3 py-2 flex items-center gap-2 text-left ring-1 transition active:scale-[0.97] cursor-pointer ${on ? 'bg-[#2f7d4f] text-white ring-[#2f7d4f] shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)]' : 'bg-white text-[#4a3426] ring-[#e8dcc8]'}`}
                  >
                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${on ? 'bg-white/20' : 'ring-1 ring-[#d9cbb5]'}`}>{on && <Check className="w-4 h-4" />}</span>
                    <span className="min-w-0 flex-1 text-[15px] font-bold leading-tight break-words">{name}</span>
                    <span className={`text-[14px] font-bold tabular-nums ${on ? 'text-white/85' : 'text-[#9a8b7b]'}`}>{scores[i]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {game.phase === 'end' && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            <div className="text-center py-3">
              <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" />
              {winners.length ? (
                <>
                  <p className="mt-2 text-[13px] font-bold text-[#9a8b7b]">{winners.length > 1 ? 'გაიმარჯვეს' : 'გაიმარჯვა'}</p>
                  <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028] break-words">{winners.join(' და ')}</p>
                  <p className="mt-1 text-[13px] tabular-nums text-[#75685a]">{best} სწორი პასუხი {n}-დან</p>
                </>
              ) : <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#7a2028]">ამჯერად ქულა არავის აქვს</p>}
            </div>
            <ul className="space-y-2.5">
              {order.map(i => (
                <li key={i} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums ${places[i] === 1 && best > 0 ? 'bg-[#b8860b]/15 text-[#8a6508]' : 'bg-[#f1e8d9] text-[#75685a]'}`}>{places[i]}</span>
                    <span className="min-w-0 flex-1 font-serif-ge text-[15px] font-bold leading-tight text-[#4a3426] break-words">{game.names[i]}</span>
                    <span className="text-[15px] font-bold tabular-nums text-[#7a2028]">{scores[i]}</span>
                  </div>
                  <div className="mt-1.5 pl-10"><Bar value={scores[i]} max={n} tone={places[i] === 1 && best > 0 ? 'green' : 'wine'} /></div>
                </li>
              ))}
            </ul>
            <div className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden">
              <button type="button" onClick={() => { triggerHaptic(5); setShowAll(s => !s); }} aria-expanded={showAll} className="w-full flex items-center gap-2 px-3 min-h-12 py-2 text-left cursor-pointer hover:bg-[#fbf6ec]">
                <span className="min-w-0 flex-1 text-[14px] font-bold text-[#4a3426]">კითხვები და პასუხები</span>
                <ChevronDown className={`w-5 h-5 shrink-0 text-[#9a8b7b] transition ${showAll ? 'rotate-180' : ''}`} />
              </button>
              {showAll && (
                <ol className="divide-y divide-[#f1e8d9] border-t border-[#f1e8d9]">
                  {game.questions.map((x, i) => (
                    <li key={x.id} className="px-3 py-2.5">
                      <p className="text-[13px] leading-snug text-[#4a3426] break-words"><span className="font-bold tabular-nums text-[#9a8b7b]">{i + 1}.</span> {x.q}</p>
                      <p className="mt-0.5 text-[13px] font-bold leading-snug text-[#7a2028] break-words">{x.a}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-[#9a8b7b]">{game.marks[i].length ? `✓ ${game.marks[i].map(t => game.names[t]).join(', ')}` : 'ვერავინ გამოიცნო'}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </TableScreen>
    </div>
  );
};

export default RaSadRodisGame;
