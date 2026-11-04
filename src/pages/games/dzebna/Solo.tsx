import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, MapPin, Share2, Shuffle } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { dzebnaPools, huntBank } from '../../../data/dzebnaPools';
import {
  PENALTY, SOLO_STATIONS, daySeed, dzebnaDay, dzebnaShare, mmss, newSoloRun, parseSoloRun, pauseRun, readDay, resumeRun, runSeconds,
  soloChest, soloHunt, soloLetters, soloMap, soloNext, soloStars, soloTask, type SoloHunt, type SoloRun,
} from '../../../utils/dzebna';
import { dayNumber, hangiStats, tbilisiToday } from '../../../utils/hangi';
import { MONTHS_GE } from '../../../utils/dateNames';
import { rukaTopicLabel } from '../../../utils/ruka';
import { Btn, Card, Stat } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { useNow } from '../rounds/parts';
import { useTsikheSounds } from '../tsikhe/Door';
import { Stars } from '../tsikhe/parts';
import { KutkheMap, RegionChips } from '../kutkhe/KutkheMap';
import { ChestArt, KindPill, LetterPad, LetterTile, TaskNote, TaskView, TimePill, Trail } from './parts';
import { NOW_KEY, readJson, writeJson } from './store';

// „საგანძურის ძებნა“ alone (the hub's „ონლაინ“, 2026-11-04): the day's hunt across Georgia's map, the same for the whole school.
// Six stations: a region found by its places (a wrong region +10 s and the next clue), then its task (a wrong answer +15 s);
// each gives a letter of the treasure's word, scrambled. At the chest the six letters are put in order (a wrong word +10 s).
// The clock stops while the page is hidden; the day's result goes to useDailyRecord('dzebna'), then free hunts.

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;
const markOf = (m: number) => (m <= 0 ? 'bg-[#2f7d4f]' : m <= 2 ? 'bg-[#d4a017]' : 'bg-[#b23a48]');

const verdictOf = (miss: number) =>
  miss === 0 ? 'უშეცდომოდ! ნამდვილი მეგზური ხარ.'
  : miss <= 3 ? 'ძალიან კარგია — საგანძური შენია!'
  : 'იპოვე! ხვალ ახალი ძებნაა — სცადე ნაკლები შეცდომით.';

