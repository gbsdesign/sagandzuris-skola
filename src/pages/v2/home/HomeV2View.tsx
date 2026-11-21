import React, { useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Calendar, CircleCheck, Dice4, GraduationCap, MapPin, Music, Sparkles, type LucideIcon } from 'lucide-react';
import { Press, cx, FOCUS } from '../../../components/ui2';
import type { NextKind, NextStep } from './nextStep';
import { LettersBunch } from './LettersBunch';

// The new look's home page (boards x-mtavari, x-ultra-gaagrdzele, x-ultra-gaagrdzele-2): one holy father's saying in a white
// card, the vine with its labels as white chips (the same picture and places as the old GrapeNav), and on the qvevri one
// „გააგრძელე“ button that shows where I stopped. Pure: everything comes by props (HomeV2 is the wrapper with the app's data).
// The labels are placed in % of the picture, so the vine keeps the board's look on any phone: under the board's 374px it
// and its labels grow smaller together (never under 80 % — the words stay ≥ 12px).

export type SpotId = 'simghera' | 'chvevebi' | 'eklesiebi' | 'galoba' | 'biblioteka' | 'tamashebi';

export interface VineLabel {
  id: SpotId;
  /** the admin set it „მალე“: the label says so under its name, a tap only tells */
  soon?: boolean;
}

interface Spot { label: string; x: number; y: number; tone?: string; Icon?: LucideIcon }

/** x/y = the label's centre in % of the picture (public/home/vine.png, 1033×1390), as on the boards */
export const SPOTS: Record<SpotId, Spot> = {
  simghera: { label: 'ხალხური', x: 29, y: 14, tone: 'bg-leaf', Icon: Music },
  chvevebi: { label: 'ჩვევები', x: 66, y: 7, tone: 'bg-gold', Icon: CircleCheck },
  eklesiebi: { label: 'ტაძრები', x: 82, y: 20, tone: 'bg-clay', Icon: MapPin },
  galoba: { label: 'ღვთისმსახურება', x: 56, y: 33 },
  biblioteka: { label: 'ლოცვანი', x: 19, y: 52, tone: 'bg-gold', Icon: BookOpen },
  tamashebi: { label: 'სახალისო', x: 81, y: 51, tone: 'bg-sea', Icon: Dice4 },
};

export type BunchId = 'galoba' | 'simghera' | 'lotsvani';

/** where the picture's own bunches hung: the stem's top, in % of the picture */
const BUNCH_SPOT: Record<BunchId, React.CSSProperties> = {
  galoba: { left: '64.6%', top: '15.4%' },
  simghera: { left: '14.5%', top: '19.5%' },
  lotsvani: { left: '37.5%', top: '30.2%' },
};

/** the boards' vine box: 374px wide (the 358px column + 8px each side) */
const BOARD_W = 374;

/** the boards' quote mark (lucide's `Quote` is a heavier, filled shape) */
const QuoteMark: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 7H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
    <path d="M19 7h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3" />
  </svg>
);

/** the boards' play mark: a smaller triangle than lucide's `Play` */
const PlayMark: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8.5 5.5v13l10.5-6.5z" />
  </svg>
);

const NEXT_ICON: Record<NextKind, React.ReactNode> = {
  lesson: <Calendar strokeWidth={2} />,
  start: <Sparkles strokeWidth={2} />,
  ai: <Sparkles strokeWidth={2} />,
  review: <PlayMark />,
  learn: <PlayMark />,
  book: <BookOpen strokeWidth={2} />,
};

export interface HomeV2ViewProps {
  saying: { text: string; author: string };
  /** the vine's labels to draw (the hidden ones left out), in the boards' order */
  labels: VineLabel[];
  /** „აბიტური“ hangs under „ღვთისმსახურება“ */
  abituri: boolean;
  onLabel: (id: SpotId) => void;
  onAbituri: () => void;
  /** the one thing „გააგრძელე“ shows; none — no button */
  next: NextStep | null;
  onNext: () => void;
  /** „წერილები“ as the grape bunch right of the trunk (2026-11-21); none — the bunch is not drawn */
  letters?: { unread: number; onOpen: () => void };
  /** the sections written into the vine's other bunches (2026-11-21); a hidden section is left out */
  bunches?: { id: BunchId; word: string; onOpen: () => void }[];
  /** under the vine: the birthdays' line and the member's own buttons */
  children?: React.ReactNode;
}

/** the vine's scale: 1 at the board's width and wider, smaller on a narrower phone, never under 0.8 */
const useVineScale = () => {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const set = () => setK(Math.min(1, Math.max(0.8, el.clientWidth / BOARD_W)));
    set();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { box, k };
};

// sg-keep-text: the labels hang on the picture, so a bigger text size (design/look.ts) leaves them as they are
const SWAY = 'vine-sway sg-keep-text absolute -translate-x-1/2 -translate-y-1/2';

const chipLook = cx(
  'flex h-[46px] items-center gap-2 rounded-full bg-surf pr-3.5 pl-2 whitespace-nowrap shadow-lift select-none',
  'cursor-pointer transition active:scale-95', FOCUS,
);

