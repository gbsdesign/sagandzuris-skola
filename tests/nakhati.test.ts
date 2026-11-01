import test from 'node:test';
import assert from 'node:assert/strict';
import { NAKHATI_THEMES, NAKHATI_WORDS, nakhatiNote, nakhatiThemeOf } from '../src/data/nakhatiWords';
import { mulberry32 } from '../src/utils/otkheuli';
import { INK_MAX, INK_SIDE, addPoint, decodeInk, encodeInk, inkGrows, inkPoints, inkUpTo, isInk, type Stroke } from '../src/utils/ink';
import {
  MAX_TEAMS, NAKHATI_RULES, SEEN_KEEP, circleNow, drawNakhati, foldWord, guessForm, letterCount, mendLast, nakhatiOver, nakhatiScores,
  newNakhatiTable, parseNakhatiTable, playNakhati, rememberDrawn, sameWord, skipWord, threeToDraw, turnNow, unfoldWord, wordNow,
  type NakhatiQ,
} from '../src/utils/nakhati';
import { editRound, newRounds, nextRound, publicView, revealRound, roundKey } from '../src/utils/roundGames';

const WORDS = NAKHATI_WORDS;

test('the words: once each, every theme with four at least, short, with a note — and none a church thing to draw', () => {
  const ws = WORDS.map(x => x.w);
  assert.equal(new Set(ws).size, ws.length, 'a word comes twice');
  assert.ok(ws.length >= 150);
  for (const t of NAKHATI_THEMES) {
    assert.ok(t.words.length >= 4, `${t.id}: too few for four answers`);
    assert.ok(t.label && /^#[0-9a-f]{6}$/.test(t.color), t.id);
    for (const x of t.words) {
      assert.ok(x.w.trim() === x.w && x.w.length >= 2 && x.w.length <= 24, x.w);
      assert.ok(/^[ა-ჰ -]+$/.test(x.w), `${x.w}: Georgian letters only`);
      assert.ok(nakhatiNote(x.w).length > 10, `${x.w}: no note`);
      assert.equal(nakhatiThemeOf(x.w), t.id);
    }
  }
  // the user's rule (2026-11-01): no religious picture in a game — nobody is asked to draw one
  for (const w of ws) assert.ok(!/ჯვარ|ტაძარ|ეკლესი|მონასტ|^ხატი|სამრეკლო|გუმბათ|ანგელოზ|სანთელ|წმინდა|ბერი$|მღვდელ|სამრეკლ/.test(w), w);
});

test('the lines as text: back as they were, one stroke a part, nothing out of the square', () => {
  const s: Stroke[] = [
    { c: 0, w: 1, p: [0, 0, 999, 999, 500, 12] },
    { c: 7, w: 2, p: [250, 250] },
    { c: 5, w: 0, p: [10.4, 20.6, -5, 1200] },
  ];
  const text = encodeInk(s);
  assert.ok(isInk(text));
  assert.equal(text.split('.').length, 3);
  const back = decodeInk(text);
  assert.deepEqual(back[0], s[0]);
  assert.deepEqual(back[1], s[1]);
  assert.deepEqual(back[2].p, [10, 21, 0, INK_SIDE - 1]);
  assert.equal(inkPoints(back), 3 + 1 + 2);
  assert.deepEqual(decodeInk(encodeInk(back)), back);
  // what does not read right is left out
  assert.deepEqual(decodeInk('x'), []);
  assert.equal(decodeInk(`${text}.9zAAAA`).length, 3);
  assert.ok(!isInk('01AA'), 'a point is four characters');
  assert.ok(!isInk('81AAAA'), 'no ninth colour');
  assert.ok(!isInk('03AAAA'), 'no fourth width');
  assert.ok(!isInk(`01${'AAAA'.repeat(INK_MAX / 4)}`), 'too long');
  assert.ok(isInk(''));
  assert.ok(!isInk(null) && !isInk(5));
});

test('a drawing grows: its first points, a point too near the last one left out', () => {
  const s: Stroke[] = [{ c: 0, w: 1, p: [0, 0, 10, 10, 20, 20] }, { c: 1, w: 1, p: [5, 5, 50, 50] }];
  assert.deepEqual(inkUpTo(s, 0), []);
  assert.deepEqual(inkUpTo(s, 2), [{ c: 0, w: 1, p: [0, 0, 10, 10] }]);
  assert.deepEqual(inkUpTo(s, 4), [s[0], { c: 1, w: 1, p: [5, 5] }]);
  assert.deepEqual(inkUpTo(s, 99), s);
  const p: number[] = [];
  assert.ok(addPoint(p, 100, 100));
  assert.ok(!addPoint(p, 102, 101), 'too near');
  assert.ok(addPoint(p, 110, 100));
  assert.deepEqual(p, [100, 100, 110, 100]);
  const a = encodeInk([{ c: 0, w: 1, p: [0, 0, 10, 10] }]);
  const b = encodeInk([{ c: 0, w: 1, p: [0, 0, 10, 10, 30, 30] }, { c: 2, w: 0, p: [4, 4] }]);
  assert.ok(inkGrows(a, b));
  assert.ok(inkGrows('', b));
  assert.ok(!inkGrows(b, a), 'a stroke taken back');
});

test('a room\'s rounds: the themes in turn, four words of one theme, the unseen first', () => {
  const rnd = mulberry32(5);
  const rounds = drawNakhati({ words: WORDS, themes: [], count: 12, seen: [], rnd });
  assert.equal(rounds.length, 12);
  assert.equal(new Set(rounds.map(r => r.id)).size, 12, 'a word twice in a game');
  assert.equal(new Set(rounds.slice(0, 7).map(r => r.theme)).size, 7, 'every theme before one comes again');
  for (const q of rounds) {
    assert.ok(NAKHATI_RULES.valid(q), JSON.stringify(q));
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.right], q.id);
    for (const o of q.options) assert.equal(nakhatiThemeOf(o), q.theme, `${o} is not of ${q.theme}`);
  }
  // one theme only; what was drawn lately comes last
  const sufra = WORDS.filter(x => x.theme === 'sufra').map(x => x.w);
  const seen = sufra.slice(0, sufra.length - 3);
  const again = drawNakhati({ words: WORDS, themes: ['sufra', 'nope'], count: 3, seen, rnd });
  assert.equal(again.length, 3);
  for (const q of again) assert.ok(!seen.includes(q.id), `${q.id} was drawn lately`);
  assert.equal(rememberDrawn(['a', 'b'], ['b', 'c']).join(), 'a,b,c');
  assert.equal(rememberDrawn(Array.from({ length: 200 }, (_, i) => `w${i}`), ['x']).length, SEEN_KEEP);
});

