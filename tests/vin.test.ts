import test from 'node:test';
import assert from 'node:assert/strict';
import { VIN_PEOPLE } from '../src/data/vinPeople';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  BOARD_SIZE, MAX_QUESTIONS, MAX_TEAMS, VIN_QUESTIONS, VIN_YEARS, askQuestion, boardFor, dayRun, freeRun, guessName, hiddenOfDay,
  newVinTable, parseVinRun, parseVinTable, playVinTurn, ruledOut, runOver, runWon, signatureOf, vinDay, vinMeta, vinOver, vinPoints,
  vinScores, vinShareText, vinTeamNow, vinWho,
} from '../src/utils/vin';

test('the people: their own ids, the facts there, the years off the questions\' edges, the lari notes once each', () => {
  const ids = VIN_PEOPLE.map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(VIN_PEOPLE.map(p => p.name)).size, ids.length);
  assert.ok(VIN_PEOPLE.length >= 48);
  for (const p of VIN_PEOPLE) {
    assert.ok(p.facts.length >= 4 && p.facts.length <= 5, p.id);
    assert.ok(p.kinds.length >= 1, p.id);
    assert.ok(!VIN_YEARS.includes(p.born as never), `${p.id}: born on a question's year`);
    for (const f of p.facts) assert.ok(f.trim() === f && f.length > 8, `${p.id}: ${f}`);
  }
  const notes = VIN_PEOPLE.flatMap(p => (p.lari ? [p.lari] : [])).sort((a, b) => a - b);
  assert.deepEqual(notes, [1, 2, 5, 10, 20, 50, 100, 200]);
  // every question splits the people somewhere
  for (const q of VIN_QUESTIONS) {
    const yes = VIN_PEOPLE.filter(q.test).length;
    assert.ok(yes > 0 && yes < VIN_PEOPLE.length, q.id);
  }
});

test('the day: one person for the school, every one once a round, a board that can find them', () => {
  const seen = new Set<string>();
  const n = VIN_PEOPLE.length;
  // a whole round of days starting where a round starts
  const start = new Date(Date.UTC(2026, 9, 28 + (n - 1)));
  for (let i = 0; i < n; i++) {
    const iso = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    seen.add(hiddenOfDay(iso, VIN_PEOPLE));
  }
  assert.equal(seen.size, n, 'a person twice in one round');
  const r = dayRun('2026-11-02', VIN_PEOPLE);
  assert.deepEqual(r, dayRun('2026-11-02', VIN_PEOPLE), 'the same on every phone');
  assert.equal(r.board.length, BOARD_SIZE);
  assert.ok(r.board.includes(r.hidden));
  const h = VIN_PEOPLE.find(p => p.id === r.hidden)!;
  for (const id of r.board) if (id !== r.hidden) assert.notEqual(signatureOf(VIN_PEOPLE.find(p => p.id === id)!), signatureOf(h), 'a twin on the board');
  const born = r.board.map(id => VIN_PEOPLE.find(p => p.id === id)!.born);
  assert.deepEqual(born, [...born].sort((a, b) => a - b), 'the board goes by the year of birth');
  const all = freeRun(VIN_PEOPLE, 999, 5);
  assert.ok(all.board.length > BOARD_SIZE && all.board.includes(all.hidden));
  assert.deepEqual(boardFor('nobody', VIN_PEOPLE, 5, mulberry32(1)), []);
});

