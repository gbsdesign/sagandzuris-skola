import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Dices, Eraser, Flame, Share2, Shuffle } from 'lucide-react';
import { useDailyRecord } from '../../hooks/useDailyRecord';
import { OTKHEULI_GROUPS } from '../../data/otkheuliGroups';
import {
  GROUP_SIZE, MAX_MISTAKES, afterPick, buildGrid, gridOfDay, mulberry32, otkheuliShareText, otkheuliStats, replay, shuffle, wasTried,
  type OtkheuliGroup,
} from '../../utils/otkheuli';
import { dayNumber, emptyDay, tbilisiToday, type HangiDay } from '../../utils/hangi';
import { Btn, Card, Stat } from '../../components/ui/kit';
import { Toast } from '../../components/ui/Toast';
import { triggerHaptic } from '../../utils/haptics';
import { MONTHS_GE } from '../../utils/dateNames';

// „ოთხეული“ (games hub, 2026-10-28): sixteen words, four hidden groups of four. One grid a day for the whole school —
// its record counts for the streak and the statistics — and as many extra grids as one likes (a random seed, nothing
// saved). The rules and the grid are utils/otkheuli.ts, the groups data/otkheuliGroups.ts, the record
// hooks/useDailyRecord.ts ('otkheuli').

// the four groups' colours, by their place in the grid (the share squares follow the same order: 🟨🟩🟦🟪)
const TONE = [
  'bg-[#f6d66e] text-[#4a3a10]',
  'bg-[#a8d48c] text-[#1f3d1a]',
  'bg-[#a6c8ea] text-[#102a43]',
  'bg-[#cfa6d4] text-[#3a1536]',
];

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

const GroupBar: React.FC<{ group: OtkheuliGroup; tone: string }> = ({ group, tone }) => (
  <div className={`rounded-2xl px-3 py-2.5 text-center ${tone}`}>
    <p className="text-[13.5px] font-bold leading-snug">{group.label}</p>
    <p className="mt-0.5 text-[12.5px] leading-snug opacity-90">{group.words.join(' · ')}</p>
  </div>
);

