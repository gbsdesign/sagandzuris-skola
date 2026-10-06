import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, CircleCheck, Download, ListOrdered, Loader2 } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { ChantItem } from '../../data';
import { canOpenNotes } from '../../data/chantLookup';
import { formatLiturgyDate, formatTime } from '../../hooks/useLiturgy';
import { estimateMb, offlineCount, offlineSupported, onOfflineChange, saveOffline } from '../../utils/offlineNotes';
import { GrapeBunch } from '../../components/home/PlateOrnaments';
import { triggerHaptic } from '../../utils/haptics';

/** "დღევანდელი წირვა" card at the head of the chant lists: the teacher's program, or the one sent to my class. */
export const ProgramCard: React.FC = () => {
  const { liturgy, program, openProgram } = useNotes();
  if (liturgy.role === 'guest' || (liturgy.role === 'member' && !program)) return null;
  const n = program?.items.length ?? 0;
  const meta = program
    ? `${formatLiturgyDate(program.date)} · ${n} საგალობელი${liturgy.role === 'member' && program.sentAt ? ` · მასწავლებელმა გამოგზავნა ${formatTime(program.sentAt)}` : ''}`
    : '';
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); openProgram(); }}
      className="relative overflow-hidden w-full flex items-center gap-3 p-3.5 rounded-[18px] text-left text-white cursor-pointer active:scale-[0.985] transition-transform bg-gradient-to-br from-[#8a2630] to-[#5e1820] shadow-[0_16px_30px_-20px_rgba(94,24,32,0.9)]"
    >
      <span className="shrink-0 w-11 h-11 rounded-[14px] grid place-items-center bg-white/15"><ListOrdered className="w-6 h-6" /></span>
      <span className="relative z-[1] flex-1 min-w-0 flex flex-col gap-0.5">
        <b className="font-serif-ge text-[17px] font-bold">დღევანდელი წირვა</b>
        <small className="text-xs font-semibold opacity-90">{meta || 'პროგრამის შედგენა: ვერსიებზე „+“'}</small>
      </span>
      <GrapeBunch color="#fbe9d7" curls className="absolute right-11 -top-2 w-[70px] opacity-20 pointer-events-none" />
      <ChevronRight className="relative z-[1] shrink-0 w-5 h-5 opacity-85" />
    </button>
  );
};

/** Keeps every version of a service (or of one chant) on the phone, for singing without internet. */
export const ServiceDownload: React.FC<{ chants: ChantItem[]; label: string }> = ({ chants, label }) => {
  const ids = useMemo(() => chants.flatMap(c => (c.variants ?? []).filter(v => canOpenNotes(c, v)).map(v => v.id)), [chants]);
  const [, bump] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => onOfflineChange(() => bump(x => x + 1)), []);
  if (!offlineSupported() || !ids.length) return null;
  const saved = offlineCount(ids);
  const all = saved === ids.length;
  const mb = estimateMb(ids);
  const run = async () => {
    setConfirm(false);
    triggerHaptic(10);
    setProgress({ done: 0, total: ids.length - saved });
    await saveOffline(ids, (done, total) => setProgress({ done, total }));
    setProgress(null);
  };
  // a small pill as in the prototype; the confirmation explains itself in a little card under it
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={Boolean(progress) || all}
        onClick={() => (confirm ? run() : setConfirm(true))}
        aria-label={all ? `${label} ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება` : `${label} ჩამოწერა ინტერნეტის გარეშე`}
        title={all ? 'ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება' : `${label} ჩამოწერა ინტერნეტის გარეშე`}
        className={`relative overflow-hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 cursor-pointer disabled:cursor-default ${
          all
            ? 'bg-white text-[#2f7a4f] shadow-[inset_0_0_0_1px_#a8d3b8]'
            : confirm
              ? 'bg-[#7a2028] text-white'
              : 'bg-white text-[#574739] shadow-[inset_0_0_0_1px_#e4d8c4] hover:shadow-[inset_0_0_0_1px_rgba(122,32,40,0.4)]'
        }`}
      >
        {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : all ? <CircleCheck className="w-4 h-4" /> : <Download className="w-4 h-4" />}
        {progress ? <span className="tabular-nums">{progress.done}/{progress.total}</span> : all ? 'ჩამოწერილია' : confirm ? `~${mb} MB · დადასტურება` : 'ჩამოწერა'}
        {!progress && !all && !confirm && saved > 0 && (
          <span className="text-[10px] font-semibold text-[#8c7c6b] tabular-nums">{saved}/{ids.length}</span>
        )}
        {progress && <i className="absolute left-0 bottom-0 h-[3px] bg-[#7a2028] transition-[width]" style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} />}
      </button>
      {confirm && !progress && (
        <div className="absolute right-0 top-full mt-2 z-20 w-64 max-w-[calc(100vw-2rem)] p-3 rounded-xl bg-white text-left text-[11.5px] leading-snug text-[#8c7c6b] shadow-[0_12px_28px_-14px_rgba(42,32,23,0.45),inset_0_0_0_1px_#e4d8c4] animate-[galoba-unfold_0.25s_ease_both]">
          <b className="block mb-0.5 text-[#2a2017]">{label} ჩამოწერა</b>
          {ids.length - saved} ვერსია, დაახლოებით {mb} MB. ჩამოწერის მერე ნოტები ინტერნეტის გარეშეც გაიხსნება.
          <button type="button" className="mt-2 block font-bold text-[#7a2028] cursor-pointer" onClick={() => setConfirm(false)}>გაუქმება</button>
        </div>
      )}
    </div>
  );
};
