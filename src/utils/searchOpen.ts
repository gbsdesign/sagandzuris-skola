import type { RoomGame } from './gameRoom';
import { useEffect, useLayoutEffect, useRef } from 'react';

// The one search (components/search): opening it from anywhere, and handing a page the item to show.

export const SEARCH_EVENT = 'sg-search-open';

/** Opens the search over the current page, with `query` already typed when given (a game's „ნახე აპში“). */
export const openSearch = (query?: string) => window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: query ?? '' }));

// The new look's search is a page (pages/shell/SearchPage): the words typed before it opened wait here for it, and what
// was typed stays here while a picked result is open, so „უკან“ brings the same results back.
let pendingQuery = '';
export const setPendingQuery = (q: string) => { pendingQuery = q; };
/** the words the search page starts with (kept until it changes them) */
export const pendingSearchQuery = () => pendingQuery;

// "Open this song / ancestor / tab / person (the admin panel)": the page takes the request when it mounts, or at once if it is
// already on screen. One request at a time; a page that never opens simply leaves it unused.
/** a page that takes a picked item; a game played in a class's room takes a room (`classId/roomId`) or a variant, as do
 *  „ჩემი გუნდი“, „დღის სიტყვა“ and „ოთხეული“ (a variant: its tab) */
export type OpenTarget = 'bell' | 'simghera' | 'tsinaprebi' | 'biblioteka' | 'admin' | 'churches' | 'gundi' | 'sitqva' | 'otkheuli' | 'bade' | 'tsartsera' | 'khazi' | 'chaitsvi' | 'anbani' | 'tsikhe' | 'tsinapari' | 'tabu' | 'minishneba' | 'vin' | 'saidumlo' | 'utskho' | 'dzebna' | 'ezo' | RoomGame;
const REQUEST_EVENT = 'sg-open-request';
let pending: { target: OpenTarget; id: string } | null = null;

export const requestOpen = (target: OpenTarget, id: string) => {
  pending = { target, id };
  last = { target, id };
  window.dispatchEvent(new Event(REQUEST_EVENT));
};

// the new look's game frame (pages/v2/tamashebi/GameFrame) looks at a request without taking it: a room or a station shows
// the game at once, a variant only picks its tab
let last: { target: OpenTarget; id: string } | null = null;
/** the request waiting for `target` (not taken) */
export const peekOpen = (target: OpenTarget): string | null => (pending?.target === target ? pending.id : null);
/** the newest request, also once taken (read inside REQUEST_EVENT's turn) */
export const lastOpenRequest = () => last;
export const OPEN_REQUEST_EVENT = REQUEST_EVENT;

const take = (target: OpenTarget): string | null => {
  if (pending?.target !== target) return null;
  const { id } = pending;
  pending = null;
  return id;
};

/** A page that can show one item: `onOpen` runs with the requested id (before the first paint on mounting). */
export const useOpenRequest = (target: OpenTarget, onOpen: (id: string) => void) => {
  const ref = useRef(onOpen);
  ref.current = onOpen;
  useLayoutEffect(() => {
    const id = take(target);
    if (id) ref.current(id);
  }, [target]);
  useEffect(() => {
    const on = () => {
      const id = take(target);
      if (id) ref.current(id);
    };
    window.addEventListener(REQUEST_EVENT, on);
    return () => window.removeEventListener(REQUEST_EVENT, on);
  }, [target]);
};
