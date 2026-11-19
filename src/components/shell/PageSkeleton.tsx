import React, { useEffect, useState } from 'react';
import { CloudDownload, RotateCw, Wifi } from 'lucide-react';
import { Button, cx } from '../ui2';
import { useNavigation } from '../../context/NavigationContext';

// One way to wait (redesign stage 2, boards x-ultra-chonchkhi 1–3): while a page is still loading, its shape stands where
// the words will be — a list (a field, then a card of rows), a text (round tools, then a card of lines) or the notes (a
// white sheet of grey staves) — so the screen does not jump when it arrives. No spinner. The shapes breathe softly, and
// stand still for „reduce motion“. `Waiting` gives up after ten seconds: one calm screen, „ხელახლა ცდა“ and the way to what
// the phone keeps (`LoadFailed`).

const Bar: React.FC<{ className: string }> = ({ className }) => <span className={cx('block rounded-full bg-track', className)} />;

/** A list's shape: a field, then a card of rows (a round + two lines). `field={false}`: the rows alone (a list in a sheet). */
export const PageSkeleton: React.FC<{ rows?: number; field?: boolean; className?: string }> = ({ rows = 7, field = true, className }) => (
  <div role="status" aria-label="იტვირთება" className={cx('flex w-full flex-col gap-3 motion-safe:animate-pulse', className)}>
    {field && <div className="h-12 shrink-0 rounded-full bg-surf" />}
    <div className="flex shrink-0 flex-col overflow-hidden rounded-card bg-surf">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cx('flex h-row items-center gap-2.5 pr-3 pl-4', i > 0 && 'border-t border-line')}>
          <span className="size-icon shrink-0 rounded-full bg-track" />
          <span className="flex flex-1 flex-col gap-2">
            <Bar className="h-3.5 w-[62%]" />
            <Bar className="h-2.5 w-[38%]" />
          </span>
        </div>
      ))}
    </div>
  </div>
);

const LINES = ['w-full', 'w-[94%]', 'w-[98%]', 'w-[72%]', 'w-full', 'w-[90%]', 'w-[96%]', 'w-[60%]', 'w-full', 'w-[88%]', 'w-[40%]'];

/** A text's lines alone, for a place that is already a card (a fold, a step). */
export const LinesSkeleton: React.FC<{ lines?: number; className?: string }> = ({ lines = 4, className }) => (
  <div role="status" aria-label="იტვირთება" className={cx('flex w-full flex-col gap-3.5 py-2 motion-safe:animate-pulse', className)}>
    {Array.from({ length: lines }, (_, i) => <Bar key={i} className={cx('h-3.5', LINES[(i + 1) % LINES.length])} />)}
  </div>
);

/** A reading page's shape: round tools in a row, then a card of text lines. `tools={false}`: the card alone. */
export const TextSkeleton: React.FC<{ tools?: boolean; lines?: number; className?: string }> = ({ tools = true, lines = LINES.length, className }) => (
  <div role="status" aria-label="იტვირთება" className={cx('flex w-full flex-col gap-3 motion-safe:animate-pulse', className)}>
    {tools && (
      <div className="flex gap-2">
        {[0, 1, 2, 3].map(i => <span key={i} className="size-tap rounded-full bg-surf" />)}
      </div>
    )}
    <div className="flex flex-col gap-4 rounded-card bg-surf p-5">
      <Bar className="mb-4 h-5 w-[55%]" />
      {Array.from({ length: lines }, (_, i) => <Bar key={i} className={cx('h-3.5', LINES[i % LINES.length])} />)}
    </div>
  </div>
);

/** The notes' shape: a white sheet with three grey staves a line. */
export const NotesSkeleton: React.FC<{ systems?: number; className?: string }> = ({ systems = 4, className }) => (
  <div role="status" aria-label="ნოტები იტვირთება" className={cx('flex w-full flex-col gap-6 rounded-tile bg-surf p-4 motion-safe:animate-pulse', className)}>
    <Bar className="mx-auto h-4 w-[46%]" />
    {Array.from({ length: systems }, (_, s) => (
      <div key={s} className="flex flex-col gap-3">
        {[0, 1, 2].map(v => (
          <div key={v} className="flex flex-col gap-[5px]">
            {[0, 1, 2, 3, 4].map(l => <span key={l} className="block h-px w-full bg-dim" />)}
          </div>
        ))}
      </div>
    ))}
  </div>
);

/** How long a page may load before the calm „ვერ ჩაიტვირთა“ takes its place. */
export const WAIT_MS = 10_000;

/** The calm screen when nothing came (board x-ultra-chonchkhi-3): what happened, why, „ხელახლა ცდა“ and the way to what the
 *  phone keeps (the chant lists show what is saved and fade the rest). */
export const LoadFailed: React.FC<{
  title?: string;
  text?: string;
  onRetry?: () => void;
  /** „რაც ტელეფონშია ჩამოწერილი“; by default the chant lists */
  onSaved?: () => void;
  className?: string;
}> = ({ title = 'ვერ ჩაიტვირთა', text = 'შეამოწმე ინტერნეტი და სცადე თავიდან.', onRetry, onSaved, className }) => {
  const nav = useNavigation();
  const saved = onSaved ?? (() => nav.navigateTo('galoba'));
  return (
    <div role="alert" className={cx('flex min-h-[60dvh] w-full flex-1 flex-col', className)}>
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-3.5 py-10 text-center">
        <span aria-hidden="true" className="mb-1.5 flex size-[84px] items-center justify-center rounded-full bg-tint text-wine">
          <Wifi className="size-9" strokeWidth={1.75} />
        </span>
        <h2 className="text-title font-bold">{title}</h2>
        <p className="max-w-[300px] text-body leading-normal text-mut">{text}</p>
      </div>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-2 pb-2">
        <Button full icon={<RotateCw />} onClick={onRetry ?? (() => window.location.reload())}>ხელახლა ცდა</Button>
        <Button full kind="ghost" icon={<CloudDownload />} onClick={saved}>რაც ტელეფონშია ჩამოწერილი</Button>
      </div>
    </div>
  );
};

/** The one rule: the page's skeleton while it loads; after ten seconds the calm screen instead. */
export const Waiting: React.FC<{
  kind?: 'list' | 'text' | 'notes';
  rows?: number;
  /** a list's field over its rows, a text's round tools over its card (off inside a card or a sheet) */
  field?: boolean;
  onRetry?: () => void;
  onSaved?: () => void;
  /** a small place (a sheet, a pane): no calm screen, the skeleton keeps breathing */
  quiet?: boolean;
  className?: string;
}> = ({ kind = 'list', rows, field, onRetry, onSaved, quiet, className }) => {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (quiet) return;
    const t = window.setTimeout(() => setLate(true), WAIT_MS);
    return () => window.clearTimeout(t);
  }, [quiet]);
  if (late) return <LoadFailed onRetry={onRetry} onSaved={onSaved} className={className} />;
  if (kind === 'text') return <TextSkeleton tools={field} className={className} />;
  if (kind === 'notes') return <NotesSkeleton className={className} />;
  return <PageSkeleton rows={rows} field={field} className={className} />;
};
