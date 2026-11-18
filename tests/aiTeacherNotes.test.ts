import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFor, fromDay, makeNote, noteLine, newNoteId, withNote, withoutNote } from '../src/utils/aiTeacherNotes';

const n = (id: string, at: string, text = 'ტექსტი') => ({ id, text, at, by: 'u', byName: 'ნ' });

test('noteLine names who and from when', () => {
  assert.equal(noteLine(n('a', '2026-11-03T10:00:00Z'), 'class'), 'მთელ კლასს · 3 ნოემბრიდან');
  assert.equal(noteLine(n('a', '2026-11-10T10:00:00Z'), 'student'), 'ერთ მოსწავლეს · 10 ნოემბრიდან');
  assert.equal(noteLine({ at: '' }, 'class'), 'მთელ კლასს');
  assert.equal(fromDay('2026-01-01'), '1 იანვრიდან');
});

test('activeFor joins, drops empties, sorts newest first, filters other classes', () => {
  const cls = [n('c1', '2026-11-03T00:00:00Z'), n('c2', '2026-11-01T00:00:00Z', '  ')];
  const st = [{ ...n('s1', '2026-11-10T00:00:00Z'), classId: 'A' }, { ...n('s2', '2026-11-12T00:00:00Z'), classId: 'B' }];
  const all = activeFor(cls, st);
  assert.deepEqual(all.map(a => a.note.id), ['s2', 's1', 'c1']);
  assert.deepEqual(all.map(a => a.kind), ['student', 'student', 'class']);
  assert.deepEqual(activeFor(cls, st, 'A').map(a => a.note.id), ['s1', 'c1']);
  assert.deepEqual(activeFor(undefined, 'x'), []);
});

test('makeNote trims, cuts and refuses empty; add and remove keep the rest', () => {
  assert.equal(makeNote('   ', 'u', 'ნ'), null);
  assert.equal(makeNote('ა'.repeat(400), 'u', 'ნ')!.text.length, 300);
  const a = makeNote('ერთი', 'u', 'ნ')!;
  const b = makeNote('ორი', 'u', 'ნ', new Date(Date.now() + 5))!;
  assert.notEqual(a.id, b.id);
  const list = withNote(withNote(undefined, a), b);
  assert.deepEqual(withoutNote(list, a.id).map(x => x.id), [b.id]);
  assert.deepEqual(withoutNote(undefined, 'x'), []);
  assert.match(newNoteId(), /^n[0-9a-z]+$/);
});