test('a round\'s rules: the drawing must read right; the word kept from the players, the drawing shown; a round over keeps no lines', () => {
  const [q] = drawNakhati({ words: WORDS, themes: [], count: 1, seen: [], rnd: mulberry32(9) });
  assert.ok(NAKHATI_RULES.valid({ ...q, ink: encodeInk([{ c: 0, w: 1, p: [1, 1, 50, 50] }]) }));
  assert.ok(!NAKHATI_RULES.valid({ ...q, ink: 'not ink' }));
  assert.ok(!NAKHATI_RULES.valid({ ...q, right: (q.right + 1) % 4 }), 'the right one must be the word');
  assert.ok(!NAKHATI_RULES.valid({ ...q, options: [q.id, q.id, q.id, q.id] }));
  assert.ok(NAKHATI_RULES.ok(q, 3) && !NAKHATI_RULES.ok(q, 4));

  const rounds = drawNakhati({ words: WORDS, themes: [], count: 2, seen: [], rnd: mulberry32(3) });
  let s = newRounds([{ uid: 'a', name: 'ა' }, { uid: 'b', name: 'ბ' }], { game: 'nakhati', rounds, sound: 'all', now: 1 })!;
  const key = roundKey(s);
  const ink = encodeInk([{ c: 1, w: 1, p: [100, 100, 900, 900] }]);
  const drawn: NakhatiQ = { ...(s.rounds[0] as NakhatiQ), ink };
  s = editRound(s, key, drawn);
  assert.equal((s.rounds[0] as NakhatiQ).ink, ink);
  const view = publicView(s);
  assert.equal((view.q as NakhatiQ).ink, ink, 'every phone sees the drawing');
  assert.equal((view.q as NakhatiQ).id, undefined, 'not the word');
  assert.equal((view.q as NakhatiQ).right, undefined);
  // only the round asked now, by its key, and only its lines
  assert.equal(editRound(s, 'old', { ...drawn, ink: '' }), s);
  assert.equal(editRound(s, key, { ...drawn, ink: 'bad' }), s);
  assert.equal(editRound(s, key, { ...(rounds[1] as NakhatiQ), kind: 'otkhi' } as never), s);
  s = revealRound(s);
  assert.equal(editRound(s, roundKey(s), { ...drawn, ink: '' }), s, 'not after the reveal');
  assert.equal((publicView(s).q as NakhatiQ).id, drawn.id);
  s = nextRound(s, 5);
  assert.equal((s.rounds[0] as NakhatiQ).ink, undefined, 'the round over keeps no lines');
  assert.equal(s.at, 1);
});

