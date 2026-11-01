import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DoorOpen, KeyRound, Lightbulb, Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import { TSIKHE_ROOMS, tsikheRoom } from '../../../data/tsikheRooms';
import {
  HINT_COST, LEVEL_LABEL, ROOM_MINUTES, ROOM_MS, WRONG_COST, better, isOut, mmss, newRun, parseRun, piecesOf, resumeClock, pauseClock, runHint,
  runMiss, runMs, runPass, runSolve, starsOf, type TsikheBest, type TsikheRoom, type TsikheRun,
} from '../../../utils/tsikhe';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { useNow } from '../rounds/parts';
import { CastleArt, ClockPill, DoorTrail, OpenedDoor, Stars, lookOf } from './parts';
import { DoorPanel, GatePanel, useTsikheSounds, type TsikheSounds } from './Door';

// „ციხის გასაღები“ alone (the hub's „ონლაინ“, 2026-11-01) — or friends round one phone: the four castles, each with its best on
// this device; a castle's story, then its five doors and the gate against the clock. The run is kept on the device after every
// step (`sg-tsikhe-run`), so ✕ only pauses it; while a door's note shows the clock waits.

const RUN_KEY = 'sg-tsikhe-run';
const BEST_KEY = 'sg-tsikhe-best';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readBest = (): Record<string, TsikheBest> => {
  const o = load(BEST_KEY);
  if (!o || typeof o !== 'object') return {};
  return Object.fromEntries(Object.entries(o as Record<string, Partial<TsikheBest>>).filter(([k, v]) => !!tsikheRoom(k) && typeof v?.ms === 'number' && typeof v?.stars === 'number')) as Record<string, TsikheBest>;
};
const costText = (ms: number) => (ms >= 60_000 ? `+${ms / 60_000} წთ` : `+${ms / 1000} წმ`);

