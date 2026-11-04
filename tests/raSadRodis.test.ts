import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RSR_QUESTIONS, RSR_TOPICS, type RsrQuestion } from '../src/data/raSadRodisQuestions';
import {
  A_MAX, LISTEN, MINE, Q_MAX, RSR_RULES, SEEN_KEEP, answerForms, drawGame, listenQuestion, parseGame, parseMine, placesOf, rememberSeen,
  rsrMatch, sameWord, scoresOf, stemOf, toRsrRound, topicPlan,
  type RsrPlay,
} from '../src/utils/raSadRodis';
import { mulberry32 } from '../src/utils/otkheuli';

test('the written questions are whole: unique ids, known topics, short enough for a card', () => {
  const ids = new Set(RSR_QUESTIONS.map(q => q.id));
  assert.equal(ids.size, RSR_QUESTIONS.length);
  const topics = new Set(RSR_TOPICS.map(t => t.id));
  for (const q of RSR_QUESTIONS) {
    assert.ok(topics.has(q.topic), q.id);
    assert.ok(q.q.length >= 10 && q.q.length <= 240, `${q.id}: ${q.q.length}`);
    assert.ok(q.a.length >= 1 && q.a.length <= 70, `${q.id}: ${q.a.length}`);
    assert.ok(!q.note || q.note.length <= 120, q.id);
  }
  // the print kit takes the first five of every topic
  for (const t of RSR_TOPICS) assert.ok(RSR_QUESTIONS.filter(q => q.topic === t.id).length >= 5, t.id);
});

test('topicPlan goes round the chosen topics and never repeats one twice in a row', () => {
  const rnd = mulberry32(5);
  const plan = topicPlan(['a', 'b', 'c'], 12, rnd);
  assert.equal(plan.length, 12);
  for (const t of ['a', 'b', 'c']) assert.equal(plan.filter(p => p === t).length, 4);
  for (let i = 1; i < plan.length; i++) assert.notEqual(plan[i], plan[i - 1]);
  assert.deepEqual(topicPlan(['a'], 3, rnd), ['a', 'a', 'a']);
  assert.deepEqual(topicPlan([], 5, rnd), []);
});

const bank: RsrQuestion[] = [
  ...['a1', 'a2', 'a3'].map(id => ({ id, topic: 'a', q: `question ${id}`, a: id })),
  ...['b1', 'b2'].map(id => ({ id, topic: 'b', q: `question ${id}`, a: id })),
];

test('drawGame spreads the topics, asks nothing twice and the unasked first', () => {
  const g = drawGame({ bank, topics: ['a', 'b'], count: 4, seen: ['a1', 'b1'], rnd: mulberry32(1) });
  assert.equal(g.length, 4);
  assert.equal(new Set(g.map(q => q.id)).size, 4);
  assert.equal(g.filter(q => q.topic === 'a').length, 2);
  // the unasked a2, a3 and b2 come before the asked ones
  for (const id of ['a2', 'a3', 'b2']) assert.ok(g.some(q => q.id === id), id);
});

test('drawGame takes the one asked longest ago when a topic has nothing new, and lends a dry topic\'s slot', () => {
  const g = drawGame({ bank, topics: ['b'], count: 2, seen: ['b2', 'b1'], rnd: mulberry32(2) });
  assert.deepEqual(g.map(q => q.id), ['b2', 'b1']);
  // three b slots out of five, but b has only two: the rest go to a
  const all = drawGame({ bank, topics: ['a', 'b'], count: 5, seen: [], rnd: mulberry32(3) });
  assert.equal(all.length, 5);
  assert.equal(new Set(all.map(q => q.id)).size, 5);
  // more slots than questions: it stops when everything is asked
  assert.equal(drawGame({ bank, topics: ['a', 'b'], count: 9, seen: [], rnd: mulberry32(4) }).length, 5);
});

test('drawGame asks the recordings for a LISTEN slot', () => {
  let n = 0;
  const listen = (used: Set<string>): RsrPlay | null => {
    const id = `l:${n++}`;
    assert.ok(!used.has(id));
    return { id, topic: LISTEN, q: 'listen', a: 'x', audio: { url: 'u', title: 't', sub: 's' } };
  };
  const g = drawGame<RsrPlay>({ bank, topics: ['a', LISTEN], count: 4, seen: [], listen, rnd: mulberry32(6) });
  assert.equal(g.filter(q => q.topic === LISTEN).length, 2);
  assert.ok(g.filter(q => q.topic === LISTEN).every(q => q.audio));
  // no recordings at all: their slots go to the written questions
  const none = drawGame({ bank, topics: ['a', LISTEN], count: 3, seen: [], listen: () => null, rnd: mulberry32(6) });
  assert.deepEqual(none.map(q => q.topic), ['a', 'a', 'a']);
});

