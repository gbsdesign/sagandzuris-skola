import React, { useMemo, useState } from 'react';
import { Check, Church as ChurchIcon, Moon, Sun } from 'lucide-react';
import { Dot, Note, Row, Rows, Sheet, Small, cx } from '../../../components/ui2';
import { FOLK_REGIONS, type FolkRegion } from '../../../data/songsData';
import { KIND_FILTERS, passesKind, whereOf, type Church, type KindFilter } from '../../../data/churches';
import type { ServiceSlot } from '../../../data/churchServices';
import { dayText } from '../../../data/churchFeasts';
import type { Visits } from '../../../hooks/useChurchVisits';
import { Chev, PillRow, usePaged, type Pill } from '../khalkhuri/parts';

// Small parts of „ეკლესია-მონასტრები“ in the new look (boards x-tadzrebi … x-ruka): a church as a row, the kinds' pills,
// a long list in steps, a service's line.

export { Page, SearchPill, Loading, MapCard, OtherRegion, PillRow, Chev } from '../khalkhuri/parts';

/** Tbilisi stands for the songs map's „ქალაქური“ */
export const churchRegionName = (r: FolkRegion) => (r.id === 'kalakuri' ? 'თბილისი' : r.nameGe);
export const churchRegion = (id: string): FolkRegion | null => FOLK_REGIONS.find(r => r.id === id) ?? null;

/** 3407 → „3 407“ */
export const big = (n: number) => n.toLocaleString('en-US').replace(/,/g, ' ');
/** „21 ნოემბერი“ → „21 ნოე“ */
export const shortDay = (iso: string) => { const [d, m] = dayText(iso).split(' '); return `${d} ${m.slice(0, 3)}`; };

export type Filter = KindFilter | 'mine';
export const passes = (c: Church, f: Filter, visits: Visits) => (f === 'mine' ? c.id in visits : passesKind(c, f));

/** the search's hits whose own name holds the words first (a village of the same name after them) */
export const byName = (list: Church[], query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const named = (c: Church) => words.every(w => c.name.toLowerCase().includes(w));
  return [...list.filter(named), ...list.filter(c => !named(c))];
};

/** its state in a word, when it is not a plain working church */
export const stateOf = (c: Church) => (c.building ? 'მშენებარე' : c.kind === 'x' ? 'არ მოქმედებს' : c.kind === 'm' ? 'მონასტერი' : '');

/** where it is in a few words: inside a region its village (or municipality); across regions the village and the region */
export const placeOf = (c: Church, local?: boolean) => {
  if (!c.place) return whereOf(c);
  if (local) return c.place;
  const r = churchRegion(c.region);
  const region = r ? churchRegionName(r) : '';
  return region && region !== c.place ? `${c.place} · ${region}` : whereOf(c);
};

/** a church in a list: its mark (a green ✓ once I have been there), the name, where it is (`local`: inside its region);
 *  `badge` = a distance or a day */
export const ChurchRow: React.FC<{ c: Church; onOpen: (id: string) => void; been?: string; badge?: string; local?: boolean }> = ({
  c, onOpen, been, badge, local,
}) => (
  <Row
    lead={<Dot icon={been ? <Check strokeWidth={2.4} /> : <ChurchIcon />} color={been ? 'leaf' : c.kind === 'x' ? 'soft' : 'tint'} />}
    title={<>{c.name}{been && <span className="sr-only"> — ვიყავი</span>}</>}
    sub={[placeOf(c, local), stateOf(c)].filter(Boolean).join(' · ')}
    wrap
    right={badge ? <><span className="shrink-0 text-meta font-bold whitespace-nowrap text-wine tabular-nums">{badge}</span><Chev /></> : undefined}
    onClick={() => onOpen(c.id)}
  />
);

