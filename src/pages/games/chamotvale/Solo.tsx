import React, { useEffect, useRef, useState } from 'react';
import { Flag, ListRestart, RotateCcw, Trophy } from 'lucide-react';
import { chamoSeconds, tryName, type ChamoList } from '../../../utils/chamotvale';
import { bell, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { TimerRing, useNow } from '../rounds/parts';
import { CountLine, FillMap, Slots, type SlotState } from './Board';
import { Entry } from './Entry';
import { ListPicker, timeText } from './Picker';
import { keepBest, rememberPlayed } from './store';

// „ჩამოთვალე!“ alone (the plan's „ონლაინ“: pick a list, the clock starts, type, the boxes fill; at the end the ones missed
// show): a list against its clock, my best per list on this phone.

interface Run { list: ChamoList; t0: number; found: boolean[]; fresh: number | null; end: { ms: number; record: boolean } | null }

export const UNCHECKED = 'სიები ხელოვნურმა ინტელექტმა შეადგინა საყოველთაოდ ცნობილი ფაქტებიდან და აპის მონაცემებიდან; მასწავლებელს ჯერ არ შეუმოწმებია.';

export const ChamotvaleSolo: React.FC = () => {
  const [run, setRun] = useState<Run | null>(null);
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const now = useNow(!!run && !run.end);
  const secs = run ? chamoSeconds(run.list.items.length) : 0;
  const left = run && !run.end ? Math.max(0, secs - (now - run.t0) / 1000) : 0;

  const start = (list: ChamoList) => {
    openAudio(audio);
    rememberPlayed([list.id]);
    setRun({ list, t0: Date.now(), found: list.items.map(() => false), fresh: null, end: null });
  };
  const finish = (r: Run) => {
    const ms = Math.min(secs * 1000, Date.now() - r.t0);
    const got = r.found.filter(Boolean).length;
    const record = got > 0 && keepBest(r.list.id, { found: got, n: r.list.items.length, ms });
    bell(audio.current);
    setRun({ ...r, fresh: null, end: { ms, record } });
  };
  // the clock runs out
  useEffect(() => {
    if (run && !run.end && left <= 0) finish(run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);
  // the fresh box's ring fades
  useEffect(() => {
    if (run?.fresh == null) return;
    const t = window.setTimeout(() => setRun(r => (r ? { ...r, fresh: null } : r)), 900);
    return () => window.clearTimeout(t);
  }, [run?.fresh]);

  if (!run) {
    return (
      <div className="space-y-4">
        <Card tone="wine" className="!p-4 sm:!p-5">
          <p className="font-serif-ge text-[17px] font-bold leading-snug">ჩამოთვალე!</p>
          <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
            აირჩიე სია — 12 მოციქული, რუკის 13 კუთხე, მზის სისტემის პლანეტები — და დროზე ჩამოთვალე ყველა. სახელი თავისით ჩაიწერება, როცა ბოლომდე
            დაწერ; ერთ-ორ ასოს შეცდომას „შემოწმება“ გაპატიებს. ბოლოს გამორჩენილებს ნახავ.
          </p>
        </Card>
        <ListPicker onPick={start} />
        <Hint>{UNCHECKED}</Hint>
      </div>
    );
  }

  const { list } = run;
  const n = list.items.length;
  const got = run.found.filter(Boolean).length;
  const state = (i: number): SlotState => (run.found[i] ? 'found' : run.end ? 'missed' : 'empty');

  if (run.end) {
    const whole = got === n;
    return (
      <TableScreen
        title={list.title}
        onClose={() => setRun(null)}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={() => setRun(null)} icon={<ListRestart />} className="!h-14 !text-[15px]">სხვა სია</Btn>
            <Btn size="lg" full onClick={() => start(list)} icon={<RotateCcw />} className="!h-14 !text-[15px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className={`w-9 h-9 mx-auto ${whole ? 'text-[#c9a227]' : 'text-[#b9ad9c]'}`} />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">{whole ? 'მთელი სია!' : `${got} / ${n}`}</p>
            <Hint>{whole ? `${timeText(run.end.ms)}-ში` : `${n - got} ვერ გაიხსენე — წითლად ჩანს`}{run.end.record ? ' · ახალი რეკორდი!' : ''}</Hint>
          </div>
          {list.map && <FillMap state={state} />}
          <Slots items={list.items} state={state} />
        </div>
      </TableScreen>
    );
  }

  const onTry = (text: string, enter: boolean) => {
    const t = tryName(list, run.found, text, enter);
    if (t.kind === 'found') {
      const found = run.found.slice();
      found[t.item] = true;
      const next = { ...run, found, fresh: t.item };
      if (found.every(Boolean)) finish(next);
      else setRun(next);
    }
    return t;
  };

  return (
    <TableScreen title={list.title} onClose={() => setRun(null)}>
      <div className="py-2 space-y-3">
        <CountLine found={got} n={n}>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => finish(run)}
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[13px] font-bold text-[#7a2028] bg-[#7a2028]/[0.07] cursor-pointer"
          >
            <Flag className="w-4 h-4" /> დასრულება
          </button>
          <TimerRing left={left} total={secs} size="sm" />
        </CountLine>
        {list.note && <Hint>{list.note}</Hint>}
        <Entry items={list.items} onTry={onTry}>
          {list.map && <FillMap state={state} />}
          <Slots items={list.items} state={state} fresh={run.fresh} />
        </Entry>
      </div>
    </TableScreen>
  );
};
