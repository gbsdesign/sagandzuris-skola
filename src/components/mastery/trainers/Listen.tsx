import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Pause, Play } from 'lucide-react';
import { Btn, Tabs } from '../../ui/kit';
import { knownChants } from '../../../data/chantGamePool';
import { HEIRMOI } from '../../../data/rvakhmaPool';
import { ChantSynth, loadBookScore, makeTimeMap, type BookScore } from '../../../utils/chantSynth';
import type { Timed } from '../../../utils/chantClips';
import { drawRvakhmaRounds, modelOf, toneName } from '../../../utils/rvakhma';
import { ROUNDS, SCHOOLS, shuffled } from '../../../utils/earTrainer';
import { georgiaToday } from '../../../utils/psalter';
import { playAndWait, stopSound, useFinish } from './shared';
import { QuizRun, type QuizQ } from './Quiz';

// Listening from the books' notes on the synthesizer: the day's chant to hear whole („მხოლოდ მოსმენა“), the eight tones'
// heirmoi (vol. VIII) and the three schools' books — first their samples, then a quiz of ten.

/** a chant's opening, every voice, from its first note for `seconds` */
export const openingNotes = (score: BookScore, seconds = 12): Timed[] => {
  const { toSec } = makeTimeMap(score.tempos);
  const all: Timed[] = [];
  score.voices.forEach(v => v.forEach(([b, len, m]) => { const a = toSec(b); all.push([a, toSec(b + len) - a, m]); }));
  if (!all.length) return [];
  const t0 = Math.min(...all.map(n => n[0]));
  return all
    .map(([a, l, m]): Timed => [a - t0, l, m])
    .filter(([a]) => a < seconds)
    .map(([a, l, m]): Timed => [a, Math.min(l, seconds - a), m]);
};

const openingOf = async (book: string, num: number, seconds = 12) => openingNotes(await loadBookScore(num, book), seconds);

// ——— the day's chant ———

export const ListenRun: React.FC<{ drillId: string }> = ({ drillId }) => {
  const { finish } = useFinish(drillId);
  const chant = useMemo(() => {
    const pool = knownChants();
    const day = Math.floor(Date.parse(georgiaToday()) / 86400000);
    return pool.length ? pool[day % pool.length] : null;
  }, []);
  const synth = useRef<ChantSynth | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState(false);
  const heard = useRef(0);
  useEffect(() => {
    let off = false;
    if (chant) {
      loadBookScore(chant.num, chant.book).then(score => {
        if (off) return;
        const s = new ChantSynth(score);
        s.onEnd = () => { setPlaying(false); setPos(s.duration); };
        synth.current = s;
        setReady(true);
      }).catch(() => undefined);
    }
    return () => { off = true; synth.current?.dispose(); synth.current = null; };
  }, [chant]);
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => {
      const s = synth.current;
      if (!s) return;
      const p = s.position();
      heard.current += 0.5;
      setPos(p);
      if (!done && (heard.current >= Math.min(60, s.duration * 0.7))) { setDone(true); finish(null); }
    }, 500);
    return () => window.clearInterval(t);
  }, [playing, done, finish]);

  if (!chant) return <p className="text-center text-[14px] text-[#8a7a6a]">საგალობელი ვერ მოიძებნა.</p>;
  const dur = synth.current?.duration ?? 0;
  const toggle = () => {
    const s = synth.current;
    if (!s) return;
    if (playing) { s.pause(); setPlaying(false); } else { void s.play(); setPlaying(true); }
  };
  return (
    <div className="space-y-4 text-center sg-in">
      <p className="text-[13px] font-bold text-[#8a7a6a]">დღის საგალობელი · {chant.service}</p>
      <p className="font-serif-ge text-[22px] font-bold text-[#4a3426]">{chant.title}</p>
      <button
        type="button"
        onClick={toggle}
        disabled={!ready}
        aria-label={playing ? 'პაუზა' : 'მოსმენა'}
        className="mx-auto w-20 h-20 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-50"
      >
        {!ready ? <Loader2 className="w-8 h-8 animate-spin" /> : playing ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 ml-1" />}
      </button>
      <div className="h-2 rounded-full bg-[#efe5d4] overflow-hidden">
        <div className="h-full bg-[#7a2028] transition-[width] duration-500" style={{ width: `${dur ? Math.min(100, (100 * pos) / dur) : 0}%` }} />
      </div>
      <p className="text-[13.5px] text-[#4a3426]">ჯერ ზედა ხმას გაჰყევი, მეორე მოსმენაზე — ბანს.</p>
      {done && <p className="inline-flex items-center gap-1.5 text-[14px] font-bold text-emerald-700"><Check className="w-4 h-4" /> დღევანდელი მოსმენა შესრულდა</p>}
    </div>
  );
};

// ——— eight tones, three schools ———

/** a sample button: plays a piece's opening (loaded on the tap) */
const SampleBtn: React.FC<{ label: string; sub?: string; load: () => Promise<Timed[]>; active: boolean; onPlay: () => void }> = ({ label, sub, load, active, onPlay }) => {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        onPlay();
        setBusy(true);
        try { await playAndWait(await load(), 0); } catch { /* not loaded */ } finally { setBusy(false); }
      }}
      className={`min-h-14 px-3 py-2 rounded-2xl text-left ring-1 transition cursor-pointer active:scale-[0.98] ${active && busy ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#2a2017] ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
    >
      <span className="flex items-center gap-2 text-[14px] font-bold">{busy && active ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{label}</span>
      {sub && <span className={`block mt-0.5 text-[12px] ${active && busy ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{sub}</span>}
    </button>
  );
};

