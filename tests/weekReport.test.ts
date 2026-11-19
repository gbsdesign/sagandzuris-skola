import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignmentDone, classWeek, longDay, memberWeek, practiceDays, practiceLabel, rangeLabel, readyLetter, shortName, weekRange, weekReport,
  type WeekAssignment,
} from '../src/utils/weekReport';

const today = '2026-11-18';
const days = (o: Record<string, [number, number, number]>) =>
  ({ aiLesson: { days: Object.fromEntries(Object.entries(o).map(([d, [min, learned, reviews]]) => [d, { min, learned, reviews }])) } });

test('good: lessons of the last seven days only', () => {
  const r = memberWeek({ uid: 'a', name: 'ნინო', data: days({ '2026-11-18': [10, 1, 2], '2026-11-12': [5, 1, 0], '2026-11-11': [30, 9, 9] }) }, today);
  assert.deepEqual([r.lessons, r.minutes, r.newPhrases, r.status], [2, 15, 2, 'good']);
  assert.equal(r.line, '2 გაკვეთილი · 2 ახალი ფრაზა');
});

test('skip: no lesson in the week', () => {
  const r = memberWeek({ uid: 'b', name: 'მარიამი', data: days({ '2026-11-01': [10, 1, 0] }) }, today);
  assert.equal(r.status, 'skip');
  assert.equal(r.line, 'ამ კვირაში არ უვარჯიშია');
  assert.equal(memberWeek({ uid: 'c', name: 'x', data: null }, today).status, 'skip');
});

test('help: a weak leap or mostly low takes', () => {
  const base = days({ '2026-11-17': [10, 0, 1] });
  const leap = memberWeek({ uid: 'g', name: 'გიორგი', data: { ...base, aiNote: { misses: { '62>67': { n: 3, last: '2026-11-17' } } } } }, today);
  assert.equal(leap.status, 'help');
  assert.equal(leap.line, '1 გაკვეთილი · გაიჭედა');
  const takes = [1, 2, 3].map(i => ({ d: '2026-11-1' + (4 + i), p: 'a~0', h: 1, n: 6 }));
  assert.equal(memberWeek({ uid: 'g', name: 'გ', data: { ...base, aiNote: { takes } } }, today).status, 'help');
  const fine = [1, 2, 3].map(i => ({ d: '2026-11-1' + (4 + i), p: 'a~0', h: 5, n: 6 }));
  assert.equal(memberWeek({ uid: 'g', name: 'გ', data: { ...base, aiNote: { takes: fine } } }, today).status, 'good');
});

test('totals and hours label', () => {
  assert.equal(practiceLabel(40), '40 წთ');
  assert.equal(practiceLabel(300), '5 სთ');
  assert.equal(practiceLabel(90), '1,5 სთ');
  const { totals } = weekReport([
    { uid: 'a', name: 'ა', data: days({ '2026-11-18': [30, 1, 0] }) },
    { uid: 'b', name: 'ბ', data: days({ '2026-11-17': [30, 1, 0], '2026-11-16': [30, 0, 0] }) },
  ], today);
  assert.deepEqual([totals.members, totals.lessons, totals.minutes, totals.practice], [2, 3, 90, '1,5 სთ']);
});

// ---- „კვირის შეჯამება“ -------------------------------------------------------------------------------------------------

const monday = '2026-11-16';

test('the week = the seven whole days before today, and its label', () => {
  assert.deepEqual(weekRange(monday), { from: '2026-11-09', to: '2026-11-15' });
  assert.equal(rangeLabel(weekRange(monday)), '9–15 ნოემბერი');
  assert.equal(rangeLabel(weekRange('2026-11-03')), '27 ოქტომბერი – 2 ნოემბერი');
  assert.equal(longDay('2026-11-01'), '1 ნოემბერი');
  assert.equal(shortName('ლუკა გიორგაძე'), 'ლუკა გ.');
  assert.equal(shortName('ნინო'), 'ნინო');
});

