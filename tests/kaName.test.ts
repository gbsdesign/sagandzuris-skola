import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kaName } from '../src/utils/georgianName';

test('Latin names are shown in Georgian letters (2026-11-22)', () => {
  assert.equal(kaName('giorgi Tskhovrebashvili'), 'გიორგი ცხოვრებაშვილი');
  assert.equal(kaName('Zura Tsiklauri'), 'ზურა ციკლაური');
  assert.equal(kaName("Nino Ts'ereteli"), 'ნინო წერეთელი');
  assert.equal(kaName('Ketevan Beridze'), 'ქეთევან ბერიძე');
  assert.equal(kaName('ზურა ხიხაძე'), 'ზურა ხიხაძე');
  assert.equal(kaName(''), '');
});
