import test from 'node:test';
import assert from 'node:assert/strict';
import { TS_LINES } from '../src/data/tsartseraLines';
import { countsOf, letterCount, lettersOf, type TsLine } from '../src/utils/tsartsera';
import {
  READ_BONUS, TEAM_MAX, TEAM_MIN, callLetter, drawTeamLines, hiddenOf, newTsTeams, nextLine, parseTsTeams, readLine, timeUp, undo,
} from '../src/utils/tsartseraTeams';
import { mulberry32 } from '../src/utils/otkheuli';

const line: TsLine = { id: 'a11', text: 'ნათქვამს ნაქნარი სჯობია.', by: 'ხალხური ანდაზა', kind: 'proverb' };
const fresh = () => newTsTeams(['ა გუნდი', 'ბ გუნდი', 'გ გუნდი'], 'asomtavruli', 30, ['a11', 'a15'], 1000);

test('a letter the line has: its boxes, a point each, the turn stays; one it hasn\'t: the turn passes; twice: nothing', () => {
  let g = fresh();
  g = callLetter(g, line, 'ნ', 2000);
  assert.deepEqual(g.scores, [3, 0, 0]);
  assert.equal(g.turn, 0);
  assert.equal(g.t0, 2000);
  assert.deepEqual(g.last, { team: 0, letter: 'ნ', n: 3 });
  g = callLetter(g, line, 'ზ', 3000);
  assert.deepEqual(g.scores, [3, 0, 0]);
  assert.equal(g.turn, 1);
  const same = callLetter(g, line, 'ნ', 4000);
  assert.equal(same, g);
});

test('reading the line: right = the closed boxes + the bonus; wrong = nothing; the letters alone open it too', () => {
  let g = callLetter(fresh(), line, 'ა', 2000);
  const a = countsOf(line.text)['ა'];
  assert.equal(a, 5);
  const hidden = hiddenOf(line, g.said);
  assert.equal(hidden, letterCount(line.text) - countsOf(line.text)['ა']);
  const right = readLine(g, line, true, 3000);
  assert.equal(right.phase, 'read');
  assert.equal(right.readBy, 0);
  assert.equal(right.scores[0], a + hidden + READ_BONUS);
  const wrong = readLine(g, line, false, 3000);
  assert.equal(wrong.readBy, -1);
  assert.deepEqual(wrong.scores, [a, 0, 0]);
  // every letter called: the line is open, nobody read it
  for (const c of lettersOf(line.text)) g = callLetter(g, line, c, 4000);
  assert.equal(g.phase, 'read');
  assert.equal(g.readBy, -1);
  assert.equal(g.scores.reduce((a, b) => a + b, 0), letterCount(line.text));
});

test('the clock passes the turn; the next line starts with the next team; the end; one step back', () => {
  let g = timeUp(fresh(), 5000);
  assert.equal(g.turn, 1);
  assert.equal(g.t0, 5000);
  g = readLine(g, line, true, 6000);
  g = nextLine(g, 7000);
  assert.equal(g.at, 1);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.said, []);
  assert.equal(g.phase, 'play');
  const before = g;
  g = callLetter(g, line, 'ს', 8000);
  g = undo(g, 9000);
  assert.deepEqual(g.said, before.said);
  assert.deepEqual(g.scores, before.scores);
  assert.equal(g.prev, null);
  g = nextLine(readLine(g, line, false, 9500), 10_000);
  assert.equal(g.phase, 'over');
});

test('the game\'s lines: a fit length, each once, the kinds taking turns, the unseen first', () => {
  const ids = drawTeamLines(TS_LINES, 7, mulberry32(4));
  assert.equal(ids.length, 7);
  assert.equal(new Set(ids).size, 7);
  const got = ids.map(id => TS_LINES.find(l => l.id === id)!);
  for (const l of got) assert.ok(letterCount(l.text) >= TEAM_MIN && letterCount(l.text) <= TEAM_MAX, l.id);
  for (let i = 1; i < got.length; i++) assert.notEqual(got[i].kind, got[i - 1].kind);
  const seen = TS_LINES.map(l => l.id).filter(id => id !== 'a11');
  assert.equal(drawTeamLines(TS_LINES, 1, mulberry32(9), seen)[0], 'a11');
});

test('a kept game is checked', () => {
  const g = callLetter(fresh(), line, 'ნ', 2000);
  const back = parseTsTeams(JSON.parse(JSON.stringify(g)));
  assert.ok(back);
  assert.deepEqual(back!.scores, g.scores);
  assert.equal(back!.prev, null);
  assert.equal(parseTsTeams({ ...g, script: 'latin' }), null);
  assert.equal(parseTsTeams({ ...g, names: ['ერთი'] , scores: [1] }), null);
  assert.equal(parseTsTeams(null), null);
});