test('practice days: AI lessons, the learning mode, exercises, independent work', () => {
  const days = practiceDays({
    aiLesson: { days: { '2026-11-10': { min: 10 } } },
    learning: { 'v-1': { 0: { best: 80, level: 1, at: '2026-11-11' }, 1: { best: 20, level: 0, at: '2026-11-11T20:30:00.000Z' } } },
    drillDone: { 'm-hold': '2026-11-13' },
    completedSessions: { '2026-11-14_18': true, '2026-11-15_18': false },
    habitLog: { '2026-11-12': ['habit_1'] },
  });
  // 20:30 UTC is already the 12th in Tbilisi; habits and an unticked hour are not practice
  assert.deepEqual([...days].sort(), ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']);
  assert.equal(practiceDays(null).size, 0);
});

const work = (o: Partial<WeekAssignment>): WeekAssignment => ({ id: 'a', title: 'მხოლოდ-შობილი', voices: [], due: '2026-11-14', studentIds: [], ...o });

test('an assignment done: an exercise since given, voices marked, or every part learned', () => {
  const drill = work({ exercise: 'm-hold', createdAt: '2026-11-10T09:00:00Z' });
  assert.equal(assignmentDone(drill, { drillDone: { 'm-hold': '2026-11-12' } }), true);
  assert.equal(assignmentDone(drill, { drillDone: { 'm-hold': '2026-11-02' } }), false);
  const chant = work({ variantId: 'v-1', voices: ['2'] });
  assert.equal(assignmentDone(chant, { selectedChantVariants: { 'v-1': { voices: ['1', '2'] } } }), true);
  assert.equal(assignmentDone(chant, { selectedChantVariants: { 'v-1': { voices: '1' } } }), false);
  const learned = { learnParts: { 'v-1': 2 }, learning: { 'v-1': { 0: { best: 90, level: 1, at: '2026-11-11' }, 1: { best: 90, level: 2, at: '2026-11-12' } } } };
  assert.equal(assignmentDone(chant, learned), true);
});

const lessonsOn = (...ds: [string, string[]][]) => ds.map(([date, present]) => ({ date, present }));

test('classWeek: the three numbers and the two groups', () => {
  const members = [
    // practised five days, did both assignments
    { uid: 'n', name: 'ნინო ბერიძე', data: {
      aiLesson: { days: Object.fromEntries(['09', '10', '11', '12', '13'].map(d => [`2026-11-${d}`, { min: 10 }])) },
      drillDone: { 'm-hold': '2026-11-12' },
      selectedChantVariants: { 'v-1': { voices: ['1'] } },
    } },
    // nothing for two weeks
    { uid: 'l', name: 'ლუკა გიორგაძე', data: { drillDone: { 'm-hold': '2026-11-01' } } },
    // practised, but missed the lessons and an assignment's deadline
    { uid: 'a', name: 'ანა ქავთარაძე', data: { aiLesson: { days: { '2026-11-10': { min: 5 }, '2026-11-12': { min: 5 } } } } },
  ];
  const w = classWeek({
    members,
    attendance: lessonsOn(['2026-11-11', ['n', 'l', 'x']], ['2026-11-14', ['n', 'l']], ['2026-11-04', ['a']]),
    assignments: [
      work({ id: 'e', title: 'სავარჯიშო', exercise: 'm-hold', createdAt: '2026-11-08', due: '2026-11-20' }),
      work({ id: 'c', title: 'მხოლოდ-შობილი', variantId: 'v-1', voices: ['1'], due: '2026-11-14' }),
      work({ id: 'old', title: 'ძველი', variantId: 'v-2', due: '2026-11-01' }),
    ],
    today: monday,
    ai: false,
  });
  assert.equal(w.members, 3);
  assert.equal(w.practised, 2);
  // two lessons, three members: 4 of 6 came (a stranger's mark does not count)
  assert.equal(w.attendance, 67);
  assert.equal(w.workDone, 2);
  assert.deepEqual(w.good.map(r => r.uid), ['n']);
  assert.equal(w.good[0].line, '5 დღე ივარჯიშა · ორივე დავალება შეასრულა');
  assert.deepEqual(w.attention.map(r => r.uid), ['l', 'a']);
  assert.equal(w.attention[0].line, 'ორი კვირაა არ უვარჯიშია · დავალება ვადაში არ შეასრულა');
  assert.deepEqual(w.attention[1].concerns, ['missed', 'behind']);
  assert.equal(w.attention[1].line, '2 გაკვეთილი გააცდინა · დავალება ვადაში არ შეასრულა');
  assert.equal(w.attention[0].last, '2026-11-01');
});

test('classWeek: the AI lines only while it is on, and the teacher may say the AI erred', () => {
  const data = {
    aiLesson: { days: { '2026-11-10': { min: 10 }, '2026-11-12': { min: 10 }, '2026-11-14': { min: 10 } } },
    aiNote: { misses: { '62>67': { n: 3, last: '2026-11-14', p: 'v-9~2' } } },
    aiPass: { 'v-9': { 2: { at: '2026-11-13T18:00:00Z', hit: 49, total: 52 } }, 'v-8': { 1: { at: '2026-10-01', hit: 9, total: 9 } } },
  };
  const base = { members: [{ uid: 'g', name: 'გიორგი', data }], attendance: [], assignments: [], today: monday };
  const off = classWeek({ ...base, ai: false });
  assert.equal(off.rows[0].group, 'good');
  assert.deepEqual(off.rows[0].passes, []);
  assert.equal(off.workDone, null);
  assert.equal(off.attendance, null);
  const on = classWeek({ ...base, ai: true });
  assert.equal(on.rows[0].group, 'attention');
  assert.equal(on.rows[0].line, 'მე-3 ფრაზაზე ჩერდება');
  assert.deepEqual(on.rows[0].stuck, { piece: 'v-9', part: 2 });
  assert.deepEqual(on.rows[0].passes, [{ variantId: 'v-9', voice: '2', at: '2026-11-13' }]);
  // „AI შეცდა“ is kept on the member's record for that week only
  const erred = (week: string) => classWeek({ ...base, members: [{ uid: 'g', name: 'გიორგი', data: { ...data, aiErred: { week, by: 't' } } }], ai: true });
  const wrong = erred('2026-11-15');
  assert.equal(wrong.rows[0].group, 'good');
  assert.equal(wrong.rows[0].stuck, null);
  assert.deepEqual(wrong.rows[0].erred, { piece: 'v-9', part: 2 });
  assert.equal(wrong.rows[0].line, '3 დღე ივარჯიშა · AI-ს ერთი ხმა ჩააბარა');
  assert.equal(memberWeek({ uid: 'g', name: 'გიორგი', data: { ...data, aiErred: { week: '2026-11-15' } } }, '2026-11-15').status, 'good');
  assert.equal(memberWeek({ uid: 'g', name: 'გიორგი', data }, '2026-11-15').status, 'help');
  assert.equal(erred('2026-11-08').rows[0].group, 'attention');
  assert.equal(erred('2026-11-08').rows[0].erred, null);
});

test('readyLetter: kind words from the week', () => {
  const w = classWeek({
    members: [
      { uid: 'l', name: 'ლუკა გიორგაძე', data: { learning: { 'v-1': { 0: { best: 90, level: 1, due: '2026-11-15', at: '2026-11-01' } } } } },
      { uid: 'n', name: 'ნინო', data: { aiLesson: { days: { '2026-11-10': { min: 5 }, '2026-11-11': { min: 5 } } }, drillDone: { x: '2026-11-11' } } },
    ],
    attendance: [],
    assignments: [work({ exercise: 'x', createdAt: '2026-11-09', due: '2026-11-20' })],
    today: monday,
    ai: false,
  });
  const luka = w.rows[0];
  assert.equal(luka.repeat, 'v-1');
  assert.equal(readyLetter(luka), 'ლუკა, ეს კვირა როგორ მიდის? დღეში 10 წუთიც საკმარისია.');
  assert.equal(readyLetter(luka, { repeat: 'მხოლოდ-შობილი' }), 'ლუკა, ეს კვირა როგორ მიდის? დღეში 10 წუთიც საკმარისია. დაიწყე ამით: „მხოლოდ-შობილი“.');
  assert.equal(readyLetter(w.rows[1]), 'ნინო, ყოჩაღ! ამ კვირაში 2 დღე ივარჯიშე და დავალება შეასრულე. ასე გააგრძელე!');
});

// the reminders Worker's Monday notice counts the same as this screen (worker/reminders/reminders.js `weekCountOf`)
test('the Monday notice counts as the report does', async () => {
  const { weekCountOf } = await import('../worker/reminders/reminders.js');
  const records: Record<string, Record<string, any>> = {
    n: { aiLesson: { days: { '2026-11-09': { min: 10 }, '2026-11-12': { min: 10 } } }, drillDone: { 'm-hold': '2026-11-12' },
      selectedChantVariants: { 'v-1': { voices: '1' } } },
    l: { drillDone: { 'm-hold': '2026-11-01' } },
    a: { aiLesson: { days: { '2026-11-10': { min: 5 }, '2026-11-12': { min: 5 } } }, drillDone: { 'm-hold': '2026-11-10' },
      learnParts: { 'song-v-1-t1': 2 }, learning: { 'song-v-1-t1': { 0: { best: 90, level: 1, at: '2026-11-11' }, 1: { best: 90, level: 1, at: '2026-11-11' } } } },
    g: { aiLesson: { days: { '2026-11-10': { min: 10 }, '2026-11-12': { min: 10 }, '2026-11-14': { min: 10 } } }, drillDone: { 'm-hold': '2026-11-14' },
      selectedChantVariants: { 'v-1': { voices: ['1'] } }, aiNote: { misses: { '62>67': { n: 3, last: '2026-11-14', p: 'v-9~2' } } } },
    e: { aiLesson: { days: { '2026-11-10': { min: 10 }, '2026-11-13': { min: 10 } } }, drillDone: { 'm-hold': '2026-11-13' },
      selectedChantVariants: { 'v-1': { voices: ['1'] } }, aiErred: { week: '2026-11-15', by: 't' },
      aiNote: { takes: [{ d: '2026-11-10', p: 'v-9~1', h: 1, n: 10 }, { d: '2026-11-11', p: 'v-9~1', h: 2, n: 10 }, { d: '2026-11-13', p: 'v-9~1', h: 3, n: 10 }] } },
  };
  const uids = Object.keys(records);
  const attendance = lessonsOn(['2026-11-11', ['n', 'l', 'g', 'e', 'x']], ['2026-11-14', ['n', 'g', 'e']], ['2026-11-04', ['a']]);
  const assignments = [
    work({ id: 'e', title: 'სავარჯიშო', exercise: 'm-hold', createdAt: '2026-11-08', due: '2026-11-20' }),
    work({ id: 'c', title: 'მხოლოდ-შობილი', variantId: 'v-1', voices: ['1'], due: '2026-11-14' }),
    work({ id: 'n2', title: 'ნინოს', variantId: 'v-7', due: '2026-11-13', studentIds: ['n'] }),
  ];
  for (const ai of [false, true]) {
    const site = classWeek({ members: uids.map(uid => ({ uid, name: uid, data: records[uid] })), attendance, assignments, today: monday, ai });
    const worker = weekCountOf({
      members: uids, students: new Map(Object.entries(records)), lessons: attendance, work: assignments, day: monday, ai,
    });
    assert.deepEqual(worker, { members: site.members, practised: site.practised, attention: site.attention.length, attendance: site.attendance });
  }
});
