import test from 'node:test';
import assert from 'node:assert/strict';
import { KHAZI_CARDS, khaziCard } from '../src/data/khaziCards';
import {
  DAY_CARDS, dealDeck, dealOfDay, deckOf, finishedDay, fits, khaziMeta, khaziShareText, khaziStats, resultsOf, rightOf, sortLine, type KhaziCard,
} from '../src/utils/khazi';

const card = (id: string, when: number): KhaziCard => ({ id, deck: 'istoria', text: id, when, label: String(when), icon: 'flag' });

test('a gap is right when the card falls between its neighbours; an equal year fits on either side', () => {
  const line = [card('a', 1100), card('b', 1500), card('c', 1900)];
  assert.ok(fits(line, 0, card('x', 900)));
  assert.ok(!fits(line, 1, card('x', 900)));
  assert.ok(fits(line, 2, card('x', 1700)));
  assert.ok(!fits(line, 3, card('x', 1700)));
  assert.ok(fits(line, 3, card('x', 2000)));
  assert.ok(fits(line, 1, card('x', 1500)) && fits(line, 2, card('x', 1500)));
  assert.ok(!fits(line, 4, card('x', 2000)));
  assert.ok(fits([], 0, card('x', 1)));
});

test('the line stands in time order; equal times keep the order they came in', () => {
  const cards = new Map([['a', card('a', 1900)], ['b', card('b', 1100)], ['c', card('c', 1900)], ['d', card('d', 1500)]]);
  const line = sortLine([{ id: 'a', ok: null }, { id: 'b', ok: true }, { id: 'c', ok: false }, { id: 'd', ok: true }], id => cards.get(id));
  assert.deepEqual(line.map(p => p.id), ['b', 'd', 'a', 'c']);
});

test('the cards: unique ids, a text and a label each, the Liturgy numbered 1…18, the writers from the app', () => {
  const ids = new Set(KHAZI_CARDS.map(c => c.id));
  assert.equal(ids.size, KHAZI_CARDS.length);
  for (const c of KHAZI_CARDS) {
    assert.ok(c.text.length > 4 && c.label.length > 0, c.id);
    assert.equal(khaziCard(c.id), c);
    if (c.deck !== 'tsirva') assert.ok(c.when > 300 && c.when <= 2025, `${c.id} ${c.when}`);
  }
  const liturgy = deckOf(KHAZI_CARDS, 'tsirva');
  assert.deepEqual(liturgy.map(c => c.when), Array.from({ length: liturgy.length }, (_, i) => i + 1));
  const people = deckOf(KHAZI_CARDS, 'adamianebi');
  assert.ok(people.length >= 25);
  assert.equal(khaziCard('a-baratashvili')?.when ?? khaziCard(people.find(p => p.text.includes('ბარათაშვილი'))!.id)?.when, 1817);
  assert.ok(deckOf(KHAZI_CARDS, 'all').every(c => c.deck !== 'tsirva'));
});

test('the day\'s line: ten cards of the year decks, no year twice, no deck over four, the same all day', () => {
  for (const iso of ['2026-11-01', '2026-11-02', '2027-03-15']) {
    const deal = dealOfDay(KHAZI_CARDS, iso);
    assert.equal(deal.length, DAY_CARDS);
    assert.equal(new Set(deal.map(c => c.when)).size, DAY_CARDS);
    for (const deck of ['istoria', 'adamianebi', 'kultura'] as const) assert.ok(deal.filter(c => c.deck === deck).length <= 4);
    assert.ok(deal.every(c => c.deck !== 'tsirva'));
    assert.deepEqual(dealOfDay(KHAZI_CARDS, iso).map(c => c.id), deal.map(c => c.id));
  }
  assert.notDeepEqual(dealOfDay(KHAZI_CARDS, '2026-11-01').map(c => c.id), dealOfDay(KHAZI_CARDS, '2026-11-02').map(c => c.id));
  assert.equal(dealDeck(KHAZI_CARDS, 'tsirva', 7).length, deckOf(KHAZI_CARDS, 'tsirva').length);
});

test('the day\'s record: results, stats, share and the hub\'s line', () => {
  const d = finishedDay('2026-11-01', '110111011');
  assert.equal(resultsOf(d), '110111011');
  assert.equal(rightOf(resultsOf(d)), 7);
  const days = { '2026-10-31': finishedDay('2026-10-31', '111111111'), '2026-11-01': d };
  const s = khaziStats(days, '2026-11-01');
  assert.equal(s.played, 2);
  assert.equal(s.streak, 2);
  assert.equal(s.perfect, 1);
  assert.equal(s.best, 9);
  assert.equal(s.average, 8);
  assert.equal(khaziStats(days, '2026-11-02').streak, 2);
  assert.equal(khaziStats(days, '2026-11-03').streak, 0);
  assert.match(khaziShareText(5, d), /^დროის ხაზი №5 · 7\/9\n🟩🟩🟥🟩🟩🟩🟥🟩🟩\n/);
  assert.equal(khaziMeta(days, '2026-11-01'), 'დღეს: 7/9');
  assert.equal(khaziMeta(days, '2026-11-02'), 'სერია: 2 დღე');
});