test('listenQuestion asks a feast for a feast\'s chant, the region for a song and the name otherwise', () => {
  const feast = listenQuestion({ id: 'v:1', title: 'ჯვართამაღლება — 14 სექტემბერი', sub: 'სადღესასწაულო · გელათის სკოლა', url: 'u', kind: 'chant' });
  assert.equal(feast.a, 'ჯვართამაღლება');
  assert.match(feast.q, /დღესასწაულის/);
  assert.equal(feast.note, '14 სექტემბერი · გელათის სკოლა');
  assert.equal(feast.id, 'l:v:1');
  const chant = listenQuestion({ id: 'v:2', title: 'წმიდაო ღმერთო', sub: 'წირვა · ქართლ-კახური', url: 'u', kind: 'chant' });
  assert.equal(chant.a, 'წმიდაო ღმერთო');
  assert.equal(chant.note, 'წირვა · ქართლ-კახური');
  const song = listenQuestion({ id: 's:1', title: 'მერისულა', sub: 'ხალხური სიმღერა · სამეგრელო', url: 'u', kind: 'song' });
  assert.equal(song.a, 'სამეგრელო');
  assert.equal(song.note, '„მერისულა“');
  const city = listenQuestion({ id: 's:2', title: 'სულიკო', sub: 'ხალხური სიმღერა · ქალაქური', url: 'u', kind: 'song' });
  assert.equal(city.a, 'სულიკო');
  assert.equal(song.audio?.url, 'u');
});

test('scores and shared places', () => {
  assert.deepEqual(scoresOf([[0, 2], [2], [], [1, 2, 9]], 3), [1, 1, 3]);
  assert.deepEqual(placesOf([5, 5, 3]), [1, 1, 3]);
  assert.deepEqual(placesOf([0, 2, 1]), [3, 1, 2]);
});

test('rememberSeen keeps the newest, without recordings, at most SEEN_KEEP', () => {
  assert.deepEqual(rememberSeen(['a', 'b'], ['b', 'l:x', 'c']), ['a', 'b', 'c']);
  const many = Array.from({ length: SEEN_KEEP + 5 }, (_, i) => `q${i}`);
  const kept = rememberSeen([], many);
  assert.equal(kept.length, SEEN_KEEP);
  assert.equal(kept[kept.length - 1], `q${SEEN_KEEP + 4}`);
});

test('parseMine keeps only whole questions of the device', () => {
  assert.deepEqual(parseMine(null), []);
  const mine = parseMine([
    { id: 'm:1', q: '  რა?  ', a: ' ეს ', note: '' },
    { id: 'm:1', q: 'again', a: 'x' },
    { id: 'x:2', q: 'wrong id', a: 'x' },
    { id: 'm:3', q: '', a: 'x' },
    { id: 'm:4', q: 'q'.repeat(Q_MAX + 50), a: 'a'.repeat(A_MAX + 50), note: 'n' },
    'junk',
  ]);
  assert.deepEqual(mine[0], { id: 'm:1', topic: MINE, q: 'რა?', a: 'ეს' });
  assert.equal(mine.length, 2);
  assert.equal(mine[1].q.length, Q_MAX);
  assert.equal(mine[1].a.length, A_MAX);
  assert.equal(mine[1].note, 'n');
});

test('parseGame reads back a kept game and refuses a broken one', () => {
  const game = { names: ['ა', 'ბ'], questions: [bank[0], bank[1]], index: 1, marks: [[0], []], phase: 'answer' };
  assert.deepEqual(parseGame(JSON.parse(JSON.stringify(game))), game);
  assert.equal(parseGame({ ...game, index: 2 }), null);
  assert.equal(parseGame({ ...game, marks: [[0]] }), null);
  assert.equal(parseGame({ ...game, names: ['ა'] }), null);
  assert.equal(parseGame({ ...game, phase: 'think' }), null);
  assert.equal(parseGame('junk'), null);
});

// ——— online (2026-11-04): the answer judge and the room's rules

test('rsrMatch takes the answer in any case, its bracket forms and one slip in a long word', () => {
  assert.ok(rsrMatch('ფარნავაზს', 'ფარნავაზი'));
  assert.ok(rsrMatch('ფარნავაზს', 'ფარნავაზმა'));
  assert.ok(rsrMatch('ფარნავაზს', '  ფარნავაზ!  '));
  assert.ok(!rsrMatch('ფარნავაზს', 'მირიანი'));
  assert.ok(!rsrMatch('თამარი', 'თამაზი'));
  assert.ok(rsrMatch('ივირონი (ივერთა მონასტერი)', 'ივერთა მონასტერი'));
  assert.ok(rsrMatch('ივირონი (ივერთა მონასტერი)', 'ივირონში'));
  assert.ok(rsrMatch('ნიკო ფიროსმანაშვილი', 'ნიკო ფიროსმანშვილი'));
  assert.ok(!rsrMatch('ფარნავაზს', ''));
});