/** a castle's story and the rules, before its clock starts */
const IntroScreen: React.FC<{ room: TsikheRoom; onStart: () => void; onClose: () => void }> = ({ room, onStart, onClose }) => {
  const look = lookOf(room.id);
  return (
    <TableScreen
      title={room.title}
      onClose={onClose}
      footer={<Btn size="lg" full icon={<Play />} onClick={onStart} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">დავიწყოთ! · {ROOM_MINUTES} წუთი</Btn>}
    >
      <div className="my-auto w-full max-w-xl mx-auto py-2 space-y-4">
        <CastleArt room={room.id} className="w-full max-w-[300px] mx-auto block rounded-3xl" />
        <div className="text-center">
          <p className="font-serif-ge text-[26px] font-bold leading-tight" style={{ color: look.tint }}>{room.title}</p>
          <p className="mt-0.5 text-[13.5px] font-bold text-[#75685a]">{room.where} · {LEVEL_LABEL[room.level]}</p>
        </div>
        <p className="text-[16px] leading-relaxed text-[#4a3426]">{room.intro}</p>
        <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3 space-y-2 text-[14px] leading-snug text-[#4a3426]">
          <li className="flex gap-2.5"><DoorOpen className="w-5 h-5 shrink-0 text-[#7a2028]" />ხუთი კარი ერთმანეთის მიყოლებით — ყოველი გაღებული კარი გასაღების ერთ ნაწილს გაძლევს.</li>
          <li className="flex gap-2.5"><KeyRound className="w-5 h-5 shrink-0 text-[#c9a227]" />ჭიშკართან ნაწილებიდან სიტყვას ააწყობ — ის აღებს ციხეს.</li>
          <li className="flex gap-2.5"><Lightbulb className="w-5 h-5 shrink-0 text-amber-600" />გაჭედე? მინიშნება {costText(HINT_COST[0])}, პასუხი {costText(HINT_COST[2])}. არასწორი არჩევანი {costText(WRONG_COST)}.</li>
          <li className="flex gap-2.5"><Timer className="w-5 h-5 shrink-0 text-[#2b5f8a]" />ერთ ტელეფონზე მეგობრებთან ერთადაც ითამაშეთ — ერთად ფიქრი უფრო სწრაფია!</li>
        </ul>
      </div>
    </TableScreen>
  );
};

/** a door is open: its piece, what one learns, and on */
const SolvedPanel: React.FC<{ room: TsikheRoom; run: TsikheRun; tint: string }> = ({ room, run, tint }) => {
  const d = room.doors[run.door];
  const piece = piecesOf(room)[run.door];
  return (
    <div className="my-auto w-full max-w-xl mx-auto py-3 space-y-4 text-center">
      <OpenedDoor piece={piece} tint={tint} />
      <div>
        <p className="font-serif-ge text-[24px] font-bold text-[#2f7d4f]">კარი გაიღო!</p>
        <p className="mt-0.5 text-[15px] text-[#4a3426]">გასაღების ნაწილი: <b className="font-serif-ge text-[19px] text-[#8a6d12]">{piece}</b></p>
      </div>
      <div className="rounded-2xl bg-[#f6f0e4] px-4 py-3 text-left">
        <p className="text-[12.5px] font-bold text-[#8a6416]">იცოდი?</p>
        <p className="mt-1 text-[15px] leading-relaxed text-[#4a3426]">{d.note}</p>
      </div>
    </div>
  );
};

/** out of the castle — or caught by the guard */
const OutPanel: React.FC<{ room: TsikheRoom; run: TsikheRun; record: boolean }> = ({ room, run, record }) => {
  const stars = starsOf(run.done, run.used);
  const inTime = run.done <= ROOM_MS;
  return (
    <div className="my-auto w-full max-w-xl mx-auto py-3 space-y-4 text-center">
      <CastleArt room={room.id} open className="w-full max-w-[260px] mx-auto block rounded-3xl" />
      <div>
        <p className="font-serif-ge text-[28px] font-bold leading-tight text-[#2f7d4f]">{inTime ? 'გამოაღწიეთ!' : 'გამოხვედით — მაგრამ მცველმა დაგინახათ!'}</p>
        <div className="mt-1"><Stars n={stars} size="lg" /></div>
        {record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]"><Trophy className="w-4 h-4" />ამ ციხის რეკორდი!</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-2 py-2.5"><p className="text-[20px] font-bold tabular-nums text-[#4a3426]">{mmss(run.done)}</p><p className="text-[12px] text-[#75685a]">დრო</p></div>
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-2 py-2.5"><p className="text-[20px] font-bold tabular-nums text-[#4a3426]">{run.used}</p><p className="text-[12px] text-[#75685a]">მინიშნება</p></div>
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-2 py-2.5"><p className="text-[20px] font-bold tabular-nums text-[#4a3426]">{mmss(run.penalty)}</p><p className="text-[12px] text-[#75685a]">ჯარიმა</p></div>
      </div>
      <p className="text-[15.5px] leading-relaxed text-[#4a3426]">{room.outro}</p>
      <div className="rounded-2xl bg-[#f6f0e4] px-4 py-3 text-left">
        <p className="text-[12.5px] font-bold text-[#8a6416]">იცოდი? · {room.key}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-[#4a3426]">{room.gate.note}</p>
      </div>
      <p className="text-[13px] leading-snug text-[#75685a]">★★★ — {ROOM_MINUTES} წუთში და უმინიშნებოდ · ★★ — {ROOM_MINUTES} წუთში · ★ — დაგვიანებით</p>
    </div>
  );
};

const RunScreen: React.FC<{
  room: TsikheRoom;
  run: TsikheRun;
  setRun: (r: TsikheRun) => void;
  record: boolean;
  onClose: () => void;
  onAgain: () => void;
  sounds: TsikheSounds;
}> = ({ room, run, setRun, record, onClose, onAgain, sounds }) => {
  const doors = room.doors.length;
  const out = isOut(run, doors);
  const now = useNow(!out && !run.solved);
  const ms = runMs(run, now);
  const look = lookOf(room.id);
  const [bump, setBump] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => {
    if (!bump) return;
    const t = window.setTimeout(() => setBump(null), 1600);
    return () => window.clearTimeout(t);
  }, [bump]);
  const cost = (ms2: number) => setBump(b => ({ text: costText(ms2), n: (b?.n ?? 0) + 1 }));
  const scroller = useRef<HTMLDivElement>(null);
  // a new door starts at its top
  useEffect(() => { scroller.current?.parentElement?.scrollTo({ top: 0 }); }, [run.door, run.solved]);

  const title = out ? room.title : run.door < doors ? `${room.title} · კარი ${run.door + 1} / ${doors}` : `${room.title} · ჭიშკარი`;
  const right = out ? undefined : (
    <span className="relative flex items-center">
      {bump && <span key={bump.n} className="samosi-pop absolute right-full mr-1.5 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[12.5px] font-bold text-amber-900">{bump.text}</span>}
      <ClockPill ms={ms} />
    </span>
  );
  const footer = out ? (
    <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
      <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15px]">სხვა ციხე</Btn>
      <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15px]">თავიდან</Btn>
    </div>
  ) : run.solved ? (
    <Btn size="lg" full icon={run.door + 1 < doors ? <DoorOpen /> : <KeyRound />} onClick={() => { triggerHaptic(10); setRun(runPass(run, doors, Date.now())); }} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">
      {run.door + 1 < doors ? 'შემდეგი კარი' : 'ჭიშკართან!'}
    </Btn>
  ) : undefined;

  return (
    <TableScreen title={title} right={right} onClose={onClose} footer={footer}>
      <div ref={scroller} className="flex flex-col gap-3.5 pt-1 min-h-full">
        <DoorTrail room={room} door={run.door} solved={run.solved} />
        {!out && ms > ROOM_MS && !run.solved && (
          <p className="rounded-2xl bg-[#b23a48]/10 px-3.5 py-2 text-center text-[13.5px] font-bold text-[#8f2632]" role="status">{ROOM_MINUTES} წუთი გავიდა — მცველი მოდის! მაინც დაასრულეთ.</p>
        )}
        {out ? <OutPanel room={room} run={run} record={record} />
          : run.solved ? <SolvedPanel room={room} run={run} tint={look.tint} />
            : run.door < doors ? (
              <DoorPanel
                key={run.door}
                door={room.doors[run.door]}
                index={run.door}
                seed={run.seed}
                wrong={run.wrong}
                hints={run.hints}
                tint={look.tint}
                sounds={sounds}
                onRight={() => setRun(runSolve(run, Date.now()))}
                onMiss={o => { cost(WRONG_COST); setRun(runMiss(run, o)); }}
                onHint={() => { cost(HINT_COST[run.hints]); setRun(runHint(run)); }}
              />
            ) : (
              <GatePanel
                room={room}
                hints={run.hints}
                tint={look.tint}
                sounds={sounds}
                onHint={() => { cost(HINT_COST[run.hints]); setRun(runHint(run)); }}
                onRight={() => setRun(runPass(run, doors, Date.now()))}
              />
            )}
      </div>
    </TableScreen>
  );
};

export const TsikheSolo: React.FC = () => {
  const [run, setRunState] = useState<TsikheRun | null>(() => parseRun(load(RUN_KEY), tsikheRoom));
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState<TsikheRoom | null>(null);
  const [best, setBest] = useState(readBest);
  const [record, setRecord] = useState(false);
  const sounds = useTsikheSounds();
  const latest = useRef(run);
  latest.current = run;
  const bestRef = useRef(best);
  bestRef.current = best;

  const setRun = useCallback((r: TsikheRun | null) => {
    const was = latest.current;
    latest.current = r;
    setRunState(r);
    save(RUN_KEY, r);
    const room = r ? tsikheRoom(r.room) : undefined;
    // out of the castle: its best on this device
    if (r && room && isOut(r, room.doors.length) && !was?.done) {
      const b: TsikheBest = { ms: r.done, stars: starsOf(r.done, r.used) };
      const won = better(bestRef.current[r.room], b);
      setRecord(won);
      if (won) {
        const next = { ...bestRef.current, [r.room]: b };
        bestRef.current = next;
        setBest(next);
        save(BEST_KEY, next);
      }
    }
  }, []);

  // leaving the page (or the phone's screen going off) keeps the clock's time so far
  useEffect(() => {
    const keep = () => { const r = latest.current; if (r) save(RUN_KEY, pauseClock(r, Date.now())); };
    const onHide = () => { if (document.visibilityState === 'hidden') keep(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', keep);
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', keep); keep(); };
  }, []);

  const room = run ? tsikheRoom(run.room) : undefined;
  const start = (r: TsikheRoom) => {
    sounds.open();
    setRecord(false);
    setRun(newRun(r.id, (Date.now() % 2_147_483_647) || 1, Date.now()));
    setIntro(null);
    setOpen(true);
  };
  const enter = async (r: TsikheRoom) => {
    if (run && run.room === r.id && room && !isOut(run, room.doors.length)) {
      sounds.open();
      setRun(run.solved ? run : resumeClock(run, Date.now()));
      setOpen(true);
      return;
    }
    if (run && room && run.room !== r.id && !isOut(run, room.doors.length)) {
      if (!(await askConfirm({ title: `${room.title} — თამაში შეჩერებულია`, text: 'ახალ ციხეში შესვლა შეჩერებულ თამაშს წაშლის.', ok: 'ახალი ციხე' }))) return;
    }
    triggerHaptic(10);
    setIntro(r);
  };
  const close = () => {
    if (run && room && isOut(run, room.doors.length)) setRun(null);
    else if (run) setRun(pauseClock(run, Date.now()));
    setOpen(false);
  };

  if (intro) return <IntroScreen room={intro} onStart={() => start(intro)} onClose={() => setIntro(null)} />;
  if (open && run && room) return <RunScreen room={room} run={run} setRun={setRun} record={record} sounds={sounds} onClose={close} onAgain={() => start(room)} />;

  return (
    <div className="space-y-4">
      <Card tone="paper" className="!p-4 space-y-1.5">
        <p className="font-serif-ge text-[17px] font-bold text-[#7a2028]">ციხეში ჩაგკეტეს!</p>
        <p className="text-[14px] leading-relaxed text-[#4a3426]">
          ხუთი კარი, ხუთი ამოცანა: ძველი ასოებით ნაწერი წარწერა, კოდის საკეტი, გამოცანა, ჰანგი სმენით, ამბავი რიგზე. ყოველი
          გაღებული კარი გასაღების ნაწილს გაძლევს — ჭიშკართან სიტყვას ააწყობ. {ROOM_MINUTES} წუთი გაქვს!
        </p>
      </Card>
      <ul className="grid gap-3 sm:grid-cols-2">
        {TSIKHE_ROOMS.map(r => {
          const look = lookOf(r.id);
          const b = best[r.id];
          const going = run && run.room === r.id && room && !isOut(run, room.doors.length) ? run : null;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => { void enter(r); }}
                className="w-full h-full text-left rounded-3xl bg-white ring-1 ring-[#e8dcc8] p-3 flex flex-col gap-3 cursor-pointer active:scale-[0.99] transition hover:ring-[#7a2028]/30"
              >
                <CastleArt room={r.id} className="w-full rounded-2xl" />
                <div className="px-1 flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-serif-ge text-[19px] font-bold leading-tight" style={{ color: look.tint }}>{r.title}</p>
                    <p className="mt-0.5 text-[13px] text-[#75685a]">{r.where}</p>
                  </div>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold" style={{ background: `${look.tint}14`, color: look.tint }}>{LEVEL_LABEL[r.level]}</span>
                </div>
                <div className="px-1 flex items-center justify-between gap-2 min-h-11">
                  {b ? (
                    <span className="flex items-center gap-2"><Stars n={b.stars} /><span className="text-[13px] font-bold tabular-nums text-[#4a3426]">{mmss(b.ms)}</span></span>
                  ) : <span className="text-[13px] text-[#9a8b7b]">ჯერ არ გაგივლია</span>}
                  <span className="h-11 px-4 rounded-full inline-flex items-center gap-1.5 text-[14px] font-bold text-[#fbf6ec]" style={{ background: look.tint }}>
                    {going ? <><Play className="w-4 h-4" />{going.door < r.doors.length ? `კარი ${going.door + 1}` : 'ჭიშკარი'}</> : <><DoorOpen className="w-4 h-4" />შესვლა</>}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[12.5px] leading-snug text-[#75685a]">
        ამოცანები Claude-მა დაწერა ცნობილი ფაქტებითა და აპის მონაცემებით — მასწავლებელს ჯერ არ შეუმოწმებია. ჰანგებს სინთეზატორი
        წიგნის ნოტებით უკრავს. საუკეთესო დრო ამ მოწყობილობაზე ინახება.
      </p>
    </div>
  );
};
