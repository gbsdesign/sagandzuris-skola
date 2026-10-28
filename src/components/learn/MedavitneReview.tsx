import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Pause, Play } from 'lucide-react';
import { useAuth } from '../../context';
import { dayMonthGe } from '../../data/churchCalendar';
import { lessonById } from '../../data/medavitneLessons';
import { bookName, parseReadTakeId, rangesText, type ReadTake } from '../../utils/dayReadings';
import type { PearlShine } from '../../utils/pearls';
import { shinePearl, takeUrl, usePearlTakes } from '../../hooks/usePearls';
import { askConfirm, Btn } from '../ui/kit';

// The member's readings sent from „მედავითნეობა“ (a lesson's read-aloud step or the day's Apostle, ids „read~…“)
// in their window (teachers, admins): hear one and approve it („ჩათვლა“, kept in students.pearlShine under its id).
// Shown only once something was sent.

const titleOf = (t: ReadTake) => {
  if (t.kind === 'day') return { title: `${bookName(t.file)} ${rangesText(t.ranges)}`, sub: `სამოციქულო · ${dayMonthGe(t.iso)}` };
  const lesson = lessonById(t.lesson);
  const step = lesson?.steps[t.step];
  return { title: step && 'title' in step ? step.title : 'კითხვა', sub: lesson ? `გაკვეთილი · ${lesson.title}` : 'გაკვეთილი' };
};

export const MedavitneReview: React.FC<{ uid: string; shine?: Record<string, PearlShine> }> = ({ uid, shine = {} }) => {
  const { user } = useAuth();
  const takes = usePearlTakes(uid);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);

  const sent = Object.values(takes)
    .map(t => ({ t, id: parseReadTakeId(t.id) }))
    .filter((x): x is { t: typeof x.t; id: ReadTake } => Boolean(x.id))
    .sort((a, b) => Number(Boolean(shine[a.t.id])) - Number(Boolean(shine[b.t.id])) || b.t.at.localeCompare(a.t.at));
  if (!sent.length) return null;

  const play = (id: string) => {
    if (playing === id) { stop(); return; }
    stop();
    const t = takes[id];
    if (!t) return;
    const url = takeUrl(t);
    const a = new Audio(url);
    a.onended = stop;
    audio.current = { a, url };
    setPlaying(id);
    a.play().catch(stop);
  };

  const approve = async (id: string, on: boolean) => {
    setError('');
    if (!on && !(await askConfirm({ title: 'ჩათვლის მოხსნა?', text: 'წევრი ამ კითხვას ჩათვლილად აღარ დაინახავს.', ok: 'მოხსნა' }))) return;
    shinePearl(uid, id, on ? { voice: takes[id]?.voice || '1', by: user?.email || '', at: new Date().toISOString() } : null)
      .catch(e => setError('ვერ შეინახა: ' + (e?.message || e?.code || '')));
  };

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#75685a]">
        <BookOpen className="w-4 h-4 text-[#7a2028]" />
        მედავითნეობა · გამოგზავნილი კითხვა {sent.length}
      </p>
      <ul className="mt-1 divide-y divide-[#f1e8d9]">
        {sent.map(({ t, id }) => {
          const { title, sub } = titleOf(id);
          return (
            <li key={t.id} className="py-2.5 flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#4a3426] truncate">{title}</p>
                <p className="text-[12px] text-[#8a7a6a] truncate">{sub} · {t.at.slice(0, 10)}</p>
              </div>
              <button type="button" onClick={() => play(t.id)} aria-label={playing === t.id ? 'გაჩერება' : 'მოსმენა'}
                className="shrink-0 w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.14]">
                {playing === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              {shine[t.id]
                ? <Btn kind="ghost" size="sm" onClick={() => approve(t.id, false)}>ჩათვლილია</Btn>
                : <Btn kind="primary" size="sm" onClick={() => approve(t.id, true)}>ჩათვლა</Btn>}
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
    </div>
  );
};
