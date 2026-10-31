// A class's online game room (2026-10-30, born with „სამშვილდის ღამე“; every room game since 2026-10-31), under its class
// so the class's rules guard it (firestore.rules):
//   classes/{classId}/games/{roomId}   {game, host, hostName, status, createdAt, at, uids, view} — the whole class reads it,
//                                      only its host writes it; `view` = the game's public view as JSON (never a secret)
//   …/joins/{uid}    {uid, name, photoURL, at}   the lobby: each player writes their own
//   …/seats/{uid}    {s}   a player's own seat (JSON), for a game with secrets (a role) — read by that player and the host
//   …/acts/{uid}     {key, pick, end, at, ms?}   a player's latest answer — read by that player and the host
//   …/host/state     {s}   the host's whole game (JSON), so a reload goes on where it stopped — the host only
//   …/peers/{uid}    the game's own call (utils/callSession.ts, base classes/{classId}/games/{roomId})
// One room at a time per phone and game engine: a module store (like the calls), so the game goes on while the host looks
// at another page. The host's phone is the game's engine: it applies every answer once (by its `at`) and writes the seats
// and the view that changed in one batch. A game is a `RoomEngine` (utils/samshvildeRoom.ts, utils/roundGames.ts). Written
// against `Backend`, so tests/gameRoom.test.ts plays whole games in memory; the app's Firestore backend is
// utils/gameRoomFirestore.ts.

/** the games played in a room; firestore.rules lets a room be opened only for these */
export const ROOM_GAMES = ['samshvilde', 'kutkhe', 'otkhi', 'khmebi', 'notebi', 'turniri'] as const;
export type RoomGame = typeof ROOM_GAMES[number];
export const isRoomGame = (v: unknown): v is RoomGame => typeof v === 'string' && (ROOM_GAMES as readonly string[]).includes(v);

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

/** a player's answer to the step named by `key`: a seat or an option (`pick`), „my word is over“ (`end`), and how long
 *  they took on their own phone (`ms`, the quick games) */
export interface Act { key: string; pick: number | null; end?: boolean; ms?: number }
export interface MyAct extends Act { at: number }

/** a game as the room plays it: the host's whole state `S`, the public view `V` everybody reads, a player's seat */
export interface RoomEngine<S, V, Seat, O> {
  /** the games this engine plays (a room of another game is not its store's) */
  games: readonly RoomGame[];
  /** the lobby's players (in the order they came) start a game — null: they don't fit */
  start(players: { uid: string; name: string }[], opts: O, rnd: () => number): S | null;
  /** seat → uid */
  uids(s: S): string[];
  /** the step on now: an answer moving it on lets the host go back to it */
  key(s: S): string;
  apply(s: S, seat: number, a: Act): S;
  view(s: S): V;
  /** a player's own part of the game (a game without secrets has none: no seat is written) */
  seat?: (s: S, seat: number) => Seat;
  over(s: S): boolean;
  /** may the host go back to this state (never into the deal) */
  backable(s: S): boolean;
  /** the same players once more */
  again?: (s: S, rnd: () => number) => S | null;
  /** the documents' JSON as written (host/state `s`, the room's `view`, a seat's `s`) back into the game's shapes */
  parseState(raw: unknown): S | null;
  parseView(raw: unknown): V | null;
  parseSeat?: (raw: unknown) => Seat | null;
}

export type RoomStatus = 'lobby' | 'live' | 'over';
export interface RoomDoc<V = unknown> { game: RoomGame; host: string; hostName: string; status: RoomStatus; createdAt: number; at: number; uids: string[]; view: V | null }
export interface Joined { uid: string; name: string; photoURL: string; at: number }
export interface Me { uid: string; name: string; photoURL: string }

export interface RoomSnap<S = unknown, V = unknown, Seat = unknown> {
  classId: string;
  roomId: string;
  me: Me;
  /** undefined while it loads; null — there is no such room (it was closed) */
  room: RoomDoc<V> | null | undefined;
  joins: Joined[];
  seat: Seat | null;
  mine: MyAct | null;
  /** the host's whole game */
  state: S | null;
  canBack: boolean;
  error: string;
}