/** the hunt's end: the chest open on its word, the time and every station's region and answer */
const Result: React.FC<{ h: SoloHunt; secs: number; miss: number[]; head: React.ReactNode; after?: React.ReactNode }> = ({ h, secs, miss, head, after }) => {
  const total = miss.reduce((a, b) => a + b, 0);
  const regionName = dzebnaPools().regionNames;
  return (
    <Card tone="paper" className="!p-4 space-y-3.5">
      {head}
      <div className="flex flex-col items-center gap-2 pt-1">
        <ChestArt open className="w-24 h-24" />
        <p className="font-serif-ge text-[20px] font-bold text-[#2f7d4f]">სკივრი გაიღო!</p>
        <div className="flex flex-wrap justify-center gap-1.5" aria-label={h.word.word}>
          {[...h.word.word].map((ch, i) => (
            <span key={i} className="w-11 h-12 rounded-xl bg-[#c9a227] text-white shadow-[0_3px_0_#a3821b] flex items-center justify-center font-serif-ge text-[26px] font-bold">{ch}</span>
          ))}
        </div>
        <p className="text-[13px] font-bold text-[#8a7560]">{h.word.hint}</p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <TimePill secs={secs} big />
        <Stars n={soloStars(total)} size="lg" />
      </div>
      <p className="text-center text-[14px] leading-snug text-[#4a3426]">
        {verdictOf(total)} {total > 0 && <span className="text-[#75685a]">შეცდომა: {total}.</span>}
      </p>
      <ol className="space-y-1.5">
        {h.stations.map((st, i) => (
          <li key={i} className="flex items-start gap-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2">
            <span className={`mt-0.5 w-7 h-7 shrink-0 rounded-full ${markOf(miss[i] ?? 0)} text-white text-[13px] font-bold flex items-center justify-center tabular-nums`}>{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold leading-snug text-[#4a3426]">{regionName[st.region]} <span className="font-normal text-[#8a7560]">· {st.clues.map(c => c.name).join(', ')}</span></p>
              <p className="text-[12.5px] leading-snug text-[#75685a]">{st.task.ask} — <span className="font-bold text-[#2f7d4f]">{st.task.options[st.task.right]}</span></p>
            </div>
          </li>
        ))}
      </ol>
      {after}
    </Card>
  );
};

/** a station's clues: the places of its region, the hardest first, one more after each wrong region */
const Clues: React.FC<{ h: SoloHunt; r: SoloRun }> = ({ h, r }) => {
  const st = h.stations[r.at];
  return (
    <ol className="space-y-2">
      {st.clues.map((c, i) => (i < r.clues ? (
        <li key={c.id} className="samosi-pop flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2.5">
          <span className="w-8 h-8 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center"><MapPin className="w-4 h-4" /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-[#9a8b7b]">{rukaTopicLabel(c.topic)}</p>
            <p className="font-serif-ge text-[19px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{c.name}</p>
          </div>
        </li>
      ) : (
        <li key={c.id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#e3d5bd] px-3.5 py-2 text-[13px] font-bold text-[#a8998a]">
          <span className="w-8 h-8 shrink-0 rounded-full bg-[#f1e8d9] flex items-center justify-center tabular-nums">{i + 1}</span>
          მინიშნება {i + 1} — გაიხსნება შეცდომის შემდეგ
        </li>
      )))}
    </ol>
  );
};

/** a hunt being played: the trail and the clock, then the station's map, its task, the letter, and the chest */
const Play: React.FC<{ h: SoloHunt; r: SoloRun; setRun: (r: SoloRun) => void; title: string; onDone: (r: SoloRun) => void }> = ({ h, r, setRun, title, onDone }) => {
  const now = useNow(r.phase !== 'done');
  const secs = runSeconds(r, now);
  const sounds = useTsikheSounds();
  const [bump, setBump] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!bump) return;
    const t = window.setTimeout(() => setBump(null), 1600);
    return () => window.clearTimeout(t);
  }, [bump]);
  const cost = (s: number) => setBump(b => ({ text: `+${s} წამი`, n: (b?.n ?? 0) + 1 }));
  const top = useRef<HTMLDivElement>(null);
  // a new station (or the chest) starts at the top of the game
  useEffect(() => { top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, [r.at, r.phase === 'got']); // eslint-disable-line react-hooks/exhaustive-deps

  const st = h.stations[r.at];
  const letters = soloLetters(h, r);
  const names = dzebnaPools().regionNames;
  const pickRegion = (i: number) => {
    const next = soloMap(h, r, i);
    if (next === r) return;
    if (next.phase === 'task') { sounds.right(); triggerHaptic(20); } else { sounds.wrong(); triggerHaptic(40); cost(PENALTY.map); }
    setRun(next);
  };
  const pickAnswer = (i: number) => {
    const next = soloTask(h, r, i);
    if (next === r) return;
    if (next.phase === 'got') { sounds.out(); triggerHaptic(25); } else { sounds.wrong(); triggerHaptic(40); cost(PENALTY.task); }
    setRun(next);
  };
  const tryWord = (w: string) => {
    const next = soloChest(h, r, w, Date.now());
    if (next.phase === 'done') { sounds.out(); triggerHaptic(40); onDone(next); return true; }
    sounds.wrong();
    cost(PENALTY.chest);
    setRun(next);
    return false;
  };

  return (
    <div ref={top} className="space-y-3 scroll-mt-24">
      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-serif-ge text-[16px] font-bold leading-snug text-[#4a3426]">{title}</p>
          {bump && <span key={bump.n} className="samosi-pop shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[12.5px] font-bold text-amber-900" role="status">{bump.text}</span>}
          <TimePill secs={secs} />
        </div>
        <Trail n={h.stations.length} at={r.at} letters={letters} />
      </Card>

      {r.phase === 'map' && st && (
        <Card tone="paper" className="!p-4 space-y-3">
          <div>
            <p className="text-[13px] font-bold text-[#9a8b7b]">სადგური {r.at + 1} / {h.stations.length}</p>
            <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">რომელ კუთხეშია შემდეგი სადგური?</p>
          </div>
          <Clues h={h} r={r} />
          <KutkheMap mode="pick" pick={null} onPick={pickRegion} out={r.out} nameOf={i => names[i]} />
          <RegionChips pick={null} onPick={pickRegion} out={r.out} nameOf={i => names[i]} />
        </Card>
      )}

      {(r.phase === 'task' || r.phase === 'got') && st && (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#2f7d4f]/[0.1] text-[#1e4d31] text-[12.5px] font-bold">
              <Check className="w-3.5 h-3.5" />{names[st.region]}
            </span>
            <KindPill kind={st.task.kind} />
          </div>
          <TaskView task={st.task} struck={r.struck} onPick={pickAnswer} solved={r.phase === 'got'} />
          {r.phase === 'got' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
                <LetterTile ch={letters[letters.length - 1]} />
                <div className="min-w-0">
                  <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">ახალი ასო!</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
                    {r.at + 1 < h.stations.length ? `კიდევ ${h.stations.length - r.at - 1} სადგური დარჩა.` : 'ყველა ასო გაქვს — სკივრთან!'}
                  </p>
                </div>
              </div>
              <TaskNote task={st.task} />
              <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-3.5 py-2.5 space-y-1.5">
                <p className="text-[12.5px] font-bold text-[#8a7560]">{names[st.region]}: რაზე იყო მინიშნებები</p>
                {st.clues.map(c => (
                  <p key={c.id} className="text-[13px] leading-snug text-[#5a4a3c]"><span className="font-bold">{c.name}</span>{c.note ? ` — ${c.note}` : ''}</p>
                ))}
              </div>
              <Btn size="lg" full onClick={() => setRun(soloNext(h, r))}>
                {r.at + 1 < h.stations.length ? 'შემდეგი სადგური' : 'სკივრთან!'}
              </Btn>
            </div>
          )}
        </Card>
      )}

      {r.phase === 'chest' && (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex items-center gap-3">
            <ChestArt className="w-16 h-16 shrink-0" />
            <div className="min-w-0">
              <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">სკივრი</p>
              <p className="mt-0.5 text-[13.5px] leading-snug text-[#4a3426]">
                {h.stations.length} ასო გაქვს. შეადგინე სიტყვა და სკივრი გაიღება.
              </p>
              <p className="mt-1 text-[13px] font-bold text-[#8a6416]">მინიშნება: {h.word.hint}</p>
            </div>
          </div>
          <LetterPad letters={letters} onFull={tryWord} wrongText={`სკივრი არ გაიღო — სხვა რიგი სცადე (+${PENALTY.chest} წამი)`} />
        </Card>
      )}
    </div>
  );
};

const loadRun = (): SoloRun | null => {
  const raw = readJson(NOW_KEY) as { seed?: unknown } | null;
  if (!raw || !Number.isInteger(raw.seed)) return null;
  return parseSoloRun(raw, soloHunt(dzebnaPools(), huntBank(), raw.seed as number));
};

export const DzebnaSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('dzebna');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);
  const dayHunt = useMemo(() => soloHunt(dzebnaPools(), huntBank(), daySeed(today)), [today]);
  const done = readDay(days[today]);

  // the hunt on its way, the day's or a free one (kept on the device; the clock stops while the page is hidden)
  const [run, setRunState] = useState<SoloRun | null>(() => {
    const r = loadRun();
    return r && r.phase !== 'done' ? resumeRun(r, Date.now()) : r;
  });
  const setRun = (r: SoloRun | null) => { setRunState(r); writeJson(NOW_KEY, r); };
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    const keep = () => { const r = latest.current; if (r?.t0) writeJson(NOW_KEY, pauseRun(r, Date.now())); };
    const onVis = () => {
      const r = latest.current;
      if (!r || r.phase === 'done') return;
      const next = document.visibilityState === 'hidden' ? pauseRun(r, Date.now()) : resumeRun(r, Date.now());
      setRunState(next);
      writeJson(NOW_KEY, next);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', keep);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', keep); keep(); };
  }, []);
  // a day's hunt left from another day, or already finished on another phone, is let go
  useEffect(() => {
    if (run?.iso && (run.iso !== today || done)) setRun(null);
  }, [run?.iso, today, !!done]); // eslint-disable-line react-hooks/exhaustive-deps

  const hunt = useMemo(() => (run ? soloHunt(dzebnaPools(), huntBank(), run.seed) : null), [run?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => hangiStats(days, today), [days, today]);

  const startDay = () => {
    if (!dayHunt) return;
    triggerHaptic(12);
    setRun(newSoloRun(dayHunt, Date.now(), today));
  };
  const startFree = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const h = soloHunt(dzebnaPools(), huntBank(), seed);
    if (!h) return;
    triggerHaptic(12);
    setRun(newSoloRun(h, Date.now()));
    window.scrollTo({ top: 0 });
  };
  const finish = (r: SoloRun) => {
    if (!hunt) return;
    if (r.iso === today) {
      save(today, dzebnaDay(hunt.word.word, runSeconds(r, Date.now()), r.miss));
      setRun(null);
    } else setRun(r);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const share = async () => {
    if (!done) return;
    const msg = dzebnaShare(today, done.secs, done.miss);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  const unchecked = (
    <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
      ადგილები, კითხვები და მოვლენების თარიღები აპის თამაშებიდანაა (ნაწილი Claude-მა დაწერა) — მასწავლებელს ჯერ არ შეუმოწმებია.
    </p>
  );

  if (run && hunt && run.phase !== 'done') {
    const title = run.iso ? `დღის ძებნა №${dayNumber(today)} · ${dateLabel(today)}` : 'თავისუფალი ძებნა';
    return <div className="space-y-4"><Play h={hunt} r={run} setRun={setRun} title={title} onDone={finish} />{unchecked}</div>;
  }

  // a free hunt's end
  if (run && hunt && run.phase === 'done' && !run.iso) {
    return (
      <div className="space-y-4">
        <Result
          h={hunt}
          secs={runSeconds(run, Date.now())}
          miss={run.miss}
          head={<p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი ძებნა · არაფერი ინახება</p>}
          after={(
            <div className="flex flex-wrap gap-2">
              <Btn icon={<Shuffle />} onClick={startFree} className="flex-1 min-w-[150px]">კიდევ ერთი</Btn>
              <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setRun(null)} className="flex-1 min-w-[150px]">დღის ძებნა</Btn>
            </div>
          )}
        />
        {unchecked}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!loaded ? (
        <Card className="!p-4"><p className="text-[14px] text-[#9a8b7b]">იტვირთება…</p></Card>
      ) : done && dayHunt ? (
        <Result
          h={dayHunt}
          secs={done.secs}
          miss={done.miss}
          head={<p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის ძებნა №{dayNumber(today)} · {dateLabel(today)}</p>}
          after={<Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        />
      ) : (
        <Card className="!p-4 space-y-3.5">
          <div className="flex items-center gap-3">
            <ChestArt className="w-14 h-14 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">დღის ძებნა №{dayNumber(today)} · {dateLabel(today)}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ერთი და იგივე მთელი სკოლისთვის</p>
            </div>
          </div>
          <p className="text-[14px] leading-relaxed text-[#4a3426]">
            საგანძური საქართველოს {SOLO_STATIONS} კუთხეშია გაბნეული. თითო კუთხეს მინიშნებებით იპოვი რუკაზე, მერე მის დავალებას
            ამოხსნი და ერთ ასოს მიიღებ. ბოლოს ასოებს სწორ რიგში ჩაალაგებ და სკივრი გაიღება.
          </p>
          <ul className="grid grid-cols-3 gap-2 text-center">
            {[[`+${PENALTY.map}`, 'სხვა კუთხე'], [`+${PENALTY.task}`, 'სხვა პასუხი'], [`+${PENALTY.chest}`, 'სხვა სიტყვა']].map(([n, t]) => (
              <li key={t} className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe3cf] px-2 py-2">
                <p className="font-bold tabular-nums text-[#7a2028] text-[15px]">{n} წმ</p>
                <p className="text-[12px] leading-snug text-[#75685a]">{t}</p>
              </li>
            ))}
          </ul>
          <Btn size="lg" full onClick={startDay} disabled={!dayHunt}>ძებნის დაწყება</Btn>
        </Card>
      )}

      {loaded && done && (
        <>
          <Card className="!p-4 space-y-3">
            <div>
              <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი ძებნა</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ახალი კუთხეები, ახალი სიტყვა — რამდენჯერაც გინდა. ხვალ ახალი დღის ძებნაა.</p>
            </div>
            <Btn icon={<Shuffle />} onClick={startFree} full>დაწყება</Btn>
          </Card>
          <Card className="!p-4">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={stats.played} label="ნაპოვნი საგანძური" />
              <Stat value={mmss(done.secs)} label="დღევანდელი დრო" tone="green" />
              <Stat value={stats.streak} label="სერია" tone="wine" />
              <Stat value={stats.best} label="საუკეთესო სერია" />
            </div>
          </Card>
        </>
      )}
      {unchecked}
      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
