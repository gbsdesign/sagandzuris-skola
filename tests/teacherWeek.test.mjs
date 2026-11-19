// The reminders Worker's Monday notice to teachers (2026-11-19, board x-idea-kvira-0): when, to whom, and the words.
// tests/weekReport.test.ts checks that the Worker counts as the site's week report does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiStuckOf, isTeacherWeekTime, practiceDaysOf, teacherWeekNotices, teacherWeekText, weekBefore, workDoneOf,
} from '../worker/reminders/reminders.js';

const at = (d, h, m) => new Date(Date.UTC(2026, 10, d, h - 4, m)); // Tbilisi = UTC+4

test('Monday from 09:00 in Tbilisi', () => {
  assert.equal(isTeacherWeekTime(at(16, 9, 0)), true); // Monday 16 November
  assert.equal(isTeacherWeekTime(at(16, 9, 1)), true); // a missed minute still sends (once — meta)
  assert.equal(isTeacherWeekTime(at(16, 23, 59)), true);
  assert.equal(isTeacherWeekTime(at(16, 8, 59)), false);
  assert.equal(isTeacherWeekTime(at(17, 9, 0)), false); // Tuesday
  assert.equal(isTeacherWeekTime(at(16, 3, 30)), false); // Sunday 23:30 UTC is Monday 03:30 in Tbilisi — too early
  assert.deepEqual(weekBefore('2026-11-16'), { from: '2026-11-09', to: '2026-11-15' });
});

test('practice days, as the site counts them', () => {
  const days = practiceDaysOf({
    aiLesson: { days: { '2026-11-10': { min: 10 } } },
    learning: { 'v-1': { 0: { at: '2026-11-11T20:30:00.000Z', level: 1 } } },
    drillDone: { 'm-hold': '2026-11-13' },
    completedSessions: { '2026-11-14_18': true, '2026-11-15_18': false },
  });
  assert.deepEqual([...days].sort(), ['2026-11-10', '2026-11-12', '2026-11-13', '2026-11-14']);
  assert.equal(practiceDaysOf(null).size, 0);
});

test('an assignment done and the AI teacher\'s „stuck“', () => {
  const work = { variantId: 'v-1', exercise: '', voices: ['2'], due: '2026-11-14', studentIds: [], createdAt: '' };
  assert.equal(workDoneOf(work, { selectedChantVariants: { 'v-1': { voices: '1,2' } } }), true);
  assert.equal(workDoneOf(work, { selectedChantVariants: { 'v-1': { voices: ['1'] } } }), false);
  // a song counts by any of its recordings learned whole
  const song = { ...work, variantId: 'lale' };
  assert.equal(workDoneOf(song, { learnParts: { 'song-lale-t2': 2 }, learning: { 'song-lale-t2': { 0: { level: 1 }, 1: { level: 3 } } } }), true);
  assert.equal(workDoneOf(song, { learnParts: { 'song-lale-t2': 2 }, learning: { 'song-lale-t2': { 0: { level: 1 }, 1: { level: 0 } } } }), false);
  const drill = { ...work, variantId: '', exercise: 'm-hold', createdAt: '2026-11-10T09:00:00Z' };
  assert.equal(workDoneOf(drill, { drillDone: { 'm-hold': '2026-11-10' } }), true);
  assert.equal(workDoneOf(drill, { drillDone: { 'm-hold': '2026-11-09' } }), false);

  const week = weekBefore('2026-11-16');
  assert.equal(aiStuckOf({ misses: { '62>67': { n: 3, last: '2026-11-14' } } }, week), true);
  assert.equal(aiStuckOf({ misses: { '62>67': { n: 2, last: '2026-11-14' } } }, week), false);
  assert.equal(aiStuckOf({ misses: { '62>67': { n: 5, last: '2026-11-01' } } }, week), false);
  const take = (d, h) => ({ d, p: 'v-9~1', h, n: 10 });
  assert.equal(aiStuckOf({ takes: [take('2026-11-10', 2), take('2026-11-11', 3), take('2026-11-12', 9)] }, week), true);
  assert.equal(aiStuckOf({ takes: [take('2026-11-10', 2), take('2026-11-11', 8), take('2026-11-12', 9)] }, week), false);
  assert.equal(aiStuckOf(undefined, week), false);
});