export const roomPath = (classId: string, roomId: string) => `classes/${classId}/games/${roomId}`;
/** how long an untouched room is still shown (an invitation, „the game goes on“) */
export const ROOM_FRESH_MS = 3 * 3600_000;

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** a room's document; its view is read by the game's own parser (without one — for a list of rooms — it stays unread) */
export const parseRoom = <V = unknown>(d: Data | null, parseView?: (raw: unknown) => V | null): RoomDoc<V> | null => {
  if (!d || !isRoomGame(d.game) || typeof d.host !== 'string') return null;
  return {
    game: d.game,
    host: d.host,
    hostName: str(d.hostName, 120),
    status: d.status === 'live' || d.status === 'over' ? d.status : 'lobby',
    createdAt: num(d.createdAt),
    at: num(d.at),
    uids: Array.isArray(d.uids) ? d.uids.filter((u): u is string => typeof u === 'string') : [],
    view: parseView ? parseView(d.view) : null,
  };
};
const parseJoin = (d: Data): Joined | null =>
  (typeof d.uid === 'string' && d.uid ? { uid: d.uid, name: str(d.name, 120) || 'მოთამაშე', photoURL: str(d.photoURL, 2000), at: num(d.at) } : null);
export const parseMine = (d: Data | null): MyAct | null =>
  (d && typeof d.key === 'string' && (d.pick === null || Number.isInteger(d.pick)) && num(d.at) > 0
    ? { key: d.key, pick: d.pick as number | null, end: d.end === true, at: num(d.at), ...(Number.isInteger(d.ms) ? { ms: d.ms as number } : {}) } : null);

export const newRoomId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** a new room waiting for players, its host the one who opens it */
export const createRoom = async (be: Backend, classId: string, me: Me, game: RoomGame = 'samshvilde'): Promise<string> => {
  const id = newRoomId();
  await be.write([{
    path: roomPath(classId, id),
    data: { game, host: me.uid, hostName: me.name.slice(0, 120), status: 'lobby', createdAt: be.stamp(), at: be.stamp(), uids: [], view: '' },
  }]);
  return id;
};

