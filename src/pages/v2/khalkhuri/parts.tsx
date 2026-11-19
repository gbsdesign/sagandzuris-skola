import React, { useEffect, useState } from 'react';
import { ChevronRight, LoaderCircle, Lock, Play, Square } from 'lucide-react';
import { Button, Card, Press, SectionLabel, cx, FOCUS_IN } from '../../../components/ui2';
import { RegionLocator, RegionPuzzleMap } from '../../../components/maps/RegionPuzzleMap';
import type { FolkRegion, MapRegionId } from '../../../data/songsData';
import { usePreview } from '../../../utils/listPreview';
import { triggerHaptic } from '../../../utils/haptics';

// Small parts shared by „ხალხური“ and „ეკლესია-მონასტრები“ in the new look (boards x-khalkhuri … x-ruka).

export { Page, SearchPill, Loading, AutoRound } from '../library/parts';

/** `iconOnly`: the pill shows only its icon (its label is said to screen readers) */
export type Pill = { id: string; label: string; on?: boolean; onClick: () => void; icon?: React.ReactNode; iconOnly?: boolean };

/** A row of pills that scrolls sideways past the page's edges — the boards' `chips`, where some pills only lead somewhere
 *  and some may be on together (the kit's Chips picks one). */
export const PillRow: React.FC<{ items: Pill[]; label?: string; className?: string }> = ({ items, label, className }) => (
  <div role="group" aria-label={label} className={cx(
    '-mx-4 -my-1 flex shrink-0 gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    className,
  )}>
    {items.map(it => (
      <Press key={it.id} aria-pressed={it.on} aria-label={it.iconOnly ? it.label : undefined} title={it.iconOnly ? it.label : undefined}
        onClick={() => { triggerHaptic(8); it.onClick(); }}
        className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
        <span className={cx(
          'flex h-10 min-w-[44px] items-center justify-center gap-1.5 rounded-full text-body whitespace-nowrap transition [&_svg]:size-[18px] [&_svg]:shrink-0',
          'group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
          it.iconOnly ? 'px-3' : 'px-4',
          it.on ? 'bg-wine font-bold text-white' : 'bg-surf font-semibold text-ink',
        )}>{it.icon}{!it.iconOnly && it.label}</span>
      </Press>
    ))}
  </div>
);

/** A quick listen from a list: the tint round ▶ (■ while it sounds) — `ndot` of the boards, the old list's PreviewButton. */
export const PlayDot: React.FC<{ id: string; label: string; onToggle: () => void }> = ({ id, label, onToggle }) => {
  const phase = usePreview(id);
  const on = phase !== null;
  return (
    <Press
      aria-pressed={on}
      aria-label={on ? `გაჩერება: ${label}` : `მოსმენა: ${label}`}
      title={on ? 'გაჩერება' : 'მოსმენა'}
      onClick={e => { e.stopPropagation(); triggerHaptic(12); onToggle(); }}
      className={cx(
        'relative flex size-icon shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95',
        'before:absolute before:-inset-1 before:rounded-full [&_svg]:size-4',
        on ? 'bg-wine text-white' : 'bg-tint text-wine',
        FOCUS_IN,
      )}
    >
      {phase === 'loading' ? <LoaderCircle aria-hidden="true" className="animate-spin" />
        : phase === 'playing' ? <Square aria-hidden="true" className="fill-current" />
        : <Play aria-hidden="true" className="translate-x-px fill-current" />}
    </Press>
  );
};

/** A row's chevron after something else at its end (the kit draws it only when nothing else is there). */
export const Chev: React.FC = () => <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;

/** The lock at a row's end for a guest (the row asks to sign in). */
export const LockMark: React.FC = () => <Lock aria-label="შესვლა საჭიროა" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;

/** A long list in steps: the shown part and „კიდევ N“ under it. The step starts again when the list changes. */
export const usePaged = <T,>(items: T[], step = 60) => {
  const [limit, setLimit] = useState(step);
  useEffect(() => { setLimit(step); }, [items, step]);
  const left = items.length - limit;
  const more = left > 0 ? (
    <Button kind="ghost" size="md" className="self-center" onClick={() => { triggerHaptic(8); setLimit(l => l + step); }}>
      კიდევ {Math.min(step, left)} · სულ {items.length}
    </Button>
  ) : null;
  return { shown: items.slice(0, limit), more };
};

/** The puzzle map of Georgia with the regions' names and counts on it, on its own card (the tap's grown region and its
 *  running light are the map's own). */
export const MapCard: React.FC<{
  count: (id: string) => number;
  onSelect: (r: FolkRegion) => void;
  regionName?: (r: FolkRegion) => string;
  title: string;
  label: (n: number) => string;
}> = ({ count, onSelect, regionName, title, label }) => (
  <Card pad="sm" className="px-1.5 pt-2 pb-1">
    <RegionPuzzleMap rich mapOnly onSelect={onSelect} count={id => count(id)} countLabel={label} regionName={regionName} title={title} />
  </Card>
);

/** The regions as small white tiles two by two: its colour, its name, its count in wine (a region with none is pale). */
export const RegionGrid: React.FC<{
  regions: FolkRegion[];
  count: (id: string) => number;
  name?: (r: FolkRegion) => string;
  onOpen: (r: FolkRegion) => void;
}> = ({ regions, count, name = r => r.nameGe, onOpen }) => (
  <div className="grid shrink-0 grid-cols-2 gap-2">
    {regions.map(r => {
      const n = count(r.id);
      return (
        <Press
          key={r.id}
          onClick={() => { triggerHaptic(10); onOpen(r); }}
          className={cx(
            'flex min-h-tap-lg min-w-0 cursor-pointer items-center gap-2 rounded-tile bg-surf py-1.5 pr-3 pl-2.5 text-left transition active:scale-[0.98] active:bg-soft',
            !n && 'opacity-55',
            FOCUS_IN,
          )}
        >
          <span aria-hidden="true" className="size-3.5 shrink-0 rounded-chip" style={{ background: r.color }} />
          <span className="min-w-0 flex-1 text-body leading-tight font-bold wrap-break-word">{name(r)}</span>
          {n > 0 && <span className="shrink-0 text-body font-bold text-wine tabular-nums">{n}</span>}
        </Press>
      );
    })}
  </div>
);

/** „სხვა კუთხე“: the small map with this region lit — another region takes a tap (the old head's locator). */
export const OtherRegion: React.FC<{ region: FolkRegion; onPick: (id: MapRegionId) => void }> = ({ region, onPick }) => (
  <>
    <SectionLabel label="სხვა კუთხე" className="mt-1" />
    <Card pad="sm" className="flex justify-center">
      <RegionLocator region={region} onPick={onPick} className="h-auto w-full max-w-[300px]" />
    </Card>
  </>
);
