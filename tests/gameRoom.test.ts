import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, roomPath, type Backend, type Data } from '../src/utils/gameRoom';
import { samshvildeRooms as createRooms, type SamRooms as Rooms } from '../src/utils/samshvildeRoom';
import { NO } from '../src/utils/samshvildeOnline';
import { mulberry32 } from '../src/utils/otkheuli';

// The room's code with a backend in memory: a host and seven players, each with their own copy of the store, play a
// whole online „სამშვილდის ღამე“ the way their screens do — the rules of the database itself are tested in CI
// (tests/firestore-rules.test.mjs).

const memory = () => {
  const docs = new Map<string, Data>();
  const docSubs = new Map<string, Set<(d: Data | null) => void>>();
  const colSubs = new Map<string, Set<(docs: { id: string; d: Data }[]) => void>>();
  const parent = (p: string) => p.split('/').slice(0, -1).join('/');
  const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
  const list = (c: string) => [...docs].filter(([k]) => parent(k) === c).map(([k, d]) => ({ id: k.split('/').pop()!, d: copy(d) }));
  const add = <T,>(m: Map<string, Set<T>>, k: string, f: T) => { if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(f); return () => { m.get(k)!.delete(f); }; };
  const be: Backend & { docs: Map<string, Data> } = {
    docs,
    doc: (path, on) => { const off = add(docSubs, path, on); queueMicrotask(() => on(docs.has(path) ? copy(docs.get(path)!) : null)); return off; },
    col: (path, on) => { const off = add(colSubs, path, on); queueMicrotask(() => on(list(path))); return off; },
    get: async path => (docs.has(path) ? copy(docs.get(path)!) : null),
    write: async ops => {
      for (const o of ops) {
        if (o.data === null) docs.delete(o.path);
        else docs.set(o.path, copy(o.merge ? { ...(docs.get(o.path) ?? {}), ...o.data } : o.data));
      }
      const paths = new Set(ops.map(o => o.path));
      queueMicrotask(() => paths.forEach(p => {
        docSubs.get(p)?.forEach(f => f(docs.has(p) ? copy(docs.get(p)!) : null));
        colSubs.get(parent(p))?.forEach(f => f(list(parent(p))));
      }));
    },
    stamp: () => Date.now(),
  };
  return be;
};

const flush = async () => { for (let k = 0; k < 12; k++) await new Promise(r => setTimeout(r, 0)); };

/** what a player's screen sends for the step on it (once a step) */
const playerTurn = (c: Rooms, rnd: () => number) => {
  const s = c.get();
  const view = s?.room?.view;
  const seat = s?.seat;
  if (!s || !view || !seat) return;
  const key = view.key;
  if (s.mine?.key === key && view.phase.kind !== 'night') return;
  const me = seat.i;
  const ph = view.phase;
  if (ph.kind === 'deal') c.act(key, 1);
  else if (ph.kind === 'night') {
    const ask = seat.night;
    if (!ask || ask.key !== key || ask.step === 'meet' || !ask.targets.length || s.mine?.key === key) return;
    if (ask.step === 'check' && ask.by !== me) return;
    c.act(key, ask.step === 'spies' ? ask.targets[0] : ask.targets[Math.floor(rnd() * ask.targets.length)]);
  } else if (ph.kind === 'intro' && ph.at === me) c.act(key, null, true);
  else if (ph.kind === 'day' && ph.order[ph.at] === me) {
    const others = ph.order.filter(i => i !== me);
    c.act(key, rnd() < 0.6 ? others[Math.floor(rnd() * others.length)] : null, true);
  } else if (ph.kind === 'vote' && !view.out[me]) {
    const cs = ph.candidates;
    c.act(key, cs.length === 1 ? (rnd() < 0.6 ? cs[0] : NO) : cs[Math.floor(rnd() * cs.length)]);
  } else if (ph.kind === 'tie' && ph.tied[ph.at] === me) c.act(key, null, true);
};

