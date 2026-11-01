import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHOKHA_STEPS, HAT, KABA_STEPS, PENALTY_MS, isDressed, missingFor, newDressTeams, parseDressTeams, ranking, recordTurn, scoreMs,
  shuffled, timeText, tryPut, turnOf,
} from '../src/utils/chaitsvi';
import { SAMOSI_PARTS } from '../src/data/samosiData';
import { KABA_PARTS } from '../src/data/kabaData';

test('the chokha goes on in its order: the undershirt, the chokha, cartridges and belt, the dagger on the belt, the hat last', () => {
  let on: string[] = [];
  const put = (id: string) => { const r = tryPut('chokha', on, id); if (r.ok) on = r.on; return r; };
  const early = put('chokha');
  assert.equal(early.ok, false);
  if (!early.ok) assert.deepEqual(early.missing, ['akhalukhi']);
  assert.equal(put('akhalukhi').ok, true);
  assert.equal(put('khanjali').ok, false);
  assert.deepEqual(missingFor('chokha', on, 'khanjali'), ['kamari']);
  assert.equal(put('chokha').ok, true);
  // the cartridges and the belt in either order
  assert.equal(put('kamari').ok, true);
  assert.equal(put(HAT).ok, false);
  assert.equal(put('khanjali').ok, true);
  assert.equal(put('masrebi').ok, true);
  assert.equal(isDressed('chokha', on), false);
  assert.equal(put(HAT).ok, true);
  assert.equal(isDressed('chokha', on), true);
  // a part already on stays as it is
  assert.deepEqual(tryPut('chokha', on, 'chokha'), { ok: true, on });
});

test('the dress: the dress first, chest panel and sash, the overcoat over them, the veil last', () => {
  const r = tryPut('kaba', ['kaba', 'gulispiri'], 'katibi');
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(r.missing, ['sartqeli']);
  assert.equal(tryPut('kaba', ['kaba', 'sartqeli', 'gulispiri'], 'katibi').ok, true);
  assert.equal(isDressed('kaba', ['kaba', 'gulispiri', 'sartqeli', 'katibi', 'lechaki']), true);
});

test('every step is a part of „ჩემი სამოსი“, and each order can be finished', () => {
  const chokhaIds = new Set(SAMOSI_PARTS.map(p => p.id));
  for (const s of CHOKHA_STEPS) if (s.id !== HAT) assert.ok(chokhaIds.has(s.id), s.id);
  const kabaIds = new Set(KABA_PARTS.map(p => p.id));
  for (const s of KABA_STEPS) assert.ok(kabaIds.has(s.id), s.id);
  for (const [outfit, steps] of [['chokha', CHOKHA_STEPS], ['kaba', KABA_STEPS]] as const) {
    let on: string[] = [];
    for (const s of steps) { const r = tryPut(outfit, on, s.id); assert.ok(r.ok, s.id); if (r.ok) on = r.on; }
    assert.ok(isDressed(outfit, on));
    for (const s of steps) if (s.needs.length) assert.ok(s.why, s.id);
  }
});

test('the time that counts, and how it reads', () => {
  assert.equal(scoreMs(12_345, 2), 12_345 + 2 * PENALTY_MS);
  assert.equal(timeText(9_840), '9.8');
  assert.equal(timeText(83_400), '1:23.4');
  assert.equal(timeText(60_000), '1:00.0');
  const a = shuffled([1, 2, 3, 4, 5, 6], 7);
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(shuffled([1, 2, 3, 4, 5, 6], 7), a);
});

test('teams dress in turn; the fastest wins, ties share a place; a kept game reads back', () => {
  let g = newDressTeams(['ა', 'ბ', 'გ'], 'chokha', true, 5);
  assert.equal(turnOf(g), 0);
  g = recordTurn(g, 20_000, 1);
  g = recordTurn(g, 18_000, 0);
  assert.equal(turnOf(g), 2);
  g = recordTurn(g, 23_000, 0);
  assert.equal(turnOf(g), null);
  assert.deepEqual(ranking(g).map(r => [r.name, r.ms, r.place]), [['ბ', 18_000, 1], ['ა', 23_000, 2], ['გ', 23_000, 2]]);
  assert.deepEqual(parseDressTeams(JSON.parse(JSON.stringify(g))), g);
  assert.equal(parseDressTeams({ outfit: 'x' }), null);
  assert.equal(parseDressTeams(null), null);
});
