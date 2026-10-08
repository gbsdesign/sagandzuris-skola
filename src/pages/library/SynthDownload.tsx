import React, { useEffect, useMemo, useState } from 'react';
import { AudioLines, CircleCheck, Download, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  EXPORT_BOOKS, cancelExport, clearExport, estimateMb, estimateMinutes, exportItems, getExport, onExportChange, startExport,
} from '../../utils/synthExport';

const minutesGe = (m: number) => (m < 60 ? `${m} წუთი` : `${Math.floor(m / 60)} სთ${m % 60 ? ` ${m % 60} წთ` : ''}`);

// "საგალობლების mp3": signed-in members download every book chant as the synthesizer plays it, in one ZIP

const BOOK_LABELS: Record<string, [vol: string, name: string]> = {
  book: ['I ტომი', 'გელათის სკოლა'],
  feast: ['II ტომი', 'დღესასწაულები'],
  kk: ['III ტომი', 'ქართლ-კახური'],
  triod: ['IV ტომი', 'მარხვანი, ზატიკი'],
  v5: ['V ტომი', 'წირვა'],
  karb: ['VII ტომი', 'კარბელაანთ კილო'],
  v9: ['IX ტომი', 'გელათის სკოლა'],
  pat: ['პატარავა', 'შემოქმედის სკოლა'],
  momix: ['ჰიმნოგრ. კრებული I', 'მომიხსენენი'],
  v8: ['VIII ტომი', 'ძლისპირები, კატაბასიები'],
  dasd1: ['ჰიმნოგრ. კრებული II', 'დასდებელნი, ხმა ა–ბ'],
  dasd2: ['ჰიმნოგრ. კრებული III', 'დასდებელნი, ხმა გ–დ'],
};

const useExportState = () => {
  const [, bump] = useState(0);
  useEffect(() => onExportChange(() => bump(x => x + 1)), []);
  return getExport();
};

