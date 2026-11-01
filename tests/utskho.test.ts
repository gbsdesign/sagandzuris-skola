import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UTSKHO_PLACES } from '../src/data/utskhoPlaces';
import { mulberry32 } from '../src/utils/otkheuli';
import { dayNumber } from '../src/utils/hangi';
import {
  ANSWERS, BOARD, HINT_CUT, MAX_WRONG, START_POINTS, accusationFailed, dayDeal, dealNext, finish, freeDeal, leftMs, newRound, newTable,
  nextRound, parseTable, pause, placeOfDay, resume, roundPoints, soloStep, soloStars, soloStepsOf, soloView, utskhoDay, utskhoMeta,
  utskhoShare, type URound,
} from '../src/utils/utskho';

test('the places: thirty, seven roles and five answers each, no answer naming its place', () => {
  assert.equal(UTSKHO_PLACES.length, 30);
  assert.equal(new Set(UTSKHO_PLACES.map(p => p.id)).size, 30);
  assert.equal(new Set(UTSKHO_PLACES.map(p => p.name)).size, 30);
  for (const p of UTSKHO_PLACES) {
    assert.equal(p.roles.length, 7, p.id);
    assert.equal(new Set(p.roles).size, 7, p.id);
    assert.equal(p.answers.length, ANSWERS, p.id);
    assert.ok(p.note.length > 40, p.id);
    const said = p.answers.map(([q, a]) => `${q} ${a}`).join(' ');
    for (const w of p.name.split(/\s+/).filter(x => x.length >= 4)) {
      const stem = w.slice(0, Math.max(4, w.length - 2));
      assert.ok(!said.includes(stem), `${p.id}: „${stem}“ in its answers`);
    }
  }
});

test('alone: the day, the board, answers, hints, misses and points', () => {
  const iso = '2026-11-02';
  const d = dayDeal(iso, UTSKHO_PLACES);
  assert.deepEqual(dayDeal(iso, UTSKHO_PLACES), d);
  assert.equal(d.board.length, BOARD);
  assert.ok(d.board.includes(d.place));
  assert.equal(new Set(d.board).size, BOARD);
  // every place once in a round of thirty days
  const rounds = new Map<number, string[]>();
  for (let i = 0; i < 120; i++) {
    const day = new Date(Date.UTC(2026, 9, 28 + i)).toISOString().slice(0, 10);
    const k = Math.floor(dayNumber(day) / 30);
    rounds.set(k, [...(rounds.get(k) ?? []), placeOfDay(day, UTSKHO_PLACES)]);
  }
  const full = [...rounds.values()].filter(r => r.length === 30);
  assert.ok(full.length >= 2);
  for (const r of full) assert.equal(new Set(r).size, 30);

  const wrong = d.board.filter(id => id !== d.place);
  let acts: string[] = [];
  for (const a of ['a', 'a', 'h', `g:${wrong[0]}`, `g:${wrong[0]}`, 'zz']) acts = soloStep(d, acts, a);
  let v = soloView(d, acts);
  assert.equal(v.shown, 3);
  assert.equal(v.hints, 1);
  assert.equal(v.cut.length, HINT_CUT);
  assert.ok(!v.cut.includes(d.place));
  assert.deepEqual(v.wrong.length, 1);
  assert.equal(acts.length, 4, 'a repeated guess and a strange step count nothing');
  assert.equal(v.points, START_POINTS - 2 - 1 - 2);
  // a crossed-out place cannot be guessed
  assert.deepEqual(soloStep(d, acts, `g:${v.cut[0]}`), acts);
  acts = soloStep(d, acts, `g:${d.place}`);
  v = soloView(d, acts);
  assert.ok(v.won && !v.lost);
  assert.equal(v.points, 5);
  assert.equal(soloStars(v), 2);
  assert.deepEqual(soloStep(d, acts, 'a'), acts, 'nothing after the end');
  const day = utskhoDay(d, acts);
  assert.ok(day.won && day.done && day.id === d.place);
  assert.equal(utskhoMeta({ [iso]: day }, iso), 'დღეს: გამოიცანი');
  assert.match(utskhoShare(7, d, acts), /№7 · 5 ქულა\n💬💬💬💡❌✅/);
  assert.deepEqual(soloStepsOf(d, ['a', 'a', 'a', 'a', 'a', 'a']), ['a', 'a', 'a', 'a'], 'five answers at most');
  assert.equal(soloStars(soloView(d, [`g:${d.place}`])), 3);
  assert.equal(soloView(d, [`g:${d.place}`]).points, START_POINTS);

  const lost = soloView(d, wrong.slice(0, MAX_WRONG).map(id => `g:${id}`));
  assert.ok(lost.lost && !lost.won);
  assert.equal(soloStars(lost), 0);
  const three = soloView(d, ['h', 'h', 'h', 'h']);
  assert.equal(three.hints, 3);
  assert.equal(three.cut.length, 3 * HINT_CUT);
  // a free board
  const f = freeDeal(UTSKHO_PLACES, 99);
  assert.deepEqual(freeDeal(UTSKHO_PLACES, 99), f);
  assert.equal(f.board.length, BOARD);
});

