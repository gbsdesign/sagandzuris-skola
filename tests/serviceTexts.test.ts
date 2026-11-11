import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  sliceOf, octoechos, menaion, sundayExapost, weekdayExapost, sundayProkeimenon, saintProkeimenon, pentecostarion,
  saintKindOf, gospelNumberOf, type TextSrc, type OctoSeg, type MenaionSeg,
} from '../src/utils/serviceTexts';

const load = (coll: string, n: number) =>
  JSON.parse(readFileSync(new URL(`../public/wignebi/${coll}/${String(n).padStart(2, '0')}.json`, import.meta.url), 'utf8'));
const got = (src: TextSrc | null) => {
  assert.ok(src);
  const f = load(src.coll, src.n);
  assert.ok(f.c[src.part], `${src.label}: no part ${src.part}`);
  return sliceOf(f.c[src.part].s, src);
};

test('the Octoechos has every piece for every tone and evening', () => {
  const week: OctoSeg[] = ['stichera', 'aposticha', 'sedalens', 'canon', 'beatitudes'];
  const sun: OctoSeg[] = ['stichera', 'aposticha', 'troparion', 'sedalens', 'antiphons', 'prokeimenon', 'canon', 'lauds', 'beatitudes'];
  for (let tone = 1; tone <= 8; tone++) {
    for (let eve = 0; eve < 6; eve++) for (const seg of week) {
      const s = got(octoechos(tone, eve, seg));
      assert.ok(s.length > 0, `tone ${tone} eve ${eve} ${seg}`);
      assert.ok(s.length < 80, `tone ${tone} eve ${eve} ${seg} too long: ${s.length}`);
    }
    for (const seg of sun) assert.ok(got(octoechos(tone, 6, seg)).length > 0, `tone ${tone} Sunday ${seg}`);
  }
});

test('the common services have their pieces', () => {
  const segs: MenaionSeg[] = ['stichera', 'aposticha', 'canon', 'lauds'];
  for (let k = 1; k <= 15; k++) for (const seg of segs) assert.ok(got(menaion(k, seg)).length > 0, `kind ${k} ${seg}`);
});

test('exapostilaria, prokeimena, the Pentecostarion', () => {
  for (let g = 1; g <= 11; g++) assert.ok(got(sundayExapost(g)).length >= 2, `gospel ${g}`);
  for (let d = 1; d <= 6; d++) assert.ok(got(weekdayExapost(d)).length >= 1, `weekday ${d}`);
  for (let t = 1; t <= 8; t++) assert.ok(got(sundayProkeimenon(t)).length >= 1);
  for (let k = 1; k <= 15; k++) assert.ok(got(saintProkeimenon(k)).length >= 1);
  for (let e = 0; e <= 56; e++) assert.ok(got(pentecostarion(e)).length > 0, `easter +${e}`);
});

test("a saint's kind and the Gospel number from the calendar", () => {
  assert.equal(saintKindOf('მოწამისა ნესტორ თესალონიკელისა (306)'), 5);
  assert.equal(saintKindOf('მოწამეთა: კაპეტოლინესი და ეროდიტესი'), 6);
  assert.equal(saintKindOf('მღვდელმოწამისა მილისა, სპარსელი ეპისკოპოსისა'), 7);
  assert.equal(saintKindOf('ღირსისა მამისა ჩვენისა სერაპიონ ზარზმელისა'), 12);
  assert.equal(saintKindOf('წმიდისა იოანე ოქროპირისა, კონსტანტინოპოლელი მთავარეპისკოპოსისა'), 4);
  assert.equal(saintKindOf('მოციქულთა 70-თაგანთა: ერასტისა'), 3);
  assert.equal(gospelNumberOf('ცისკ.: სახ. მე-10, ინ. 21: 1-14'), 10);
});
