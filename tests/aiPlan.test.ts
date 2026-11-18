import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planOf, levelWeeks, partOfRange, rangeLabel, earLine, inFirstWeek, weekStepNow, FIRST_WEEK, noteMisses, weakLeap, weakLine,
  leapLabel, leapName, levelOfCheck, checkLine, fitShift, weekDoneToday, markOf, phraseTries, worstNote, worstLine, noteOrdinal, weekBars, tenOf, keepTake, TAKES_KEPT, bestAndWorst, usualTime, factsOf, lineWord, weekOf,
} from '../src/utils/aiPlan';

test('the plan follows the pace and starts where the voice check put one', () => {
  const p = planOf({ minutes: 10, days: 5, goal: 'liturgy' }, 0);
  assert.deepEqual(p.map(r => r.weeks), [3, 6, 10, 0]);
  assert.equal(p[3].last, true);
  assert.match(p[3].what, /წირვა სამ ხმაში/);
  assert.equal(levelWeeks(0, 5, 5), 6);
  assert.equal(levelWeeks(1, 20, 5), 3);
  assert.equal(planOf({ minutes: 10, days: 5, goal: 'self' }, 2)[0].name, 'მთქმელი');
  assert.equal(planOf({ minutes: 10, days: 5, goal: 'self' }, 4).length, 2);
});

test('the voice: a part by the middle of the range, and the ear in a line', () => {
  assert.equal(partOfRange(45, 64), 3);
  assert.equal(partOfRange(52, 64), 2);
  assert.equal(partOfRange(57, 72), 1);
  assert.equal(rangeLabel(57, 64), 'ლა — მი');
  assert.equal(earLine({ hold: 1, echo1: 1, echo3: 0.2 }), 'ერთ ნოტს იმეორებ; სამი ჯერ ძნელია');
  assert.equal(earLine({ hold: 0.2, echo1: 0.1 }), 'ჯერ ერთი ნოტის დაჭერიდან ვიწყებთ');
});

test('the first week waits for a missed day and ends after seven steps', () => {
  const note = { intro: { before: 'never' as const, minutes: 10 as const, goal: 'liturgy' as const, days: 5, at: '2026-11-18' } };
  assert.equal(inFirstWeek(note), true);
  assert.equal(weekStepNow(note), 0);
  const two = { ...note, week1: { w1: '2026-11-18', w2: '2026-11-25' } };
  assert.equal(weekStepNow(two), 2);
  const all = { ...note, week1: Object.fromEntries(FIRST_WEEK.map(s => [s.id, '2026-11-20'])) };
  assert.equal(inFirstWeek(all), false);
  assert.equal(inFirstWeek({ ...note, intro: { ...note.intro, before: 'choir' } }), false);
});

test('missed leaps are counted and the most missed this week is the weak spot', () => {
  const target = [62, 67, 66, 62];
  let m = noteMisses(undefined, target, [true, false, true, true], '2026-11-16', 'v-1');
  m = noteMisses(m, target, [true, false, true, true], '2026-11-17');
  assert.equal(weakLeap(m, '2026-11-17'), null);
  m = noteMisses(m, target, [true, false, true, false], '2026-11-18');
  const w = weakLeap(m, '2026-11-18');
  assert.deepEqual(w && { key: w.key, n: w.n }, { key: '62>67', n: 3 });
  assert.equal(leapLabel('62>67'), 'რე → სოლ');
  assert.equal(leapName('62>67'), 'კვარტა');
  assert.match(weakLine('62>67', 5), /ხუთჯერ აგერია/);
  // a step (66 → 62 is four semitones: counted; 67 → 66 is one: not)
  assert.equal(m['66>62'].n, 1);
  assert.equal(m['67>66'], undefined);
  // a week later it is no longer this week's
  assert.equal(weakLeap(m, '2026-11-27'), null);
});