/** questions made ahead (their notes loaded), then handed to the quiz one by one */
const usePrepared = (prepare: () => Promise<QuizQ[]>) => {
  const [list, setList] = useState<QuizQ[] | null>(null);
  const [failed, setFailed] = useState(false);
  const at = useRef(0);
  useEffect(() => {
    let off = false;
    prepare().then(qs => { if (!off) setList(qs); }, () => { if (!off) setFailed(true); });
    return () => { off = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const make = () => { const q = list![at.current % list!.length]; at.current++; return q; };
  return { list, failed, make };
};

const TONE_OPTIONS = Array.from({ length: 8 }, (_, t) => toneName(t));

const prepareTones = async (): Promise<QuizQ[]> => {
  const rounds = drawRvakhmaRounds(HEIRMOI, ROUNDS);
  const qs = await Promise.all(rounds.map(async r => ({ play: await openingOf(r.book, r.num), options: TONE_OPTIONS, right: r.right, note: r.name })));
  return qs.filter(q => q.play.length);
};

const prepareSchools = async (): Promise<QuizQ[]> => {
  const picks = Array.from({ length: ROUNDS + 2 }, (_, i) => {
    const s = i % SCHOOLS.length;
    const nums = SCHOOLS[s].nums;
    return { s, num: nums[Math.floor(Math.random() * nums.length)] };
  });
  const qs = await Promise.all(shuffled(picks, Math.random).map(async p => {
    try { return { play: await openingOf(SCHOOLS[p.s].book, p.num), options: SCHOOLS.map(x => x.name), right: p.s }; } catch { return null; }
  }));
  return qs.filter((q): q is QuizQ => !!q && q.play.length > 0).slice(0, ROUNDS);
};

const Preparing: React.FC<{ failed: boolean }> = ({ failed }) => (
  <p className="flex items-center justify-center gap-2 py-6 text-[14px] text-[#8a7a6a]">
    {failed ? 'ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.' : <><Loader2 className="w-4 h-4 animate-spin" /> ნოტები იტვირთება…</>}
  </p>
);

export const TonesRun: React.FC<{ drillId: string }> = ({ drillId }) => {
  const [tab, setTab] = useState<'samples' | 'quiz'>('samples');
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => () => stopSound(), []);
  return (
    <div className="space-y-4">
      <Tabs<'samples' | 'quiz'> cols={2} value={tab} onChange={setTab} items={[{ id: 'samples', label: 'ნიმუშები' }, { id: 'quiz', label: 'ტესტი' }]} />
      {tab === 'samples' ? (
        <div className="space-y-3 sg-in">
          <p className="text-[14px] leading-relaxed text-[#4a3426]">თითო ხმის ძლისპირის დასაწყისი, 12 წამი. მოუსმინე ერთ-ორს დღეში და შეადარე.</p>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }, (_, t) => {
              const h = modelOf(HEIRMOI, t);
              return h ? <SampleBtn key={t} label={toneName(t)} sub={h.name} active={active === t} onPlay={() => setActive(t)} load={() => openingOf(h.book, h.num)} /> : null;
            })}
          </div>
          <Btn full onClick={() => setTab('quiz')}>ტესტზე გადასვლა</Btn>
        </div>
      ) : <TonesQuiz drillId={drillId} />}
    </div>
  );
};

const TonesQuiz: React.FC<{ drillId: string }> = ({ drillId }) => {
  const { list, failed, make } = usePrepared(prepareTones);
  if (!list) return <Preparing failed={failed} />;
  return <QuizRun drillId={drillId} make={make} intro="ძლისპირის დასაწყისი ჟღერს — რომელი ხმაა?" />;
};

export const SchoolsRun: React.FC<{ drillId: string }> = ({ drillId }) => {
  const [tab, setTab] = useState<'samples' | 'quiz'>('samples');
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => () => stopSound(), []);
  return (
    <div className="space-y-4">
      <Tabs<'samples' | 'quiz'> cols={2} value={tab} onChange={setTab} items={[{ id: 'samples', label: 'ნიმუშები' }, { id: 'quiz', label: 'ტესტი' }]} />
      {tab === 'samples' ? (
        <div className="space-y-3 sg-in">
          <p className="text-[14px] leading-relaxed text-[#4a3426]">ყოველ დაჭერაზე — ახალი საგალობელი ამ სკოლის წიგნიდან, 12 წამი.</p>
          <div className="grid gap-2">
            {SCHOOLS.map((s, i) => (
              <SampleBtn key={s.name} label={s.name} sub={s.where} active={active === i} onPlay={() => setActive(i)}
                load={() => openingOf(s.book, s.nums[Math.floor(Math.random() * s.nums.length)])} />
            ))}
          </div>
          <Btn full onClick={() => setTab('quiz')}>ტესტზე გადასვლა</Btn>
        </div>
      ) : <SchoolsQuiz drillId={drillId} />}
    </div>
  );
};

const SchoolsQuiz: React.FC<{ drillId: string }> = ({ drillId }) => {
  const { list, failed, make } = usePrepared(prepareSchools);
  if (!list) return <Preparing failed={failed} />;
  return <QuizRun drillId={drillId} make={make} cols={1} intro="საგალობლის დასაწყისი ჟღერს — რომელი სკოლისაა?" />;
};
