import React, { useState } from 'react';
import { ArrowRight, Check, Ear, RotateCcw, X } from 'lucide-react';
import { COLLOQUIUM_CHANTS, COLLOQUIUM_SONGS, COLLOQUIUM_VIDEOS, type ColloquiumGroup, type ColloquiumItem } from '../../data/abituriProgram';
import { useAbituriProgress } from '../../hooks/useAbituriProgress';
import { triggerHaptic } from '../../utils/haptics';
import { CARD, SectionHead } from './shared';

// „გამოიცანი სმენით“ — the colloquium as practice: a random half minute from the university's listening video,
// four names to choose from. The player has no controls, so the video's chapter names can't give the answer away.

type Pool = 'chant' | 'song' | 'all';
interface Entry { item: ColloquiumItem; group: string; video: string; kind: 'chant' | 'song' }

const entries = (groups: ColloquiumGroup[], video: string, kind: Entry['kind']): Entry[] =>
  groups.flatMap(g => g.items.map(item => ({ item, group: g.name, video, kind })));
const ALL = [
  ...entries(COLLOQUIUM_CHANTS, COLLOQUIUM_VIDEOS.chants, 'chant'),
  ...entries(COLLOQUIUM_SONGS, COLLOQUIUM_VIDEOS.songs, 'song'),
];
const EXCERPT = 30; // seconds

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

interface Round { e: Entry; options: Entry[]; start: number; end: number; n: number }
let seq = 0;
const makeRound = (pool: Pool, last?: Entry): Round => {
  const from = ALL.filter(x => pool === 'all' || x.kind === pool);
  let e = from[Math.floor(Math.random() * from.length)];
  if (e === last) e = from[(from.indexOf(e) + 1) % from.length];
  const others = shuffle(from.filter(x => x !== e && x.kind === e.kind && x.item.title !== e.item.title));
  // a random half minute inside the item's own part of the video
  const [a, b] = e.item.yt;
  const len = (b ?? a + 150) - a;
  const start = a + Math.floor(Math.random() * Math.max(1, len - EXCERPT));
  return { e, options: shuffle([e, ...others.slice(0, 3)]), start, end: Math.min(start + EXCERPT, b ?? start + EXCERPT), n: ++seq };
};

const embed = (r: Round) =>
  `https://www.youtube-nocookie.com/embed/${r.e.video}?start=${r.start}&end=${r.end}&autoplay=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&rel=0&playsinline=1&modestbranding=1`;

const about = (e: Entry) => [e.group, e.item.sub, e.item.genre].filter(Boolean).join(' · ');

