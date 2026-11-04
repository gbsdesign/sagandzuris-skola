import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_GAMES, GAMES, GAME_GROUPS } from '../src/data/games';

test('every game stands under exactly one heading of the hub', () => {
  const listed = GAME_GROUPS.flatMap(g => g.games);
  assert.equal(new Set(listed).size, listed.length, 'a game under two headings');
  assert.deepEqual([...listed].sort(), GAMES.map(g => g.id).sort());
});

test('the daily games are games of the catalogue with an online variant', () => {
  for (const id of DAILY_GAMES) {
    const g = GAMES.find(x => x.id === id);
    assert.ok(g, id);
    assert.ok(g.modes.includes('online'), id);
  }
});
