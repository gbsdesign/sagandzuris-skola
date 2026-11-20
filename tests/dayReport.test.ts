// „შეცდომა ვნახე“ (utils/dayReport): the letter names the place so that the administration can find it again.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REPORT_MAX, placeLine, reportText, type ReportPlace } from '../src/utils/dayReport';

const place: ReportPlace = {
  iso: '2026-11-21', day: 'შაბათი, 21 ნოემბერი', service: 'მწუხრი', n: 5, step: '„უფალო, ღაღად-ვყავ“',
  setup: ['ხმა 7', ' პოლიელეი ', '', 'ტაძარი: წმ. გიორგი'],
};

test('the place in one line', () => {
  assert.equal(placeLine(place), 'შაბათი, 21 ნოემბერი · მწუხრი · 5. „უფალო, ღაღად-ვყავ“');
});

test('the letter: heading, place with its date, the page\'s setup, the reader\'s words', () => {
  const lines = reportText(place, '  აქ სხვა ტროპარი იკითხება  ').split('\n');
  assert.equal(lines.length, 5);
  assert.match(lines[0], /შეცდომა ვნახე/);
  assert.equal(lines[1], `${placeLine(place)} (2026-11-21)`);
  assert.equal(lines[2], 'ხმა 7 · პოლიელეი · ტაძარი: წმ. გიორგი');
  assert.equal(lines[3], '');
  assert.equal(lines[4], 'აქ სხვა ტროპარი იკითხება');
});

test('no setup — no empty line for it; long words are cut; the letter fits a chat message', () => {
  const lines = reportText({ ...place, setup: [] }, 'ა'.repeat(5000)).split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[3].length, REPORT_MAX);
  assert.ok(reportText(place, 'ა'.repeat(5000)).length <= 2000);
});