export const ColloquiumQuiz: React.FC = () => {
  const { countDrill } = useAbituriProgress();
  const [pool, setPool] = useState<Pool>('all');
  const [round, setRound] = useState<Round | null>(null);
  const [choice, setChoice] = useState<Entry | null>(null);
  const [score, setScore] = useState({ right: 0, all: 0 });
  const [replay, setReplay] = useState(0);

  const next = (p = pool) => { triggerHaptic(10); setRound(r => makeRound(p, r?.e)); setChoice(null); setReplay(0); };
  const choose = (o: Entry) => {
    if (!round || choice) return;
    triggerHaptic(12);
    setChoice(o);
    const ok = o === round.e;
    setScore(s => ({ right: s.right + (ok ? 1 : 0), all: s.all + 1 }));
    countDrill('colloquium', ok);
  };

  return (
    <section>
      <SectionHead title="გამოიცანი სმენით" sub="ვარჯიში კოლოკვიუმისთვის — ნაწყვეტი უნივერსიტეტის ჩანაწერიდან" />
      <div className={`${CARD} overflow-hidden`}>
        {!round ? (
          <div className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028]"><Ear className="w-5 h-5" /></span>
              <p className="text-[14px] leading-relaxed text-[#3a2d22]">
                აპი ჩართავს ნახევარწუთიან ნაწყვეტს, შენ კი ოთხი სახელიდან სწორს აირჩევ. მერე ნახავ, სადაურია და რა ჟანრისაა —
                გამოცდაზე ესეც უნდა დაწერო.
              </p>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {([['all', 'ყველა'], ['chant', 'საგალობლები'], ['song', 'სიმღერები']] as [Pool, string][]).map(([p, label]) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { triggerHaptic(8); setPool(p); }}
                  aria-pressed={pool === p}
                  className={`min-h-10 px-4 rounded-full text-[13px] font-bold cursor-pointer ${pool === p ? 'bg-[#2a2017] text-[#fbf6ec]' : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => next()}
              className="mt-3.5 inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold hover:bg-[#5e1820] cursor-pointer shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]"
            >
              დაწყება <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 border-b border-[#efe5d4] bg-[#fffdf8]">
              <span className="flex-1 min-w-0 font-serif-ge text-[16px] font-bold text-[#2a2017]">რა ჟღერს?</span>
              {score.all > 0 && (
                <span className="shrink-0 inline-flex items-center gap-1 px-2.5 h-8 rounded-full bg-[#edf6ef] text-[#2f6b43] text-[13px] font-bold tabular-nums">
                  <Check className="w-4 h-4" /> {score.right} / {score.all}
                </span>
              )}
              <button type="button" onClick={() => { triggerHaptic(10); setRound(null); }} aria-label="დახურვა" className="shrink-0 grid place-items-center w-9 h-9 rounded-full text-[#8a7a6a] hover:bg-[#f3ead9] hover:text-[#2a2017] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-3.5 sm:px-5 py-4 space-y-3">
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                <iframe
                  key={`${round.n}:${replay}`}
                  title="ნაწყვეტი კოლოკვიუმისთვის"
                  src={embed(round)}
                  className="block w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                />
              </div>
              <div className="flex justify-between items-center gap-2">
                <p className="text-[13px] text-[#6b5c4d]">ნახევარი წუთი. თუ არ ჩაირთო, შეეხე ვიდეოს.</p>
                <button
                  type="button"
                  onClick={() => { triggerHaptic(8); setReplay(x => x + 1); }}
                  className="shrink-0 inline-flex items-center gap-1.5 min-h-10 px-3.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> თავიდან
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {round.options.map(o => {
                  const state = choice ? (o === round.e ? 'right' : o === choice ? 'wrong' : 'dim') : 'idle';
                  return (
                    <button
                      key={o.item.title + o.group}
                      type="button"
                      disabled={Boolean(choice)}
                      onClick={() => choose(o)}
                      className={`min-h-12 rounded-xl ring-1 px-3 py-2 text-left font-serif-ge text-[15px] font-bold leading-snug transition-colors cursor-pointer disabled:cursor-default ${
                        state === 'right' ? 'bg-[#edf6ef] text-[#24563a] ring-2 ring-[#7fb893]'
                          : state === 'wrong' ? 'bg-[#fbeeee] text-[#a3262f] ring-2 ring-[#e7a9ae]'
                          : state === 'dim' ? 'bg-white text-[#b3a28d] ring-[#efe5d4]'
                          : 'bg-white text-[#2a2017] ring-[#e2d5bf] hover:ring-[#7a2028]/45 hover:text-[#7a2028]'
                      }`}
                    >
                      {o.item.title}
                    </button>
                  );
                })}
              </div>
              {choice && (
                <div className={`rounded-xl px-3.5 py-3 ring-1 ${choice === round.e ? 'bg-[#edf6ef] ring-[#bfdcc7]' : 'bg-[#fbeeee] ring-[#efc4c7]'}`}>
                  <p className={`flex items-center gap-1.5 text-[14.5px] font-bold ${choice === round.e ? 'text-[#2f6b43]' : 'text-[#a3262f]'}`}>
                    {choice === round.e ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                    {choice === round.e ? 'სწორია!' : 'არასწორია'}
                  </p>
                  <p className="mt-1 text-[14px] leading-snug text-[#3a2d22]">
                    ეს იყო <b className="font-serif-ge">„{round.e.item.title}“</b> — {about(round.e)}.
                  </p>
                </div>
              )}
              {choice && (
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => next()}
                    className="ml-auto inline-flex items-center gap-1.5 min-h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold hover:bg-[#5e1820] cursor-pointer"
                  >
                    შემდეგი <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