test('the diary: bars by week, ten-of, best and worst; the takes are capped', () => {
  const takes = [
    { d: '2026-11-10', p: 'a~0', h: 7, n: 10, t: 8 }, { d: '2026-11-17', p: 'a~0', h: 9, n: 10, t: 9 },
    { d: '2026-11-18', p: 'b~2', h: 4, n: 10, t: 10 },
  ];
  const bars = weekBars(takes, '2026-11-18', 3);
  assert.deepEqual(bars.map(b => b.week), ['2026-11-02', '2026-11-09', '2026-11-16']);
  assert.equal(bars[2].tries, 2);
  assert.equal(tenOf(bars[2].share), 7);
  assert.equal(weekOf('2026-11-22'), '2026-11-16');
  const bw = bestAndWorst(takes, '2026-11-18');
  assert.equal(bw.best?.p, 'a~0');
  assert.equal(bw.worst?.p, 'b~2');
  let many: ReturnType<typeof keepTake> = [];
  for (let i = 0; i < TAKES_KEPT + 5; i++) many = keepTake(many, { d: '2026-11-18', p: 'x', h: 1, n: 1, t: 8 });
  assert.equal(many.length, TAKES_KEPT);
});

test('the notebook says where each line came from', () => {
  const takes = Array.from({ length: 8 }, () => ({ d: '2026-11-18', p: 'a~0', h: 5, n: 8, t: 8 }));
  assert.equal(usualTime(takes), 'დილით');
  const facts = factsOf({
    voice: { low: 57, high: 64, part: 2, hold: 1, echo1: 1, level: 0, at: '2026-11-18' },
    misses: { '62>67': { n: 5, last: '2026-11-17' } }, takes,
  }, '2026-11-18');
  assert.deepEqual(facts.map(f => f.id), ['voice', 'misses', 'takes']);
  assert.equal(facts[0].title, 'ხმა: ლა — მი · II ხმა');
  assert.equal(lineWord(0.1), 'სავარჯიშოა');
  assert.equal(lineWord(0.5), 'იზრდება');
  assert.equal(lineWord(0.9), 'კარგია');
});

test('the check: level, words, and the move into my voice', () => {
  assert.equal(levelOfCheck({ hold: 1, echo1: 0.4 }), 0);
  assert.equal(levelOfCheck({ hold: 1, echo1: 1, echo3: 0.5 }), 1);
  assert.match(checkLine({ hold: 1, echo1: 0.3 }), /ერთი ნოტი მყარად/);
  assert.doesNotMatch(checkLine({ hold: 0, echo1: 0 }), /ცუდ/);
  assert.equal(fitShift(57, 64, [60, 62, 64]), 0); // the phrase already in the middle
  assert.equal(fitShift(45, 57, [60, 67, 64]), 0); // an octave apart: sung an octave lower, nothing to move
  assert.equal(fitShift(52, 60, [62, 64, 66]), 4); // 8 down = 4 up and an octave lower
  assert.equal(fitShift(57, 64, [57, 59, 60]), 2);
  assert.equal(fitShift(48, 60, [60, 62, 63]), 5);
  assert.equal(fitShift(57, 64, [61, 63]), 0); // a semitone: left alone
  assert.equal(weekDoneToday({ week1: { w1: '2026-11-17', w2: '2026-11-18' } }, '2026-11-18'), true);
  assert.equal(weekDoneToday({ week1: { w1: '2026-11-17' } }, '2026-11-18'), false);
});

test('a phrase in the diary: its last tries and the note most often off', () => {
  assert.equal(markOf(true, 0.2), '1');
  assert.equal(markOf(false, -1), '-');
  assert.equal(markOf(false, null), '0');
  const t = (x: string, d: string) => ({ d, p: 'a~2', h: [...x].filter(c => c === '1').length, n: x.length, x });
  const takes = [t('11-1+', '2026-11-02'), t('111-1', '2026-11-05'), { d: '2026-11-06', p: 'b~0', h: 1, n: 1 }, t('11111', '2026-11-09'), t('111-1', '2026-11-12'), t('11111', '2026-11-13')];
  const tries = phraseTries(takes, 'a~2');
  assert.equal(tries.length, 4);
  assert.equal(tries[0].d, '2026-11-05');
  const w = worstNote(phraseTries(takes, 'a~2', 5));
  assert.deepEqual(w, { i: 3, dir: 'low', count: 2 });
  assert.equal(`${noteOrdinal(w!.i)} — ${worstLine(w!)}`, 'მე-4 ნოტი — ორ ცდაში დაბლა იყო');
  assert.equal(worstNote([t('11111', '2026-11-13')]), null);
});
