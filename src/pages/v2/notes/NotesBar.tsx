// The notes page's top bar in the new look (board x-notebi): round ←, the chant's name (two lines at most) with its
// service and book under it, the place in the service as a pill that goes to the next chant, and the page's „?“.
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cx, FOCUS, Press } from '../../../components/ui2';
import { HelpButton } from '../mkitkhe/HelpButton';

/** night paper: the bar's pills turn dark so nothing glares */
const pill = (dark: boolean) => (dark ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink');

export const NotesBar: React.FC<{
  title: string;
  sub: string;
  /** „16 / 68“ */
  pos: string;
  onBack: () => void;
  onNext: () => void;
  /** the last chant: the pill stays, greyed */
  atEnd: boolean;
  nextName?: string;
  dark: boolean;
  /** a line under the bar while a file is being made */
  status?: string;
}> = ({ title, sub, pos, onBack, onNext, atEnd, nextName, dark, status }) => (
  <div className="flex flex-col">
    <header className="flex items-center gap-2 px-3 pt-3 pb-2.5">
      <Press
        onClick={onBack}
        aria-label="უკან"
        title="უკან"
        className={cx('flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-5', pill(dark), FOCUS)}
      >
        <ArrowLeft aria-hidden="true" strokeWidth={1.75} />
      </Press>
      <div className="min-w-0 flex-1 pl-1">
        <h1 className={cx('line-clamp-2 text-lead leading-tight font-bold tracking-tight wrap-break-word', dark ? 'text-night-ink' : 'text-ink')}>{title}</h1>
        {/* as many lines as it needs (three at most): the service and the book's place are never cut off */}
        <div className={cx('line-clamp-3 text-meta leading-snug text-pretty wrap-break-word', dark ? 'text-night-ink/70' : 'text-mut')}>{sub}</div>
      </div>
      <Press
        onClick={onNext}
        disabled={atEnd}
        aria-label={atEnd ? `ბოლო საგალობელია, ${pos}` : `შემდეგი${nextName ? `: ${nextName}` : ' საგალობელი'}, ${pos}`}
        title={atEnd ? 'ბოლო საგალობელია' : nextName ? `შემდეგი: ${nextName}` : 'შემდეგი საგალობელი'}
        className={cx(
          'flex h-tap shrink-0 cursor-pointer items-center gap-0.5 rounded-full pr-1.5 pl-3 text-meta font-bold whitespace-nowrap tabular-nums transition',
          'active:scale-95 disabled:cursor-default disabled:opacity-50 disabled:active:scale-100 [&_svg]:size-[18px]',
          pill(dark),
          FOCUS,
        )}
      >
        {pos}
        <ChevronRight aria-hidden="true" strokeWidth={2} />
      </Press>
      {/* „?“ — three ready answers about this page (x-idea-adgilze), always last at the right */}
      <HelpButton page="notes" />
    </header>
    {status && (
      <p role="status" className={cx('mx-auto mb-2 rounded-full px-3 py-1 text-meta font-semibold', pill(dark))}>{status}</p>
    )}
  </div>
);
