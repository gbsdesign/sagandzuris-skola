// Run: npx tsx --test tests/churches.test.ts
// „ეკლესია-მონასტრები“: the generated list holds together, and the nearest / search / place words work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceM, distanceText, loadChurches, matchChurch, nearest, passesKind, whereOf, type Church } from '../src/data/churches';

test('the list: ids unique, every church in a map region, places inside Georgia', async () => {
  const { list, byId } = await loadChurches();
  assert.ok(list.length > 3000);
  assert.equal(byId.size, list.length);
  // the songs map's regions (data/songsData.ts FOLK_REGIONS) but Abkhazia, which the list does not cover
  const regions = new Set(['svaneti', 'samegrelo', 'racha', 'imereti', 'guria', 'achara', 'samtskhe', 'shidakartli', 'kvemokartli', 'mtianeti', 'kakheti', 'kalakuri']);
  for (const c of list) {
    assert.ok(regions.has(c.region), `${c.name}: ${c.region}`);
    if (c.located) assert.ok(c.lat > 41 && c.lat < 43.7 && c.lng > 39.9 && c.lng < 46.8, `${c.name}: ${c.lat},${c.lng}`);
  }
});

test('Bodbe is found by two words, and it is the nearest to its own gate', async () => {
  const { list } = await loadChurches();
  const bodbe = list.find(c => matchChurch(c, 'ბოდბის ნინოს მონასტ'));
  assert.ok(bodbe);
  assert.equal(bodbe.region, 'kakheti');
  const near = nearest(list, 41.6060, 45.9340, 5);
  assert.equal(near[0].church.id, bodbe.id);
  assert.ok(near.every((n, i) => i === 0 || near[i - 1].m <= n.m), 'nearest first');
});

const one = (more: Partial<Church>): Church => ({
  id: 'x', name: 'წმინდა გიორგის ეკლესია', region: 'imereti', muni: 'ხონის მუნიციპალიტეტი', place: 'ზედა გორდი', lat: 42.3, lng: 42.4,
  located: true, kind: 'c', built: '', building: false, note: '', photo: '', wiki: '', desc: '', text: '', ...more,
});

test('place words: a village, a Tbilisi district, a town already named', () => {
  assert.equal(whereOf(one({})), 'ზედა გორდი · ხონის მუნიციპალიტეტი');
  assert.equal(whereOf(one({ muni: 'ვაკის რაიონი', place: 'თბილისი' })), 'თბილისი, ვაკის რაიონი');
  assert.equal(whereOf(one({ muni: 'ქ. ქუთაისი', place: 'ქუთაისი' })), 'ქ. ქუთაისი');
});

test('distances and kinds', () => {
  assert.ok(Math.abs(distanceM(41.7151, 44.8271, 41.8421, 44.7208) - 16700) < 600); // Tbilisi → Mtskheta
  assert.equal(distanceText(320), '300 მ');
  assert.equal(distanceText(4321), '4.3 კმ');
  assert.equal(distanceText(23456), '23 კმ');
  assert.ok(passesKind(one({ kind: 'm' }), 'active'));
  assert.ok(!passesKind(one({ kind: 'x' }), 'active'));
  assert.ok(passesKind(one({ kind: 'x' }), 'x'));
});

test('the TV reports point at churches that exist, under monasteries the videos page has', async () => {
  const { FILM_CHURCH, filmsOfChurch } = await import('../src/data/churchFilms');
  const { MONASTERY_FILMS } = await import('../src/data/monasteryVideos');
  const { byId } = await loadChurches();
  const monasteries = new Set(MONASTERY_FILMS.map(f => f[4]));
  for (const [monastery, id] of Object.entries(FILM_CHURCH)) {
    assert.ok(monasteries.has(monastery), `no films for „${monastery}“`);
    assert.ok(byId.has(id), `„${monastery}“ → ${id} is not in the list`);
  }
  assert.ok(filmsOfChurch('cb4219ef').length >= 1, 'Bodbe has its report');
});

test('every church of „მსახურებები“ is in the list', async () => {
  const { CHURCH_SERVICES } = await import('../src/data/churchServices');
  const { byId } = await loadChurches();
  for (const s of CHURCH_SERVICES) assert.ok(byId.has(s.id), s.name);
  assert.equal(new Set(CHURCH_SERVICES.map(s => s.id)).size, CHURCH_SERVICES.length);
});
