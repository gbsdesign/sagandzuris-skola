import React, { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Tabs } from '../ui/kit';

// The new look's game frame (pages/v2/tamashebi/GameFrame; per-game boards x-tamashi-<game>: one page — the variants as tabs,
// a card, one start button, „როგორ ვითამაშოთ · N ნაბიჯი“ — then the game alone on the screen) and the games' own parts talk
// through this small store, so the 46 games keep their logic and their old drawing:
// - a game's variant tabs („ონლაინ · ჰიბრიდული“, „დღის ჰანგი · ონლაინ · ჰიბრიდული“, „სცენა · ჰიბრიდული“) hand their choice
//   to the frame (GameTabs) and draw nothing while a frame listens;
// - a game's „როგორ ვითამაშოთ“ steps (HowTo) go up into the frame's row and its window;
// - a full-screen play screen opening (TableScreen) tells the frame to show the game (an invitation, a resumed game);
// - the frame's „ოთახის გახსნა“ asks the room setup to open its window „ახალი ოთახი“;
// - while the frame shows its first page the game is mounted but hidden: its keyboard listeners rest (gameKeysPaused).
// Without a frame (the old look) everything stays where it was.

export interface VariantItem { id: string; label: string }
export interface VariantSlot { items: VariantItem[]; value: string; pick: (id: string) => void }

let frames = 0;
let slot: VariantSlot | null = null;
let howto: { id: string; steps: React.ReactNode[] } | null = null;
let intro: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

/** the frame's side: listen while mounted (before the first paint, so the game's own tabs never flash) */
const useFrameMount = () => {
  useLayoutEffect(() => {
    frames += 1;
    emit();
    return () => { frames -= 1; if (!frames) { slot = null; howto = null; intro = null; } emit(); };
  }, []);
};

/** the frame's side: the open game's variants (or none) */
export const useVariantFrame = (): VariantSlot | null => {
  useFrameMount();
  return useSyncExternalStore(subscribe, () => slot, () => null);
};

/** the frame's side: the open variant's „როგორ ვითამაშოთ“ steps (or none) */
export const useFrameHowTo = (): React.ReactNode[] | null => useSyncExternalStore(subscribe, () => howto?.steps ?? null, () => null);

/** the frame's side: the game's own longer story (its old intro card), for the window „როგორ ვითამაშოთ“ */
export const useFrameIntro = (): string | null => useSyncExternalStore(subscribe, () => intro, () => null);

/** a game's part: true while a frame shows it (it leaves out what the frame already says — the intro card, the steps) */
export const useInGameFrame = (): boolean => useSyncExternalStore(subscribe, () => frames > 0, () => false);

/** the game's side: hand the switch to the frame while one listens; true = the frame has it (draw nothing here) */
export const useVariantSlot = (items: VariantItem[], value: string, onChange: (id: string) => void): boolean => {
  const listening = useInGameFrame();
  const pick = useRef(onChange);
  pick.current = onChange;
  const key = items.map(i => `${i.id}\u0001${i.label}`).join('\u0002');
  useLayoutEffect(() => {
    if (!listening) return;
    const mine: VariantSlot = { items: key.split('\u0002').map(x => { const [id, label] = x.split('\u0001'); return { id, label }; }), value, pick: id => pick.current(id) };
    slot = mine;
    emit();
    return () => { if (slot === mine) { slot = null; emit(); } };
  }, [listening, key, value]);
  return listening;
};

/** a game's „როგორ ვითამაშოთ“ (components/games/HowTo): its steps go to the frame; true = the frame has them */
export const useHowToSlot = (id: string, steps: React.ReactNode[]): boolean => {
  const listening = useInGameFrame();
  const latest = useRef(steps);
  latest.current = steps;
  useLayoutEffect(() => {
    if (!listening) return;
    const mine = { id, steps: latest.current };
    howto = mine;
    emit();
    return () => { if (howto === mine) { howto = null; emit(); } };
  }, [listening, id, steps.length]);
  return listening;
};

/** a game's intro card: under a frame its words go into the frame's window and the card steps aside */
export const GameIntro: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => {
  const listening = useInGameFrame();
  useLayoutEffect(() => {
    if (!listening) return;
    intro = text;
    emit();
    return () => { if (intro === text) { intro = null; emit(); } };
  }, [listening, text]);
  return listening ? null : <>{children}</>;
};

type TabsProps<T extends string> = Parameters<typeof Tabs<T>>[0];

/** the kit's tabs for a game's variants: in the new look's frame they move up into it */
export function GameTabs<T extends string>(props: TabsProps<T>) {
  const taken = useVariantSlot(props.items, props.value, props.onChange as (id: string) => void);
  return taken ? null : <Tabs {...props} />;
}

// ——— a play screen opened (TableScreen): the frame shows the game
const tableSubs = new Set<() => void>();
let openTables = 0;
/** TableScreen's side: tell a listening frame that a play screen opened */
export const useTableOpened = (on: boolean) => {
  useLayoutEffect(() => {
    if (!on) return;
    openTables += 1;
    tableSubs.forEach(f => f());
    return () => { openTables -= 1; };
  }, [on]);
};
/** the frame's side: a play screen opening from now on; true when one is open already */
export const onTableOpened = (f: () => void) => { tableSubs.add(f); return () => { tableSubs.delete(f); }; };
export const tableOpenNow = () => openTables > 0;

// ——— „ოთახის გახსნა“: the room setup opens its window „ახალი ოთახი“
const ROOM_ASK = 'sg-game-new-room';
let roomAnswered = false;
/** true when a room setup opened its window (false: signed out, in no class, a room of one's own — the page says what to do) */
export const askNewRoom = (): boolean => {
  roomAnswered = false;
  window.dispatchEvent(new Event(ROOM_ASK));
  return roomAnswered;
};
/** the room setup's side: `f` opens the window and says whether it did */
export const useNewRoomAsk = (f: () => boolean) => {
  const ref = useRef(f);
  ref.current = f;
  useEffect(() => {
    const on = () => { if (ref.current()) roomAnswered = true; };
    window.addEventListener(ROOM_ASK, on);
    return () => window.removeEventListener(ROOM_ASK, on);
  }, []);
};

// ——— the game hidden under the frame's first page: its keyboard listeners rest
let keysPaused = false;
export const setGameKeysPaused = (on: boolean) => { keysPaused = on; };
/** a game's window keydown listener returns at once while this is true */
export const gameKeysPaused = () => keysPaused;