const OtkheuliGame: React.FC = () => {
  const { days, loaded, save, member } = useDailyRecord('otkheuli');
  const [today, setToday] = useState(tbilisiToday);
  const [seed, setSeed] = useState<number | null>(null); // null = the day's grid
  const [extraMoves, setExtraMoves] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [shaking, setShaking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // the day turns at midnight in Georgia, even with the page open
  useEffect(() => {
    const t = setInterval(() => setToday(tbilisiToday()), 60_000);
    return () => clearInterval(t);
  }, []);

  const isDay = seed === null;
  const grid = useMemo(() => (seed === null ? gridOfDay(OTKHEULI_GROUPS, today) : buildGrid(OTKHEULI_GROUPS, mulberry32(seed))), [seed, today]);
  useEffect(() => { setPicked([]); setOrder(grid?.tiles ?? []); }, [grid]);

  const saved = days[today];
  const day: HangiDay = grid && saved && saved.id === grid.key ? saved : emptyDay(grid?.key ?? '');
  const moves = isDay ? day.guesses : extraMoves;
  const st = useMemo(() => (grid ? replay(grid, moves) : undefined), [grid, moves]);
  const stats = useMemo(() => otkheuliStats(days, today), [days, today]);
  const n = dayNumber(today);

  const toggle = (w: string) => {
    if (!st || st.done) return;
    triggerHaptic(5);
    setPicked(p => (p.includes(w) ? p.filter(x => x !== w) : p.length < GROUP_SIZE ? [...p, w] : p));
  };

  const shake = () => { triggerHaptic(40); setShaking(true); window.setTimeout(() => setShaking(false), 450); };

  const check = () => {
    if (!grid || !st || st.done || picked.length !== GROUP_SIZE) return;
    if (wasTried(moves, picked)) { shake(); setToast('ეს ოთხეული უკვე სცადე'); return; }
    const record: HangiDay = isDay ? day : { id: grid.key, guesses: extraMoves, won: st.won, done: st.done };
    const { day: next, verdict } = afterPick(record, grid, picked);
    if (isDay) save(today, next); else setExtraMoves(next.guesses);
    if (verdict.kind === 'solved') { triggerHaptic(20); setPicked([]); return; }
    shake();
    if (verdict.kind === 'oneAway') setToast('ერთი აკლია!');
  };

  const share = async () => {
    if (!grid) return;
    const msg = otkheuliShareText(n, grid, moves);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  const another = () => { setExtraMoves([]); setSeed(Math.floor(Math.random() * 2 ** 31)); };
  const backToDay = () => { setExtraMoves([]); setSeed(null); };

  if (!loaded) return <div className="w-full max-w-2xl px-1 py-6 text-center text-[13px] text-[#8a7a6a]">იტვირთება…</div>;
  if (!grid || !st) return null;

  const tiles = order.filter(w => st.left.includes(w));
  const toneOf = (g: OtkheuliGroup) => TONE[grid.groups.indexOf(g)] ?? TONE[0];
  const unsolved = grid.groups.filter(g => !st.solved.includes(g));

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug">{isDay ? `ოთხეული · №${n}` : 'ოთხეული · დამატებითი ბადე'}</p>
            <p className="mt-0.5 text-[13px] text-[#fbf6ec]/85">{isDay ? dateLabel(today) : 'შემთხვევითი ბადე — შედეგი არ ინახება'}</p>
          </div>
          {isDay && (
            <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 px-3 h-9 text-[13px] font-bold tabular-nums" title="სერია">
              <Flame className="w-4 h-4" /> {stats.streak}
            </div>
          )}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          16 სიტყვა, ოთხი ფარული ჯგუფი. აირჩიე ოთხი, რომელსაც რაღაც აერთიანებს, და შეამოწმე. ოთხი შეცდომის მერე თამაში მთავრდება.
        </p>
      </Card>

      {st.solved.length > 0 && (
        <div className="space-y-1.5">
          {st.solved.map(g => <GroupBar key={g.id} group={g} tone={toneOf(g)} />)}
        </div>
      )}

      {!st.done ? (
        <>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="სიტყვები">
            {tiles.map(w => {
              const on = picked.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(w)}
                  className={`min-h-[60px] rounded-xl px-1 py-1.5 font-bold leading-tight text-center [overflow-wrap:anywhere] transition active:scale-95 cursor-pointer ${w.length > 8 ? 'text-[12px]' : 'text-[13.5px]'} ${on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.9)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:bg-[#fbf6ec]'} ${on && shaking ? 'sg-shake' : ''}`}
                >
                  {w}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-[12.5px] text-[#75685a]" aria-label={`დარჩა ${MAX_MISTAKES - st.mistakes} ცდა`}>
            <span>დარჩენილი ცდები:</span>
            <span className="flex gap-1.5">
              {Array.from({ length: MAX_MISTAKES }, (_, i) => (
                <span key={i} className={`w-3 h-3 rounded-full ${i < MAX_MISTAKES - st.mistakes ? 'bg-[#7a2028]' : 'bg-[#e8dcc8]'}`} />
              ))}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Btn kind="ghost" icon={<Shuffle />} onClick={() => setOrder(o => shuffle(o, Math.random))} className="flex-1 min-w-[120px]">არევა</Btn>
            <Btn kind="ghost" icon={<Eraser />} disabled={!picked.length} onClick={() => setPicked([])} className="flex-1 min-w-[120px]">გასუფთავება</Btn>
            <Btn icon={<Check />} disabled={picked.length !== GROUP_SIZE} onClick={check} className="w-full">შემოწმება{picked.length ? ` · ${picked.length}/${GROUP_SIZE}` : ''}</Btn>
          </div>
          {!isDay && (
            <div className="text-center">
              <button type="button" onClick={backToDay} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
                <CalendarDays className="w-4 h-4" /> დღის ბადეზე დაბრუნება
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {unsolved.length > 0 && (
            <div className="space-y-1.5">
              <p className="px-1 text-[12.5px] font-bold text-[#75685a]">ვერ იპოვე:</p>
              {unsolved.map(g => <GroupBar key={g.id} group={g} tone={toneOf(g)} />)}
            </div>
          )}
          <Card tone="paper" className="!p-4">
            <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">
              {st.won ? (st.mistakes ? `ყველა ოთხეული იპოვე ${st.mistakes} შეცდომით! 🎉` : 'ყველა ოთხეული უშეცდომოდ იპოვე! 🎉') : isDay ? 'დღეს ვერ იპოვე' : 'ამჯერად ვერ იპოვე'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {isDay && <Btn kind="ghost" icon={<Share2 />} onClick={share}>გაზიარება</Btn>}
              <Btn kind="ghost" icon={<Dices />} onClick={another}>კიდევ ერთი ბადე</Btn>
              {!isDay && <Btn kind="ghost" icon={<CalendarDays />} onClick={backToDay}>დღის ბადე</Btn>}
            </div>
            {isDay && <p className="mt-3 text-[12.5px] leading-snug text-[#9a8b7b]">ხვალ ახალი ბადე იქნება. {member ? 'შედეგი შენს ჩანაწერშია.' : 'შედეგი ამ ტელეფონზე ინახება.'}</p>}
          </Card>
        </>
      )}

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები" />
          <Stat value={stats.played ? `${Math.round((stats.won / stats.played) * 100)}%` : '–'} label="ნაპოვნი" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.best} label="საუკეთესო" />
        </div>
        <p className="mt-3 mb-1.5 text-[12.5px] font-bold text-[#75685a]">რამდენი შეცდომით</p>
        <ul className="space-y-1">
          {stats.dist.map((c, i) => {
            const max = Math.max(1, ...stats.dist);
            return (
              <li key={i} className="flex items-center gap-2 text-[12px] tabular-nums text-[#75685a]">
                <span className="w-7 text-right">{i < MAX_MISTAKES ? i : 'ვერ'}</span>
                <span className="flex-1 h-3 rounded-full bg-[#f1e8d9] overflow-hidden"><span className={`block h-full rounded-full ${i < MAX_MISTAKES ? 'bg-[#7a2028]/70' : 'bg-[#9a8b7b]/60'}`} style={{ width: `${(c / max) * 100}%` }} /></span>
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

export default OtkheuliGame;
