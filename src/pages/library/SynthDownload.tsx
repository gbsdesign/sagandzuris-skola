import React, { useEffect, useMemo, useState } from 'react';
import { AudioLines, Check, Download, Info, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  ExportState, cancelExport, clearExport, estimateMb, estimateMinutes, exportItems, getExport, onExportChange, startExport,
} from '../../utils/synthExport';
import { BookHead } from './BookHead';

// "საგალობლების mp3": members download a chant book as the synthesizer plays it (all voices), one book a
// ZIP. The whole set (2000 chants, ~1.4 GB, hours of work in a browser) is too much for one go, so the
// books are listed one by one, each with its size and time, and one is made at a time.

const minutesGe = (m: number) => (m < 60 ? `${m} წთ` : `${Math.floor(m / 60)} სთ${m % 60 ? ` ${m % 60} წთ` : ''}`);

// in the order of the volumes
const BOOKS: [id: string, vol: string, name: string][] = [
  ['book', 'I ტომი', 'გელათის სკოლა'],
  ['feast', 'II ტომი', 'დღესასწაულები'],
  ['kk', 'III ტომი', 'ქართლ-კახური'],
  ['triod', 'IV ტომი', 'მარხვანი, ზატიკი'],
  ['v5', 'V ტომი', 'წირვა'],
  ['karb', 'VII ტომი', 'კარბელაანთ კილო'],
  ['v8', 'VIII ტომი', 'ძლისპირები, კატაბასიები'],
  ['v9', 'IX ტომი', 'გელათის სკოლა'],
  ['pat', 'პატარავა', 'შემოქმედის სკოლა'],
  ['momix', 'ჰიმნოგრაფიული კრებული I', 'მომიხსენენი'],
  ['dasd1', 'ჰიმნოგრაფიული კრებული II', 'დასდებელნი, ხმა ა–ბ'],
  ['dasd2', 'ჰიმნოგრაფიული კრებული III', 'დასდებელნი, ხმა გ–დ'],
];

export const useExportState = () => {
  const [, bump] = useState(0);
  useEffect(() => onExportChange(() => bump(x => x + 1)), []);
  return getExport();
};
export const exportBusy = (job: ExportState | null) => job?.phase === 'running' || job?.phase === 'saving';

const ROUND = 'w-11 h-11 shrink-0 rounded-full flex items-center justify-center ring-1 cursor-pointer active:scale-95 transition-all disabled:opacity-35 disabled:cursor-default disabled:active:scale-100';