const NAMES = ['ანა', 'ბექა', 'გიო', 'დათო', 'ელე'];

test('the class: the deal, the stranger, the roles, the clock', () => {
  for (let s = 0; s < 40; s++) {
    const r = newRound(NAMES, UTSKHO_PLACES, [], 2, mulberry32(s));
    assert.notEqual(r.stranger, 2, 'not last round\'s stranger');
    assert.equal(r.roles[r.stranger], '');
    const place = UTSKHO_PLACES.find(p => p.id === r.place)!;
    assert.ok(r.roles.every((x, i) => i === r.stranger || place.roles.includes(x)));
    assert.equal(new Set(r.roles.filter(Boolean)).size, NAMES.length - 1, 'up to seven villagers, every role once');
  }
  // twelve players: roles repeat but everyone has one
  const big = newRound(Array.from({ length: 12 }, (_, i) => `p${i}`), UTSKHO_PLACES, [], null, mulberry32(3));
  assert.equal(big.roles.filter(Boolean).length, 11);

  let t = newTable(NAMES, 8, UTSKHO_PLACES, mulberry32(5));
  assert.equal(t.round.phase, 'deal');
  for (let i = 0; i < NAMES.length - 1; i++) t = dealNext(t, 1000);
  assert.equal(t.round.phase, 'deal');
  t = dealNext(t, 10_000);
  assert.equal(t.round.phase, 'play');
  assert.equal(leftMs(t, 10_000 + 60_000), 7 * 60_000);
  t = pause(t, 70_000);
  assert.equal(leftMs(t, 500_000), 7 * 60_000, 'the clock waits while an accusation is heard');
  t = accusationFailed(t, 1, 100_000);
  assert.deepEqual(t.round.accusers, [1]);
  assert.equal(t.round.pausedAt, null);
  assert.equal(leftMs(t, 160_000), 6 * 60_000);
  assert.equal(resume(t, 1), t);
});

test('the class: points as in the original, then the next round', () => {
  const r = { stranger: 3, place: 'marani' } as URound;
  assert.deepEqual(roundPoints(r, { kind: 'vote', accused: 3, accuser: 1, late: false }, 5), [1, 2, 1, 0, 1]);
  assert.deepEqual(roundPoints(r, { kind: 'vote', accused: 3, accuser: null, late: true }, 5), [1, 1, 1, 0, 1]);
  assert.deepEqual(roundPoints(r, { kind: 'vote', accused: 0, accuser: 1, late: false }, 5), [0, 0, 0, 4, 0]);
  assert.deepEqual(roundPoints(r, { kind: 'vote', accused: 0, accuser: null, late: true }, 5), [0, 0, 0, 2, 0]);
  assert.deepEqual(roundPoints(r, { kind: 'guess', guess: 'marani' }, 5), [0, 0, 0, 4, 0]);
  assert.deepEqual(roundPoints(r, { kind: 'guess', guess: 'rtveli' }, 5), [1, 1, 1, 0, 1]);
  assert.deepEqual(roundPoints(r, { kind: 'timeout' }, 5), [0, 0, 0, 2, 0], 'the time over, nobody agreed on');

  let t = newTable(NAMES, 6, UTSKHO_PLACES, mulberry32(8));
  for (let i = 0; i < NAMES.length; i++) t = dealNext(t, 0);
  const s = t.round.stranger;
  const place = t.round.place;
  t = finish(t, { kind: 'guess', guess: place }, 5000);
  assert.equal(t.round.phase, 'end');
  assert.equal(t.scores[s], 4);
  assert.deepEqual(t.used, [place]);
  assert.equal(finish(t, { kind: 'guess', guess: place }, 6000), t, 'once');
  const kept = parseTable(JSON.parse(JSON.stringify(t)), UTSKHO_PLACES);
  assert.deepEqual(kept, t);
  t = nextRound(t, UTSKHO_PLACES, mulberry32(9));
  assert.equal(t.round.phase, 'deal');
  assert.notEqual(t.round.place, place);
  assert.notEqual(t.round.stranger, s);
  let u = t;
  for (let i = 0; i < NAMES.length; i++) u = dealNext(u, 0);
  u = finish(u, { kind: 'timeout' }, 9000);
  assert.equal(u.scores[u.round.stranger] - t.scores[u.round.stranger], 2);
  assert.deepEqual(parseTable(JSON.parse(JSON.stringify(u)), UTSKHO_PLACES), u);
  assert.equal(parseTable({ names: ['a', 'b'] }, UTSKHO_PLACES), null);
  assert.equal(parseTable({ ...t, round: { ...t.round, place: 'nowhere' } }, UTSKHO_PLACES), null);
});
