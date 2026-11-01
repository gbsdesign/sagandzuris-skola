import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OTKHEULI_GROUPS } from '../src/data/otkheuliGroups';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  GRID, MAX_MISSES, boardOfCode, buildSolo, codeText, newSdTable, other, parseCode, parseSdTable, saidumloDay, saidumloMeta,
  saidumloShare, sidesFor, soloOfDay, soloPick, soloStars, soloState, stemIn, tableView, type SdBoard, type SdSolo,
} from '../src/utils/saidumlo';

const groupOf = new Map(OTKHEULI_GROUPS.map(g => [g.id, g]));

test('alone: every board has four clues of ten words, each with one answer, and a trap outside them', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const s = buildSolo(OTKHEULI_GROUPS, mulberry32(seed));
    assert.ok(s, `seed ${seed}`);
    assert.equal(s.tiles.length, GRID);
    assert.equal(new Set(s.tiles).size, GRID);
    assert.deepEqual(s.clues.map(c => c.words.length).sort(), [2, 2, 3, 3]);
    const fams = s.clues.map(c => groupOf.get(c.id)!.family).filter(Boolean);
    assert.ok(!fams.some(f => f === 'songs' || f === 'chants'), 'no titles as clues');
    const titles = new Set(OTKHEULI_GROUPS.filter(g => g.family === 'songs' || g.family === 'chants').flatMap(g => g.words));
    const plain = new Set(OTKHEULI_GROUPS.filter(g => g.family !== 'songs' && g.family !== 'chants').flatMap(g => g.words));
    assert.ok(s.tiles.every(w => !titles.has(w) || plain.has(w)), 'no song or chant title on the board');
    assert.equal(new Set(fams).size, fams.length, 'one group of a family');
    for (const c of s.clues) {
      const g = groupOf.get(c.id)!;
      assert.equal(c.label, g.label);
      // on the board, the clue's group holds exactly its own words
      assert.deepEqual(s.tiles.filter(w => g.words.includes(w)).sort(), [...c.words].sort(), `${seed} ${c.id}`);
    }
    for (const c of s.clues) assert.ok(!s.tiles.some(w => stemIn(c.label, w)), `${seed}: a word in „${c.label}“`);
    assert.ok(s.tiles.includes(s.trap));
    assert.ok(!s.clues.some(c => groupOf.get(c.id)!.words.includes(s.trap)));
  }
  assert.ok(stemIn('ქართველის სიკეთეები', 'სიკეთე') && stemIn('ღვინის ჯიშები', 'ღვინო') && !stemIn('ხეები', 'ცაცხვი') && !stemIn('მდინარეები', 'ხმა'));
  const iso = '2026-11-02';
  assert.deepEqual(soloOfDay(OTKHEULI_GROUPS, iso), soloOfDay(OTKHEULI_GROUPS, iso));
});

const SOLO: SdSolo = {
  key: 'a+b',
  tiles: ['a1', 'a2', 'a3', 'b1', 'b2', 'n1', 'n2', 'n3', 'n4', 'n5', 'trap'],
  clues: [{ id: 'a', label: 'ა', words: ['a1', 'a2', 'a3'] }, { id: 'b', label: 'ბ', words: ['b1', 'b2'] }],
  trap: 'trap',
};

test('alone: found words, misses, the trap and the end', () => {
  let picks: string[] = [];
  for (const w of ['b1', 'n1', 'a1', 'a1', 'zz']) picks = soloPick(SOLO, picks, w);
  assert.deepEqual(picks, ['b1', 'n1', 'a1']);
  let st = soloState(SOLO, picks);
  assert.deepEqual(st.found, ['b1', 'a1']);
  assert.deepEqual(st.misses, ['n1']);
  assert.equal(st.clue, 0);
  for (const w of ['a2', 'a3']) picks = soloPick(SOLO, picks, w);
  assert.equal(soloState(SOLO, picks).clue, 1);
  picks = soloPick(SOLO, picks, 'b2');
  st = soloState(SOLO, picks);
  assert.ok(st.won && !st.lost);
  assert.equal(soloStars(st), 2);
  assert.deepEqual(soloPick(SOLO, picks, 'n2'), picks);
  const day = saidumloDay(SOLO, picks);
  assert.ok(day.won && day.done && day.id === 'a+b');
  assert.equal(saidumloMeta({ '2026-11-02': day }, '2026-11-02'), 'დღეს: გამოიცანი');
  assert.match(saidumloShare(3, SOLO, picks), /№3 · ★★☆\n🟦⬜🟦🟦🟦🟦/);

  const trapped = soloState(SOLO, ['a1', 'trap', 'a2']);
  assert.ok(trapped.trapped && trapped.lost && !trapped.won);
  assert.deepEqual(trapped.found, ['a1']);
  const missed = soloState(SOLO, ['n1', 'n2', 'n3', 'n4', 'a1']);
  assert.equal(missed.misses.length, MAX_MISSES);
  assert.ok(missed.lost);
  assert.deepEqual(missed.found, []);
  assert.equal(soloStars(soloState(SOLO, ['a1', 'a2', 'a3', 'b1', 'b2'])), 3);
});

