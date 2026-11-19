import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PEOPLE, MAX_TEXT, assistantPrompt, buildScope, checkPlan, contextText, draftOf, parseAnswer, planFromAi, readyAsks,
  type ScopeInput,
} from '../src/utils/aiAssistant';

const today = '2026-11-18';
const now = Date.parse('2026-11-18T12:00:00Z');

const input = (over: Partial<ScopeInput> = {}): ScopeInput => ({
  me: 't1',
  admin: false,
  today,
  now,
  classes: [
    {
      id: 'A', name: 'ახალგაზრდები', teacherIds: ['t1'], teachers: [{ uid: 't1', name: 'გიორგი მასწ' }],
      members: [{ uid: 'u1', name: 'ნინო ბერიძე' }, { uid: 'u2', name: 'ნინო გელაშვილი' }, { uid: 'u3', name: 'ლევანი' }],
      schedule: [{ day: 1, start: '18:00', end: '20:00' }],
    },
  ],
  records: {
    u1: { profile: { abilities: ['beginner'] }, lastActiveAt: '2026-11-16T10:00:00Z', email: 'x@y.ge', profile_phone: '+995555', aiLesson: { days: { '2026-11-17': { min: 10, learned: 2 } } } },
    u2: { profile: { experienceLevel: 'ვგალობ', phone: '+995599000000' } },
  },
  ...over,
});

test('the scope: refs, first names, two Ninos told apart, beginners and the class a letter goes through', () => {
  const s = buildScope(input());
  assert.deepEqual(s.people.map(p => [p.ref, p.short]), [['p1', 'ნინო ბ.'], ['p2', 'ნინო გ.'], ['p3', 'ლევანი']]);
  assert.equal(s.people[0].beginner, true);
  assert.equal(s.people[1].beginner, false);
  assert.equal(s.people[0].via, 'A');
  assert.equal(s.people[0].lastActive, 2);
  assert.equal(s.people[2].known, false);
  assert.equal(s.classes[0].ref, 'c1');
});

test('what the AI is told carries no e-mail, phone or uid', () => {
  const s = buildScope(input());
  const text = assistantPrompt(s, [{ who: 'me', text: 'გამარჯობა' }], 'შემიჯამე');
  for (const secret of ['x@y.ge', '+995', 'u1', 'u2', 'ბერიძე', 'გელაშვილი']) assert.ok(!text.includes(secret), secret);
  assert.match(contextText(s), /p1 ნინო ბ\. · კლასი: c1 · დამწყები/);
  // a teacher is told a class is the admin's to make
  assert.match(text, /კლასს მხოლოდ ადმინი ქმნის/);
});

test('an admin sees people outside the classes too; a teacher does not', () => {
  const others = [{ uid: 'o1', name: 'მარიამი' }];
  assert.equal(buildScope(input({ others })).people.length, 3);
  const a = buildScope(input({ admin: true, me: 'adm', others }));
  assert.equal(a.people.length, 4);
  assert.equal(a.people.find(p => p.uid === 'o1')?.via, null);
  // the admin does not teach A: a letter goes through the administration's chat
  assert.equal(a.people[0].via, null);
});

test('parseAnswer: words, a plan, fences, nonsense', () => {
  assert.deepEqual(parseAnswer('{"say":"**კარგად** არიან"}'), { say: 'კარგად არიან' });
  const a = parseAnswer('```json\n{"say":"ასე","plan":{"kind":"message","to":["p1"],"text":"გამარჯობა"}}\n```');
  assert.equal(a?.say, 'ასე');
  assert.ok(a?.plan);
  assert.equal(parseAnswer('not json'), null);
  assert.equal(parseAnswer('{"say":""}'), null);
  assert.equal(parseAnswer('[1,2]'), null);
});