/** the store of one engine's room on this phone; `moves` names the game's own host steps over the generic `step` */
export const createRooms = <S, V, Seat, O, X extends object = Record<string, never>>(
  be: Backend,
  engine: RoomEngine<S, V, Seat, O>,
  moves?: (step: (f: (s: S) => S, push: boolean) => void) => X,
) => {
  type Snap = RoomSnap<S, V, Seat>;
  let snap: Snap | null = null;
  let visible = false;
  let gen = 0;
  const subs = new Set<() => void>();
  let offs: (() => void)[] = [];
  let hosting = false;
  let consumed = new Map<string, number>();
  let hist: S[] = [];
  let wrote = { view: '', status: '', seats: new Map<string, string>() };
  let chain: Promise<void> = Promise.resolve();
  let lastAt = 0;

  const emit = () => subs.forEach(f => f());
  const patch = (p: Partial<Snap>) => { if (snap) { snap = { ...snap, ...p }; emit(); } };
  const path = (...rest: string[]) => [roomPath(snap!.classId, snap!.roomId), ...rest].join('/');
  const fail = (e: unknown) => {
    console.warn('room: ', (e as { code?: string })?.code || e);
    patch({ error: 'კავშირი შეფერხდა — შეამოწმე ინტერნეტი.' });
  };
  // the host's writes go out one batch after another, in order
  const send = (ops: Op[]) => { chain = chain.then(() => be.write(ops)).then(() => { if (snap?.error) patch({ error: '' }); }, fail); return chain; };
  const canBack = () => hist.length > 0 && engine.backable(hist[hist.length - 1]);

  /** the host's game moved: the seats and the view that changed, and the whole game, in one batch */
  const commit = (s: S, push?: S, room: Data = {}) => {
    if (!snap) return;
    if (push) hist = [...hist.slice(-80), push];
    patch({ state: s, canBack: canBack() });
    const ops: Op[] = [];
    if (engine.seat) {
      engine.uids(s).forEach((uid, i) => {
        const seat = JSON.stringify(engine.seat!(s, i));
        if (wrote.seats.get(uid) !== seat) { wrote.seats.set(uid, seat); ops.push({ path: path('seats', uid), data: { s: seat } }); }
      });
    }
    const view = JSON.stringify(engine.view(s));
    const status = engine.over(s) ? 'over' : 'live';
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
    let s: S = st;
    let before: S | undefined;
    const uids = engine.uids(s);
    for (const { id, d } of [...docs].sort((a, b) => num(a.d.at) - num(b.d.at))) {
      const a = parseMine(d);
      if (!a || (consumed.get(id) ?? 0) >= a.at) continue;
      consumed.set(id, a.at);
      const i = uids.indexOf(id);
      if (i < 0) continue;
      const next = engine.apply(s, i, a);
      if (engine.key(next) !== engine.key(s) && !before) before = s;
      s = next;
    }
    if (s !== st) commit(s, before);
  };

  const startHosting = async (g: number) => {
    hosting = true;
    const saved = await be.get(path('host', 'state')).catch(() => null);
    if (g !== gen || !snap) return;
    const st = engine.parseState(saved?.s);
    if (st && !snap.state) patch({ state: st, canBack: false });
    offs.push(be.col(path('acts'), onActs, fail));
  };

  const onRoom = (g: number) => (d: Data | null) => {
    if (g !== gen || !snap) return;
    const room = parseRoom(d, engine.parseView);
    // a room of another game is not this store's
    const mine = room && engine.games.includes(room.game) ? room : null;
    patch({ room: mine });
    if (mine && mine.host === snap.me.uid && !hosting) void startHosting(g);
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
      be.doc(path('acts', me.uid), d => { if (g === gen) patch({ mine: parseMine(d) }); }, fail),
    ];
    if (engine.parseSeat) offs.push(be.doc(path('seats', me.uid), d => { if (g === gen) patch({ seat: engine.parseSeat!(d?.s) }); }, fail));
  };

  /** the host moves the game (`push`: the step before can be gone back to) */
  const step = (f: (s: S) => S, push: boolean) => {
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
    /** my answer to the step `key` (shown at once, sent in order); `ms` — how long I took, on my own phone */
    act: (key: string, pick: number | null, end = false, ms?: number) => {
      if (!snap) return;
      const at = Math.max(Date.now(), lastAt + 1);
      lastAt = at;
      const timed = ms === undefined ? {} : { ms: Math.min(600_000, Math.max(0, Math.round(ms))) };
      patch({ mine: { key, pick, end, at, ...timed } });
      void send([{ path: path('acts', snap.me.uid), data: { key, pick, end, at, ...timed } }]);
    },

    // ——— the host

    host: {
      /** the lobby's players start the game */
      start: (opts: O, rnd: () => number = Math.random): boolean => {
        if (!snap || snap.room?.host !== snap.me.uid) return false;
        const s = engine.start(snap.joins.map(j => ({ uid: j.uid, name: j.name })), opts, rnd);
        if (!s) return false;
        hist = [];
        consumed = new Map();
        wrote = { view: '', status: '', seats: new Map() };
        commit(s, undefined, { uids: engine.uids(s) });
        return true;
      },
      step,
      back: () => {
        const prev = hist[hist.length - 1];
        if (!prev || !engine.backable(prev) || snap?.room?.host !== snap?.me.uid) return;
        hist = hist.slice(0, -1);
        commit(prev);
      },
      /** the same players once more (a game with `again`), or a new start the caller made */
      again: (next?: S) => {
        const s = snap?.state;
        const fresh = next ?? (s && engine.again ? engine.again(s, Math.random) : null);
        if (!fresh || snap?.room?.host !== snap?.me.uid) return;
        hist = [];
        commit(fresh, undefined, { uids: engine.uids(fresh) });
      },
      /** a player out of the lobby */
      kick: (uid: string) => { if (snap) void send([{ path: path('joins', uid), data: null }]); },
      /** the room and everything in it is deleted */
      close: async () => {
        if (!snap) return;
        const uids = new Set([...snap.joins.map(j => j.uid), ...(snap.state ? engine.uids(snap.state) : []), ...(snap.room?.uids ?? [])]);
        const ops: Op[] = [];
        uids.forEach(u => {
          ops.push({ path: path('joins', u), data: null }, { path: path('acts', u), data: null });
          if (engine.seat) ops.push({ path: path('seats', u), data: null });
        });
        ops.push({ path: path('host', 'state'), data: null }, { path: path(), data: null });
        await chain;
        await be.write(ops).catch(fail);
        close();
      },
      ...(moves ? moves(step) : ({} as X)),
    },
  };
};
