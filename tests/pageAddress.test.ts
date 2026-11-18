import test from 'node:test';
import assert from 'node:assert/strict';
import { addressOf, snapOfAddress, type PageSnap } from '../src/utils/pageAddress';

const snap = (p: Partial<PageSnap>): PageSnap => ({ page: 'home', service: null, classId: null, prayerId: null, mapItem: null, dmId: null, ...p });

test('a page and what is open on it make an address and come back from it', () => {
  const cases: PageSnap[] = [
    snap({ page: 'galoba', service: 'წირვა' }),
    snap({ page: 'galoba' }),
    snap({ page: 'class', classId: 'abc123' }),
    snap({ page: 'prayer', prayerId: 'morning' }),
    snap({ page: 'dm', dmId: 'u1_u2' }),
    snap({ page: 'simghera', mapItem: 'kakheti~i' }),
    snap({ page: 'biblioteka', mapItem: 'lives:m9' }),
    snap({ page: 'churches', mapItem: 'imereti/1960dc5d' }),
    snap({ page: 'settings' }),
  ];
  for (const c of cases) {
    const a = addressOf(c);
    assert.ok(a.startsWith('/p/'), a);
    assert.deepEqual(snapOfAddress(a), c, a);
  }
  assert.equal(addressOf(snap({ page: 'galoba', service: 'წირვა' })), '/p/galoba/tsirva');
});

test('home, a student page and anything else are no page address', () => {
  assert.equal(addressOf(snap({ page: 'home' })), '/');
  assert.equal(addressOf(snap({ page: 'student', mapItem: 'u|c' })), '/');
  assert.equal(snapOfAddress('/'), null);
  assert.equal(snapOfAddress('/notes/x.json'), null);
  assert.equal(snapOfAddress('/p/student/u'), null);
  assert.equal(snapOfAddress('/p/nope'), null);
  assert.deepEqual(snapOfAddress('/p/galoba/%E0%A4'), snapOfAddress('/p/galoba'));
});
