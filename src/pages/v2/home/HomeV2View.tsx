import React from 'react';
import { ArrowUpRight, Church, NotebookPen, type LucideIcon } from 'lucide-react';
import { Press, cx, FOCUS, FOCUS_IN } from '../../../components/ui2';

// The new look's home page. Since 2026-11-22 it has no vine and no grapes (the user: „ყურძენი და ხე მოაცილო, თანამედროვე
// ღილაკები დახატო … პირველი მთავარი ღილაკი არის მიმდინარე გაკვეთილი, მერე გალობა სიმღერა ლოცვა, შემდეგ დაბლა სხვა ღილაკები
// მცირედ“), then „დახვეწე … უფრო თანამედროვედ“ and „ულტრა თანამედროვე მინდა“ the same night:
// - one holy father's saying in a quiet white card;
// - „გაკვეთილი“ (until 2026-11-22 „მიმდინარე გაკვეთილი“): a compact wine row with a warm glow (it opens what the vine's
//   „გაკვეთილი“ bunch opened — a student's teacher chat, everyone else the letters);
// - გალობა · სიმღერა · ლოცვანი as a mosaic: გალობა tall on the left, the other two stacked on the right;
// - the other sections as an app grid in one white card: a colour square with a gloss, the name under it.
// Pure: everything comes by props (HomeV2 is the wrapper with the app's data).

export interface HomeTile {
  id: string;
  word: string;
  Icon: LucideIcon;
  /** the section's colour (a design rules' ground: bg-wine, bg-leaf …) */
  tone: string;
  /** the admin set it „მალე“: the tile says so, a tap only tells */
  soon?: boolean;
  onOpen: () => void;
}

export interface HomeV2ViewProps {
  saying: { text: string; author: string };
  /** „გაკვეთილი“: none — the card is not drawn (a member with no letters) */
  /** `onProgram`: the round ⛪ on the card — „დღევანდელი წირვა“ (teachers and admins) */
  lesson?: { unread: number; onOpen: () => void; onProgram?: () => void };
  /** the three big tiles: გალობა · სიმღერა · ლოცვანი (a hidden section is left out) */
  main: HomeTile[];
  /** the other sections, small, four in a row */
  more: HomeTile[];
  /** under the buttons: the classes card and the member's own buttons */
  children?: React.ReactNode;
}

/** the boards' quote mark (lucide's `Quote` is a heavier, filled shape) */
const QuoteMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M10 7H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
    <path d="M19 7h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
  </svg>
);

/** each colour's look: the square's light-to-deep fall, a tile's whisper of it, and the big faint icon in a tile's corner */
const LOOK: Record<string, { fall: string; wash: string; ghost: string }> = {
  'bg-wine': { fall: 'from-wine/75 to-wine-deep', wash: 'to-tint', ghost: 'text-wine/10' },
  'bg-leaf': { fall: 'from-leaf/75 to-leaf-ink', wash: 'to-leaf-tint', ghost: 'text-leaf/10' },
  'bg-gold': { fall: 'from-gold/75 to-gold-ink', wash: 'to-gold-tint', ghost: 'text-gold/12' },
  'bg-sea': { fall: 'from-sea/70 to-sea', wash: 'to-sea-tint', ghost: 'text-sea/10' },
  'bg-plum': { fall: 'from-plum/70 to-plum', wash: 'to-plum/10', ghost: 'text-plum/10' },
  'bg-clay': { fall: 'from-clay/70 to-clay', wash: 'to-clay/10', ghost: 'text-clay/10' },
};
const lookOf = (tone: string) => LOOK[tone] ?? LOOK['bg-wine'];

/** the long names may break here on the narrowest phones (with a hyphen), never anywhere else */
const SOFT: Record<string, string> = { 'მედავითნეობა': 'მედავით­ნეობა', 'ბიბლიოთეკა': 'ბიბლიო­თეკა', 'ვიდეოთეკა': 'ვიდეო­თეკა' };
const soft = (word: string) => SOFT[word] ?? word;

