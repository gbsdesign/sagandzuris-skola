import React from 'react';
import { Camera, Check, Ellipsis, Plus } from 'lucide-react';
import { Button, Card, FOCUS, Press, RoundButton, TopBar, cx } from '../../../components/ui2';

// „ჩემი სამოსი“ in the new look (board x-samosi): the bar with „შეგროვებულია N / M“ (the real parts) and a round ⋯ for
// the rare things, the big figure in the middle of a white card, the parts as tiles in one white card under it, and one
// button — photograph the next part. Pure: everything comes in by props (the page is Samosi.tsx).

/** a part's tile: `real` = photographed (wine ✓), `tried` = only tried on now (pale ✓), `none` = not on */
export type TileMark = 'real' | 'tried' | 'none';
export interface SamosiTile { id: string; label: string; mark: TileMark }
/** a row of tiles, with an optional line over it (the hats: any one of them counts) */
export interface TileGroup { label?: string; tiles: SamosiTile[] }

/** the greeting over the figure once a real part is kept; `whole` = the last one's line („ჩოხა სრულადაა!“) */
export interface SamosiCheer { n: number; finale: boolean; whole: string }

export interface SamosiViewProps {
  onBack: () => void;
  /** the real (photographed) parts and how many the outfit has */
  done: number;
  total: number;
  /** the ⋯: colour, outfit, real / tried, the photo try-on */
  onMore?: () => void;
  /** the figure, or a line while it loads */
  figure: React.ReactNode;
  cheer?: SamosiCheer | null;
  groups: TileGroup[];
  /** what an empty tile shows: the camera (photograph it), a plus (tap tries it on), or a plain ring (a teacher's look) */
  empty: 'camera' | 'plus' | 'ring';
  onTile: (id: string) => void;
  /** the bottom button: the next part not yet real; none = all are, or a teacher's look */
  onNext?: () => void;
  /** under everything (the owner's kaba studio) */
  footer?: React.ReactNode;
  /** the sheets */
  children?: React.ReactNode;
}

const MARK_WORD: Record<TileMark, string> = { real: 'ნამდვილი', tried: 'მოსინჯული', none: 'ჯერ არ არის' };

const Mark: React.FC<{ mark: TileMark; empty: SamosiViewProps['empty'] }> = ({ mark, empty }) => {
  if (mark === 'real') {
    return (
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-wine text-white">
        <Check className="size-[11px]" strokeWidth={2.4} />
      </span>
    );
  }
  if (mark === 'tried') {
    return (
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-wine bg-surf text-wine">
        <Check className="size-[11px]" strokeWidth={2.4} />
      </span>
    );
  }
  if (empty === 'ring') return <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-[1.5px] border-dashed border-dim" />;
  const Icon = empty === 'plus' ? Plus : Camera;
  return <Icon aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={1.75} />;
};

const Tile: React.FC<{ tile: SamosiTile; empty: SamosiViewProps['empty']; onTap: () => void }> = ({ tile, empty, onTap }) => (
  <Press
    onClick={onTap}
    aria-label={`${tile.label} — ${MARK_WORD[tile.mark]}`}
    className={cx(
      'flex min-h-16 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-tile px-1 py-1.5 text-center',
      'text-meta leading-tight font-semibold transition active:scale-[0.97]',
      tile.mark === 'tried' ? 'bg-tint' : 'bg-page',
      tile.mark === 'none' ? 'text-mut' : 'text-ink',
      FOCUS,
    )}
  >
    <Mark mark={tile.mark} empty={empty} />
    <span className="max-w-full wrap-break-word">{tile.label}</span>
  </Press>
);

export const SamosiView: React.FC<SamosiViewProps> = ({
  onBack, done, total, onMore, figure, cheer, groups, empty, onTile, onNext, footer, children,
}) => (
  <div className="flex flex-col">
    <TopBar
      title="ჩემი სამოსი"
      sub={`შეგროვებულია ${done} / ${total}`}
      onBack={onBack}
      right={onMore && (
        <RoundButton label="მეტი" onClick={onMore}>
          <Ellipsis aria-hidden="true" strokeWidth={1.75} />
        </RoundButton>
      )}
    />
    <main className="flex flex-col gap-3 pt-0.5 pb-5">
      {/* the figure, big and in the middle; the greeting rises over its fading hem */}
      <Card pad="sm" className="relative">
        <div className="flex min-h-[330px] items-center justify-center">{figure}</div>
        {cheer && (
          <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <div key={cheer.n} className="samosi-cheer rounded-tile bg-surf/90 px-6 py-3.5 text-center shadow-float backdrop-blur-sm">
              {cheer.finale && <p className="text-cap font-bold text-leaf-ink">{cheer.whole}</p>}
              <p className="font-serif-ge text-title leading-tight font-bold text-wine">გილოცავ!</p>
              <p className="text-body font-bold text-ink">ღმერთს ებარებოდე!</p>
            </div>
          </div>
        )}
      </Card>

      {groups.some(g => g.tiles.length) && (
        <Card pad="sm" className="flex flex-col gap-2">
          {groups.map((g, i) => !!g.tiles.length && (
            <React.Fragment key={i}>
              {g.label && <p className="px-1 pt-1 text-meta font-semibold text-mut">{g.label}</p>}
              <div className="grid grid-cols-4 gap-2">
                {g.tiles.map(t => <Tile key={t.id} tile={t} empty={empty} onTap={() => onTile(t.id)} />)}
              </div>
            </React.Fragment>
          ))}
        </Card>
      )}

      {onNext && (
        <Button full icon={<Camera aria-hidden="true" strokeWidth={2} />} onClick={onNext}>
          გადაუღე ფოტო შემდეგ ნაწილს
        </Button>
      )}

      {footer}
    </main>
    {children}
  </div>
);
