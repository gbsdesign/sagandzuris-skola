import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, HelpCircle, Play, Share2, Shuffle, UserRound, X } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { VIN_PEOPLE, vinPerson } from '../../../data/vinPeople';
import {
  BOARD_SIZE, MAX_QUESTIONS, askQuestion, boardFor, dayRun, freeRun, guessName, parseVinRun, questionsLeft, ruledOut, runOver, runWon,
  vinDay, vinQuestion, vinShareText, vinStats, type VinRun,
} from '../../../utils/vin';
import { mulberry32 } from '../../../utils/otkheuli';
import { dayNumber, hash32, tbilisiToday } from '../../../utils/hangi';
import { MONTHS_GE } from '../../../utils/dateNames';
import { Btn, Card, Stat, askConfirm } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { AskedLine, Facts, NameBoard, PersonHead, QuestionDots, QuestionSheet } from './parts';

// „ვინ ვარ მე?“ alone (the hub's „ონლაინ“, 2026-11-01): the day's person — the same for the whole school — hides among 24
// names; the questions sit in a sheet, each answer rules names out on the board, a name tapped is a guess. The day's record is
// the questions asked (`useDailyRecord('vin')`, kept after every one, so the day goes on on any phone); then the free game,
// 24 names or all of them (`sg-vin-free`).

const FREE_KEY = 'sg-vin-free';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

/** the day's game as the record left it (another phone's questions too) */
const dayFrom = (iso: string, record: { id: string; guesses: string[] } | undefined): VinRun => {
  const day = dayRun(iso, VIN_PEOPLE);
  if (!record) return day;
  const board = record.id === day.hidden ? day.board : boardFor(record.id, VIN_PEOPLE, BOARD_SIZE, mulberry32(hash32(`vin-board|${iso}`)));
  return parseVinRun({ hidden: record.id, board, asked: record.guesses }, VIN_PEOPLE) ?? day;
};

const verdictOf = (r: VinRun) => {
  if (!runWon(r)) return 'ოცი კითხვა ამოიწურა. ხვალ ახალი ადამიანია — სცადე ისევ!';
  const n = r.asked.length;
  return n <= 5 ? 'ბრწყინვალე! ცოტა კითხვით, ზუსტად.' : n <= 8 ? 'ძალიან კარგია!' : n <= 12 ? 'კარგია — ხვალ უფრო ცოტა კითხვით სცადე.' : 'გამოიცანი! შემდეგ ჯერზე კითხვები ისე შეარჩიე, რომ ბევრი სახელი ერთად წაიშალოს.';
};

/** one game: the board, the questions' button, the answers; once over, who it was */
const Play$: React.FC<{ run: VinRun; setRun: (r: VinRun) => void; head: React.ReactNode; after?: React.ReactNode }> = ({ run, setRun, head, after }) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const over = runOver(run);
  const out = ruledOut(run, VIN_PEOPLE);
  const left = run.board.length - out.size;
  const hidden = vinPerson(run.hidden);
  useEffect(() => { setNote(null); }, [run.hidden]);

  const ask = (id: string) => {
    const before = ruledOut(run, VIN_PEOPLE).size;
    const next = askQuestion(run, id);
    setOpen(false);
    if (next === run) return;
    const yes = vinQuestion(id)?.test(hidden!) ?? false;
    const gone = ruledOut(next, VIN_PEOPLE).size - before;
    setNote(`„${vinQuestion(id)?.text}“ — ${yes ? 'კი' : 'არა'}. ${gone ? `დაფიდან წაიშალა ${gone}.` : 'ამ პასუხმა არავინ წაშალა.'}`);
    triggerHaptic(yes ? 20 : 12);
    setRun(next);
  };
  const guess = async (id: string) => {
    const p = vinPerson(id);
    if (!p || over) return;
    const ok = await askConfirm({ title: `ეს არის „${p.name}“?`, text: 'გამოცნობაც კითხვად ითვლება.', ok: 'ეს არის!' });
    if (!ok) return;
    const next = guessName(run, id);
    setNote(id === run.hidden ? null : `„${p.name}“ არ არის.`);
    triggerHaptic(id === run.hidden ? 30 : 45);
    setRun(next);
  };

  return (
    <div className="space-y-3">
      {head}
      {over && hidden ? (
        <Card tone="paper" className="!p-4 space-y-3">
          <p className={`font-serif-ge text-[19px] font-bold ${runWon(run) ? 'text-[#2f7d4f]' : 'text-[#7a2028]'}`}>
            {runWon(run) ? `გამოიცანი ${run.asked.length} კითხვით!` : 'ვერ გამოიცანი'}
          </p>
          <p className="text-[14px] leading-snug text-[#4a3426]">{verdictOf(run)}</p>
          <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-4 space-y-3">
            <PersonHead p={hidden} big />
            <Facts p={hidden} />
          </div>
          {after}
        </Card>
      ) : note && (
        <p className="rounded-2xl bg-[#7a2028]/[0.06] px-4 py-2.5 text-[14px] font-bold leading-snug text-[#7a2028]" role="status" aria-live="polite">{note}</p>
      )}
      <NameBoard run={run} over={over} onGuess={id => { void guess(id); }} />
      <AskedLine run={run} />
      {!over && (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70">
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#75685a]">
              {left === 1
                ? <b className="text-[#2f7d4f]">დარჩა ერთი — შეეხე მის სახელს!</b>
                : <>დარჩა <b className="text-[#4a3426]">{left}</b> სახელი</>}
              {' '}· კითხვა <b className="text-[#4a3426] tabular-nums">{run.asked.length}/{MAX_QUESTIONS}</b>
            </p>
            <Btn size="lg" icon={<HelpCircle />} onClick={() => setOpen(true)} className="!h-12 shrink-0">კითხვის დასმა</Btn>
          </div>
        </div>
      )}
      <QuestionSheet open={open} onClose={() => setOpen(false)} run={run} onAsk={ask} left={questionsLeft(run)} />
    </div>
  );
};