test('three words for the chat: of different themes, the ones drawn lately last', () => {
  const rnd = mulberry32(11);
  const three = threeToDraw(WORDS, [], [], rnd);
  assert.equal(three.length, 3);
  assert.equal(new Set(three.map(x => x.theme)).size, 3);
  const one = threeToDraw(WORDS, ['musika'], [], rnd);
  assert.equal(one.length, 3);
  assert.ok(one.every(x => x.theme === 'musika'));
  const musika = WORDS.filter(x => x.theme === 'musika').map(x => x.w);
  const lately = threeToDraw(WORDS, ['musika'], musika.slice(3), rnd);
  assert.deepEqual(new Set(lately.map(x => x.w)), new Set(musika.slice(0, 3)));
});

test('one phone: the teams in turn, everybody\'s turn after each circle, a point to the team that guessed', () => {
  const deck = WORDS.map(x => x.w);
  assert.equal(newNakhatiTable(['ა'], { seconds: 90, rounds: 2, where: 'board', allPlay: false }, deck), null, 'two teams at least');
  let g = newNakhatiTable(['ა', 'ბ', 'გ'], { seconds: 90, rounds: 2, where: 'board', allPlay: true }, deck, mulberry32(2))!;
  assert.equal(turnNow(g), 0);
  const w0 = wordNow(g);
  g = skipWord(g);
  assert.notEqual(wordNow(g), w0, 'another word before the turn');
  g = playNakhati(g, 1);
  assert.equal(g.turns[0].won, null, 'on a team\'s turn only that team may win it');
  g = playNakhati(g, 1);
  assert.equal(g.turns[1].won, 1);
  g = playNakhati(g, null);
  assert.equal(turnNow(g), -1, 'everybody draws');
  assert.equal(circleNow(g), 1);
  g = playNakhati(g, 2);
  assert.equal(g.turns[3].team, -1);
  assert.equal(g.turns[3].won, 2, 'any team on everybody\'s turn');
  assert.equal(circleNow(g), 2);
  assert.equal(turnNow(g), 0);
  assert.deepEqual(nakhatiScores(g), [0, 1, 1]);
  g = mendLast(g, 0);
  assert.deepEqual(nakhatiScores(g), [1, 1, 0]);
  g = mendLast(g, null);
  assert.deepEqual(nakhatiScores(g), [0, 1, 0]);
  while (!nakhatiOver(g)) g = playNakhati(g, turnNow(g) < 0 ? 0 : turnNow(g));
  assert.equal(g.turns.length, 8, 'two circles of three teams and everybody\'s turn');
  assert.equal(playNakhati(g, 0), g, 'over');
  assert.equal(new Set(g.turns.map(t => t.w)).size, 8, 'a new word every turn');

  // kept and read back
  const back = parseNakhatiTable(JSON.parse(JSON.stringify(g)), new Set(deck))!;
  assert.deepEqual(back, g);
  assert.equal(parseNakhatiTable({ names: ['ა'], deck }, new Set(deck)), null);
  assert.equal(parseNakhatiTable('x', new Set(deck)), null);
  const odd = parseNakhatiTable({ names: ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ'], deck: ['nope', deck[0]], seconds: 7, rounds: 9, turns: [{ w: deck[0], won: 3 }] }, new Set(deck))!;
  assert.equal(odd.names.length, MAX_TEAMS);
  assert.deepEqual(odd.deck, [deck[0]]);
  assert.equal(odd.seconds, 90);
  assert.equal(odd.rounds, 2);
  assert.equal(odd.where, 'board');
  assert.equal(odd.turns[0].won, null, 'not that team\'s turn');
});

test('the chat\'s riddle: the word folded and back, a guess with or without its last vowel', () => {
  for (const w of ['ჩურჩხელა', 'სვანური კოშკი', 'ხინკალი']) {
    const f = foldWord(w);
    assert.ok(!f.includes(w) && f.length <= 200);
    assert.equal(unfoldWord(f), w);
  }
  assert.equal(unfoldWord('%%%'), '');
  assert.equal(unfoldWord(5), '');
  assert.equal(guessForm('  სვანური   კოშკი! '), 'სვანური კოშკი');
  assert.ok(sameWord('ჩურჩხელა', 'ჩურჩხელა'));
  assert.ok(sameWord(' ჩურჩხელ ', 'ჩურჩხელა'));
  assert.ok(sameWord('ხინკალს', 'ხინკალი') === false);
  assert.ok(sameWord('სვანური კოშკი', 'სვანური  კოშკი'));
  assert.ok(!sameWord('ხა', 'ხი'), 'too short to drop a vowel');
  assert.ok(!sameWord('', 'ხინკალი'));
  assert.equal(letterCount('სვანური კოშკი'), 12);
});
