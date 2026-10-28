import React, { useEffect, useRef, useState } from 'react';
import { Dumbbell, Pause, Play } from 'lucide-react';
import { findDrill } from '../../data/vocalDrills';
import { drillTakeUrl, readDrillDone, useDrillTakes } from '../../utils/drillTakes';
import { readDrillScores } from '../../utils/drillScores';
import { ManeraScore } from '../views/ManeraPanel';
import { georgiaToday } from '../../utils/psalter';
import { shortDate } from '../../hooks/useTeaching';

// The member's exercises in their window (teachers, admins): how many they did in the last 7 days, the app's best score
// of each (microphone or AI teacher), and the recordings they sent („მასწავლებელს გაგზავნა“) to hear. Shown only once
// there is something.
export const DrillReview: React.FC<{ uid: string; drillDone?: unknown; drillScore?: unknown }> = ({ uid, drillDone, drillScore }) => {
  const takes = useDrillTakes(uid);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);

  const done = readDrillDone(drillDone);
  const weekStart = georgiaToday(new Date(Date.now() - 6 * 86400000));
  const week = Object.values(done).filter(d => d >= weekStart).length;
  const scores = Object.entries(readDrillScores(drillScore)).sort((a, b) => a[1] - b[1]);
  if (!takes.length && !Object.keys(done).length && !scores.length) return null;

  const play = (id: string) => {
    if (playing === id) { stop(); return; }
    stop();
    const t = takes.find(x => x.id === id);
    if (!t) return;
    const url = drillTakeUrl(t);
    const a = new Audio(url);
    a.onended = stop;
    audio.current = { a, url };
    setPlaying(id);
    a.play().catch(stop);
  };

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#75685a]">
        <Dumbbell className="w-4 h-4" /> სავარჯიშოები · ბოლო 7 დღეში {week}
      </p>
      {scores.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="აპის შეფასებები">
          {scores.map(([id, v]) => (
            <li key={id} className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#efe5d4] pl-2.5 pr-1 py-0.5">
              <span className="text-[12.5px] font-semibold text-[#4a3426]">{findDrill(id)?.title ?? id}</span>
              <ManeraScore v={v} />
            </li>
          ))}
        </ul>
      )}
      {takes.length > 0 && (
        <ul className="mt-1 divide-y divide-[#f1e8d9]">
          {takes.map(t => (
            <li key={t.id} className="py-2.5 flex items-center gap-2.5">
              <button type="button" onClick={() => play(t.id)} aria-label={playing === t.id ? 'გაჩერება' : 'მოსმენა'}
                className="shrink-0 w-11 h-11 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.14]">
                {playing === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold leading-snug text-[#4a3426]">{findDrill(t.id)?.title ?? t.id}</p>
                <p className="text-[12px] text-[#8a7a6a]">{shortDate(t.at.slice(0, 10))} · {t.seconds} წმ</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
