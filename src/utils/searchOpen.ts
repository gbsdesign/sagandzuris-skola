import type { RoomGame } from './gameRoom';
import { useEffect, useLayoutEffect, useRef } from 'react';

// The one search (components/search): opening it from anywhere, and handing a page the item to show.

export const SEARCH_EVENT = 'sg-search-open';

/** Opens the search over the current page, with `query` already typed when given (a game's „ნახე აპში“). */
export const openSearch = (query?: string) => window.dispatchEvent(new CustomEvent(SEARCH_EVENT, { detail: query ?? '' }));

// "Open this song / ancestor / tab / person (the admin panel)": the page takes the request when it mounts, or at once if it is
// already on screen. One request at a time; a page that never opens simply leaves it unused.
/** a page that takes a picked item; a game played in a class's room takes a room (`classId/roomId`) or a variant */
export type OpenTarget = 'simghera' | 'tsinaprebi' | 'biblioteka' | 'admin' | RoomGame;
const REQUEST_EVENT = 'sg-open-request';
let pending: { target: OpenTarget; id: string } | null = null;

export const requestOpen = (target: OpenTarget, id: string) => {
  pending = { target, id };
  window.dispatchEvent(new Event(REQUEST_EVENT));
};

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