export const HomeV2View: React.FC<HomeV2ViewProps> = ({ saying, labels, abituri, onLabel, onAbituri, next, onNext, letters, bunches, children }) => {
  const { box, k } = useVineScale();
  return (
    // -mt-0.5: the app frame gives the home 4px under its bar, the boards 2px
    <div className="mx-auto -mt-0.5 flex w-full max-w-lg flex-col gap-2">
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

      {/* the vine: 8px wider than the column on each side, as on the boards */}
      <div className="-mx-2 flex shrink-0 justify-center">
        <div ref={box} className="relative aspect-[1033/1390] w-full select-none">
          <img src="/home/vine.png" alt="" aria-hidden="true" draggable={false} className="sg-vine-img absolute inset-0 size-full opacity-80 saturate-85" />

          {labels.map(({ id, soon }, i) => {
            const s = SPOTS[id];
            // the sway turns a label round its top, so the scale does too: its centre is moved back down by what it lost
            const half = id === 'galoba' ? 27 : 23;
            const place: React.CSSProperties = {
              left: `${s.x}%`, top: k < 1 ? `calc(${s.y}% + ${((1 - k) * half).toFixed(1)}px)` : `${s.y}%`, scale: k, animationDelay: `${-i * 0.7}s`,
            };
            if (id === 'galoba') {
              return (
                <div key={id} className={cx(SWAY, 'z-2')} style={place}>
                  <Press onClick={() => onLabel(id)} className={cx(
                    'relative z-2 flex h-[54px] flex-col items-center justify-center rounded-full bg-wine px-[22px] whitespace-nowrap text-white shadow-wine select-none',
                    'cursor-pointer transition hover:bg-wine-deep active:scale-95', FOCUS,
                  )}>
                    <span className="text-head leading-tight font-bold tracking-[-0.01em]">{s.label}</span>
                    {soon && <span className="text-cap leading-none font-semibold text-white/85">მალე</span>}
                  </Press>
                  {/* „აბიტური“: a tab under the pill's left side, swaying with it */}
                  {abituri && (
                    <Press onClick={onAbituri} className={cx(
                      'absolute top-full left-2 z-1 -mt-1.5 flex h-[46px] items-center gap-1.5 rounded-t-chip rounded-b-tile bg-surf pt-2 pr-3.5 pl-3',
                      'text-meta font-bold whitespace-nowrap text-wine shadow-lift select-none cursor-pointer transition active:scale-95', FOCUS,
                    )}>
                      <GraduationCap aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
                      აბიტური
                    </Press>
                  )}
                </div>
              );
            }
            const Icon = s.Icon!;
            return (
              <div key={id} className={SWAY} style={place}>
                <Press onClick={() => onLabel(id)} className={chipLook}>
                  <span aria-hidden="true" className={cx('flex size-[30px] shrink-0 items-center justify-center rounded-full text-white [&_svg]:size-4', s.tone)}>
                    <Icon strokeWidth={2} />
                  </span>
                  <span className="flex flex-col">
                    <span className={cx('text-body leading-tight font-bold', soon ? 'text-mut' : 'text-ink')}>{s.label}</span>
                    {soon && <span className="text-cap leading-none font-semibold text-mut">მალე</span>}
                  </span>
                </Press>
              </div>
            );
          })}

          {/* words in the grapes, where the picture's own bunches hung: the first one („გაკვეთილი“) opens the letters, the others
              their sections; they sway out of step */}
          {letters && <LettersBunch word="გაკვეთილი" label="წერილები" shiny unread={letters.unread} onOpen={letters.onOpen} className="z-1 w-[23%]" style={{ left: '68.9%', top: '32.4%' }} />}
          {bunches?.map((b, i) => (
            <LettersBunch key={b.id} word={b.word} onOpen={b.onOpen} className="z-1 w-[23%]" style={{ ...BUNCH_SPOT[b.id], animationDelay: `${-(i + 1) * 0.9}s` }} />
          ))}

          {/* „გააგრძელე“ on the qvevri: one thing, where I stopped */}
          {next && (
            <Press
              key={next.kind}
              onClick={onNext}
              aria-label={`${next.kicker}: ${next.what}${next.tail ?? ''}`}
              className={cx(
                // as wide as the screen less 4px a side at most (the boards' AI line needs 382px of a 390px phone)
                'sg-in absolute top-[81%] left-1/2 z-2 flex h-[60px] max-w-[calc(100%+8px)] -translate-x-1/2 -translate-y-1/2 items-center gap-2',
                'rounded-full bg-surf pr-[18px] pl-2 text-left whitespace-nowrap shadow-lift select-none cursor-pointer transition active:scale-[0.97]', FOCUS,
              )}
            >
              <span aria-hidden="true" className="flex size-tap shrink-0 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-[18px]">
                {NEXT_ICON[next.kind]}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-meta leading-tight font-semibold text-mut">{next.kicker}</span>
                <span className="flex min-w-0 text-body leading-tight font-bold whitespace-pre text-ink">
                  <span className="truncate">{next.what}</span>
                  {next.tail && <span className="shrink-0">{next.tail}</span>}
                </span>
              </span>
            </Press>
          )}
        </div>
      </div>

      {children && <div className="flex flex-col items-center gap-3 px-1 pt-2">{children}</div>}
    </div>
  );
};
