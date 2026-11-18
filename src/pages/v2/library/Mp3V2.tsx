import React, { useMemo, useState, useSyncExternalStore } from 'react';
import { Check, Download, LoaderCircle, X } from 'lucide-react';
import { useAuth } from '../../../context';
import { Bar, Note, Press, Rows, TopBar, cx, FOCUS, FOCUS_IN } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import {
  cancelExport, clearExport, estimateMb, estimateMinutes, exportItems, getExport, onExportChange, startExport,
} from '../../../utils/synthExport';
import { BOOKS, exportBusy, useExportState } from '../../library/SynthDownload';
import { Page } from './parts';

// x-mp3 — „საგალობლების mp3“ in the new look: the same volumes, a row each with its chants and size; a touch on the row's
// words shows the time it takes („~18 წთ“); the round at the right makes the ZIP (as before, one at a time), a volume made
// on this phone keeps a green mark.

const minutesGe = (m: number) => (m < 60 ? `${m} წთ` : `${Math.floor(m / 60)} სთ${m % 60 ? ` ${m % 60} წთ` : ''}`);

// the volumes made on this device (a finished ZIP), for the green mark
const SAVED_KEY = 'sg-mp3-saved';
const readSaved = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; }
  catch { return []; }
};
let saved = readSaved();
const savedSubs = new Set<() => void>();
const remember = (id: string) => {
  if (saved.includes(id)) return;
  saved = [...saved, id];
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); } catch { /* this visit only */ }
  savedSubs.forEach(f => f());
};
// a ZIP finished while any page is open (the library's part stays loaded once opened)
onExportChange(() => {
  const j = getExport();
  if (j?.phase === 'done' && j.books.length === 1 && j.total - j.failed > 0) remember(j.books[0]);
});
const useSaved = () => useSyncExternalStore(f => { savedSubs.add(f); return () => { savedSubs.delete(f); }; }, () => saved);

/** the list itself (a guest sees a line instead) */
export const Mp3List: React.FC = () => {
  const job = useExportState();
  const made = useSaved();
  const [shown, setShown] = useState<string | null>(null);
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
    <Rows>
      {BOOKS.filter(([id]) => counts.get(id)).map(([id, vol, name]) => {
        const n = counts.get(id)!;
        const mine = job && job.books.length === 1 && job.books[0] === id ? job : null;
        const running = !!mine && exportBusy(mine);
        const done = mine?.phase === 'done' || made.includes(id);
        const time = shown === id;
        return (
          <div key={id} className={cx('flex flex-col', running && 'bg-tint/50')}>
            <div className="flex min-h-row items-center gap-2.5 pr-3">
              <Press
                aria-expanded={time}
                onClick={() => setShown(time ? null : id)}
                className={cx('flex min-h-row min-w-0 flex-1 cursor-pointer flex-col justify-center py-2 pl-4 text-left', FOCUS_IN)}
              >
                <span className="text-lead font-bold wrap-break-word">{vol} · {name}</span>
                <span className="text-meta text-mut tabular-nums">
                  {n} გალობა · {estimateMb(n)} MB{time && <span className="font-semibold text-ink"> · ~{minutesGe(estimateMinutes(n))}</span>}
                </span>
              </Press>
              {running ? (
                mine!.phase === 'running' ? (
                  <Press
                    onClick={() => { triggerHaptic(10); cancelExport(); }}
                    aria-label={`${vol} — შეჩერება`}
                    title="შეჩერება"
                    className={cx('flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surf text-wine ring-2 ring-wine/30 active:scale-95', FOCUS)}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </Press>
                ) : (
                  <span className="flex size-10 shrink-0 items-center justify-center text-wine"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" /></span>
                )
              ) : (
                <Press
                  disabled={busy}
                  onClick={() => start(id)}
                  aria-label={`${vol} — ${done ? 'კიდევ გადმოწერა' : 'გადმოწერა'}`}
                  title={done ? 'კიდევ გადმოწერა' : 'გადმოწერა'}
                  className={cx(
                    'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95',
                    'before:absolute before:-inset-0.5 before:rounded-full disabled:cursor-default disabled:opacity-40',
                    done ? 'bg-leaf text-white' : 'bg-tint text-wine',
                    FOCUS,
                  )}
                >
                  {done ? <Check aria-hidden="true" className="size-5" strokeWidth={2.4} /> : <Download aria-hidden="true" className="size-5" />}
                </Press>
              )}
            </div>

            {/* this volume's job */}
            {mine && (
              <div className="px-4 pb-3" aria-live="polite">
                {running ? (
                  <>
                    <div className="flex items-baseline justify-between gap-3 text-meta font-bold">
                      <span>{mine.phase === 'saving' ? 'ZIP ინახება…' : 'მზადდება'}</span>
                      <span className="text-wine tabular-nums">{mine.done} / {mine.total}</span>
                    </div>
                    <Bar value={mine.done / Math.max(1, mine.total)} h={8} className="mt-1.5" label="მზადდება" />
                    {mine.current && <p className="mt-1.5 truncate text-meta text-mut">{mine.current}</p>}
                  </>
                ) : (
                  <p className={cx('text-meta leading-snug', mine.phase === 'done' ? 'text-leaf-ink' : 'text-danger')}>
                    {mine.phase === 'done'
                      ? <><b>შენახულია</b> — ZIP ჩამოტვირთვებშია ({mine.total - mine.failed} mp3).</>
                      : mine.phase === 'cancelled'
                        ? <><b>შეჩერდა</b> — ფაილი არ შეინახა.</>
                        : <><b>ვერ მოხერხდა.</b> სცადეთ თავიდან.</>}
                    {mine.phase === 'done' && mine.failed > 0 && (
                      <span className="mt-0.5 block text-mut">{mine.failed} გალობა ვერ დამზადდა და ZIP-ში არ არის.</span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </Rows>
  );
};

export const Mp3V2: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  return (
    <Page>
      <TopBar title="საგალობლების mp3" onBack={onBack} />
      {user ? (
        <>
          <Note>წიგნ-წიგნ, სინთეზატორით დაკრული — ყველა ხმა ერთად. ჩამოწერილი ტომი ZIP-ად ინახება და ინტერნეტის გარეშეც უკრავს.</Note>
          <Mp3List />
          <Note>ერთ ჯერზე ერთი ტომი მზადდება; ტომის სახელზე შეხებით ჩანს, რამდენ ხანს გასტანს.</Note>
        </>
      ) : (
        <Note className="py-8 text-center">ჩამოტვირთვა მხოლოდ წევრებისთვისაა.</Note>
      )}
    </Page>
  );
};
