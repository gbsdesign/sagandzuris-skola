import { useSyncExternalStore } from 'react';
import { useNavigation } from '../../../context';

// The habits in the new look (redesign stage 4b) live on page `gz`: each screen is a history step of its own through the
// navigation's `mapItem`, so the phone's back walks them in order and a reload (/p/gz/<item>) opens the same screen.
//   chvevebi            the day (x-chvevebi)
//   chvevebi~week|month|year   the other views (x-chvevebi-kvira, -tve, -tseli)
//   chvevebi~h/<id>     a habit's own page (x-chveva)
//   chvevebi~s/<id>     a habit's settings — its ✎ (x-chveva-linki)
//   chvevebi~edit       the daily habits' list to change (x-chvevebi-shetsvla); ~edit~rare = the weekly / monthly ones
//   chvevebi~vazi       „ჩემი ვაზი“ (x-vazi)

export type HabitsView = 'day' | 'week' | 'month' | 'year';

export type HabitsScreen =
  | { kind: 'view'; view: HabitsView }
  | { kind: 'habit'; id: string }
  | { kind: 'settings'; id: string }
  | { kind: 'edit'; rare: boolean }
  | { kind: 'vazi' };

export const HABITS_ITEM = 'chvevebi';
export const viewItem = (v: HabitsView) => (v === 'day' ? HABITS_ITEM : `${HABITS_ITEM}~${v}`);
export const habitItem = (id: string) => `${HABITS_ITEM}~h/${id}`;
export const settingsItem = (id: string) => `${HABITS_ITEM}~s/${id}`;
export const editItem = (rare = false) => `${HABITS_ITEM}~edit${rare ? '~rare' : ''}`;
export const VAZI_ITEM = `${HABITS_ITEM}~vazi`;

/** which habits screen a `gz` mapItem names — null when it is not one of the habits' */
export const screenOf = (item: string | null | undefined): HabitsScreen | null => {
  if (!item || (item !== HABITS_ITEM && !item.startsWith(`${HABITS_ITEM}~`))) return null;
  const rest = item.slice(HABITS_ITEM.length + 1);
  if (!rest) return { kind: 'view', view: 'day' };
  if (rest === 'week' || rest === 'month' || rest === 'year') return { kind: 'view', view: rest };
  if (rest.startsWith('h/') && rest.length > 2) return { kind: 'habit', id: rest.slice(2) };
  if (rest.startsWith('s/') && rest.length > 2) return { kind: 'settings', id: rest.slice(2) };
  if (rest === 'edit') return { kind: 'edit', rare: false };
  if (rest === 'edit~rare') return { kind: 'edit', rare: true };
  if (rest === 'vazi') return { kind: 'vazi' };
  return { kind: 'view', view: 'day' };
};

/** Moving between the habits' screens. `go` = a new step; `swap` = the same step shows another face (the views' switch);
 *  `back` = the phone's back. */
export const useHabitsNav = () => {
  const { openMapItem, handleGoBack } = useNavigation();
  return {
    go: (item: string) => openMapItem(item),
    swap: (item: string) => openMapItem(item, true),
    back: handleGoBack,
  };
};

// The day the views share: „დღე“ shows it, the month's „მონიშვნა“ and the week's columns pick it. Kept for the visit
// only (a reload starts on today), outside React so every screen sees the same one.
let picked: Date = new Date();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const read = () => picked;

export const setHabitsDate = (d: Date) => {
  picked = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  listeners.forEach(fn => fn());
};

/** the day the habits' screens show and tick */
export const useHabitsDate = (): [Date, (d: Date) => void] => [useSyncExternalStore(subscribe, read, read), setHabitsDate];
