// Run: npx tsx --test tests/churchFeasts.test.ts
// „დღეს ტაძრობაა“: every feast's date stands in the church calendar, Easter is right, names find their feast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEAST_RULES, feastDay, feastOf, nextFeastDay, orthodoxEaster } from '../src/data/churchFeasts';

const cal = JSON.parse(readFileSync(new URL('../src/data/calendar/2026.json', import.meta.url), 'utf8')).days as Record<string, unknown>;
const textOf = (v: unknown): string =>
  typeof v === 'string' ? v : Array.isArray(v) ? v.map(textOf).join(' ') : v && typeof v === 'object' ? Object.values(v).map(textOf).join(' ') : '';

test('each feast falls on a day whose calendar line names it', () => {
  for (const f of FEAST_RULES) {
    // the 2026 file runs from 14 January 2026 to 13 January 2027
    let day = feastDay(f, 2026);
    if (day < '2026-01-14') day = feastDay(f, 2027);
    const line = textOf(cal[day]);
    assert.ok(line.includes(f.check), `${f.label} (${day}): „${f.check}“ not in „${line.slice(0, 120)}“`);
  }
});

test('Orthodox Easter', () => {
  assert.equal(orthodoxEaster(2025), '2025-04-20');
  assert.equal(orthodoxEaster(2026), '2026-04-12');
  assert.equal(orthodoxEaster(2027), '2027-05-02');
});

const f = (name: string) => feastOf({ id: name, name })?.id ?? null;

test('names find their feast, the specific before the general', () => {
  assert.equal(f('წმინდა გიორგის სახელობის ეკლესია'), 'giorgoba');
  assert.equal(f('ღვთისმშობლის მიძინების სახელობის ეკლესია'), 'mariamoba');
  assert.equal(f('ყოვლადწმიდა ღვთისმშობლის შობის მამათა მონასტერი'), 'mariam-shoba');
  assert.equal(f('იოანე ნათლისმცემლის შობის სახელობის ეკლესია'), 'ioane-shoba');
  assert.equal(f('მაცხოვრის შობის სახელობის ეკლესია'), 'shoba');
  assert.equal(f('ჯვართამაღლების ეკლესია'), 'jvari');
  assert.equal(f('მაცხოვრის ამაღლების ეკლესია'), 'amagleba');
  assert.equal(f('ბერი გაბრიელის დედათა მონასტერი'), 'gabriel-beri');
  assert.equal(f('ნინოწმინდის სამონასტრო კომპლექსი'), null);
  assert.equal(f('ღვთისმშობლის სახელობის ეკლესია'), null);
});

test('the next feast day comes from today on', () => {
  const g = FEAST_RULES.find(r => r.id === 'giorgoba')!;
  assert.equal(nextFeastDay(g, '2026-11-07'), '2026-11-23');
  assert.equal(nextFeastDay(g, '2026-11-24'), '2027-11-23');
  assert.equal(nextFeastDay(g, '2026-11-23'), '2026-11-23');
});
