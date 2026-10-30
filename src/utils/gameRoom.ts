import {
  againOnline, applyAct, hostAccuse, hostActs, hostNext, newOnline, parseSeat, parseState, parseView, publicView, seatView, startClock,
  type Act, type OnlineState, type PubView, type SeatView,
} from './samshvildeOnline';
import type { NightActs } from './samshvilde';
import { shuffle } from './otkheuli';

// The online room of „სამშვილდის ღამე“ (2026-10-30), under its class so the class's rules guard it (firestore.rules):
//   classes/{classId}/games/{roomId}   {game, host, hostName, status, createdAt, at, uids, view} — the whole class reads it,
//                                      only its host writes it; `view` = the public view as JSON (never a role before the end)
//   …/joins/{uid}    {uid, name, photoURL, at}   the lobby: each player writes their own
//   …/seats/{uid}    {s}   a player's own seat (JSON): role, mates, the night's question — read by that player and the host
//   …/acts/{uid}     {key, pick, end, at}   a player's latest answer — read by that player and the host
//   …/host/state     {s}   the host's whole game (JSON), so a reload goes on where it stopped — the host only
//   …/peers/{uid}    the game's own call (utils/callSession.ts, base classes/{classId}/games/{roomId})
// One room at a time per phone: a module store (like the calls), so the game goes on while the host looks at another
// page. The host's phone is the game's engine: it applies every answer once (by its `at`) and writes the seats and the
// view that changed in one batch. Written against `Backend`, so tests/gameRoom.test.ts plays whole games in memory;
// the app's Firestore backend is utils/gameRoomFirestore.ts.

export type Data = Record<string, unknown>;
export interface Op { path: string; data: Data | null; merge?: boolean }
export interface Backend {
  /** one document, live (null: none); times come as milliseconds */
  doc(path: string, on: (d: Data | null) => void, err: (e: unknown) => void): () => void;
  /** the documents right under a collection, live */
  col(path: string, on: (docs: { id: string; d: Data }[]) => void, err: (e: unknown) => void): () => void;
  get(path: string): Promise<Data | null>;
  /** all at once (null deletes) */
  write(ops: Op[]): Promise<void>;
  /** the server's time, to put in a document */
  stamp(): unknown;
}

export type RoomStatus = 'lobby' | 'live' | 'over';
export interface RoomDoc { host: string; hostName: string; status: RoomStatus; createdAt: number; at: number; uids: string[]; view: PubView | null }
export interface Joined { uid: string; name: string; photoURL: string; at: number }
export interface Me { uid: string; name: string; photoURL: string }
export interface MyAct extends Act { at: number }

export interface RoomSnap {
  classId: string;
  roomId: string;
  me: Me;
  /** undefined while it loads; null — there is no such room (it was closed) */
  room: RoomDoc | null | undefined;
  joins: Joined[];
  seat: SeatView | null;
  mine: MyAct | null;
  /** the host's whole game */
  state: OnlineState | null;
  canBack: boolean;
  error: string;
}

export const roomPath = (classId: string, roomId: string) => `classes/${classId}/games/${roomId}`;
/** how long an untouched room is still shown (an invitation, „the game goes on“) */
export const ROOM_FRESH_MS = 3 * 3600_000;

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export const parseRoom = (d: Data | null): RoomDoc | null => {
  if (!d || d.game !== 'samshvilde' || typeof d.host !== 'string') return null;
  return {
    host: d.host,
    hostName: str(d.hostName, 120),
    status: d.status === 'live' || d.status === 'over' ? d.status : 'lobby',
    createdAt: num(d.createdAt),
    at: num(d.at),
    uids: Array.isArray(d.uids) ? d.uids.filter((u): u is string => typeof u === 'string') : [],
    view: parseView(d.view),
  };
};
const parseJoin = (d: Data): Joined | null =>
  (typeof d.uid === 'string' && d.uid ? { uid: d.uid, name: str(d.name, 120) || 'მოთამაშე', photoURL: str(d.photoURL, 2000), at: num(d.at) } : null);
export const parseMine = (d: Data | null): MyAct | null =>
  (d && typeof d.key === 'string' && (d.pick === null || Number.isInteger(d.pick)) && num(d.at) > 0
    ? { key: d.key, pick: d.pick as number | null, end: d.end === true, at: num(d.at) } : null);