const POOL = Array.from({ length: 60 }, (_, i) => ({ w: `w${i}`, theme: `t${i % 12}` }));

test('the class: a code gives the same words and key; nine, eight, seven and the trap', () => {
  const b = boardOfCode(4827, POOL);
  assert.deepEqual(boardOfCode(4827, POOL), b);
  assert.notDeepEqual(boardOfCode(4828, POOL).words, b.words);
  assert.equal(new Set(b.words).size, GRID);
  const per = new Map<string, number>();
  for (const w of b.words) { const t = POOL.find(x => x.w === w)!.theme; per.set(t, (per.get(t) ?? 0) + 1); }
  assert.ok([...per.values()].every(n => n <= 3));
  const count = (s: string) => b.sides.filter(x => x === s).length;
  assert.equal(count(b.first), 9);
  assert.equal(count(other(b.first)), 8);
  assert.equal(count('none'), 7);
  assert.equal(count('trap'), 1);
  // a small pool still fills the board
  assert.equal(boardOfCode(1, POOL.slice(0, 30).map(x => ({ ...x, theme: 'one' }))).words.length, GRID);
  for (let i = 0; i < 50; i++) assert.equal(sidesFor(mulberry32(i)).sides.length, GRID);
  assert.equal(codeText(7), '0007');
  assert.equal(parseCode(' 0420 '), 420);
  assert.equal(parseCode('42'), null);
});

test('the class: turns, the trap, the last word, a pass', () => {
  const sides = ['blue', 'blue', 'red', 'none', 'trap', 'red'] as SdBoard['sides'];
  const b: SdBoard = { code: 1, words: sides.map((_, i) => `w${i}`), sides, first: 'blue' };
  let v = tableView(b, [{ i: 0 }]);
  assert.equal(v.turn, 'blue');
  assert.equal(v.left.blue, 1);
  v = tableView(b, [{ i: 0 }, { i: 3 }]);
  assert.equal(v.turn, 'red');
  assert.equal(v.switches, 1);
  v = tableView(b, [{ i: 0 }, { i: 3 }, { i: 1 }]);
  assert.deepEqual(v.over, { winner: 'blue', trap: false }, 'red opened blue\'s last word');
  v = tableView(b, [{ pass: true }, { i: 4 }, { i: 2 }]);
  assert.deepEqual(v.over, { winner: 'blue', trap: true });
  assert.equal(v.opened.get(4), 'red');
  assert.ok(!v.opened.has(2), 'nothing after the end');
  v = tableView(b, [{ i: 2 }, { i: 2 }, { i: 9 }]);
  assert.equal(v.turn, 'red');
  assert.equal(v.opened.size, 1);

  const t = newSdTable(12345, 90, { blue: 2, red: 1 });
  assert.equal(t.code, 2345);
  assert.equal(t.seconds, 90);
  assert.equal(newSdTable(5, 33).seconds, 0);
  const kept = { ...t, log: [{ i: 3 }, { pass: true as const }] };
  assert.deepEqual(parseSdTable(JSON.parse(JSON.stringify(kept))), kept);
  assert.equal(parseSdTable({ code: 'x' }), null);
  const odd = parseSdTable({ code: 7, seconds: 5, log: [{ i: 30 }, { pass: 'yes' }, { i: 2 }], wins: { blue: -1 } })!;
  assert.deepEqual(odd, { code: 7, seconds: 0, log: [{ i: 2 }], wins: { blue: 0, red: 0 } });
});
