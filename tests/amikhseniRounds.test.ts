import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/utils/otkheuli';
import {
  AMIK_RULES, AMIK_SECONDS, AMIK_SEEN_KEEP, AMIK_TOP, amikMatch, amikPoints, drawAmikhseni, rememberAmik, swapAmikhseni,
  type AmikQ,
} from '../src/utils/amikhseniRounds';
import { answerRound, judgeRound, newRounds, publicView, roundKey } from '../src/utils/roundGames';

const players = [{ uid: 'a', name: 'ანა' }, { uid: 'b', name: 'გიორგი' }, { uid: 'c', name: 'ნინო' }];

// the real cards (data/amikhseniWords.ts) reach the recordings store, which plain node cannot load: ten made-up themes
const CATS = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, words: ['ა', 'ბ', 'გ', 'დ', 'ე'].map(l => `${l}${i}`) }));
CATS[1].words.push('ა0', '  ', ' ვ1 ');

test('a game\'s words: the categories in turn, no word twice, the unseen first, every one a valid round', () => {
  const rounds = drawAmikhseni({ cats: CATS, chosen: [], count: 12, seen: [], rnd: mulberry32(5) });
  assert.equal(rounds.length, 12);
  assert.equal(new Set(rounds.map(r => r.id)).size, 12, 'a word twice in a game');
  assert.equal(new Set(rounds.map(r => r.theme)).size, 10, 'every category comes before one comes twice');
  for (const q of rounds) {
    assert.ok(AMIK_RULES.valid(q), JSON.stringify(q));
    assert.ok(CATS.find(c => c.id === q.theme)!.words.includes(q.id), `${q.id} is not of ${q.theme}`);
  }
  // a word of two categories is one card, under the first; an empty word is none, a padded one is trimmed
  const all = drawAmikhseni({ cats: CATS, chosen: [], count: 99, seen: [], rnd: mulberry32(7) });
  assert.equal(all.length, 51);
  assert.equal(all.find(q => q.id === 'ა0')!.theme, 't0');
  assert.ok(all.some(q => q.id === 'ვ1'));
  // only the chosen ones; a category nobody knows is left out
  const two = drawAmikhseni({ cats: CATS, chosen: ['t3', 'no-such'], count: 5, seen: [], rnd: mulberry32(2) });
  assert.equal(two.length, 5);
  assert.ok(two.every(q => q.theme === 't3'));
  // the words shown lately come last
  const cat = { id: 'x', words: ['ერთი', 'ორი', 'სამი'] };
  const fresh = drawAmikhseni({ cats: [cat], chosen: [], count: 2, seen: ['ერთი', 'ორი'], rnd: mulberry32(1) });
  assert.equal(fresh[0].id, 'სამი');
  assert.equal(fresh[1].id, 'ერთი');
});

test('another word for the host: of the same category, not this one, the unseen first; none when there is no other', () => {
  const q = { id: 'ა2', theme: 't2' };
  const other = swapAmikhseni({ cats: CATS, q, seen: ['ა2', 'ბ2', 'გ2', 'დ2'], rnd: mulberry32(3) })!;
  assert.deepEqual(other, { kind: 'amikhseni', id: 'ე2', theme: 't2' });
  assert.ok(AMIK_RULES.valid(other));
  // all shown: the one shown longest ago
  assert.equal(swapAmikhseni({ cats: CATS, q, seen: ['გ2', 'ე2', 'ა2', 'ბ2', 'დ2'] })!.id, 'გ2');
  assert.equal(swapAmikhseni({ cats: [{ id: 'x', words: ['ერთი', ' ერთი '] }], q: { id: 'ერთი', theme: 'x' }, seen: [] }), null);
  assert.equal(swapAmikhseni({ cats: CATS, q: { id: 'ა0', theme: 'no-such' }, seen: [] }), null);
});

test('the remembered words: the last shown at the end, at most the kept number', () => {
  assert.deepEqual(rememberAmik(['ა', 'ბ', 'გ'], ['ბ', 'დ']), ['ა', 'გ', 'ბ', 'დ']);
  const many = Array.from({ length: AMIK_SEEN_KEEP + 30 }, (_, i) => `w${i}`);
  assert.equal(rememberAmik([], many).length, AMIK_SEEN_KEEP);
});

test('a guess: the word in any case or as „it is“, not a list of guesses', () => {
  assert.ok(amikMatch('ჩონგური', 'ჩონგური'));
  assert.ok(amikMatch('ჩონგური', 'ჩონგურს'));
  assert.ok(amikMatch('ჩონგური', 'ჩონგურია'));
  assert.ok(amikMatch('ჩონგური', 'ეს ჩონგურია'));
  assert.ok(amikMatch('მონასტერი', 'მონასტრის'));
  assert.ok(!amikMatch('ჩონგური', 'ფანდური'));
  assert.ok(!amikMatch('ჩონგური', 'ფანდური ჩანგი ჩონგური სალამური'));
  assert.ok(!amikMatch('ჩონგური', ''));
});

test('the points: a right word 1000 at once, 500 at the last second, the host\'s judgement wins', () => {
  const q = { id: 'ჩონგური' };
  const limit = AMIK_SECONDS * 1000;
  assert.equal(amikPoints(q, { ms: 0, text: 'ჩონგური' }, limit), AMIK_TOP);
  assert.equal(amikPoints(q, { ms: limit, text: 'ჩონგური' }, limit), AMIK_TOP / 2);
  assert.equal(amikPoints(q, { ms: limit / 2, text: 'ჩონგურს' }, limit), 750);
  assert.equal(amikPoints(q, { ms: 100, text: 'ფანდური' }, limit), 0);
  assert.equal(amikPoints(q, { ms: 100, text: 'ფანდური', ok: true }, limit), 999);
  assert.equal(amikPoints(q, { ms: 100, text: 'ჩონგური', ok: false }, limit), 0);
});

test('in the room: the word kept from the players, guesses in words, judged again by the host', () => {
  const words: AmikQ[] = [{ kind: 'amikhseni', id: 'ჩონგური', theme: 'sakravebi' }, { kind: 'amikhseni', id: 'ხორუმი', theme: 'tsekva' }];
  let s = newRounds(players, { game: 'amikhseni', rounds: words, sound: 'all', now: 1000 })!;
  assert.ok(s);
  // while it is asked the players see the theme, not the word
  const shown = publicView(s).q as Partial<AmikQ>;
  assert.equal(shown.id, undefined);
  assert.equal(shown.theme, 'sakravebi');
  const key = roundKey(s);
  s = answerRound(s, 0, { key, pick: 0, ms: 6000, text: 'ჩონგური' });
  s = answerRound(s, 1, { key, pick: 0, ms: 30000, text: 'ჩონგურია' });
  s = answerRound(s, 2, { key, pick: 0, ms: 12000, text: 'ფანდური' });
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [950, 750, 0]);
  assert.equal((publicView(s).q as Partial<AmikQ>).id, 'ჩონგური');
  // the host counts the third one after all: by its own time
  s = judgeRound(s, 2, true);
  assert.deepEqual(s.gained, [950, 750, 900]);
  assert.deepEqual(s.players.map(p => p.score), [950, 750, 900]);
});