test('a private letter: refs become people; strangers, myself, too many and long texts are refused', () => {
  const s = buildScope(input());
  const ok = checkPlan(planFromAi({ kind: 'message', to: ['p1', 'p3', 'p1'], text: ' ივარჯიშე ', label: 'დამწყები' }, s)!, s);
  assert.ok(ok.ok);
  if (ok.ok && ok.plan.kind === 'message') {
    assert.deepEqual(ok.plan.to.map(p => [p.uid, p.via]), [['u1', 'A'], ['u3', 'A']]);
    assert.equal(ok.plan.text, 'ივარჯიშე');
    assert.deepEqual(checkPlan(draftOf(ok.plan), s), ok);
  }
  assert.equal(checkPlan({ kind: 'message', to: ['zzz'], text: 'a' }, s).ok, false);
  assert.equal(checkPlan(planFromAi({ kind: 'message', to: ['p9'], text: 'a' }, s)!, s).ok, false);
  assert.equal(checkPlan({ kind: 'message', to: ['t1'], text: 'a' }, s).ok, false);
  assert.equal(checkPlan({ kind: 'message', to: ['u1'], text: '  ' }, s).ok, false);
  assert.equal(checkPlan({ kind: 'message', to: ['u1'], text: 'ა'.repeat(MAX_TEXT) }, s).ok, true);
  assert.equal(checkPlan({ kind: 'message', to: ['u1'], text: 'ა'.repeat(MAX_TEXT + 1) }, s).ok, false);

  const many = Array.from({ length: MAX_PEOPLE + 1 }, (_, i) => ({ uid: `m${i}`, name: `წევრი${i}` }));
  const big = buildScope(input({ classes: [{ ...input().classes[0], members: many }] }));
  assert.equal(checkPlan({ kind: 'message', to: many.slice(0, MAX_PEOPLE).map(m => m.uid), text: 'a' }, big).ok, true);
  const over = checkPlan({ kind: 'message', to: many.map(m => m.uid), text: 'a' }, big);
  assert.equal(over.ok, false);
});

test('a class chat: only a class in reach', () => {
  const s = buildScope(input());
  const ok = checkPlan(planFromAi({ kind: 'classMessage', classId: 'c1', text: 'ხვალ გაკვეთილია' }, s)!, s);
  assert.ok(ok.ok && ok.plan.kind === 'classMessage' && ok.plan.classId === 'A' && ok.plan.className === 'ახალგაზრდები');
  assert.equal(checkPlan({ kind: 'classMessage', classId: 'B', text: 'a' }, s).ok, false);
  assert.equal(checkPlan(planFromAi({ kind: 'classMessage', classId: 'c2', text: 'a' }, s)!, s).ok, false);
});

test('a new class: admins only; its name, days and times are checked', () => {
  const teacher = buildScope(input());
  const raw = { kind: 'createClass', name: '„ახალგაზრდები“', slots: [{ day: 1, start: '9:00', end: '10:30' }], to: ['p1'] };
  assert.equal(checkPlan(planFromAi(raw, teacher)!, teacher).ok, false);

  const admin = buildScope(input({ admin: true, me: 'adm' }));
  const ok = checkPlan(planFromAi(raw, admin)!, admin);
  assert.ok(ok.ok);
  if (ok.ok && ok.plan.kind === 'createClass') {
    assert.equal(ok.plan.name, 'ახალგაზრდები');
    assert.deepEqual(ok.plan.slots, [{ day: 1, start: '09:00', end: '10:30' }]);
    assert.deepEqual(ok.plan.members.map(m => m.uid), ['u1']);
    assert.equal(ok.plan.teachMe, true);
  }
  const bad = (d: object) => checkPlan({ kind: 'createClass', name: 'X', ...d }, admin).ok;
  assert.equal(bad({ name: ' ' }), false);
  assert.equal(bad({ name: 'ა'.repeat(61) }), false);
  assert.equal(bad({ slots: [{ day: 7, start: '18:00' }] }), false);
  assert.equal(bad({ slots: [{ day: 1, start: '25:00' }] }), false);
  assert.equal(bad({ slots: [{ day: 1, start: '18:00', end: '17:00' }] }), false);
  assert.equal(bad({ to: ['nobody'] }), false);
  assert.equal(bad({}), true);
  assert.equal(checkPlan(planFromAi({ kind: 'createClass', name: 'X', teachMe: false }, admin)!, admin).ok, true);
});

test('unknown kinds are not plans; the ready requests suit the role', () => {
  const s = buildScope(input());
  assert.equal(planFromAi({ kind: 'deleteClass' }, s), null);
  assert.equal(planFromAi('x', s), null);
  assert.deepEqual(readyAsks(true).map(a => a.label), ['შემიჯამე მოსწავლეები', 'მიწერე დამწყებებს', 'შექმენი კლასი']);
  assert.ok(!readyAsks(false).some(a => a.label === 'შექმენი კლასი'));
});
