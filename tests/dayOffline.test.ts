// The files a day's services read their texts from (utils/dayOffline): the reader's page asks for them all once so that the
// day opens in a church without internet. Every file named must exist, and the list must hold what the services open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { DEFAULT_ORDER, PATRON_PRESETS, buildServices, guessRank, type DayInput, type Patron, type Rank } from '../src/utils/dayService';
import { bibleUrl, bookUrl, dayFiles, daySignature, monthFile } from '../src/utils/dayOffline';
import { addDays } from '../src/data/churchFeasts';

const root = new URL('../', import.meta.url);
const cal: Record<string, DayInput['day']> = {
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2026.json', root), 'utf8')).days,
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2027.json', root), 'utf8')).days,
};
const george = PATRON_PRESETS.find(p => p.id === 'giorgoba') as Patron;
const input = (iso: string, more: Partial<DayInput> = {}): DayInput => {
  const day = cal[iso] ?? null;
  return { iso, day, prev: cal[addDays(iso, -1)] ?? null, tone: 7, rank: guessRank(iso, day, null), patron: null, order: DEFAULT_ORDER, ...more };
};

test('the month files of ჟამნი and the files\' addresses', () => {
  assert.equal(monthFile(9), 13);
  assert.equal(monthFile(8), 24);
  assert.equal(monthFile(1), 17);
  assert.equal(bookUrl('jamni', 4), '/wignebi/jamni/04.json');
  assert.equal(bookUrl('x', 12), '/wignebi-x/12.json');
  assert.equal(bibleUrl('romaelta'), '/bible/romaelta.json');
});

test('every file a day needs exists — through a whole year, with and without a temple', () => {
  let days = 0;
  for (let iso = '2026-11-19'; iso <= '2027-11-18'; iso = addDays(iso, 1)) {
    // every third day with a temple's name, so that its files are checked too without tripling the run
    const inp = input(iso, days % 3 === 0 ? { patron: george } : {});
    const files = dayFiles(inp);
    assert.ok(files.length >= 1, `${iso}: no files`);
    assert.ok(files.length <= 40, `${iso}: ${files.length} files — too many for a quiet download`);
    for (const f of files) assert.ok(existsSync(new URL(`public${f}`, root)), `${iso}: ${f} is not in the app`);
    days++;
  }
  assert.ok(days >= 365);
});

test('the list holds what the services open: kanons, the reader\'s texts, the saint\'s month, the Apostle', () => {
  const inp = input('2026-11-19');
  const files = dayFiles(inp);
  // the psalter's kanons the steps read
  const kanons = buildServices(inp).flatMap(s => s.steps).flatMap(st => st.read ?? []).flatMap(r => ('kathisma' in r ? [r.kathisma] : []));
  assert.ok(kanons.length > 0);
  for (const n of kanons) assert.ok(files.includes(bookUrl('davitni', n)), `kanon ${n}`);
  // 19 November = 6 November old style: ჟამნი's November
  assert.ok(files.includes(bookUrl('jamni', monthFile(11))));
  // the weekday's troparia and the day's Apostle (2 Thessalonians)
  assert.ok(files.includes(bookUrl('jamni', 28)));
  assert.ok(files.includes(bibleUrl('2tesalonikelta')));
  // sorted and without repeats
  assert.deepEqual(files, [...new Set(files)].sort());
});

test('the signature follows what changes the files', () => {
  const a = input('2026-11-19');
  assert.equal(daySignature(a), daySignature(input('2026-11-19')));
  assert.notEqual(daySignature(a), daySignature(input('2026-11-19', { rank: 'polyeleos' as Rank })));
  assert.notEqual(daySignature(a), daySignature(input('2026-11-19', { patron: george })));
  assert.notEqual(daySignature(a), daySignature(input('2026-11-19', { tone: 3 })));
  assert.notEqual(daySignature(a), daySignature(input('2026-11-19', { order: { sat: 'vigil', weekday: 'joined' } })));
  assert.notEqual(daySignature(a), daySignature(input('2026-11-20')));
});