/** a section's mark: a rounded square falling from light to deep, a soft gloss over its top half */
const Glyph: React.FC<{ tile: HomeTile; size: 'lg' | 'md' | 'sm' }> = ({ tile, size }) => (
  <span aria-hidden="true" className={cx(
    'relative flex shrink-0 items-center justify-center overflow-hidden rounded-field text-white ring-1 ring-white/15 ring-inset',
    size === 'lg' ? 'size-13 [&_svg]:size-[26px]' : size === 'md' ? 'size-11 [&_svg]:size-[22px]' : 'size-11 [&_svg]:size-5',
    tile.soon ? 'bg-dim' : cx('bg-linear-to-br', lookOf(tile.tone).fall),
  )}>
    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/25 to-transparent" />
    <tile.Icon strokeWidth={2} className="relative" />
  </span>
);

/** one of გალობა · სიმღერა · ლოცვანი: the mark above, the name at the foot, the section's icon faint and large in the corner */
const MainTile: React.FC<{ tile: HomeTile; tall?: boolean; className?: string; style?: React.CSSProperties }> = ({ tile, tall, className, style }) => (
  <Press onClick={tile.onOpen} style={style} className={cx(
    'sg-up group relative isolate flex cursor-pointer flex-col items-start justify-between gap-3 overflow-hidden rounded-card bg-linear-to-b from-surf from-40% p-4 text-left shadow-lift select-none',
    'transition active:scale-[0.97]', tile.soon ? 'to-surf' : lookOf(tile.tone).wash, tall ? 'min-h-[204px]' : 'min-h-[97px] p-3.5', FOCUS, className,
  )}>
    <tile.Icon aria-hidden="true" strokeWidth={1.5} className={cx(
      'pointer-events-none absolute -z-1 -rotate-12', tall ? '-right-6 -bottom-6 size-36' : '-right-3 -bottom-4 size-20',
      tile.soon ? 'text-dim/40' : lookOf(tile.tone).ghost,
    )} />
    <Glyph tile={tile} size={tall ? 'lg' : 'md'} />
    <span className="flex flex-col">
      <span className={cx('leading-tight font-bold tracking-[-0.01em]', tall ? 'text-title' : 'text-lead', tile.soon ? 'text-mut' : 'text-ink')}>{tile.word}</span>
      {tile.soon && <span className="text-cap leading-tight font-semibold text-mut">მალე</span>}
    </span>
  </Press>
);

/** a step's delay for the page's gentle rise on opening */
const rise = (i: number): React.CSSProperties => ({ animationDelay: `${i * 45}ms` });

