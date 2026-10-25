import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mentionsName, nameDayCandidates, nameExcerpt, nameStem } from '../src/utils/nameDayMatch';
import type { CalendarDay } from '../src/data/churchCalendar';

test('stems: a consonant stem loses its „ი“, a vowel stem stays', () => {
  assert.equal(nameStem('გიორგი'), 'გიორგ');
  assert.equal(nameStem('ნინო'), 'ნინო');
  assert.equal(nameStem('მარიამ'), 'მარიამ');
  assert.equal(nameStem('ანა ბერიძე'), 'ანა');
});

test('a name is found in its calendar cases, not inside a longer name', () => {
  assert.ok(mentionsName('ღირსისა გიორგი მალეელისა, მდუმარისა', 'გიორგი'));
  assert.ok(mentionsName('ღირსისა გიორგისა, მაწყვერელ ეპისკოპოსისა', 'გიორგი'));
  assert.ok(mentionsName('წმიდათა მენელსაცხებლეთა დედათა: მარიამ მაგდალელისა, მარიამ კლეოპასი, სალომესი', 'სალომე'));
  assert.ok(mentionsName('კეთილმსახურისა თამარისა, მეფისა ყოვლისა საქართველოისა', 'თამარ'));
  assert.ok(mentionsName('ნაწილთა აღმოყვანება ღირსთა – იოანე და გიორგი-იოანე აღმსარებელთა', 'გიორგი'));
  assert.ok(!mentionsName('მოწამეთა ბასილისასი და ანასტასიასი', 'ანა'));
  assert.ok(!mentionsName('მოწამისა ირინესი', 'ირაკლი'));
});

test('a long line is cut down to the words around the name', () => {
  const line = 'მოწამეთა, რომელნი გუთეთში იწამნეს: ორთა ხუცესთა - ბათოსი და უირიკასი, ორთა ძეთა და ორთა ასულთა თანა მათთა და არპლა მონოზონისა, ერისკაცთა: ავიპასი, კოსტასი, დედათა: ანასი, ალასი, ბარკასი, მოიკოსი';
  const e = nameExcerpt(line, 'ანა');
  assert.ok(e.includes('ანასი'), e);
  assert.ok(e.startsWith('… '), e);
  assert.ok(e.length <= 96, e);
  assert.equal(nameExcerpt('ღირსისა ნინოსი', 'ნინო'), 'ღირსისა ნინოსი');
});

test('candidates come in calendar order with the date and the line', () => {
  const day = (n: string, b?: 1): CalendarDay => ({ t: '', p: [], s: [{ n, ...(b ? { b } : {}) }] });
  const days = { '2026-11-23': day('წმიდისა დიდმოწამისა გიორგისა ბორბალზე წამება', 1), '2026-05-06': day('დიდმოწამისა გიორგისა'), '2026-05-07': day('მოწამისა ირინესი') };
  const c = nameDayCandidates(days, 'გიორგი');
  assert.deepEqual(c.map(x => x.iso), ['2026-05-06', '2026-11-23']);
  assert.equal(c[1].feast, true);
  assert.equal(c[1].month, 11);
  assert.equal(c[1].day, 23);
});