test('the words', () => {
  assert.equal(teacherWeekText({ members: 8, practised: 6, attention: 2 }), '8-დან 6-მა ივარჯიშა. ორ მოსწავლეს ყურადღება სჭირდება.');
  assert.equal(teacherWeekText({ members: 5, practised: 5, attention: 0 }), 'ყველამ ივარჯიშა. ყველა კარგად მიდის.');
  assert.equal(teacherWeekText({ members: 5, practised: 0, attention: 5 }), 'ამ კვირაში არავის უვარჯიშია. ხუთ მოსწავლეს ყურადღება სჭირდება.');
  assert.equal(teacherWeekText({ members: 14, practised: 1, attention: 13 }), '14-დან 1-მა ივარჯიშა. 13 მოსწავლეს ყურადღება სჭირდება.');
});

test('each teacher of each class in use, the week before Monday', () => {
  const classes = [
    { id: 'c1', name: 'ერთი დიდი ოჯახი', memberIds: ['a', 'b', 'c'], teacherIds: ['t1', 't2'] },
    { id: 'c2', name: 'არქივი', memberIds: ['a'], teacherIds: ['t1'], archived: true },
    { id: 'c3', name: 'ცარიელი', memberIds: [], teacherIds: ['t1'] },
    { id: 'c4', name: 'უმასწავლებლო', memberIds: ['a'], teacherIds: [] },
  ];
  const students = new Map([
    // practised on three days; stuck on a leap by the AI teacher's count
    ['a', { drillDone: { x: '2026-11-12' }, aiLesson: { days: { '2026-11-10': { min: 5 }, '2026-11-11': { min: 5 } } },
      aiNote: { misses: { '62>67': { n: 3, last: '2026-11-14' } } } }],
    ['b', { aiLesson: { days: { '2026-11-16': { min: 5 } } } }], // Monday itself is next week's
    ['c', { completedSessions: { '2026-11-09_18': true }, drillDone: { x: '2026-11-13' } }],
  ]);
  const attendance = new Map([['c1', [
    { date: '2026-11-11', present: ['a', 'b', 'x'] },
    { date: '2026-11-14', present: ['a', 'c'] },
    { date: '2026-11-04', present: ['a', 'b', 'c'] },
  ]]]);
  const assignments = new Map([['c1', [{ exercise: 'x', due: '2026-11-15', createdAt: '2026-11-09', studentIds: [] }]]]);
  const out = teacherWeekNotices({ classes, students, attendance, assignments, day: '2026-11-16', aiFor: (uid) => uid === 't2' });
  assert.deepEqual(out.map((x) => x.uid), ['t1', 't2']);
  const m = out[0].message;
  assert.equal(m.title, 'კვირის შეჯამება მზადაა · ერთი დიდი ოჯახი');
  // a and c practised; b did not (and is the only one behind on the exercise), c missed one of two lessons — not most
  assert.equal(m.body, '3-დან 2-მა ივარჯიშა. ერთ მოსწავლეს ყურადღება სჭირდება.');
  assert.equal(m.url, '/?open=class&id=c1&item=ai-report');
  assert.equal(m.kind, 'notice');
  assert.equal(m.tag, 'tweek-c1');
  // the teacher who sees the AI teacher's lines also counts a's „stuck“
  assert.equal(out[1].message.body, '3-დან 2-მა ივარჯიშა. ორ მოსწავლეს ყურადღება სჭირდება.');
  // „AI შეცდა“ for that week takes it off
  students.get('a').aiErred = { week: '2026-11-15', by: 't2' };
  const again = teacherWeekNotices({ classes, students, attendance, assignments, day: '2026-11-16', aiFor: () => true });
  assert.equal(again[1].message.body, '3-დან 2-მა ივარჯიშა. ერთ მოსწავლეს ყურადღება სჭირდება.');
});
