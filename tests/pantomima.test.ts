import test from 'node:test';
import assert from 'node:assert/strict';
import { PANTO_CARDS, PANTO_THEMES } from '../src/data/pantomimaCards';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  MAX_TEAMS, PANTO_RULES, PANTO_SECONDS, SEEN_KEEP, TILT_OFF, TILT_ON, drawPantomima, facingOf, newPantoTable, pantoOver,
  pantoScores, parsePantoTable, playTurn, readTilt, rememberShown, teamNow, toggleMark, turnPoints, wordAt, type PantoQ,
} from '../src/utils/pantomima';

test('the words: each its own id, every theme with four at least, short enough to show', () => {
  const words = PANTO_CARDS.map(c => c.w);
  assert.equal(new Set(words).size, words.length, 'a word comes twice');
  assert.ok(words.length >= 140);
  for (const t of PANTO_THEMES) {
    assert.ok(t.words.length >= 4, `${t.id}: too few for four answers`);
    assert.ok(t.verb && t.label && /^#[0-9a-f]{6}$/.test(t.color), t.id);
    for (const w of t.words) assert.ok(w.trim() === w && w.length > 0 && w.length <= 24, w);
  }
});

test('a game\'s rounds: the themes in turn, four words of one theme each, the unseen first', () => {
  const rnd = mulberry32(7);
  const rounds = drawPantomima({ words: PANTO_CARDS, themes: [], count: 12, seen: [], rnd });
  assert.equal(rounds.length, 12);
  assert.equal(new Set(rounds.map(r => r.id)).size, 12, 'a word twice in a game');
  assert.ok(new Set(rounds.map(r => r.theme)).size >= 8, 'the themes are spread');
  for (const q of rounds) {
    assert.ok(PANTO_RULES.valid(q), JSON.stringify(q));
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.right], q.id);
    for (const o of q.options) assert.equal(PANTO_CARDS.find(c => c.w === o)?.theme, q.theme);
    assert.equal(q.talk, undefined);
  }
  // one theme only; the words shown lately come last
  const animals = PANTO_CARDS.filter(c => c.theme === 'tskhovelebi').map(c => c.w);
  const seen = animals.slice(0, animals.length - 3);
  const fresh = drawPantomima({ words: PANTO_CARDS, themes: ['tskhovelebi'], count: 3, seen, talk: true, rnd: mulberry32(3) });
  assert.deepEqual(fresh.map(q => q.id).sort(), animals.slice(-3).sort());
  assert.ok(fresh.every(q => q.talk === true && q.theme === 'tskhovelebi'));
  // an unknown theme counts as none chosen
  assert.equal(drawPantomima({ words: PANTO_CARDS, themes: ['nope'], count: 5, seen: [], rnd }).length, 5);
});

test('the room\'s rules: one step, the quicker the more, the word kept back until the reveal', () => {
  const q: PantoQ = { kind: 'pantomima', id: 'ზღარბი', theme: 'tskhovelebi', options: ['მელა', 'ზღარბი', 'ბუ', 'კუ'], right: 1 };
  assert.ok(PANTO_RULES.valid(q));
  assert.equal(PANTO_RULES.steps(q), 1);
  assert.equal(PANTO_RULES.seconds(q, 1), PANTO_SECONDS);
  assert.deepEqual([...PANTO_RULES.secret].sort(), ['id', 'right']);
  const limit = PANTO_SECONDS * 1000;
  assert.equal(PANTO_RULES.points(q, { pick: 1, ms: 0, step: 1 }, limit), 1000);
  assert.equal(PANTO_RULES.points(q, { pick: 1, ms: limit, step: 1 }, limit), 500);
  assert.equal(PANTO_RULES.points(q, { pick: 0, ms: 10, step: 1 }, limit), 0);
  assert.ok(PANTO_RULES.ok(q, 3) && !PANTO_RULES.ok(q, 4));
  assert.ok(!PANTO_RULES.valid({ ...q, right: 0 }), 'the right one must be the word');
  assert.ok(!PANTO_RULES.valid({ ...q, options: ['მელა', 'მელა', 'ზღარბი', 'კუ'], right: 2 }), 'two alike');
  assert.ok(!PANTO_RULES.valid({ ...q, talk: 'yes' as unknown as boolean }));
});

