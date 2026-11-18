import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRIODION, andrewPart, complineEve, movableOf, splitHymns, triodionSrc } from '../src/utils/triodion';
import { sliceOf } from '../src/utils/serviceTexts';
import { OWN_SERVICES } from '../src/data/ownServices';
import { EXTRA_BOOKS } from '../src/data/extraBooks';
import { addDays, orthodoxEaster } from '../src/data/churchFeasts';

const book = (coll: string, n: number) => JSON.parse(readFileSync(new URL(`../public/${coll}/${String(n).padStart(2, '0')}.json`, import.meta.url), 'utf8'));
const j25 = book('wignebi/jamni', 25).c[0].s;
const cal = { ...JSON.parse(readFileSync(new URL('../src/data/calendar/2026.json', import.meta.url), 'utf8')).days, ...JSON.parse(readFileSync(new URL('../src/data/calendar/2027.json', import.meta.url), 'utf8')).days };
const names = (iso: string) => (cal[iso]?.s ?? []).map((x: { n: string }) => x.n).join(' ');

test('every movable day finds its troparia and kontakia in ჟამნი 25', () => {
  for (const [k, d] of Object.entries(TRIODION)) {
    if (d.kind === 'canon') continue;
    const src = triodionSrc(Number(k));
    assert.ok(src, `${d.name}: no source`);
    const run = sliceOf(j25, src!);
    assert.ok(run.length, `${d.name}: heading not found`);
    const { tr, ko } = splitHymns(run);
    if (d.tr) assert.ok(tr.length, `${d.name}: no troparion`);
    assert.ok(ko.length, `${d.name}: no kontakion`);
    assert.ok(run.length < 30, `${d.name}: the run does not end (${run.length})`);
  }
});

test('afterfeasts and the Pentecostarion', () => {
  assert.equal(movableOf(26)?.mode, 'after'); // Mid-Pentecost's afterfeast
  assert.equal(movableOf(26)?.e, 24);
  assert.equal(movableOf(43)?.e, 39); // Ascension's
  assert.equal(movableOf(42)?.mode, 'own'); // the Fathers of Nicaea
  assert.equal(movableOf(52)?.e, 49); // Pentecost's
  assert.equal(movableOf(10)?.mode, 'paschal');
  assert.equal(movableOf(38)?.e, 0); // Pascha's leave-taking
  assert.equal(movableOf(-30), null); // a Lent weekday
  assert.equal(movableOf(-17), null); // the Great Canon's Thursday has no hymns of its own
});

test('the movable saints fall on their calendar days (2026, 2027)', () => {
  for (const y of [2026, 2027]) {
    const p = orthodoxEaster(y);
    assert.match(names(addDays(p, -52)), /შიო/, `${y}: Shio`);
    assert.match(names(addDays(p, 45)), /დოდო/, `${y}: Dodo`);
    assert.match(names(addDays(p, 46)), /დავით/, `${y}: David`);
  }
});

test('Great Compline and St Andrew', () => {
  // Lent 2027 begins on Monday 15 March: compline on Monday–Thursday evenings, the canon in the first week
  const p = orthodoxEaster(2027);
  const e = (iso: string) => Math.round((Date.parse(iso) - Date.parse(p)) / 864e5);
  assert.equal(complineEve(e('2027-03-16'), 2), true); // Monday evening
  assert.equal(complineEve(e('2027-03-20'), 6), false); // Friday evening
  assert.equal(andrewPart(e('2027-03-16')), 1);
  assert.equal(andrewPart(e('2027-03-19')), 4);
  assert.equal(andrewPart(e('2027-03-23')), null);
});

test('own services: every book exists and its day names the saint', () => {
  const KEY: Record<number, RegExp> = {
    1: /აბო/, 2: /არსენ იყალთო/, 3: /100000|ათთა ბევრთა/, 4: /ბეთანი/, 5: /გაბრიელ/, 6: /პროხორე/, 7: /ხანცთ|ხანძთ/, 8: /დოსითე/, 9: /ექვთიმე აღმსარებ/,
    10: /ექვთიმე ღმრთისკაც/, 11: /ვახტანგ/, 12: /ზენონ/, 13: /თამარ/, 14: /ივერიის/, 15: /გაბრიელ/, 16: /ულუმბ/, 17: /მიქაელ|მიზეილ/, 19: /სერაპიონ/, 20: /სერაფიმ/, 21: /სერგი/,
  };
  for (const o of OWN_SERVICES) {
    assert.ok(EXTRA_BOOKS.find(b => b.n === o.n && b.g === 'g'), `book ${o.n}`);
    if (!KEY[o.n]) continue; // „მოულოდნელი სიხარული“ is not in the Georgian calendar
    for (const md of o.md) {
      const iso = addDays(`2026-${md}`, 13);
      assert.match(names(iso), KEY[o.n], `${o.n} on ${iso}`);
    }
  }
});
