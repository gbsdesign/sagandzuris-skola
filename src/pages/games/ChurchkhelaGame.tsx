import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, Flame, Music2, RotateCcw, X } from 'lucide-react';
import { useMembership } from '../../utils/memberAccess';
import { hangiPool, type HangiItem } from '../../data/hangiPool';
import {
  DEFAULT_SETTINGS, KIND_LABEL, RANGES, ROUNDS_CHOICES, pickItem, pickTask, roundSeconds, startOffset, tally,
  type ChurchkhelaSettings, type Round, type Source, type Task, type TaskMode,
} from '../../utils/churchkhela';
import { Btn, Card, askConfirm } from '../../components/ui/kit';
import { TableScreen } from '../../components/games/TableScreen';
import { Chip } from '../../components/games/Chip';
import { bell, closeAudio, openAudio } from '../../utils/gameSounds';
import { triggerHaptic } from '../../utils/haptics';

// „ცხელი ჩურჩხელა“ (games hub, 2026-10-28, live, Hot Potato): the phone plays a recording of the school through its
// speaker while the churchkhela goes round; the music stops at a moment nobody knows (5–45 s), the bell rings, and
// whoever holds it is „burnt“: a task card comes up (sing the next phrase, name the chant…). Without recordings (a
// guest) the teacher sings and the phone only keeps the time. The rules are utils/churchkhela.ts, the recordings
// data/hangiPool.ts (every <audio> of a Worker URL carries crossOrigin, as ChantPlayer does), the big screen
// components/games/TableScreen.tsx. Nothing is saved but the settings.

type Phase = 'setup' | 'ready' | 'play' | 'stop' | 'end';
interface Current { item?: HangiItem; task: Task | null; seconds: number }

const KEY = 'sg-churchkhela';
const TASK_MODES: { id: TaskMode; label: string }[] = [
  { id: 'random', label: 'შემთხვევითი' }, { id: 'sing', label: 'იმღერე' }, { id: 'name', label: 'დაასახელე' }, { id: 'where', label: 'საიდანაა' }, { id: 'fun', label: 'სახალისო' }, { id: 'none', label: 'დავალების გარეშე' },
];

const readSettings = (): ChurchkhelaSettings => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ChurchkhelaSettings> | null;
    const s = { ...DEFAULT_SETTINGS, ...(o ?? {}) };
    if (!['all', 'chant', 'song', 'voice'].includes(s.source)) s.source = 'all';
    if (!RANGES.some(r => r.id === s.range)) s.range = DEFAULT_SETTINGS.range;
    if (!TASK_MODES.some(m => m.id === s.tasks)) s.tasks = 'random';
    if (!(ROUNDS_CHOICES as readonly number[]).includes(s.rounds)) s.rounds = DEFAULT_SETTINGS.rounds;
    return s;
  } catch { return { ...DEFAULT_SETTINGS }; }
};
const writeSettings = (s: ChurchkhelaSettings) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

