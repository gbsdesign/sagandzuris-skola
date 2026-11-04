import React, { useEffect, useMemo, useState } from 'react';
import { CircleCheck, CloudDownload, Loader2 } from 'lucide-react';
import { chooseItems, runPercent, useOffline } from '../../utils/offlineFiles';
import { isOffline, offlineSupported, onOfflineChange, saveOffline } from '../../utils/offlineNotes';
import { planMb, planSaved, programPlan } from '../../utils/programOffline';
import { triggerHaptic } from '../../utils/haptics';

// Under the class's „სასწავლო პროგრამა“: the whole program on the phone in one tap — the chants' book pages and the
// school's recordings, the songs' recordings (utils/programOffline.ts) — so it opens without internet, in church or on
// the road. The notes go first with their own count; the recordings follow in the offline queue (the header's cloud).
export const ProgramOffline: React.FC<{ ids: string[] }> = ({ ids }) => {
  const key = ids.join('|');
  const plan = useMemo(() => programPlan(ids), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const off = useOffline();
  const [, bump] = useState(0);
  useEffect(() => onOfflineChange(() => bump(n => n + 1)), []);
  const [notes, setNotes] = useState<{ done: number; total: number } | null>(null);
  const [asked, setAsked] = useState(false);
  const [trouble, setTrouble] = useState('');

  if (!offlineSupported() || (!plan.versions.length && !plan.tracks.length)) return null;

  const has = (t: string) => off.tracks.has(t);
  const saved = planSaved(plan, has);
  // the recordings this program still waits for, while the queue runs after „ჩამოწერა“
  const recsLeft = plan.tracks.filter(t => !has(t)).length;
  const recsRunning = asked && !notes && recsLeft > 0 && !!off.run;

  const save = async () => {
    if (notes || saved) return;
    triggerHaptic(12);
    setTrouble('');
    setAsked(true);
    if (!off.online) { setTrouble('ინტერნეტი არ არის — ჩაირთვება, როცა დაბრუნდება.'); }
    if (plan.versions.length) {
      setNotes({ done: 0, total: plan.versions.length });
      await saveOffline(plan.versions, (done, total) => setNotes({ done, total }));
      setNotes(null);
    }
    if (plan.songs.length) await chooseItems(plan.songs);
    if (plan.versions.some(id => !isOffline(id))) setTrouble('ნაწილი ვერ ჩამოიწერა. შეამოწმე ინტერნეტი და სცადე თავიდან.');
  };

  const label = saved ? 'ჩამოწერილია — ოფლაინშიც იხსნება'
    : notes ? 'ნოტები ჩამოიწერება…'
    : recsRunning ? 'ჩანაწერები ჩამოიწერება…'
    : asked && recsLeft > 0 ? 'ჩანაწერები რიგშია'
    : 'პროგრამის ჩამოწერა ოფლაინისთვის';
  // the count or the size, apart at the right
  const tail = saved ? '' : notes ? `${notes.done}/${notes.total}` : recsRunning ? `${runPercent(off)}%`
    : asked && recsLeft > 0 ? String(recsLeft) : `~${planMb(plan, has)} MB`;
  const share = notes ? notes.done / Math.max(1, notes.total) : recsRunning ? runPercent(off) / 100 : 0;
  const busy = !!notes || recsRunning;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={save}
        disabled={busy || saved}
        aria-live="polite"
        className={`relative overflow-hidden w-full min-h-[48px] px-4 py-2.5 rounded-2xl flex items-center gap-2.5 text-left text-[14px] font-bold transition cursor-pointer active:scale-[0.99] disabled:cursor-default disabled:active:scale-100 ${
          saved ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-[#fbf6ec] text-[#7a2028] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35'}`}
      >
        {busy && <i className="absolute inset-y-0 left-0 bg-[#7a2028]/[0.08] transition-[width] duration-500" style={{ width: `${Math.round(share * 100)}%` }} />}
        <span className="relative shrink-0">
          {saved ? <CircleCheck className="w-5 h-5" /> : busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
        </span>
        <span className="relative min-w-0 flex-1 leading-snug">{label}</span>
        {tail && <span className="relative shrink-0 text-[12.5px] font-bold tabular-nums text-[#8a7a6a]">{tail}</span>}
      </button>
      {!saved && !busy && !asked && (
        <p className="mt-1.5 px-1 text-[12px] leading-snug text-[#8a7a6a]">ნოტები და ჩანაწერები ტელეფონში შეინახება: ტაძარში და გზაში ინტერნეტის გარეშეც გაიხსნება.</p>
      )}
      {trouble && <p className="mt-1.5 px-1 text-[12.5px] font-semibold leading-snug text-[#a02c2c]" role="alert">{trouble}</p>}
    </div>
  );
};

export default ProgramOffline;