test('the words shown are kept, the last ones last', () => {
  assert.deepEqual(rememberShown(['ა', 'ბ', 'გ'], ['ბ', 'დ']), ['ა', 'გ', 'ბ', 'დ']);
  const many = Array.from({ length: SEEN_KEEP + 5 }, (_, i) => `w${i}`);
  const kept = rememberShown([], many);
  assert.equal(kept.length, SEEN_KEEP);
  assert.equal(kept[kept.length - 1], `w${SEEN_KEEP + 4}`);
});

test('one phone: the teams in turn, a word guessed a point, the rounds to the end', () => {
  assert.equal(newPantoTable(['ერთი'], { seconds: 60, rounds: 2, how: 'actor', talk: false }, ['ა']), null);
  const deck = ['ა', 'ბ', 'გ', 'დ', 'ე'];
  let g = newPantoTable(['ჩონგური', 'ფანდური', 'დოლი'], { seconds: 60, rounds: 2, how: 'forehead', talk: true }, deck, mulberry32(1))!;
  assert.equal(g.deck.length, 5);
  assert.equal(teamNow(g), 0);
  const first = [wordAt(g, 0), wordAt(g, 1)];
  g = playTurn(g, [{ w: first[0], ok: true }, { w: first[1], ok: false }]);
  assert.equal(g.at, 2);
  assert.equal(teamNow(g), 1);
  assert.equal(wordAt(g, 4), g.deck[(2 + 4) % 5], 'the deck goes round');
  g = playTurn(g, [{ w: 'გ', ok: true }, { w: 'დ', ok: true }, { w: 'ე', ok: true }]);
  g = playTurn(g, []);
  assert.deepEqual(pantoScores(g), [1, 3, 0]);
  assert.ok(!pantoOver(g));
  g = playTurn(g, [{ w: 'ა', ok: true }]);
  g = playTurn(g, []);
  g = playTurn(g, [{ w: 'ბ', ok: true }]);
  assert.ok(pantoOver(g));
  assert.equal(playTurn(g, [{ w: 'გ', ok: true }]), g, 'no turn after the end');
  assert.deepEqual(pantoScores(g), [2, 3, 1]);
  assert.equal(turnPoints({ marks: toggleMark([{ w: 'ა', ok: true }, { w: 'ბ', ok: false }], 1) }), 2);

  // kept and read back; broken parts dropped
  const back = parsePantoTable(JSON.parse(JSON.stringify(g)), new Set(deck))!;
  assert.deepEqual(back, g);
  const odd = parsePantoTable({ ...g, deck: ['ა', 'x'], names: [...g.names, ...Array(9).fill('ზედმეტი')], turns: [{ team: 9, marks: [] }, ...g.turns], seconds: 7 }, new Set(deck))!;
  assert.deepEqual(odd.deck, ['ა']);
  assert.equal(odd.names.length, MAX_TEAMS);
  assert.equal(odd.seconds, 60);
  assert.equal(odd.turns.length, g.turns.length);
  assert.equal(parsePantoTable({ ...g, names: ['მარტო'] }, new Set(deck)), null);
});

test('the forehead: the screen\'s facing in both ways of holding, a nod counted once', () => {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  assert.ok(near(facingOf(0, 0), 1), 'flat, face up');
  assert.ok(near(facingOf(180, 0), -1), 'flat, face down');
  assert.ok(Math.abs(facingOf(90, 0)) < 1e-9, 'upright in portrait');
  assert.ok(Math.abs(facingOf(0, 90)) < 1e-9, 'upright in landscape');
  assert.ok(Math.abs(facingOf(-5, -88)) < 0.05, 'landscape, a little off');
  assert.ok(facingOf(135, 0) < -TILT_ON, 'nodded down 45°');
  assert.ok(facingOf(0, 45) > TILT_ON, 'looked up 45° in landscape');

  // unarmed until it stands; a nod down; nothing more until it stands again; then a nod up
  let s = readTilt(-0.9, false);
  assert.deepEqual(s, { tilt: null, armed: false });
  s = readTilt(0.1, s.armed);
  assert.deepEqual(s, { tilt: null, armed: true });
  s = readTilt(-0.8, s.armed);
  assert.equal(s.tilt, 'down');
  s = readTilt(-0.9, s.armed);
  assert.equal(s.tilt, null);
  s = readTilt(TILT_OFF + 0.05, s.armed);
  assert.equal(s.armed, false, 'not upright enough yet');
  s = readTilt(0, s.armed);
  s = readTilt(0.7, s.armed);
  assert.equal(s.tilt, 'up');
});