export const HomeV2View: React.FC<HomeV2ViewProps> = ({ saying, lesson, main, more, children }) => (
  // -mt-0.5: the app frame gives the home 4px under its bar, the boards 2px
  <div className="mx-auto -mt-0.5 flex w-full max-w-lg flex-col gap-3">
    {/* one saying, changing every quarter hour: a quiet card, a large faint quote mark in its lower corner (under the short
        author's line, so it never lies under the words) */}
    <figure className="sg-up relative m-0 flex shrink-0 flex-col gap-1.5 overflow-hidden rounded-card bg-surf px-5 py-4" style={rise(0)}>
      <QuoteMark className="pointer-events-none absolute right-3 -bottom-3 size-16 text-wine/10" />
      <blockquote className="relative m-0 text-body leading-[1.5] wrap-break-word text-ink">{saying.text}</blockquote>
      <figcaption className="relative text-meta font-semibold text-wine">— {saying.author}</figcaption>
    </figure>

    {/* the main card: where my learning is now — deep wine, a warm glow behind, one compact row (2026-11-22, the user:
        „მარტო გაკვეთილი ეწეროს … უფრო კომპაქტური გახადე“): the mark, „გაკვეთილი“ (new letters under it), the arrow */}
    {lesson && (
      <Press
        onClick={lesson.onOpen}
        aria-label={lesson.unread ? `სწავლა, ${lesson.unread} ახალი წერილი` : 'სწავლა'}
        style={rise(1)}
        className={cx(
          'sg-up group relative isolate flex min-h-[76px] w-full cursor-pointer items-center gap-3.5 overflow-hidden rounded-card',
          'bg-linear-to-br from-wine to-wine-deep px-4 py-3.5 text-left text-white shadow-wine select-none transition active:scale-[0.98]', FOCUS,
        )}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-20 -right-10 -z-1 size-44 rounded-full bg-blush/35 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 -z-1 size-40 rounded-full bg-gold/30 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -bottom-14 -z-1 size-32 rounded-full border border-white/12" />

        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-field bg-white/15 ring-1 ring-white/25 backdrop-blur-md [&_svg]:size-[22px]">
          <NotebookPen strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-title leading-tight font-bold tracking-[-0.01em]">სწავლა</span>
          {lesson.unread > 0 && (
            <span className="flex items-center gap-1.5 text-cap leading-tight font-semibold text-white/85">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-blush" />
              {lesson.unread} ახალი წერილი
            </span>
          )}
        </span>
        {/* today's service, only its sign (2026-11-22 evening, the user: „ლამაზი მრგვალი ღილაკი დღევანდელი მსახურების … მხოლოდ ლოგო“) */}
        {lesson.onProgram && (
          <span role="button" tabIndex={0} aria-label="დღევანდელი წირვა" title="დღევანდელი წირვა"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); e.preventDefault(); lesson.onProgram?.(); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); lesson.onProgram?.(); } }}
            className={cx('relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-md transition active:scale-90 [&_svg]:size-[22px]', FOCUS_IN)}>
            <Church strokeWidth={2} aria-hidden="true" />
          </span>
        )}
        <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surf text-wine shadow-knob transition group-active:scale-90 [&_svg]:size-5">
          <ArrowUpRight strokeWidth={2.5} />
        </span>
      </Press>
    )}

    {/* გალობა · სიმღერა · ლოცვანი — a mosaic: გალობა tall on the left, the other two stacked on the right */}
    {main.length === 3 ? (
      <div className="grid grid-cols-2 gap-2.5">
        <MainTile tile={main[0]} tall className="row-span-2" style={rise(2)} />
        <MainTile tile={main[1]} style={rise(3)} />
        <MainTile tile={main[2]} style={rise(4)} />
      </div>
    ) : main.length > 0 && (
      <div className={cx('grid gap-2.5', main.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {main.map((t, i) => <MainTile key={t.id} tile={t} style={rise(2 + i)} />)}
      </div>
    )}

    {/* the other sections: an app grid in one white card, four in a row */}
    {more.length > 0 && (
      <section aria-label="სხვა განყოფილებები" className="sg-up flex flex-col gap-2 pt-1" style={rise(5)}>
        <h2 className="m-0 px-2 text-meta font-semibold text-mut">სხვა განყოფილებები</h2>
        <div className="grid grid-cols-4 gap-y-1 rounded-card bg-surf p-1.5">
          {more.map(t => (
            <Press key={t.id} onClick={t.onOpen} className={cx(
              'flex min-h-[90px] cursor-pointer flex-col items-center justify-start gap-1.5 rounded-tile pt-2.5 pb-2 text-center select-none',
              'transition active:scale-95 active:bg-soft', FOCUS_IN,
            )}>
              <Glyph tile={t} size="sm" />
              <span className={cx('text-cap leading-tight font-semibold hyphens-manual', t.soon ? 'text-mut' : 'text-ink')}>{soft(t.word)}</span>
              {t.soon && <span className="-mt-1 text-cap leading-tight text-mut">მალე</span>}
            </Press>
          ))}
        </div>
      </section>
    )}

    {children && <div className="flex flex-col items-center gap-3 px-1 pt-1">{children}</div>}
  </div>
);
