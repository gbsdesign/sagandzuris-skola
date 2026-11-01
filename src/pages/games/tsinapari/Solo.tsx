import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Footprints, Play, RotateCcw, Sparkles, Star, Trophy } from 'lucide-react';
import { TSINAPARI_STORIES, tsinapariStory } from '../../../data/tsinapariStories';
import {
  betterPath, choiceOrder, isOver, isShown, newRun, nextStep, parseRun, pickChoice, rightCount, starsOf, type PathBest, type PathRun, type PathStory,
} from '../../../utils/tsinapari';
import { requestOpen } from '../../../utils/searchOpen';
import { triggerHaptic } from '../../../utils/haptics';
import { useNavigation } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Stars } from '../tsikhe/parts';
import { AMBER, FactBox, ForkDots, ForkHead, GREEN, Medallion, RealPath, UNCHECKED, WayButton, waysOf } from './parts';

// „წინაპრის გზა“ alone (the hub's „ონლაინ“, 2026-11-01): the ancestors' stories, each with its best on this device; a story's
// opening, then its forks one by one — a pick tells what really happened (a what-if first, where it would have led) — and at
// the end the real path with my ✓ and ✗. The run is kept after every pick (`sg-tsinapari-run`), so ✕ only pauses it.

const RUN_KEY = 'sg-tsinapari-run';
const BEST_KEY = 'sg-tsinapari-best';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readBest = (): Record<string, PathBest> => {
  const o = load(BEST_KEY);
  if (!o || typeof o !== 'object') return {};
  return Object.fromEntries(Object.entries(o as Record<string, Partial<PathBest>>).filter(([k, v]) => !!tsinapariStory(k) && typeof v?.right === 'number' && typeof v?.total === 'number')) as Record<string, PathBest>;
};

/** the biography of the story's ancestor, while the ancestors' page is open to this member */
const useBiography = () => {
  const { navigateTo } = useNavigation();
  const access = useAccess();
  if (access.section('tsinaprebi') !== 'open') return null;
  return (s: PathStory) => { requestOpen('tsinaprebi', String(s.ancestor)); navigateTo('tsinaprebi'); };
};