test('rsrMatch: a question of two things wants both; titles and kinds may be left out', () => {
  assert.ok(rsrMatch('ქეთევან დედოფალი, შირაზში', 'ქეთევანი შირაზში'));
  assert.ok(!rsrMatch('ქეთევან დედოფალი, შირაზში', 'ქეთევანი'));
  assert.ok(rsrMatch('მირიან მეფემ და ნანა დედოფალმა', 'მირიანმა და ნანამ'));
  assert.ok(!rsrMatch('მირიან მეფემ და ნანა დედოფალმა', 'მირიანმა'));
  assert.ok(rsrMatch('დავით აღმაშენებელი, გელათის მონასტრის კარიბჭეში', 'დავით აღმაშენებელი, გელათში'));
  assert.ok(!rsrMatch('ოქრო, გუნდრუკი და მური', 'ოქრო და გუნდრუკი'));
  assert.ok(rsrMatch('ოქრო, გუნდრუკი და მური', 'მური, ოქრო, გუნდრუკი'));
});

test('rsrMatch: numbers must be the same (written any way), a date with its month', () => {
  assert.ok(rsrMatch('40 დღე', '40'));
  assert.ok(rsrMatch('40 დღე', 'ორმოცი დღე'));
  assert.ok(!rsrMatch('40 დღე', '30 დღე'));
  assert.ok(rsrMatch('26 მაისს', '26 მაისი'));
  assert.ok(!rsrMatch('26 მაისს', '26 მარტს'));
  assert.ok(rsrMatch('ბაგრატ III-მ', 'ბაგრატ მესამე'));
  assert.ok(rsrMatch('ბაგრატ III-მ', 'ბაგრატ 3'));
  assert.ok(!rsrMatch('ბაგრატ III-მ', 'ბაგრატ IV'));
});

test('rsrMatch: an answer in a sentence counts, a list of guesses does not', () => {
  assert.ok(rsrMatch('ფარნავაზს', 'მგონი, ეს ფარნავაზ მეფეა'));
  assert.ok(rsrMatch('ქეთევან დედოფალი', 'ჩემი აზრით ქეთევან დედოფალი'));
  assert.ok(!rsrMatch('ფარნავაზს', 'მირიანი, ვახტანგი, ფარნავაზი, დავითი, თამარი'));
  assert.ok(!rsrMatch('ფარნავაზს', 'მირიანი ვახტანგი ფარნავაზი დავითი', 2));
  assert.ok(rsrMatch('ფარნავაზს', 'ეს ფარნავაზია', 2));
  assert.ok(rsrMatch('ჩონგური', 'ჩონგურია'));
  assert.ok(rsrMatch('ღვინო', 'ღვინოა'));
  assert.ok(!rsrMatch('ქვა', 'ქ'));
});

test('stemOf and sameWord: endings off, three letters always left, a number is itself', () => {
  assert.equal(stemOf('ფარნავაზმა'), 'ფარნავაზ');
  assert.equal(stemOf('გელათში'), 'გელათ');
  assert.equal(stemOf('ქვით'), 'ქვი');
  assert.equal(stemOf('ქვა'), 'ქვა');
  assert.ok(sameWord('მონასტერი', 'მონასტრის'));
  assert.ok(!sameWord('40', '400'));
  assert.deepEqual(answerForms('ჯორჯ ბალანჩინი (ბალანჩივაძე)'), [['ჯორჯ', 'ბალანჩინი'], ['ბალანჩივაძე']]);
});

test('a question as a round of the room: its piece starts inside the recording, and the rules read it back', () => {
  const written = RSR_QUESTIONS[0];
  const r = toRsrRound(written, mulberry32(3));
  assert.equal(r.kind, 'rsr');
  assert.equal(r.a, written.a);
  assert.equal(r.url, undefined);
  assert.ok(RSR_RULES.valid(r));
  const heard = toRsrRound(listenQuestion({ id: 'p1', title: 'ჩაკრულო', sub: 'სიმღერა · კახეთი', url: 'https://x/p1', kind: 'song' }), mulberry32(3));
  assert.equal(heard.url, 'https://x/p1');
  assert.ok(heard.from! >= 0.05 && heard.from! < 0.55);
  assert.ok(RSR_RULES.valid(heard));
  assert.ok(!RSR_RULES.valid({ ...r, a: '' }));
  assert.ok(!RSR_RULES.valid({ ...r, kind: 'otkhi' }));
  // the answer and its note are not shown while it is asked
  assert.deepEqual([...RSR_RULES.secret].sort(), ['a', 'id', 'note']);
  // one point a right answer; the host's judgement wins
  assert.equal(RSR_RULES.points(r, { pick: 0, ms: 9000, step: 1, text: written.a }, 60000), 1);
  assert.equal(RSR_RULES.points(r, { pick: 0, ms: 9000, step: 1, text: 'არ ვიცი' }, 60000), 0);
  assert.equal(RSR_RULES.points(r, { pick: 0, ms: 9000, step: 1, text: 'არ ვიცი', ok: true }, 60000), 1);
  assert.equal(RSR_RULES.points(r, { pick: 0, ms: 9000, step: 1, text: written.a, ok: false }, 60000), 0);
});

test('every written answer is taken in its own words', () => {
  for (const q of RSR_QUESTIONS) assert.ok(rsrMatch(q.a, q.a), `${q.id}: ${q.a}`);
});