const btnPrimary = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[14px] font-bold shadow-[0_8px_18px_-10px_rgba(122,32,40,0.8)] hover:bg-[#8a2630] cursor-pointer active:scale-[0.97] transition-all disabled:opacity-45 disabled:cursor-default disabled:active:scale-100';
const btnQuiet = 'inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-[14px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer active:scale-[0.97] transition-all';

export const SynthDownload: React.FC = () => {
  const { user } = useAuth();
  const job = useExportState();
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of exportItems()) m.set(it.book, (m.get(it.book) ?? 0) + 1);
    return m;
  }, []);
  const books = EXPORT_BOOKS.filter(b => counts.get(b));
  const [picked, setPicked] = useState<string[]>(() => [...books]);

  if (!user) return null;

  const count = picked.reduce((n, b) => n + (counts.get(b) ?? 0), 0);
  const allPicked = picked.length === books.length;
  const toggle = (b: string) => {
    triggerHaptic(8);
    setPicked(p => (p.includes(b) ? p.filter(x => x !== b) : books.filter(x => x === b || p.includes(x))));
  };
  const start = () => {
    triggerHaptic(12);
    setOpen(false);
    startExport(picked);
  };
  const busy = job?.phase === 'running' || job?.phase === 'saving';
  const pct = job ? Math.round((100 * job.done) / Math.max(1, job.total)) : 0;

  return (
    <section
      aria-label="საგალობლების mp3"
      className="mb-4 rounded-2xl bg-[#fffdf8] ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_12px_30px_-22px_rgba(42,32,23,0.4)] px-4 py-3.5 sm:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-[#f6ecda] ring-1 ring-[#ead9bd] flex items-center justify-center text-[#7a2028]">
          <AudioLines className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-[170px]">
          <span className="block font-serif-ge text-[15.5px] font-bold leading-snug text-[#2a2017]">საგალობლების mp3</span>
          <span className="block mt-0.5 text-[12px] leading-snug text-[#8a7a6a]">სინთეზატორის დაკრული ყველა გალობა — მხოლოდ mp3, ერთ ZIP ფაილში</span>
        </span>
        {!job && !open && (
          <button type="button" className={`${btnPrimary} max-[419px]:w-full`} onClick={() => { triggerHaptic(10); setOpen(true); }}>
            <Download className="w-[18px] h-[18px]" /> გადმოწერა
          </button>
        )}
      </div>

      {/* choosing the books */}
      {!job && open && (
        <div className="mt-4 animate-[galoba-unfold_0.25s_ease_both]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-[#4a3426]">წიგნები</span>
            <button
              type="button"
              className="h-9 px-2 text-[12.5px] font-bold text-[#7a2028] cursor-pointer"
              onClick={() => { triggerHaptic(8); setPicked(allPicked ? [] : [...books]); }}
            >
              {allPicked ? 'არცერთი' : 'ყველა'}
            </button>
          </div>
          <div className="mt-1 grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
            {books.map(b => {
              const on = picked.includes(b);
              const [vol, name] = BOOK_LABELS[b] ?? [b, ''];
              return (
                <button
                  key={b}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(b)}
                  className={`flex items-center gap-2.5 min-h-12 px-3 py-1.5 rounded-xl text-left cursor-pointer active:scale-[0.98] transition-all ${
                    on ? 'bg-[#f6ecda] ring-1 ring-[#d9bf98]' : 'bg-white ring-1 ring-[#ebe3d6] hover:ring-[#7a2028]/30'
                  }`}
                >
                  <span className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center transition-colors ${on ? 'bg-[#7a2028] text-white' : 'ring-1 ring-[#cdbfa9] bg-white'}`}>
                    {on && <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-bold leading-tight text-[#2a2017]">{vol}</span>
                    <span className="block text-[11.5px] leading-tight text-[#8a7a6a]">{name}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#8a7a6a]">{counts.get(b)}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#8a7a6a]">
            <b className="text-[#2a2017]">{count} გალობა</b>, დაახლოებით <b className="text-[#2a2017]">{estimateMb(count)} MB</b>,
            კომპიუტერზე <b className="text-[#2a2017]">~{minutesGe(estimateMinutes(count))}</b>. ყველა ხმა, ჩვეულებრივი სიჩქარე და ტონი.
            ფაილები ამ მოწყობილობაზე მზადდება — სანამ არ დასრულდება, აპი ღია დატოვეთ. ტელეფონზე სჯობს თითო წიგნი.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={`${btnPrimary} flex-1 min-w-[150px]`} disabled={!count} onClick={start}>
              <Download className="w-[18px] h-[18px]" /> დაწყება
            </button>
            <button type="button" className={btnQuiet} onClick={() => setOpen(false)}>გაუქმება</button>
          </div>
        </div>
      )}

      {/* the job */}
      {job && (
        <div className="mt-4" aria-live="polite">
          {busy ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-[13.5px] font-bold text-[#2a2017]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7a2028]" />
                  {job.phase === 'saving' ? 'ZIP ინახება…' : 'მზადდება'}
                </span>
                <span className="text-[13px] font-bold tabular-nums text-[#7a2028]">{job.done} / {job.total}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#f1e7d6] overflow-hidden">
                <i className="block h-full rounded-full bg-[#7a2028] transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              {job.current && <p className="mt-1.5 text-[11.5px] leading-snug text-[#8a7a6a] truncate">{job.current}</p>}
              {job.phase === 'running' && (
                <button type="button" className={`${btnQuiet} mt-3 max-[419px]:w-full`} onClick={() => { triggerHaptic(10); cancelExport(); }}>
                  <X className="w-4 h-4" /> შეჩერება
                </button>
              )}
            </>
          ) : (
            <>
              <p className="flex items-start gap-2 text-[13.5px] leading-snug text-[#2a2017]">
                {job.phase === 'done' && <CircleCheck className="w-5 h-5 shrink-0 text-[#2f7a4f]" />}
                <span>
                  {job.phase === 'done'
                    ? <><b>მზადაა.</b> ZIP ფაილი შეინახა ({job.total - job.failed} mp3).</>
                    : job.phase === 'cancelled'
                      ? <><b>შეჩერდა.</b> ფაილი არ შეინახა.</>
                      : <><b>ვერ მოხერხდა.</b> სცადეთ თავიდან ან ნაკლები წიგნი აირჩიეთ.</>}
                  {job.phase === 'done' && job.failed > 0 && (
                    <span className="block mt-0.5 text-[12px] text-[#8a7a6a]">{job.failed} გალობა ვერ დამზადდა და ZIP-ში არ არის.</span>
                  )}
                </span>
              </p>
              <button type="button" className={`${btnQuiet} mt-3`} onClick={() => { triggerHaptic(8); clearExport(); }}>კარგი</button>
            </>
          )}
        </div>
      )}
    </section>
  );
};