export const newRoomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** a new room waiting for players, its host the one who opens it */
export const createRoom = async (be: Backend, classId: string, me: Me): Promise<string> => {
  const id = newRoomId();
  await be.write([{
    path: roomPath(classId, id),
    data: { game: 'samshvilde', host: me.uid, hostName: me.name.slice(0, 120), status: 'lobby', createdAt: be.stamp(), at: be.stamp(), uids: [], view: '' },
  }]);
  return id;
};

export const createRooms = (be: Backend) => {
  let snap: RoomSnap | null = null;
  let visible = false;
  let gen = 0;
  const subs = new Set<() => void>();
  let offs: (() => void)[] = [];
  let hosting = false;
  let consumed = new Map<string, number>();
  let hist: OnlineState[] = [];
  let wrote = { view: '', status: '', seats: new Map<string, string>() };
  let chain: Promise<void> = Promise.resolve();
  let lastAt = 0;

  const emit = () => subs.forEach(f => f());
  const patch = (p: Partial<RoomSnap>) => { if (snap) { snap = { ...snap, ...p }; emit(); } };
  const path = (...rest: string[]) => [roomPath(snap!.classId, snap!.roomId), ...rest].join('/');
  const fail = (e: unknown) => {
    console.warn('room: ', (e as { code?: string })?.code || e);
    patch({ error: 'კავშირი შეფერხდა — შეამოწმე ინტერნეტი.' });
  };
  // the host's writes go out one batch after another, in order
  const send = (ops: Op[]) => { chain = chain.then(() => be.write(ops)).then(() => { if (snap?.error) patch({ error: '' }); }, fail); return chain; };

  const canBack = () => hist.length > 0 && hist[hist.length - 1].g.phase.kind !== 'deal';

  /** the host's game moved: the seats and the view that changed, and the whole game, in one batch */
  const commit = (s: OnlineState, push?: OnlineState, room: Data = {}) => {
    if (!snap) return;
    if (push) hist = [...hist.slice(-80), push];
    patch({ state: s, canBack: canBack() });
    const ops: Op[] = [];
    s.uids.forEach((uid, i) => {
      const json = JSON.stringify(seatView(s, i));
      if (wrote.seats.get(uid) !== json) { wrote.seats.set(uid, json); ops.push({ path: path('seats', uid), data: { s: json } }); }
    });
    const view = JSON.stringify(publicView(s));
    const status = s.g.phase.kind === 'end' ? 'over' : 'live';
    if (view !== wrote.view || status !== wrote.status || Object.keys(room).length) {
      wrote.view = view;
      wrote.status = status;
      ops.push({ path: path(), data: { ...room, view, status, at: be.stamp() }, merge: true });
    }
    ops.push({ path: path('host', 'state'), data: { s: JSON.stringify(s) } });
    void send(ops);
  };

  /** the players' answers: each applied once; a step a player's answer moved on (a word ended) can be gone back to */
  const onActs = (docs: { id: string; d: Data }[]) => {
    const st = snap?.state;
    if (!st) return;
    let s = st;
    let before: OnlineState | undefined;
    for (const { id, d } of [...docs].sort((a, b) => num(a.d.at) - num(b.d.at))) {
      const a = parseMine(d);
      if (!a || (consumed.get(id) ?? 0) >= a.at) continue;
      consumed.set(id, a.at);
      const i = s.uids.indexOf(id);
      if (i < 0) continue;
      const next = applyAct(s, i, a);
      if (next.key !== s.key && !before) before = s;
      s = next;
    }
    if (s !== st) commit(s, before);
  };

  const startHosting = async (g: number) => {
    hosting = true;
    const saved = await be.get(path('host', 'state')).catch(() => null);
    if (g !== gen || !snap) return;
    const st = parseState(saved?.s);
    if (st && !snap.state) patch({ state: st, canBack: false });
    offs.push(be.col(path('acts'), onActs, fail));
  };

  const onRoom = (g: number) => (d: Data | null) => {
    if (g !== gen || !snap) return;
    const room = parseRoom(d);
    patch({ room });
    if (room && room.host === snap.me.uid && !hosting) void startHosting(g);
  };

  const close = () => {
    offs.forEach(f => f());
    offs = [];
    gen++;
    snap = null;
    hosting = false;
    consumed = new Map();
    hist = [];
    wrote = { view: '', status: '', seats: new Map() };
    emit();
  };

  const open = (classId: string, roomId: string, me: Me) => {
    if (snap && snap.classId === classId && snap.roomId === roomId && snap.me.uid === me.uid) return;
    close();
    const g = gen;
    snap = { classId, roomId, me, room: undefined, joins: [], seat: null, mine: null, state: null, canBack: false, error: '' };
    emit();
    offs = [
      be.doc(path(), onRoom(g), fail),
      be.col(path('joins'), docs => { if (g === gen) patch({ joins: docs.flatMap(x => parseJoin(x.d) ?? []).sort((a, b) => a.at - b.at || a.name.localeCompare(b.name, 'ka')) }); }, fail),
      be.doc(path('seats', me.uid), d => { if (g === gen) patch({ seat: parseSeat(d?.s) }); }, fail),
      be.doc(path('acts', me.uid), d => { if (g === gen) patch({ mine: parseMine(d) }); }, fail),
    ];
  };

  const hostDo = (f: (s: OnlineState) => OnlineState, push: boolean) => {
    const s = snap?.state;
    if (!s || snap?.room?.host !== snap?.me.uid) return;
    const next = f(s);
    if (next !== s) commit(next, push ? s : undefined);
  };

  return {
    subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
    get: () => snap,
    /** the game's screen is on (the invitation strip hides meanwhile) */
    setVisible: (v: boolean) => { if (visible !== v) { visible = v; emit(); } },
    isVisible: () => visible,
    open,
    close,

    // ——— a player

    /** into the lobby (refused by the rules once the game has begun); `who` — me as my class's list names me */
    join: async (who?: Me): Promise<boolean> => {
      if (!snap) return false;
      if (who && who.uid === snap.me.uid && (who.name !== snap.me.name || who.photoURL !== snap.me.photoURL)) patch({ me: who });
      const { me } = snap;
      try {
        await be.write([{ path: path('joins', me.uid), data: { uid: me.uid, name: me.name.slice(0, 120), photoURL: me.photoURL.slice(0, 2000), at: be.stamp() } }]);
        return true;
      } catch (e) {
        console.warn('room join: ', (e as { code?: string })?.code || e);
        return false;
      }
    },
    leave: async () => {
      if (!snap) return;
      await be.write([{ path: path('joins', snap.me.uid), data: null }]).catch(fail);
    },
    /** my answer to the step `key` (shown at once, sent in order) */
    act: (key: string, pick: number | null, end = false) => {
      if (!snap) return;
      const at = Math.max(Date.now(), lastAt + 1);
      lastAt = at;
      patch({ mine: { key, pick, end, at } });
      void send([{ path: path('acts', snap.me.uid), data: { key, pick, end, at } }]);
    },

    // ——— the host

    host: {
      /** the lobby's players, seated in a random circle, get their roles */
      start: (opts: { piper: boolean; kids: boolean }, rnd: () => number = Math.random): boolean => {
        if (!snap || snap.room?.host !== snap.me.uid) return false;
        const s = newOnline(shuffle(snap.joins, rnd).map(j => ({ uid: j.uid, name: j.name })), opts, rnd);
        if (!s) return false;
        hist = [];
        consumed = new Map();
        wrote = { view: '', status: '', seats: new Map() };
        commit(s, undefined, { uids: s.uids });
        return true;
      },
      next: () => hostDo(hostNext, true),
      acts: (acts: NightActs) => hostDo(s => hostActs(s, acts), false),
      accuse: (accused: number | null) => hostDo(s => hostAccuse(s, accused), false),
      clock: () => hostDo(startClock, false),
      back: () => {
        const prev = hist[hist.length - 1];
        if (!prev || prev.g.phase.kind === 'deal' || snap?.room?.host !== snap?.me.uid) return;
        hist = hist.slice(0, -1);
        commit(prev);
      },
      /** the same players, the roles dealt anew */
      again: () => {
        const s = snap?.state;
        const next = s && againOnline(s);
        if (!next) return;
        hist = [];
        commit(next, undefined, { uids: next.uids });
      },
      /** a player out of the lobby */
      kick: (uid: string) => { if (snap) void send([{ path: path('joins', uid), data: null }]); },
      /** the room and everything in it is deleted */
      close: async () => {
        if (!snap) return;
        const uids = new Set([...snap.joins.map(j => j.uid), ...(snap.state?.uids ?? []), ...(snap.room?.uids ?? [])]);
        const ops: Op[] = [];
        uids.forEach(u => ops.push({ path: path('joins', u), data: null }, { path: path('seats', u), data: null }, { path: path('acts', u), data: null }));
        ops.push({ path: path('host', 'state'), data: null }, { path: path(), data: null });
        await chain;
        await be.write(ops).catch(fail);
        close();
      },
    },
  };
};

export type Rooms = ReturnType<typeof createRooms>;
