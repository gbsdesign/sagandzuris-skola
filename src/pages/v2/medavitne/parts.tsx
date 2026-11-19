import React, { useEffect } from 'react';
import { LinesSkeleton, PageSkeleton, TextSkeleton } from '../../../components/shell/PageSkeleton';
import { Note, cx } from '../../../components/ui2';
import { hideNav } from '../../../design/newLook';

// Small parts shared by the reader's screens in the new look (boards x-medavitne …).

/** reading HTML (a psalm, the Apostle's verses) in the design's colours and the serif letters */
export const PROSE_V2 = cx(
  'font-serif-ge text-lead leading-[1.75] text-ink wrap-break-word',
  '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_p.c]:mt-4 [&_p.c]:text-center [&_p.c]:text-wine',
  '[&_h2]:mt-5 [&_h2]:mb-2.5 [&_h2]:text-center [&_h2]:text-head [&_h2]:font-bold [&_h2]:text-wine [&_h2:first-child]:mt-0',
  '[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-center [&_h3]:text-lead [&_h3]:font-bold [&_h3]:text-wine',
  '[&_sup]:font-sans [&_sup]:font-bold [&_sup]:text-wine [&_em]:text-wine',
);

/** „**bold**“ inside a lesson's line */
export const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 ? <strong key={i} className="font-bold text-ink">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>,
    )}
  </>
);

/** „**name** — what it is“ as a title and a line */
export const splitPoint = (p: string): { title: string; sub?: string } => {
  const m = /^\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/.exec(p);
  return m ? { title: m[1], sub: m[2] } : { title: p.replace(/\*\*/g, '') };
};

/** the text's shape while it loads (no spinner — stage 7, x-ultra-chonchkhi; `kind`: lines inside a card, a text card, a list)
 *  / „ვერ ჩაიტვირთა“ */
export const Waiting: React.FC<{ failed?: boolean; className?: string; kind?: 'lines' | 'text' | 'list' }> = ({ failed, className, kind = 'lines' }) => (
  failed
    ? <Note className={cx('py-6 text-center', className)}>ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</Note>
    : (
      kind === 'text' ? <TextSkeleton tools={false} lines={6} className={className} />
        : kind === 'list' ? <PageSkeleton field={false} rows={6} className={className} />
          : <LinesSkeleton className={className} />
    )
);

/** A bar fixed at the bottom (the bottom menu steps aside while it shows) — a lesson's „შემდეგი“, a book's ‹ › */
export const BottomBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => hideNav(), []);
  return (
    <>
      <div aria-hidden="true" className="h-20 shrink-0" />
      <div className="fixed inset-x-0 bottom-0 z-40 safe-x">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 bg-linear-to-t from-page via-page/95 to-transparent px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </>
  );
};

/** The page's column, as the other new-look pages have it. */
export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('mx-auto flex w-full max-w-2xl flex-col gap-3 pb-4', className)}>{children}</div>
);