test('asking: the answers rule names out, a guess is a question, twenty at most', () => {
  let r = { hidden: 'ilia', board: ['tamar', 'ilia', 'akaki', 'pirosmani', 'nino'], asked: [] as string[] };
  r = askQuestion(r, 'f');
  assert.deepEqual([...ruledOut(r, VIN_PEOPLE)].sort(), ['nino', 'tamar']);
  r = askQuestion(r, 'f');
  assert.equal(r.asked.length, 1, 'a question once');
  r = askQuestion(r, 'saint');
  assert.deepEqual([...ruledOut(r, VIN_PEOPLE)].sort(), ['akaki', 'nino', 'pirosmani', 'tamar']);
  r = guessName(r, 'akaki');
  assert.equal(r.asked.length, 3);
  assert.ok(!runOver(r));
  r = guessName(r, 'ilia');
  assert.ok(runWon(r) && runOver(r));
  assert.deepEqual(askQuestion(r, 'art'), r, 'nothing after the end');
  assert.deepEqual(vinDay(r), { id: 'ilia', guesses: ['q:f', 'q:saint', 'g:akaki', 'g:ilia'], won: true, done: true });
  assert.equal(vinShareText(4, r, VIN_PEOPLE).split('\n')[1], '⬜🟩🟥⭐');

  let lost = { hidden: 'nino', board: ['nino', 'tamar'], asked: [] as string[] };
  for (const q of VIN_QUESTIONS) lost = askQuestion(lost, q.id);
  assert.equal(lost.asked.length, MAX_QUESTIONS - 1);
  lost = guessName(lost, 'tamar');
  assert.ok(runOver(lost) && !runWon(lost));
  assert.equal(vinMeta({ '2026-11-02': vinDay(lost) }, '2026-11-02'), 'დღეს ვერ გამოიცანი');
});

test('a kept run is read back only as far as it is sound', () => {
  const r = { hidden: 'ilia', board: ['tamar', 'ilia'], asked: ['q:f', 'g:tamar'] };
  assert.deepEqual(parseVinRun(JSON.parse(JSON.stringify(r)), VIN_PEOPLE), r);
  assert.deepEqual(parseVinRun({ ...r, asked: ['q:f', 'q:f', 'q:nope', 'g:akaki', 'g:ilia', 'q:art'] }, VIN_PEOPLE)!.asked, ['q:f', 'g:ilia']);
  assert.equal(parseVinRun({ ...r, hidden: 'nobody' }, VIN_PEOPLE), null);
  assert.equal(parseVinRun({ ...r, board: ['tamar'] }, VIN_PEOPLE), null);
});

test('one phone: teams in turn, points by how few questions, the rounds to the end', () => {
  assert.deepEqual([0, 1, 5, 6, 10, 11, 20, 21].map(q => vinPoints(q, true)), [0, 3, 3, 2, 2, 1, 1, 0]);
  assert.equal(vinPoints(3, false), 0);
  assert.equal(newVinTable(['ერთი'], { rounds: 1, seconds: 0 }, ['ilia']), null);
  let g = newVinTable(['ჩონგური', 'ფანდური'], { rounds: 2, seconds: 120 }, ['ilia', 'akaki', 'nino'], mulberry32(2))!;
  assert.equal(g.seconds, 120);
  assert.equal(newVinTable(['ა', 'ბ'], { rounds: 9, seconds: 7 }, ['ilia'])!.seconds, 180);
  assert.equal(g.deck.length, 3);
  const first = vinWho(g);
  g = playVinTurn(g, 4, true);
  assert.equal(g.turns[0].who, first);
  assert.equal(vinTeamNow(g), 1);
  g = playVinTurn(g, 20, false);
  g = playVinTurn(g, 9, true);
  assert.ok(!vinOver(g));
  g = playVinTurn(g, 15, true);
  assert.ok(vinOver(g));
  assert.equal(playVinTurn(g, 1, true), g);
  assert.deepEqual(vinScores(g), [5, 1]);
  const known = new Set(VIN_PEOPLE.map(p => p.id));
  assert.deepEqual(parseVinTable(JSON.parse(JSON.stringify(g)), known), g);
  const odd = parseVinTable({ ...g, names: [...g.names, ...Array(9).fill('x')], deck: ['ilia', 'zz'], turns: [{ team: 7, who: 'ilia', q: 3, ok: true }, ...g.turns] }, known)!;
  assert.equal(odd.names.length, MAX_TEAMS);
  assert.deepEqual(odd.deck, ['ilia']);
  assert.equal(odd.turns.length, g.turns.length);
  assert.equal(parseVinTable({ ...g, names: ['მარტო'] }, known), null);
});