export const SynthDownload: React.FC = () => {
  const { user } = useAuth();
  const job = useExportState();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of exportItems()) m.set(it.book, (m.get(it.book) ?? 0) + 1);
    return m;
  }, []);

  const busy = exportBusy(job);
  const start = (id: string) => {
    triggerHaptic(12);
    clearExport();
    startExport([id]);
  };

  return (
    <div>
      <BookHead
        cover={
          <span className="w-11 h-[60px] shrink-0 rounded-[2px_5px_5px_2px] bg-[#f6ecda] ring-1 ring-[#ead9bd] flex items-center justify-center text-[#7a2028]" aria-hidden>
            <AudioLines className="w-5 h-5" />
          </span>
        }
        title="საგალობლების mp3"
        sub="სინთეზატორით დაკრული, ყველა ხმით · თითო წიგნი ერთ ZIP ფაილად"
      />

      {!user ? (
        <p className="mt-6 text-center text-[13.5px] text-[#8a7a6a]">ჩამოტვირთვა მხოლოდ წევრებისთვისაა.</p>
      ) : (
        <>
          <p className="mt-4 flex items-start gap-2.5 rounded-2xl bg-[#f6ecda]/60 ring-1 ring-[#ead9bd] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#5a4636]">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#9a7438]" />
            <span>
              ფაილი ამ მოწყობილობაზე მზადდება — სანამ არ დასრულდება, აპი ღია დატოვეთ. დრო კომპიუტერისაა;
              ტელეფონზე უფრო დიდხანს გაგრძელდება.
            </span>
          </p>

          <ul className="mt-4 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_26px_-22px_rgba(42,32,23,0.35)] p-1.5 sm:p-2 [&>li+li]:border-t [&>li+li]:border-[#2a2017]/[0.05]">
            {BOOKS.filter(([id]) => counts.get(id)).map(([id, vol, name]) => {
              const n = counts.get(id)!;
              const mine = job && job.books.length === 1 && job.books[0] === id ? job : null;
              const running = mine && exportBusy(mine);
              const pct = mine ? Math.round((100 * mine.done) / Math.max(1, mine.total)) : 0;
              return (
                <li key={id} className={`rounded-xl ${running ? 'bg-[#7a2028]/[0.035]' : ''}`}>
                  <div className="flex items-center gap-3 min-h-16 px-2.5 py-2">
                    <span className="flex-1 min-w-0">
                      <span className="block font-serif-ge text-[15px] font-bold leading-snug text-[#2a2017]">{vol}</span>
                      <span className="block text-[12.5px] leading-snug text-[#5a4636]">{name}</span>
                      <span className="mt-0.5 block text-[11.5px] font-semibold tabular-nums text-[#8a7a6a]">
                        {n} გალობა · {estimateMb(n)} MB · ~{minutesGe(estimateMinutes(n))}
                      </span>
                    </span>
                    {running ? (
                      mine.phase === 'running' ? (
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(10); cancelExport(); }}
                          className={`${ROUND} bg-white ring-[#7a2028]/35 text-[#7a2028] hover:bg-[#7a2028]/[0.05]`}
                          aria-label={`${vol} — შეჩერება`}
                          title="შეჩერება"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      ) : (
                        <span className={`${ROUND} ring-transparent text-[#7a2028]`}><Loader2 className="w-5 h-5 animate-spin" /></span>
                      )
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => start(id)}
                        className={`${ROUND} ${
                          mine?.phase === 'done'
                            ? 'bg-[#2f7a4f]/10 ring-[#2f7a4f]/30 text-[#2f7a4f]'
                            : 'bg-white ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40 hover:bg-[#7a2028]/[0.04]'
                        }`}
                        aria-label={`${vol} — გადმოწერა`}
                        title={mine?.phase === 'done' ? 'კიდევ გადმოწერა' : 'გადმოწერა'}
                      >
                        {mine?.phase === 'done' ? <Check className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                      </button>
                    )}
                  </div>

                  {/* this book's job */}
                  {mine && (
                    <div className="px-2.5 pb-3" aria-live="polite">
                      {running ? (
                        <>
                          <div className="flex items-baseline justify-between gap-3 text-[12.5px] font-bold">
                            <span className="text-[#2a2017]">{mine.phase === 'saving' ? 'ZIP ინახება…' : 'მზადდება'}</span>
                            <span className="tabular-nums text-[#7a2028]">{mine.done} / {mine.total}</span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-full bg-[#f1e7d6] overflow-hidden">
                            <i className="block h-full rounded-full bg-[#7a2028] transition-[width] duration-300" style={{ width: `${pct}%` }} />
                          </div>
                          {mine.current && <p className="mt-1.5 text-[11.5px] leading-snug text-[#8a7a6a] truncate">{mine.current}</p>}
                        </>
                      ) : (
                        <p className={`text-[12.5px] leading-snug ${mine.phase === 'done' ? 'text-[#2f7a4f]' : 'text-[#8a3a2a]'}`}>
                          {mine.phase === 'done'
                            ? <><b>შენახულია</b> — ZIP ჩამოტვირთვებშია ({mine.total - mine.failed} mp3).</>
                            : mine.phase === 'cancelled'
                              ? <><b>შეჩერდა</b> — ფაილი არ შეინახა.</>
                              : <><b>ვერ მოხერხდა.</b> სცადეთ თავიდან.</>}
                          {mine.phase === 'done' && mine.failed > 0 && (
                            <span className="block mt-0.5 text-[#8a7a6a]">{mine.failed} გალობა ვერ დამზადდა და ZIP-ში არ არის.</span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