/** a long list in one card, 60 at a time */
export function ChurchList<T>({ items, empty, render }: { items: T[]; empty: string; render: (item: T) => React.ReactNode }) {
  const { shown, more } = usePaged(items, 60);
  if (!items.length) return empty ? <Note className="py-8 text-center">{empty}</Note> : null;
  return (
    <>
      <Rows>{shown.map(render)}</Rows>
      {more}
    </>
  );
}

/** the kinds as pills (the count on the chosen one), „ვიყავი“ once I have marked one of the list; `extra` = more pills after them */
export const KindPills: React.FC<{
  value: Filter; onChange: (f: Filter) => void; list: Church[]; visits: Visits; extra?: Pill[];
  /** false: no count on the chosen pill (the nearest list shows 40, not the country's number) */
  counted?: boolean;
}> = ({
  value, onChange, list, visits, extra = [], counted = true,
}) => {
  const mine = list.filter(c => c.id in visits).length;
  const count = (f: Filter) => list.filter(c => passes(c, f, visits)).length;
  const items: Pill[] = [
    ...KIND_FILTERS.map(k => ({
      id: k.id,
      label: k.id === value && counted ? `${k.label} · ${big(count(k.id))}` : k.label,
      on: k.id === value,
      onClick: () => onChange(k.id),
    })),
    ...(mine > 0 || value === 'mine' ? [{ id: 'mine', label: value === 'mine' ? `ვიყავი · ${mine}` : 'ვიყავი', on: value === 'mine', onClick: () => onChange(value === 'mine' ? 'all' : 'mine') }] : []),
    ...extra,
  ];
  return <PillRow label="ტაძრის სახე" items={items} />;
};

/** a municipality (or a region) picked in a window: one row each with its count, the chosen one ticked */
export const PickSheet: React.FC<{
  open: boolean; title: string; all: string; total: number; items: [string, string, number][]; value: string;
  onPick: (id: string) => void; onClose: () => void;
}> = ({ open, title, all, total, items, value, onPick, onClose }) => (
  <Sheet open={open} title={title} onClose={onClose}>
    <Rows>
      {[['', all, total] as [string, string, number], ...items].map(([id, label, n]) => (
        <Row
          key={id || '-'}
          title={label}
          wrap
          aria-pressed={value === id}
          right={<span className="flex shrink-0 items-center gap-2"><Small>{big(n)}</Small>{value === id && <Check aria-hidden="true" className="size-[18px] text-wine" strokeWidth={2.4} />}</span>}
          onClick={() => { onPick(id); onClose(); }}
        />
      ))}
    </Rows>
  </Sheet>
);

/** the municipalities of a list, by name, with their counts */
export const useMunis = (all: Church[]) => useMemo(() => {
  const c = new Map<string, number>();
  for (const x of all) c.set(x.muni, (c.get(x.muni) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ka')).map(([m, n]) => [m, m, n] as [string, string, number]);
}, [all]);

/** a page's own search field, folded until its 🔍 */
export const useFolded = () => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const toggle = () => { setOpen(v => !v); setQ(''); };
  return { open, q, setQ, toggle, query: open ? q.trim() : '' };
};

const SLOT = {
  morning: { Icon: Sun, tone: 'bg-gold-tint text-gold-ink', word: 'დილით' },
  night: { Icon: Moon, tone: 'bg-sea-tint text-sea', word: 'ღამით' },
} as const;

/** one service: ☀ / 🌙 in a soft round, what and which days, the hour as a pill (spans: it may stand inside a button) */
export const SlotLine: React.FC<{ s: ServiceSlot }> = ({ s }) => {
  const L = SLOT[s.when];
  return (
    <span className="flex items-center gap-2.5">
      <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4', L.tone)}><L.Icon aria-label={L.word} /></span>
      <span className="min-w-0 flex-1 text-body leading-snug text-ink wrap-break-word"><b className="font-bold">{s.what}</b> <span className="text-mut">· {s.days}</span></span>
      <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-meta font-bold whitespace-nowrap tabular-nums', L.tone)}>{s.time ?? L.word}</span>
    </span>
  );
};
