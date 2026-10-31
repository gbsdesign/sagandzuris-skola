import { createRooms, type Backend, type RoomEngine, type RoomSnap } from './gameRoom';
import {
  againOnline, applyAct, hostAccuse, hostActs, hostNext, newOnline, parseSeat, parseState, parseView, publicView, seatView, startClock,
  type OnlineState, type PubView, type SeatView,
} from './samshvildeOnline';
import type { NightActs } from './samshvilde';
import { shuffle } from './otkheuli';

// „სამშვილდის ღამე“ in a class's room (utils/gameRoom.ts): the lobby's players are seated in a random circle and get their
// roles; each one's seat holds their role; the host may step back, never into the deal.

export interface SamOpts { piper: boolean; kids: boolean }

export const SAMSHVILDE_ROOM: RoomEngine<OnlineState, PubView, SeatView, SamOpts> = {
  games: ['samshvilde'],
  start: (players, opts, rnd) => newOnline(shuffle(players, rnd), opts, rnd),
  uids: s => s.uids,
  key: s => s.key,
  apply: applyAct,
  view: publicView,
  seat: seatView,
  over: s => s.g.phase.kind === 'end',
  backable: s => s.g.phase.kind !== 'deal',
  again: (s, rnd) => againOnline(s, rnd),
  parseState,
  parseView,
  parseSeat,
};

/** the room's store with the host's own steps of this game */
export const samshvildeRooms = (be: Backend) => createRooms(be, SAMSHVILDE_ROOM, step => ({
  next: () => step(hostNext, true),
  acts: (acts: NightActs) => step(s => hostActs(s, acts), false),
  accuse: (accused: number | null) => step(s => hostAccuse(s, accused), false),
  clock: () => step(startClock, false),
}));

export type SamRooms = ReturnType<typeof samshvildeRooms>;
export type SamSnap = RoomSnap<OnlineState, PubView, SeatView>;
