import React from 'react';
import { ArrowRight, NotebookPen, type LucideIcon } from 'lucide-react';
import { Press, cx, FOCUS, FOCUS_IN } from '../../../components/ui2';

// The new look's home page. Since 2026-11-22 it has no vine and no grapes (the user: „ყურძენი და ხე მოაცილო, თანამედროვე
// ღილაკები დახატო … პირველი მთავარი ღილაკი არის მიმდინარე გაკვეთილი, მერე გალობა სიმღერა ლოცვა, შემდეგ დაბლა სხვა ღილაკები
// მცირედ“): one holy father's saying in a white card, then one big wine button „მიმდინარე გაკვეთილი“ (it opens what the vine's
// „გაკვეთილი“ bunch opened — a student's teacher chat, everyone else the letters), then three tiles (გალობა · სიმღერა · ლოცვანი),
// then the other sections as small buttons, two in a row in one card. The same evening (the user: „დახვეწე დიზაინი უფრო
// თანამედროვედ“): the wine button got a soft fall of light and a white arrow, the marks became rounded squares.
// Pure: everything comes by props (HomeV2 is the wrapper with the app's data).

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

/** a round mark's quiet version: the colour's pale ground under an icon of the colour itself (the small buttons) */
const SOFT_TONE: Record<string, string> = {
  'bg-wine': 'bg-tint text-wine', 'bg-leaf': 'bg-leaf-tint text-leaf-ink', 'bg-gold': 'bg-gold-tint text-gold-ink',
  'bg-sea': 'bg-sea-tint text-sea', 'bg-plum': 'bg-plum/15 text-plum', 'bg-clay': 'bg-clay/15 text-clay',
};

/** the section's mark: a rounded square — full colour on the big tiles, the pale ground on the small buttons */
const Mark: React.FC<{ tile: HomeTile; big?: boolean }> = ({ tile, big }) => (
  <span aria-hidden="true" className={cx(
    'flex shrink-0 items-center justify-center rounded-field',
    big ? 'size-11 [&_svg]:size-[22px]' : 'size-icon [&_svg]:size-[18px]',
    tile.soon ? 'bg-soft text-mut' : big ? cx(tile.tone, 'text-white') : SOFT_TONE[tile.tone] ?? 'bg-soft text-ink',
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

    {/* the main button: where my learning is now — wine with a soft fall of light, two pale rings behind */}
    {lesson && (
      <Press
        onClick={lesson.onOpen}
        aria-label={lesson.unread ? `მიმდინარე გაკვეთილი, ${lesson.unread} ახალი წერილი` : 'მიმდინარე გაკვეთილი'}
        className={cx(
          'group relative flex min-h-[96px] w-full cursor-pointer items-center gap-3.5 overflow-hidden rounded-card bg-linear-to-br from-wine to-wine-deep',
          'py-4 pr-4 pl-4 text-left text-white shadow-wine select-none transition active:scale-[0.98]', FOCUS,
        )}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-10 size-44 rounded-full bg-white/8" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-4 -bottom-16 size-32 rounded-full bg-white/6" />
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-field bg-white/15 ring-1 ring-white/20 [&_svg]:size-6">
          <NotebookPen strokeWidth={2} />
        </span>
        <span className="relative flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-title leading-tight font-bold tracking-[-0.01em]">მიმდინარე გაკვეთილი</span>
          {lesson.unread > 0 && (
            <span className="self-start rounded-full bg-white/15 px-2.5 py-0.5 text-cap font-semibold">{lesson.unread} ახალი წერილი</span>
          )}
        </span>
        <span aria-hidden="true" className="relative flex size-tap shrink-0 items-center justify-center rounded-full bg-surf text-wine shadow-knob transition group-active:translate-x-0.5 [&_svg]:size-5">
          <ArrowRight strokeWidth={2.5} />
        </span>
      </Press>
    )}

    {/* გალობა · სიმღერა · ლოცვანი: white tiles, the mark above, the name under it on the left */}
    {main.length > 0 && (
      <div className={cx('grid gap-2.5', main.length === 3 ? 'grid-cols-3' : main.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {main.map(t => (
          <Press key={t.id} onClick={t.onOpen} className={cx(
            'flex min-h-[112px] cursor-pointer flex-col items-start justify-between gap-3 rounded-card bg-surf p-3.5 text-left shadow-lift select-none',
            'transition active:scale-95', FOCUS,
          )}>
            <Mark tile={t} big />
            <span className="flex flex-col">
              <span className={cx('text-lead leading-tight font-bold', t.soon ? 'text-mut' : 'text-ink')}>{t.word}</span>
              {t.soon && <span className="text-cap leading-tight font-semibold text-mut">მალე</span>}
            </span>
          </Press>
        ))}
      </div>
    )}

    {/* the other sections: one white card under a small name, two in a row, a pale mark beside each name */}
    {more.length > 0 && (
      <section aria-label="სხვა განყოფილებები" className="flex flex-col gap-1.5 pt-1">
        <h2 className="m-0 px-2 text-meta font-semibold text-mut">სხვა განყოფილებები</h2>
        <div className="grid grid-cols-2 gap-1 rounded-card bg-surf p-1.5">
          {more.map(t => (
            <Press key={t.id} onClick={t.onOpen} className={cx(
              'flex min-h-tap-lg cursor-pointer items-center gap-2.5 rounded-tile py-1.5 pr-2 pl-1.5 text-left select-none transition-colors active:bg-soft', FOCUS_IN,
            )}>
              <Mark tile={t} />
              <span className="flex min-w-0 flex-col">
                <span className={cx('text-body leading-tight font-semibold hyphens-manual', t.soon ? 'text-mut' : 'text-ink')}>{soft(t.word)}</span>
                {t.soon && <span className="text-cap leading-tight font-semibold text-mut">მალე</span>}
              </span>
            </Press>
          ))}
        </div>
      </section>
    )}

    {children && <div className="flex flex-col items-center gap-3 px-1 pt-1">{children}</div>}
  </div>
);
