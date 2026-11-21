import React from 'react';
import { ChevronRight, NotebookPen, type LucideIcon } from 'lucide-react';
import { Counter, Press, cx, FOCUS } from '../../../components/ui2';

// The new look's home page. Since 2026-11-22 it has no vine and no grapes (the user: „ყურძენი და ხე მოაცილო, თანამედროვე
// ღილაკები დახატო … პირველი მთავარი ღილაკი არის მიმდინარე გაკვეთილი, მერე გალობა სიმღერა ლოცვა, შემდეგ დაბლა სხვა ღილაკები
// მცირედ“): one holy father's saying in a white card, then one big wine button „მიმდინარე გაკვეთილი“ (it opens what the vine's
// „გაკვეთილი“ bunch opened — a student's teacher chat, everyone else the letters), then three tiles (გალობა · სიმღერა · ლოცვანი),
// then the other sections as small buttons, two in a row. Pure: everything comes by props (HomeV2 is the wrapper with the app's data).

export interface HomeTile {
  id: string;
  word: string;
  Icon: LucideIcon;
  /** the round mark's colour (a design rules' ground: bg-wine, bg-leaf …) */
  tone: string;
  /** the admin set it „მალე“: the tile says so, a tap only tells */
  soon?: boolean;
  onOpen: () => void;
}

export interface HomeV2ViewProps {
  saying: { text: string; author: string };
  /** „მიმდინარე გაკვეთილი“: none — the button is not drawn (a member with no letters) */
  lesson?: { unread: number; onOpen: () => void };
  /** the three big tiles: გალობა · სიმღერა · ლოცვანი (a hidden section is left out) */
  main: HomeTile[];
  /** the other sections, small, two in a row */
  more: HomeTile[];
  /** under the buttons: the classes card and the member's own buttons */
  children?: React.ReactNode;
}

/** the boards' quote mark (lucide's `Quote` is a heavier, filled shape) */
const QuoteMark: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 7H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
    <path d="M19 7h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
  </svg>
);

/** the long names may break here on the narrowest phones (with a hyphen), never anywhere else */
const SOFT: Record<string, string> = { 'მედავითნეობა': 'მედავით\u00adნეობა', 'ბიბლიოთეკა': 'ბიბლიო\u00adთეკა', 'ვიდეოთეკა': 'ვიდეო\u00adთეკა' };
const soft = (word: string) => SOFT[word] ?? word;

const tileLook = cx('flex cursor-pointer flex-col items-center justify-center bg-surf text-center select-none transition active:scale-95', FOCUS);

const Mark: React.FC<{ tile: HomeTile; big?: boolean }> = ({ tile, big }) => (
  <span aria-hidden="true" className={cx(
    'flex shrink-0 items-center justify-center rounded-full text-white',
    big ? 'size-12 [&_svg]:size-6' : 'size-icon [&_svg]:size-[18px]',
    tile.soon ? 'bg-dim' : tile.tone,
  )}>
    <tile.Icon strokeWidth={2} />
  </span>
);

export const HomeV2View: React.FC<HomeV2ViewProps> = ({ saying, lesson, main, more, children }) => (
  // -mt-0.5: the app frame gives the home 4px under its bar, the boards 2px
  <div className="mx-auto -mt-0.5 flex w-full max-w-lg flex-col gap-3">
    {/* one saying, changing every quarter hour */}
    <figure className="m-0 flex shrink-0 items-start gap-3 rounded-card bg-surf px-4 py-3.5">
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-wine text-white [&_svg]:size-4">
        <QuoteMark />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <blockquote className="m-0 text-body leading-[1.45] wrap-break-word text-ink">{saying.text}</blockquote>
        <figcaption className="text-meta font-medium text-wine">— {saying.author}</figcaption>
      </div>
    </figure>

    {/* the main button: where my learning is now */}
    {lesson && (
      <Press
        onClick={lesson.onOpen}
        aria-label={lesson.unread ? `მიმდინარე გაკვეთილი, ${lesson.unread} ახალი წერილი` : 'მიმდინარე გაკვეთილი'}
        className={cx(
          'relative flex min-h-[84px] w-full cursor-pointer items-center gap-3 rounded-card bg-wine px-4 py-4 text-left text-white shadow-wine select-none',
          'transition hover:bg-wine-deep active:scale-[0.98]', FOCUS,
        )}
      >
        <span aria-hidden="true" className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15 [&_svg]:size-6">
          <NotebookPen strokeWidth={2} />
          {lesson.unread > 0 && <Counter n={lesson.unread} className="absolute -top-1 -right-1 ring-2 ring-wine" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-head leading-tight font-bold">მიმდინარე გაკვეთილი</span>
          {lesson.unread > 0 && <span className="text-meta font-medium text-white/85">{lesson.unread} ახალი წერილი</span>}
        </span>
        <ChevronRight aria-hidden="true" strokeWidth={2.25} className="size-5 shrink-0 text-white/80" />
      </Press>
    )}

    {/* გალობა · სიმღერა · ლოცვანი */}
    {main.length > 0 && (
      <div className={cx('grid gap-2.5', main.length === 3 ? 'grid-cols-3' : main.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {main.map(t => (
          <Press key={t.id} onClick={t.onOpen} className={cx(tileLook, 'min-h-[104px] gap-2 rounded-card px-2 py-3.5')}>
            <Mark tile={t} big />
            <span className="flex flex-col">
              <span className={cx('text-lead leading-tight font-bold', t.soon ? 'text-mut' : 'text-ink')}>{t.word}</span>
              {t.soon && <span className="text-cap leading-tight font-semibold text-mut">მალე</span>}
            </span>
          </Press>
        ))}
      </div>
    )}

    {/* the other sections, small: two in a row, a round mark and the name side by side */}
    {more.length > 0 && (
      <div className="grid grid-cols-2 gap-2">
        {more.map(t => (
          <Press key={t.id} onClick={t.onOpen} className={cx(
            'flex min-h-[56px] cursor-pointer items-center gap-2 rounded-tile bg-surf py-2 pr-2.5 pl-2 text-left select-none transition active:scale-95', FOCUS,
          )}>
            <Mark tile={t} />
            <span className="flex min-w-0 flex-col">
              <span className={cx('text-body leading-tight font-bold hyphens-manual', t.soon ? 'text-mut' : 'text-ink')}>{soft(t.word)}</span>
              {t.soon && <span className="text-cap leading-tight font-semibold text-mut">მალე</span>}
            </span>
          </Press>
        ))}
      </div>
    )}

    {children && <div className="flex flex-col items-center gap-3 px-1 pt-1">{children}</div>}
  </div>
);