test('a host and seven phones play a whole game through the room', async () => {
  const be = memory();
  const rnd = mulberry32(7);
  const host = createRooms(be);
  const hostMe = { uid: 'h', name: 'მემატიანე', photoURL: '' };
  const id = await createRoom(be, 'c1', hostMe);
  host.open('c1', id, hostMe);
  const players = Array.from({ length: 7 }, (_, i) => ({ me: { uid: `p${i}`, name: `მოთამაშე ${i + 1}`, photoURL: '' }, c: createRooms(be) }));
  for (const p of players) p.c.open('c1', id, p.me);
  await flush();
  assert.equal(host.get()?.room?.status, 'lobby');
  for (const p of players) assert.equal(await p.c.join(), true);
  await flush();
  assert.equal(host.get()?.joins.length, 7);
  assert.deepEqual(players[3].c.get()?.joins.map(j => j.uid).sort(), players.map(p => p.me.uid).sort());

  // a player leaves the lobby and comes back
  await players[6].c.leave();
  await flush();
  assert.equal(host.get()?.joins.length, 6);
  await players[6].c.join();
  await flush();

  assert.equal(host.host.start({ piper: false, kids: false }, rnd), true);
  await flush();
  const state = host.get()!.state!;
  assert.equal(host.get()?.room?.status, 'live');
  assert.deepEqual([...host.get()!.room!.uids].sort(), players.map(p => p.me.uid).sort());
  for (const p of players) {
    const seat = p.c.get()!.seat!;
    assert.ok(seat, `${p.me.uid} has a seat`);
    assert.equal(state.uids[seat.i], p.me.uid);
    assert.equal(seat.role, state.g.players[seat.i].role);
    assert.equal(p.c.get()!.room!.view!.phase.kind, 'deal');
    assert.ok(!JSON.stringify(be.docs.get(roomPath('c1', id))!.view).includes('"role"'), 'the room shows no role');
  }

  let guard = 0;
  while (host.get()!.state!.g.phase.kind !== 'end' && guard++ < 600) {
    for (const p of players) playerTurn(p.c, rnd);
    await flush();
    const s = host.get()!.state!;
    const ph = s.g.phase;
    const allIn = ph.kind === 'deal' ? s.by.every(x => x === 1) : ph.kind === 'vote' ? s.by.every((x, i) => x !== null || !!s.g.out[i]) : true;
    if (['deal', 'night', 'morning', 'verdict', 'vote'].includes(ph.kind) && allIn) host.host.next();
    await flush();
  }
  const end = host.get()!.state!;
  assert.equal(end.g.phase.kind, 'end', 'the game ended');
  for (const p of players) {
    const view = p.c.get()!.room!.view!;
    assert.equal(view.phase.kind, 'end');
    assert.deepEqual(view.final?.players.map(x => x.role), end.g.players.map(x => x.role));
    assert.equal(p.c.get()!.room!.status, 'over');
  }

  // a reload of the host's phone takes the game back from the room
  const again = createRooms(be);
  again.open('c1', id, hostMe);
  await flush();
  assert.deepEqual(again.get()?.state, end);

  // the same players again, then the host closes the room: nothing of it stays
  host.host.again();
  await flush();
  assert.equal(players[0].c.get()!.room!.view!.phase.kind, 'deal');
  assert.equal(players[0].c.get()!.room!.status, 'live');
  await host.host.close();
  await flush();
  assert.equal(players[0].c.get()!.room, null);
  assert.deepEqual([...be.docs.keys()].filter(k => k.startsWith(roomPath('c1', id))), []);
  assert.equal(host.get(), null);
});

test('the host goes a step back after a word ended on a phone', async () => {
  const be = memory();
  const rnd = mulberry32(3);
  const host = createRooms(be);
  const hostMe = { uid: 'h', name: 'H', photoURL: '' };
  const id = await createRoom(be, 'c1', hostMe);
  host.open('c1', id, hostMe);
  const players = Array.from({ length: 6 }, (_, i) => ({ me: { uid: `p${i}`, name: `P${i}`, photoURL: '' }, c: createRooms(be) }));
  for (const p of players) { p.c.open('c1', id, p.me); }
  await flush();
  for (const p of players) await p.c.join();
  await flush();
  host.host.start({ piper: false, kids: false }, rnd);
  await flush();
  for (const p of players) playerTurn(p.c, rnd);
  await flush();
  host.host.next(); // night 1
  await flush();
  while (host.get()!.state!.g.phase.kind === 'night') { host.host.next(); await flush(); }
  host.host.next(); // morning → introductions
  await flush();
  const speaker = players.find(p => p.c.get()!.seat!.i === 0)!;
  playerTurn(speaker.c, rnd);
  await flush();
  assert.equal(host.get()!.state!.key, 'i.1', 'the word ended on the phone');
  assert.equal(host.get()!.canBack, true);
  host.host.back();
  await flush();
  assert.equal(host.get()!.state!.key, 'i.0');
  assert.equal(speaker.c.get()!.room!.view!.key, 'i.0');
  // the old answer is not taken again: the speaker's word stays open until they end it anew
  await flush();
  assert.equal(host.get()!.state!.key, 'i.0');
  speaker.c.act('i.0', null, true);
  await flush();
  assert.equal(host.get()!.state!.key, 'i.1');
});