const IntroScreen: React.FC<{ story: PathStory; onStart: () => void; onClose: () => void }> = ({ story, onStart, onClose }) => (
  <TableScreen
    title={story.hero}
    onClose={onClose}
    footer={<Btn size="lg" full icon={<Footprints />} onClick={onStart} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">გზას დავადგეთ!</Btn>}
  >
    <div className="my-auto w-full max-w-xl mx-auto py-2 space-y-4">
      <div className="text-center">
        <Medallion story={story} size={112} />
        <p className="mt-3 font-serif-ge text-[26px] font-bold leading-tight" style={{ color: story.tint }}>{story.hero}</p>
        <p className="mt-0.5 text-[13.5px] font-bold text-[#75685a]">{story.years} · {story.where}</p>
      </div>
      <p className="text-[16px] leading-relaxed text-[#4a3426]">{story.intro}</p>
      <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 space-y-2 text-[14px] leading-snug text-[#4a3426]">
        <li className="flex gap-2.5"><Footprints className="w-5 h-5 shrink-0" style={{ color: story.tint }} />{story.steps.length} გასაყარი — ყოველზე სამი გზა. ერთი მათგანი ნამდვილია: ის, რაც წინაპარმა აირჩია.</li>
        <li className="flex gap-2.5"><Sparkles className="w-5 h-5 shrink-0 text-[#c9a227]" />აირჩიე — და გაიგებ, რა მოხდა სინამდვილეში. სხვა გზა? ჯერ ნახავ, სად წაგიყვანდა.</li>
        <li className="flex gap-2.5"><Star className="w-5 h-5 shrink-0 text-[#c9a227]" />ქულა ყოველ გასაყარზე, სადაც წინაპარივით აირჩიე. ★★★ — ყველა ან ერთის გარდა ყველა.</li>
      </ul>
    </div>
  </TableScreen>
);

/** a fork: the scene, the ways; once picked, what happened */
const ForkPanel: React.FC<{ story: PathStory; run: PathRun; onPick: (c: number) => void }> = ({ story, run, onPick }) => {
  const s = story.steps[run.step];
  const shown = isShown(run);
  const pick = shown ? run.picks[run.step] : -1;
  const ways = waysOf(story, run.step, choiceOrder(run.seed, run.step));
  const told = useRef<HTMLDivElement>(null);
  // the story comes under the ways: bring its top up on a phone
  useEffect(() => { if (shown) told.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [shown]);
  return (
    <div className="w-full max-w-xl mx-auto space-y-3.5">
      <ForkHead story={story} step={run.step} />
      <p className="text-[16.5px] leading-relaxed text-[#4a3426]">{s.scene}</p>
      <p className="font-serif-ge text-[19px] font-bold" style={{ color: story.tint }}>{s.ask}</p>
      <div className="space-y-2" role="group" aria-label={s.ask}>
        {ways.map(w => (
          <WayButton
            key={w.c}
            story={story}
            letter={w.letter}
            text={w.text}
            state={!shown ? 'idle' : w.c === 0 ? 'right' : w.c === pick ? 'picked-wrong' : 'other'}
            onClick={shown ? undefined : () => { triggerHaptic(w.c === 0 ? 24 : 12); onPick(w.c); }}
          />
        ))}
      </div>
      {shown && (
        <div ref={told} className="space-y-2.5 scroll-mb-4">
          {pick === 0 ? (
            <div className="rounded-2xl px-4 py-3" style={{ background: `${GREEN}12` }}>
              <p className="flex items-center gap-1.5 text-[15px] font-bold" style={{ color: GREEN }}><Star className="w-4.5 h-4.5 fill-current" />ასეც მოხდა!</p>
              <p className="mt-1 text-[15.5px] leading-relaxed text-[#4a3426]">{s.real}</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl px-4 py-3" style={{ background: `${AMBER}12` }}>
                <p className="text-[13.5px] font-bold" style={{ color: AMBER }}>ასე რომ ყოფილიყო…</p>
                <p className="mt-1 text-[15.5px] leading-relaxed text-[#4a3426]">{s.wrong[pick - 1].then}</p>
              </div>
              <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3">
                <p className="text-[13.5px] font-bold" style={{ color: GREEN }}>ისტორიამ სხვა გზა აირჩია</p>
                <p className="mt-1 text-[15.5px] leading-relaxed text-[#4a3426]">{s.real}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const EndPanel: React.FC<{ story: PathStory; run: PathRun; record: boolean; onBio: ((s: PathStory) => void) | null }> = ({ story, run, record, onBio }) => {
  const total = story.steps.length;
  const right = rightCount(run.picks);
  return (
    <div className="w-full max-w-xl mx-auto py-2 space-y-4">
      <div className="text-center">
        <Medallion story={story} size={92} />
        <p className="mt-2.5 font-serif-ge text-[24px] font-bold leading-tight" style={{ color: story.tint }}>{story.hero}</p>
        <p className="mt-1 text-[15.5px] text-[#4a3426]"><b className="tabular-nums">{right} / {total}</b> გასაყარზე წინაპარივით აირჩიე</p>
        <div className="mt-1"><Stars n={starsOf(right, total)} size="lg" /></div>
        {record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]"><Trophy className="w-4 h-4" />ამ ამბის რეკორდი!</p>}
      </div>
      <p className="text-[15.5px] leading-relaxed text-[#4a3426]">{story.outro}</p>
      <FactBox story={story} />
      <RealPath story={story} picks={run.picks} />
      {onBio && (
        <button
          type="button"
          onClick={() => { triggerHaptic(10); onBio(story); }}
          className="w-full min-h-14 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-2.5 flex items-center gap-3 text-left cursor-pointer hover:ring-[#7a2028]/30"
        >
          <BookOpen className="w-5 h-5 shrink-0 text-[#7a2028]" />
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-[#7a2028]">წაიკითხე მთელი ბიოგრაფია</span><span className="block text-[12.5px] text-[#75685a]">„გაიცანი წინაპრები“</span></span>
          <ChevronRight className="w-5 h-5 shrink-0 text-[#9a8b7b]" />
        </button>
      )}
    </div>
  );
};

const RunScreen: React.FC<{
  story: PathStory;
  run: PathRun;
  setRun: (r: PathRun) => void;
  record: boolean;
  onClose: () => void;
  onAgain: () => void;
  onBio: ((s: PathStory) => void) | null;
}> = ({ story, run, setRun, record, onClose, onAgain, onBio }) => {
  const total = story.steps.length;
  const over = isOver(run, total);
  const shown = isShown(run);
  const scroller = useRef<HTMLDivElement>(null);
  // a new fork starts at its top
  useEffect(() => { scroller.current?.parentElement?.scrollTo({ top: 0 }); }, [run.step]);
  const title = over ? story.hero : `${story.hero} · ${run.step + 1} / ${total}`;
  const footer = over ? (
    <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
      <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15px]">სხვა წინაპარი</Btn>
      <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15px]">თავიდან</Btn>
    </div>
  ) : shown ? (
    <Btn size="lg" full icon={<Footprints />} onClick={() => setRun(nextStep(run, total))} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">
      {run.step + 1 < total ? 'შემდეგი გასაყარი' : 'როგორ დასრულდა?'}
    </Btn>
  ) : undefined;
  return (
    <TableScreen title={title} onClose={onClose} footer={footer}>
      <div ref={scroller} className="flex flex-col gap-4 pt-1 min-h-full">
        <div className="w-full max-w-xl mx-auto"><ForkDots story={story} picks={run.picks} at={over ? total : run.step} /></div>
        {over ? <EndPanel story={story} run={run} record={record} onBio={onBio} /> : <ForkPanel story={story} run={run} onPick={c => setRun(pickChoice(run, c, total))} />}
      </div>
    </TableScreen>
  );
};

export const TsinapariSolo: React.FC = () => {
  const [run, setRunState] = useState<PathRun | null>(() => parseRun(load(RUN_KEY), tsinapariStory));
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState<PathStory | null>(null);
  const [best, setBest] = useState(readBest);
  const [record, setRecord] = useState(false);
  const onBio = useBiography();
  const latest = useRef(run);
  latest.current = run;
  const bestRef = useRef(best);
  bestRef.current = best;

  const setRun = useCallback((r: PathRun | null) => {
    const was = latest.current;
    latest.current = r;
    setRunState(r);
    save(RUN_KEY, r);
    const story = r ? tsinapariStory(r.story) : undefined;
    // the end of a story: its best on this device
    if (r && story && isOver(r, story.steps.length) && !(was && was.story === r.story && isOver(was, story.steps.length))) {
      const b: PathBest = { right: rightCount(r.picks), total: story.steps.length };
      const won = betterPath(bestRef.current[r.story], b);
      setRecord(won && !!bestRef.current[r.story]);
      if (won) {
        const next = { ...bestRef.current, [r.story]: b };
        bestRef.current = next;
        setBest(next);
        save(BEST_KEY, next);
      }
    }
  }, []);

  const story = run ? tsinapariStory(run.story) : undefined;
  const going = (s: PathStory) => (run && story && run.story === s.id && !isOver(run, s.steps.length) && run.picks.length ? run : null);
  const start = (s: PathStory) => {
    setRecord(false);
    setRun(newRun(s.id, (Date.now() % 2_147_483_647) || 1));
    setIntro(null);
    setOpen(true);
  };
  const enter = async (s: PathStory) => {
    if (going(s)) { setOpen(true); return; }
    const other = run && story && run.story !== s.id && !isOver(run, story.steps.length) && run.picks.length ? story : null;
    if (other && !(await askConfirm({ title: `${other.hero} — გზა შეჩერებულია`, text: 'ახალი ამბის დაწყება შეჩერებულ გზას წაშლის.', ok: 'ახალი ამბავი' }))) return;
    triggerHaptic(10);
    setIntro(s);
  };
  const close = () => {
    if (run && story && isOver(run, story.steps.length)) setRun(null);
    setOpen(false);
  };

  if (intro) return <IntroScreen story={intro} onStart={() => start(intro)} onClose={() => setIntro(null)} />;
  if (open && run && story) return <RunScreen story={story} run={run} setRun={setRun} record={record} onBio={onBio} onClose={close} onAgain={() => start(story)} />;

  return (
    <div className="space-y-4">
      <Card tone="paper" className="!p-4 space-y-1.5">
        <p className="font-serif-ge text-[17px] font-bold text-[#7a2028]">შენ რას იზამდი მათ ადგილას?</p>
        <p className="text-[14px] leading-relaxed text-[#4a3426]">
          დიდი მგალობლების ნამდვილი ამბები: ყოველ გასაყარზე სამი გზაა, ერთი მათგანი — ის, რაც წინაპარმა აირჩია. გამოიცანი მისი
          გზა და გაიგე, როგორ გადარჩა ქართული გალობა.
        </p>
      </Card>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TSINAPARI_STORIES.map(s => {
          const b = best[s.id];
          const g = going(s);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => { void enter(s); }}
                className="w-full h-full text-left rounded-3xl bg-white ring-1 ring-[#e8dcc8] p-4 flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition hover:ring-[#7a2028]/30"
              >
                <div className="flex items-start gap-3.5">
                  <Medallion story={s} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="font-serif-ge text-[19px] font-bold leading-tight" style={{ color: s.tint }}>{s.hero}</p>
                    <p className="mt-0.5 text-[13px] font-bold text-[#75685a]">{s.years} · {s.where}</p>
                    <p className="mt-1 text-[13.5px] leading-snug text-[#4a3426]">{s.role}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 min-h-11">
                  {b ? (
                    <span className="flex items-center gap-2"><Stars n={starsOf(b.right, b.total)} /><span className="text-[13px] font-bold tabular-nums text-[#4a3426]">{b.right} / {b.total}</span></span>
                  ) : <span className="text-[13px] text-[#9a8b7b]">{s.steps.length} გასაყარი</span>}
                  <span className="h-11 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-bold text-[#fbf6ec]" style={{ background: s.tint }}>
                    {g ? <><Play className="w-4 h-4" />გასაყარი {g.step + 1}</> : <><Play className="w-4 h-4" />{b ? 'კიდევ' : 'დაწყება'}</>}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[12.5px] leading-snug text-[#75685a]">{UNCHECKED} საუკეთესო შედეგი ამ მოწყობილობაზე ინახება.</p>
    </div>
  );
};