const ChurchkhelaGame: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const [settings, setSettings] = useState(readSettings);
  const [phase, setPhase] = useState<Phase>('setup');
  const [rounds, setRounds] = useState<Round[]>([]);
  const [cur, setCur] = useState<Current>({ task: null, seconds: 10 });
  const [revealed, setRevealed] = useState(false);
  const [failed, setFailed] = useState(false);
  const recent = useRef<string[]>([]);
  const player = useRef<HTMLAudioElement | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  const stopPlayer = () => { const a = player.current; if (a) { a.pause(); a.removeAttribute('src'); a.load(); } player.current = null; };
  useEffect(() => () => { stopPlayer(); closeAudio(audioCtx); }, []);

  // the recordings a member may hear decide the pool (App.tsx sets the hidden flag from the same membership before this renders)
  const pool = useMemo(() => hangiPool(), [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const chants = pool.filter(p => p.kind === 'chant').length;
  const songs = pool.length - chants;
  const source: Source = pool.length ? settings.source : 'voice';
  const bySource = source === 'chant' ? pool.filter(p => p.kind === 'chant') : source === 'song' ? pool.filter(p => p.kind === 'song') : pool;

  const set = (patch: Partial<ChurchkhelaSettings>) => setSettings(s => { const next = { ...s, ...patch }; writeSettings(next); return next; });

  const start = () => { setRounds([]); recent.current = []; setPhase('ready'); };

  // the tap that starts the round also opens the sound (the bell) and starts the recording (a phone plays only on a touch)
  const go = () => {
    triggerHaptic(20);
    openAudio(audioCtx);
    const seconds = roundSeconds(settings.range, Math.random);
    const task = pickTask(settings.tasks, Math.random, cur.task?.id);
    const item = source === 'voice' ? undefined : pickItem(bySource, Math.random, recent.current);
    if (item) recent.current = [...recent.current.slice(-4), item.id];
    setCur({ item, task, seconds });
    setRevealed(false);
    setFailed(false);
    stopPlayer();
    if (item) {
      const a = new Audio();
      a.crossOrigin = 'anonymous';
      a.preload = 'auto';
      a.src = item.url;
      a.addEventListener('loadedmetadata', () => { try { a.currentTime = startOffset(a.duration, seconds, Math.random); } catch { /* stays at 0 */ } });
      a.addEventListener('error', () => setFailed(true));
      player.current = a;
      a.play().catch(() => setFailed(true));
    }
    setPhase('play');
  };

  // the music stops when the round's seconds are up — nobody sees how many
  useEffect(() => {
    if (phase !== 'play') return;
    const t = setTimeout(() => {
      player.current?.pause();
      bell(audioCtx.current);
      triggerHaptic(150);
      setPhase('stop');
    }, cur.seconds * 1000);
    return () => clearTimeout(t);
  }, [phase, cur.seconds]);

  const finishRound = (ok: boolean | null) => {
    triggerHaptic(10);
    stopPlayer();
    const next = [...rounds, { title: cur.item?.title ?? 'მასწავლებლის გალობა', sub: cur.item?.sub ?? '', task: cur.task, ok }];
    setRounds(next);
    setPhase(settings.rounds && next.length >= settings.rounds ? 'end' : 'ready');
  };

  const quit = async () => {
    if (phase === 'end' || (phase === 'ready' && rounds.length === 0) || (await askConfirm('თამაში შეწყდეს?'))) { stopPlayer(); setPhase('setup'); }
  };

  const n = rounds.length + 1;
  const total = settings.rounds || 0;
  const t = tally(rounds);

  if (phase === 'setup') {
    return (
      <div className="w-full max-w-2xl space-y-4">
        <Card tone="wine" className="!p-4 sm:!p-5">
          <p className="font-serif-ge text-[17px] font-bold leading-snug">ცხელი ჩურჩხელა</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
            ყველა წრეში ზის, ტელეფონი დინამიკით უკრავს სკოლის ჩანაწერს და ჩურჩხელა (ან თვითონ ტელეფონი) ხელიდან ხელში გადადის. მუსიკა მოულოდნელად ჩერდება, ზარი რეკავს —
            ვისაც ხელში დარჩა, ის „დაიწვა“ და დავალებას ასრულებს: იმღერე შემდეგი ფრაზა, დაასახელე საგალობელი, თქვი რომელი კუთხისაა…
          </p>
        </Card>

        <Card className="!p-4 space-y-4">
          <div>
            <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Music2 className="w-4 h-4 text-[#7a2028]" /> მუსიკა</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pool.length > 0 && <Chip on={source === 'all'} onClick={() => set({ source: 'all' })}>ყველაფერი <span className={`tabular-nums ${source === 'all' ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{pool.length}</span></Chip>}
              {chants > 0 && <Chip on={source === 'chant'} onClick={() => set({ source: 'chant' })}>საგალობლები <span className={`tabular-nums ${source === 'chant' ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{chants}</span></Chip>}
              {songs > 0 && <Chip on={source === 'song'} onClick={() => set({ source: 'song' })}>სიმღერები <span className={`tabular-nums ${source === 'song' ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{songs}</span></Chip>}
              <Chip on={source === 'voice'} onClick={() => set({ source: 'voice' })}>ჩემი ხმით</Chip>
            </div>
            <p className="mt-2 text-[12.5px] leading-snug text-[#9a8b7b]">
              {pool.length
                ? 'ჩანაწერი ყოველ ჯერზე სხვა ადგილიდან იწყება. „ჩემი ხმით“ — მასწავლებელი თვითონ გალობს, ტელეფონი მხოლოდ დროს ითვლის და ზარს რეკავს.'
                : 'ჩანაწერები ჯერ არ გაქვს ჩართული, ამიტომ მასწავლებელი თვითონ გალობს — ტელეფონი დროს ითვლის და ზარს რეკავს.'}
            </p>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#4a3426]">რამდენ ხანს უკრავს</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RANGES.map(r => <Chip key={r.id} on={settings.range === r.id} onClick={() => set({ range: r.id })}>{r.label}</Chip>)}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#4a3426]">დავალება დამწვარს</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TASK_MODES.map(m => <Chip key={m.id} on={settings.tasks === m.id} onClick={() => set({ tasks: m.id })}>{m.label}</Chip>)}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-[#4a3426]">რაუნდები</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROUNDS_CHOICES.map(r => <Chip key={r} on={settings.rounds === r} onClick={() => set({ rounds: r })}>{r ? `${r} რაუნდი` : 'სანამ არ მოვრჩებით'}</Chip>)}
            </div>
          </div>

          <Btn size="lg" full onClick={start} icon={<ChevronRight />}>დაწყება</Btn>
        </Card>
      </div>
    );
  }

  const title = phase === 'end' ? 'ცხელი ჩურჩხელა · დასასრული' : `ცხელი ჩურჩხელა · რაუნდი ${n}${total ? ` / ${total}` : ''}`;

  return (
    <div className="w-full max-w-2xl">
      <TableScreen
        title={title}
        onClose={quit}
        right={phase !== 'end' && rounds.length > 0 ? <span className="text-[12px] tabular-nums text-[#9a8b7b] px-1">🔥 {rounds.length}</span> : undefined}
        footer={
          phase === 'ready' ? <Btn size="lg" full onClick={go} className="!h-14 !text-[16px]">წავედით!</Btn>
          : phase === 'play' ? <Btn size="lg" full disabled className="!h-14 !text-[16px]">{source === 'voice' ? 'გალობს მასწავლებელი…' : 'მუსიკა ისმის…'}</Btn>
          : phase === 'stop' ? (
            cur.task ? (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => finishRound(false)} className="h-16 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] cursor-pointer">
                  <X className="w-5 h-5" /> ვერ შეასრულა
                </button>
                <button type="button" onClick={() => finishRound(true)} className="h-16 rounded-2xl bg-[#2f7d4f] text-white font-bold text-[17px] flex items-center justify-center gap-2 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer">
                  <Check className="w-6 h-6" /> შეასრულა
                </button>
              </div>
            ) : <Btn size="lg" full onClick={() => finishRound(null)} icon={<ChevronRight />} className="!h-14 !text-[16px]">შემდეგი რაუნდი</Btn>
          )
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
            <p className="text-[13px] font-bold text-[#9a8b7b]">რაუნდი {n}{total ? ` / ${total}` : ''}</p>
            <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028]">ჩურჩხელა ხელში!</p>
            <p className="mt-2 max-w-xs text-[13px] leading-relaxed text-[#75685a]">
              {source === 'voice'
                ? 'მასწავლებელი გალობას იწყებს და ჩურჩხელა წრეზე მიდის. ტელეფონი ზარს დარეკავს — ვისაც ხელში დარჩა, ის დაიწვა.'
                : 'დააჭირე და ჩურჩხელა წრეზე გაუშვი. მუსიკა მოულოდნელად გაჩერდება — ვისაც ხელში დარჩა, ის დაიწვა.'}
            </p>
          </div>
        )}

        {phase === 'play' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
            <div className="w-32 h-32 rounded-full bg-[#7a2028]/10 flex items-center justify-center animate-pulse">
              <Music2 className="w-14 h-14 text-[#7a2028]" />
            </div>
            <p className="font-serif-ge text-[40px] font-bold leading-tight text-[#7a2028]">გადაეცი!</p>
            <p className="text-[13px] text-[#75685a]">{source === 'voice' ? 'გალობს მასწავლებელი — ზარი მოულოდნელად დარეკავს' : 'მუსიკა ისმის — მოულოდნელად გაჩერდება'}</p>
            {failed && <p className="text-[12.5px] text-[#c0392b]">ჩანაწერი ვერ ჩაირთო — ტელეფონი მაინც ითვლის დროს, იმღერეთ თქვენ</p>}
          </div>
        )}

        {phase === 'stop' && (
          <div className="flex-1 flex flex-col gap-4 py-3">
            <div className="text-center">
              <p className="font-serif-ge text-[44px] font-bold leading-none text-[#c0392b]">სტოპ!</p>
              <p className="mt-2 text-[14px] font-bold text-[#4a3426] flex items-center justify-center gap-1.5"><Flame className="w-4 h-4 text-[#c0392b]" /> ვისაც ხელში დარჩა, ის დაიწვა</p>
            </div>
            {cur.task && (
              <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] px-5 py-5 text-center">
                <span className="inline-flex h-7 px-2.5 rounded-full bg-[#7a2028]/10 text-[#7a2028] text-[12px] font-bold">{KIND_LABEL[cur.task.kind]}</span>
                <p className="mt-2 font-serif-ge text-[22px] sm:text-[26px] font-bold leading-snug text-[#4a3426]">{cur.task.text}</p>
              </div>
            )}
            {cur.item && (
              revealed ? (
                <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-4 py-3 text-center">
                  <p className="text-[12px] font-bold text-[#9a8b7b]">ისმოდა</p>
                  <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#7a2028]">{cur.item.title}</p>
                  <p className="text-[12.5px] text-[#75685a]">{cur.item.sub}</p>
                </div>
              ) : (
                <Btn kind="ghost" full onClick={() => setRevealed(true)} icon={<Eye />}>ვინ იყო? · სათაურის ჩვენება</Btn>
              )
            )}
          </div>
        )}

        {phase === 'end' && (
          <div className="flex-1 flex flex-col gap-3 py-2">
            <div className="text-center py-3">
              <Flame className="w-10 h-10 mx-auto text-[#c0392b]" />
              <p className="mt-2 font-serif-ge text-[28px] font-bold leading-tight text-[#7a2028]">{t.played} რაუნდი</p>
              <p className="mt-1 text-[13px] tabular-nums text-[#75685a]">
                {cur.task || rounds.some(r => r.task) ? <><span className="text-[#2f7d4f] font-bold">✓ {t.ok} შესრულდა</span> · <span className="text-[#8a4a2a] font-bold">✗ {t.failed}</span></> : 'ჩურჩხელამ წრე ბევრჯერ შემოიარა'}
              </p>
            </div>
            <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
              {rounds.map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-3 min-h-12 py-2">
                  <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold ${r.ok === true ? 'bg-[#2f7d4f]/10 text-[#2f7d4f]' : r.ok === false ? 'bg-[#8a4a2a]/10 text-[#8a4a2a]' : 'bg-[#f1e8d9] text-[#9a8b7b]'}`}>{r.ok === true ? '✓' : r.ok === false ? '✗' : i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-snug text-[#4a3426] truncate">{r.title}</span>
                    {r.task && <span className="block text-[12px] leading-snug text-[#9a8b7b] truncate">{r.task.text}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </TableScreen>
    </div>
  );
};

export default ChurchkhelaGame;
