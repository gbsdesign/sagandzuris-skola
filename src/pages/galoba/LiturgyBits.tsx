import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, CircleCheck, CloudDownload, ListOrdered, Loader2 } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { ChantItem } from '../../data';
import { canOpenNotes } from '../../data/chantLookup';
import { LITURGY_TITLE, formatLiturgyDate } from '../../hooks/useLiturgy';
import { estimateMb, offlineCount, offlineSupported, onOfflineChange, saveOffline } from '../../utils/offlineNotes';
import { GrapeBunch } from '../../components/home/PlateOrnaments';
import { triggerHaptic } from '../../utils/haptics';

/** "დღევანდელი წირვა" card at the head of the chant lists: the teacher's program, or the one sent to my class. */
export const ProgramCard: React.FC = () => {
  const { liturgy, program, openProgram } = useNotes();
  if (liturgy.role === 'guest' || (liturgy.role === 'member' && !program)) return null;
  // one line: the date and how many (when the teacher sent it is said on the program page itself)
  const n = program?.items.length ?? 0;
  const meta = program ? `${formatLiturgyDate(program.date)} · ${n ? `${n} საგალობელი` : 'ჯერ ცარიელია'}` : '';
  // since 2026-11-08 lower (the user: „უფრო კომპაქტური“): a smaller icon and less room round it, still two lines
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); openProgram(); }}
      className="relative overflow-hidden w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-left text-white cursor-pointer active:scale-[0.985] transition-transform bg-gradient-to-br from-[#8a2630] to-[#5e1820] shadow-[0_12px_24px_-18px_rgba(94,24,32,0.9)]"
    >
      <span className="shrink-0 w-9 h-9 rounded-xl grid place-items-center bg-white/15"><ListOrdered className="w-5 h-5" /></span>
      <span className="relative z-[1] flex-1 min-w-0 flex flex-col">
        <b className="font-serif-ge text-[16px] font-bold leading-tight truncate">{LITURGY_TITLE}</b>
        <small className="text-xs font-semibold leading-snug opacity-90 truncate">{meta || 'ჯერ ცარიელია'}</small>
      </span>
      <GrapeBunch color="#fbe9d7" curls className="absolute right-10 -top-3 w-[56px] opacity-20 pointer-events-none" />
      <ChevronRight className="relative z-[1] shrink-0 w-5 h-5 opacity-85" />
    </button>
  );
};

/** Round 36px button in „გალობა“'s page bar (left of 📌): opens „მიმდინარე მსახურება“ — shown when the card below is. */
export const ProgramButton: React.FC = () => {
  const { liturgy, program, openProgram } = useNotes();
  if (liturgy.role === 'guest' || (liturgy.role === 'member' && !program)) return null;
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); openProgram(); }}
      title={LITURGY_TITLE}
      aria-label={LITURGY_TITLE}
      className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 bg-white/85 ring-1 ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40 [&>svg]:w-[17px] [&>svg]:h-[17px]"
    >
      <ListOrdered />
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
  // the second tap confirms; left alone, the pill goes back after a few seconds
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(false), 6000);
    return () => window.clearTimeout(t);
  }, [confirm]);
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
  // a small pill as in the prototype; its second state („~38 MB · დადასტურება“) is the confirmation
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={Boolean(progress) || all}
        onClick={() => (confirm ? run() : setConfirm(true))}
        onBlur={() => setConfirm(false)}
        aria-label={all ? `${label} ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება` : `${label} ჩამოწერა ინტერნეტის გარეშე`}
        title={all ? 'ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება' : `${label} ჩამოწერა ინტერნეტის გარეშე`}
        className={`relative overflow-hidden inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 cursor-pointer disabled:cursor-default ${
          all
            ? 'bg-white text-[#2f7a4f] shadow-[inset_0_0_0_1px_#a8d3b8]'
            : confirm
              ? 'bg-[#7a2028] text-white'
              : 'bg-white text-[#574739] shadow-[inset_0_0_0_1px_#e4d8c4] hover:shadow-[inset_0_0_0_1px_rgba(122,32,40,0.4)]'
        }`}
      >
        {progress ? <Loader2 className="w-4 h-4 animate-spin" /> : all ? <CircleCheck className="w-4 h-4" /> : <CloudDownload className="w-4 h-4" />}
        {progress ? <span className="tabular-nums">{progress.done}/{progress.total}</span> : all ? 'ჩამოწერილია' : confirm ? `~${mb} MB · დადასტურება` : 'ჩამოწერა'}
        {!progress && !all && !confirm && saved > 0 && (
          <span className="text-[11px] font-semibold text-[#8c7c6b] tabular-nums">{saved}/{ids.length}</span>
        )}
        {progress && <i className="absolute left-0 bottom-0 h-[3px] bg-[#7a2028] transition-[width]" style={{ width: `${(100 * progress.done) / Math.max(1, progress.total)}%` }} />}
      </button>
    </div>
  );
};