interface Free { size: number; run: VinRun }
const readFree = (): Free | null => {
  const o = readJson(FREE_KEY) as Partial<Free> | null;
  const run = o && parseVinRun(o.run, VIN_PEOPLE);
  return run && typeof o?.size === 'number' ? { size: o.size, run } : null;
};

export const VinSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('vin');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);
  const record = days[today];
  const run = useMemo(() => dayFrom(today, record), [today, record]);
  const setRun = (r: VinRun) => save(today, vinDay(r));
  const over = runOver(run);

  const [free, setFreeState] = useState<Free | null>(readFree);
  const setFree = (f: Free | null) => { setFreeState(f); writeJson(FREE_KEY, f); };
  const [size, setSize] = useState(BOARD_SIZE);
  const startFree = () => {
    triggerHaptic(10);
    setFree({ size, run: freeRun(VIN_PEOPLE, size, Math.floor(Math.random() * 2 ** 31)) });
    window.scrollTo({ top: 0 });
  };
  const stats = useMemo(() => vinStats(days, today), [days, today]);

  const share = async () => {
    const msg = vinShareText(dayNumber(today), run, VIN_PEOPLE);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  if (free) {
    const n = free.run.board.length;
    return (
      <Play$
        run={free.run}
        setRun={r => setFree({ ...free, run: r })}
        head={(
          <Card className="!p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი თამაში · {n} სახელი</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">კითხვა {free.run.asked.length}/{MAX_QUESTIONS} · არაფერი ინახება</p>
              </div>
              <button type="button" onClick={() => setFree(null)} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
                <X className="w-5 h-5" />
              </button>
            </div>
            <QuestionDots run={free.run} max={MAX_QUESTIONS} />
          </Card>
        )}
        after={(
          <div className="flex flex-wrap gap-2">
            <Btn icon={<Shuffle />} onClick={startFree} className="flex-1 min-w-[150px]">კიდევ ერთი</Btn>
            <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setFree(null)} className="flex-1 min-w-[150px]">დღის თამაში</Btn>
          </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {loaded ? (
        <Play$
          run={run}
          setRun={setRun}
          head={(
            <Card className="!p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#7a2028] text-[#fbf6ec] inline-flex items-center justify-center shrink-0"><UserRound className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის ადამიანი №{dayNumber(today)} · {dateLabel(today)}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
                    {over ? (runWon(run) ? `გამოიცანი ${run.asked.length} კითხვით` : 'დღეს ვერ გამოიცანი') : `ერთი და იგივე მთელი სკოლისთვის · კითხვა ${run.asked.length}/${MAX_QUESTIONS}`}
                  </p>
                </div>
              </div>
              <QuestionDots run={run} max={MAX_QUESTIONS} />
              {!run.asked.length && (
                <p className="text-[13.5px] leading-snug text-[#4a3426]">
                  აპმა ჩაიფიქრა ერთი ცნობილი ქართველი — ამ {run.board.length} სახელიდან ერთ-ერთი. დასვი კი/არა კითხვები: პასუხი თვითონ წაშლის
                  დაფიდან ყველას, ვინც არ ერგება. სახელზე შეხება გამოცნობაა და ისიც კითხვად ითვლება. გაქვს {MAX_QUESTIONS} კითხვა — რაც ნაკლები, მით უკეთესი.
                </p>
              )}
            </Card>
          )}
          after={<Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        />
      ) : (
        <Card className="!p-4"><p className="text-[14px] text-[#9a8b7b]">იტვირთება…</p></Card>
      )}

      {over && (
        <>
          <Card className="!p-4 space-y-3">
            <div>
              <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი თამაში</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ახალი ადამიანი, ახალი დაფა — რამდენჯერაც გინდა. ხვალ ახალი დღის ადამიანია.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="დაფის ზომა">
              <Chip on={size === BOARD_SIZE} onClick={() => setSize(BOARD_SIZE)}>{BOARD_SIZE} სახელი</Chip>
              <Chip on={size !== BOARD_SIZE} onClick={() => setSize(VIN_PEOPLE.length)}>ყველა — {VIN_PEOPLE.length}</Chip>
            </div>
            <Btn icon={<Play />} onClick={startFree} full>დაწყება</Btn>
          </Card>
          <Card className="!p-4">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={stats.played} label="ნათამაშები დღე" />
              <Stat value={stats.streak} label="სერია" tone="wine" />
              <Stat value={stats.avg ?? '–'} label="საშუალოდ კითხვა" />
              <Stat value={stats.best} label="საუკეთესო სერია" tone="green" />
            </div>
          </Card>
        </>
      )}

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        ადამიანები და ფაქტები Claude-მა შეარჩია სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>
      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
