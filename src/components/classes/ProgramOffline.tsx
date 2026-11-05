import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CloudCheck, CloudDownload } from 'lucide-react';
import { chooseItems, runPercent, useOffline } from '../../utils/offlineFiles';
import { isOffline, offlineSupported, onOfflineChange, saveOffline } from '../../utils/offlineNotes';
import { planMb, planSaved, programPlan } from '../../utils/programOffline';
import { triggerHaptic } from '../../utils/haptics';

// The class's „სასწავლო პროგრამა“ on the phone in one tap — the chants' book pages and the school's recordings, the
// songs' recordings (utils/programOffline.ts) — so it opens without internet, in church or on the road. The notes go
// first with their own count; the recordings follow in the offline queue (the header's cloud).
// Since 2026-11-05 (the user: „რამხელა ადგილი უკავია ოფლაინს … სადმე სხვაგან პატარაზე“) a round 36px ☁ at the right of
// the card's title (`OfflineButton`) and one short line under it while something happens (`OfflineNote`) — no box.
export const useProgramOffline = (ids: string[]) => {
  const key = ids.join('|');
  const plan = useMemo(() => programPlan(ids), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const off = useOffline();
  const [, bump] = useState(0);
  useEffect(() => onOfflineChange(() => bump(n => n + 1)), []);
  const [notes, setNotes] = useState<{ done: number; total: number } | null>(null);
  const [asked, setAsked] = useState(false);
  const [trouble, setTrouble] = useState('');
  // „ჩამოწერილია“ shown for a moment: when it finishes, or on a tap once it is saved
  const [told, setTold] = useState(false);
  const toldTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tell = () => {
    setTold(true);
    clearTimeout(toldTimer.current);
    toldTimer.current = setTimeout(() => setTold(false), 4000);
  };
  useEffect(() => () => clearTimeout(toldTimer.current), []);

  const has = (t: string) => off.tracks.has(t);
  const shown = offlineSupported() && ids.length > 0 && (plan.versions.length > 0 || plan.tracks.length > 0);
  const saved = shown && planSaved(plan, has);
  // the recordings this program still waits for, while the queue runs after „ჩამოწერა“
  const recsLeft = plan.tracks.filter(t => !has(t)).length;
  const recsRunning = asked && !notes && recsLeft > 0 && !!off.run;
  const queued = asked && !notes && !recsRunning && recsLeft > 0;
  const busy = !!notes || recsRunning;
  const share = notes ? notes.done / Math.max(1, notes.total) : recsRunning ? runPercent(off) / 100 : 0;

  // finished while this page watched → say so once
  const wasSaved = useRef(saved);
  useEffect(() => {
    if (saved && !wasSaved.current && asked) { setTrouble(''); tell(); }
    wasSaved.current = saved;
  }, [saved, asked]);

  const save = async () => {
    if (notes) return;
    triggerHaptic(12);
    if (saved) { tell(); return; }
    setTrouble('');
    setAsked(true);
    if (!off.online) setTrouble('ინტერნეტი არ არის — ჩაირთვება, როცა დაბრუნდება.');
    if (plan.versions.length) {
      setNotes({ done: 0, total: plan.versions.length });
      await saveOffline(plan.versions, (done, total) => setNotes({ done, total }));
      setNotes(null);
    }
    if (plan.songs.length) await chooseItems(plan.songs);
    if (plan.versions.some(id => !isOffline(id))) setTrouble('ნაწილი ვერ ჩამოიწერა. შეამოწმე ინტერნეტი და სცადე თავიდან.');
  };

  // the one line under the title, only while there is something to say
  const line = trouble ? '' // the trouble has its own red line
    : notes ? `ნოტები ჩამოიწერება… ${notes.done}/${notes.total}`
    : recsRunning ? `ჩანაწერები ჩამოიწერება… ${runPercent(off)}%`
    : queued ? `ჩანაწერები რიგშია · ${recsLeft}`
    : told && saved ? 'ჩამოწერილია — ინტერნეტის გარეშეც გაიხსნება'
    : '';
  const label = saved ? 'პროგრამა ჩამოწერილია — ოფლაინშიც იხსნება'
    : `პროგრამის ჩამოწერა ოფლაინისთვის (~${planMb(plan, has)} MB)`;

  return { shown, saved, busy, share, line, trouble, label, save };
};

export type ProgramOfflineState = ReturnType<typeof useProgramOffline>;

/** The round ☁ beside „სასწავლო პროგრამა“: wine while to do, a filling ring while it works, green ✓ once saved. */
export const OfflineButton: React.FC<{ o: ProgramOfflineState }> = ({ o }) => {
  if (!o.shown) return null;
  const R = 16.5;
  const len = 2 * Math.PI * R;
  return (
    <button
      type="button"
      onClick={o.save}
      aria-label={o.label}
      title={o.label}
      className={`relative ml-auto w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 ${
        o.saved ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
        : 'bg-[#fbf6ec] text-[#7a2028] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}
    >
      {o.busy && (
        <svg className="absolute inset-0 w-9 h-9 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle
            cx="18" cy="18" r={R} fill="none" stroke="#7a2028" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={len} strokeDashoffset={len * (1 - Math.max(0.08, o.share))}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
      )}
      {o.saved ? <CloudCheck className="w-[18px] h-[18px]" /> : <CloudDownload className={`w-[18px] h-[18px] ${o.busy ? 'animate-pulse' : ''}`} />}
    </button>
  );
};

/** The short line under the title: what is being saved now, or that it is saved; a red one when something failed. */
export const OfflineNote: React.FC<{ o: ProgramOfflineState }> = ({ o }) => {
  if (!o.shown || (!o.line && !o.trouble)) return null;
  return o.trouble
    ? <p className="-mt-1 mb-2 px-0.5 text-[12.5px] font-semibold leading-snug text-[#a02c2c]" role="alert">{o.trouble}</p>
    : <p className={`-mt-1 mb-2 px-0.5 text-[12.5px] font-semibold leading-snug tabular-nums ${o.saved ? 'text-emerald-700' : 'text-[#8a7a6a]'}`} aria-live="polite">{o.line}</p>;
};
