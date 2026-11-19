import React from 'react';
import { PageSkeleton, TextSkeleton } from '../../../components/shell/PageSkeleton';
import { Note, cx } from '../../../components/ui2';
import type { ExamId } from '../../../utils/abituriPrep';

// Small parts shared by „აბიტურიენტს“'s screens in the new look (boards x-abituri, x-abituri-gamotsda, x-teoria,
// x-kolokviumi, x-abituri-registratsia).

/** The page's column, as the other new-look pages have it. */
export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('mx-auto flex w-full max-w-2xl flex-col gap-3 pb-4', className)}>{children}</div>
);

/** the exams in order: the step's small name and the exam's own */
export const EXAMS: { id: ExamId; step: string; title: string; mark: string }[] = [
  { id: 'program', step: 'I გამოცდა', title: 'გალობა-სიმღერა', mark: 'I' },
  { id: 'theory', step: 'II გამოცდა', title: 'თეორია', mark: 'II' },
  { id: 'colloquium', step: 'III გამოცდა', title: 'კოლოქვიუმი', mark: 'III' },
  { id: 'admission', step: 'რეგისტრაცია', title: 'ჩაბარება', mark: '' },
];

// where „ჩემი მომზადება“'s step sends an exam's screen (an element id: `piece-<list>:<title>`, `docs`…); read once on opening
let pending: string | null = null;
export const setPendingFocus = (id: string | null) => { pending = id; };
export const takePendingFocus = () => { const id = pending; pending = null; return id; };

/** bring an element into view a moment after the screen drew it */
export const scrollToId = (id: string) => {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
};

/** the list's (or a lesson's) shape while it loads (no spinner — stage 7, x-ultra-chonchkhi) / „ვერ ჩაიტვირთა“ */
export const Waiting: React.FC<{ failed?: boolean; what?: string }> = ({ failed, what = 'გაკვეთილები' }) => (
  failed
    ? <Note className="py-6 text-center">{what} ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</Note>
    : (
      what === 'გაკვეთილები' ? <PageSkeleton field={false} rows={5} /> : <TextSkeleton tools={false} lines={6} />
    )
);

/** a page on YouTube's own player */
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
