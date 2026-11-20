import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScope, type ScopeInput } from '../src/utils/aiAssistant';
import { GONE_DAYS, nextSteps, noticedIn, offersFor, pageName } from '../src/utils/programOffers';

const today = '2026-11-18';
const now = Date.parse('2026-11-18T12:00:00Z');

const input = (records: ScopeInput['records'], over: Partial<ScopeInput> = {}): ScopeInput => ({
  me: 't1',
  admin: false,
  today,
  now,
  classes: [{
    id: 'A', name: 'ახალგაზრდები', teacherIds: ['t1'], teachers: [{ uid: 't1', name: 'გიორგი' }],
    members: [{ uid: 'u1', name: 'ნინო' }, { uid: 'u2', name: 'ლევანი' }, { uid: 'u3', name: 'ანა' }],
    schedule: [],
  }],
  records,
  ...over,
});

test('a page in words: a class by its name, an unknown page is „აპი“', () => {
  assert.equal(pageName('gz'), 'საგანძურის გზა');
  assert.equal(pageName('class', 'ახალგაზრდები'), 'კლასი „ახალგაზრდები“');
  assert.equal(pageName('class'), 'კლასი');
  assert.equal(pageName('no-such-page'), 'აპი');
});

test('the ready requests: the page\'s own first, none twice, a class only for admins', () => {
  const cls = offersFor({ admin: false, page: 'class', className: 'ახალგაზრდები', classes: 1 });
  assert.equal(cls[0].group, 'here');
  assert.ok(cls.filter(o => o.group === 'here').length >= 5);
  assert.ok(cls.some(o => o.text.includes('„ახალგაზრდები“')));
  assert.equal(new Set(cls.map(o => o.label)).size, cls.length);
  assert.ok(!cls.some(o => o.label === 'შექმენი კლასი'));

  const home = offersFor({ admin: true, page: 'home', classes: 3 });
  assert.ok(home.every(o => o.group === 'more'));
  assert.ok(home.length >= 7);
  assert.ok(home.some(o => o.label === 'შექმენი კლასი'));

  const admin = offersFor({ admin: true, page: 'admin', classes: 3 });
  assert.equal(admin.filter(o => o.label === 'შექმენი კლასი').length, 1);
  assert.equal(admin.find(o => o.label === 'შექმენი კლასი')!.group, 'here');

  // a class page with no class to see: nothing about „this class“
  assert.ok(offersFor({ admin: false, page: 'class', classes: 0 }).every(o => o.group === 'more'));
  // a request to finish is put in the field, a whole one is sent
  assert.ok(cls.every(o => o.send !== o.text.endsWith(' ')));
});

test('what the program noticed: the ones gone a week first, else idle beginners, else nothing', () => {
  const gone = buildScope(input({
    u1: { lastActiveAt: '2026-11-01T10:00:00Z' },
    u2: { lastActiveAt: '2026-11-17T10:00:00Z' },
    u3: { lastActiveAt: '2026-11-05T10:00:00Z' },
  }));
  const n = noticedIn(gone)!;
  assert.ok(n.text.startsWith(`2 მოსწავლე ${GONE_DAYS} დღეა`));
  assert.ok(n.ask.length > 10);

  const idle = buildScope(input({
    u1: { profile: { abilities: ['beginner'] }, lastActiveAt: '2026-11-17T10:00:00Z' },
    u2: { lastActiveAt: '2026-11-17T10:00:00Z' },
  }));
  assert.ok(noticedIn(idle)!.text.startsWith('1 დამწყებს'));

  const fine = buildScope(input({ u2: { lastActiveAt: '2026-11-17T10:00:00Z' } }));
  assert.equal(noticedIn(fine), null);
  // someone never seen is not „gone“
  assert.equal(noticedIn(buildScope(input({ u1: {} }))), null);
});

test('the next steps: three, one to finish in the field', () => {
  const steps = nextSteps();
  assert.equal(steps.length, 3);
  assert.equal(steps.filter(s => !s.send).length, 1);
});
