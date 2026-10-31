import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  A_MAX, LISTEN, MINE, OTKHI_RULES, OTKHI_SECONDS, Q_MAX, SEEN_KEEP, answerKey, drawOtkhi, listenItem, otkhiPoints, parseMine,
  rememberOtkhi, toRound, type ListenSource, type OtkhiItem, type OtkhiQ,
} from '../src/utils/otkhi';
import { OTKHI_QUESTIONS, OTKHI_TOPICS } from '../src/data/otkhiQuestions';
import { answerRound, newRounds, nextStep, parseRoundsState, publicView, roundKey } from '../src/utils/roundGames';
import { mulberry32 } from '../src/utils/otkheuli';

// „ოთხიდან ერთი“ (utils/otkhi.ts): the points, a written question as a round, a recording's question, a game's draw, the
// teacher's own questions as the phone keeps them, the written bank itself and a round played through the rounds' engine.

const LIMIT = OTKHI_SECONDS * 1000;
const item = (id: string, topic: string, a = ['სწორი', 'ბ', 'გ', 'დ']): OtkhiItem => ({ id, topic, q: `კითხვა ${id}`, a });

test('the right answer earns 1000 at once and 500 at the very end; a wrong one nothing', () => {
  assert.equal(otkhiPoints({ right: 2 }, { pick: 2, ms: 0 }, LIMIT), 1000);
  assert.equal(otkhiPoints({ right: 2 }, { pick: 2, ms: LIMIT / 2 }, LIMIT), 750);
  assert.equal(otkhiPoints({ right: 2 }, { pick: 2, ms: LIMIT }, LIMIT), 500);
  assert.equal(otkhiPoints({ right: 2 }, { pick: 2, ms: LIMIT * 3 }, LIMIT), 500);
  assert.equal(otkhiPoints({ right: 2 }, { pick: 1, ms: 0 }, LIMIT), 0);
});

test('a written question as a round: the right one among the shuffled answers, the same answer twice only once', () => {
  for (let seed = 1; seed < 30; seed++) {
    const q = toRound({ ...item('x', 'galoba'), note: 'ნოტი' }, mulberry32(seed))!;
    assert.equal(q.kind, 'otkhi');
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.right], 'სწორი');
    assert.deepEqual([...q.options].sort(), ['ბ', 'გ', 'დ', 'სწორი'].sort());
    assert.equal(q.note, 'ნოტი');
    assert.ok(OTKHI_RULES.valid(q));
  }
  // „სვეტიცხოველი (მცხეთა)“ is „სვეტიცხოველი“: one of them goes
  const twice = toRound(item('y', 'galoba', ['სვეტიცხოველი', 'სვეტიცხოველი (მცხეთა)', 'ბოდბე']), mulberry32(3))!;
  assert.equal(twice.options.length, 2);
  assert.equal(twice.options[twice.right], 'სვეტიცხოველი');
  assert.equal(toRound(item('z', 'galoba', ['ერთადერთი'])), null);
  assert.equal(toRound({ ...item('w', 'galoba'), q: '  ' }), null);
  // a recording's question keeps its piece
  const heard = toRound({ ...item('l:1', LISTEN), url: 'https://x/1', from: 0.3 })!;
  assert.equal(heard.url, 'https://x/1');
  assert.equal(heard.from, 0.3);
});

const chant = (id: string, title: string, service: string): ListenSource => ({ id, title, sub: `${service} · გელათის სკოლა`, url: `https://x/${id}`, kind: 'chant' });
const song = (id: string, title: string): ListenSource => ({ id, title, sub: 'ხალხური სიმღერა · გურია', url: `https://x/${id}`, kind: 'song' });
const POOL: ListenSource[] = [
  chant('c1', 'ღმერთო ჩემო', 'წირვა'), chant('c2', 'ქერუბიმთა', 'წირვა'), chant('c3', 'მამაო ჩვენო', 'წირვა'), chant('c4', 'წმიდაო ღმერთო', 'წირვა'),
  chant('c5', 'ნათელო მხიარულო', 'მწუხრი'),
  chant('f1', 'შობა — 25 დეკემბერი', 'სადღესასწაულო'), chant('f2', 'ნათლისღება — 6 იანვარი', 'სადღესასწაულო'),
  chant('f3', 'ფერისცვალება — 6 აგვისტო', 'სადღესასწაულო'), chant('f4', 'ხარება — 25 მარტი', 'სადღესასწაულო'),
  chant('f5', 'შობა — 25 დეკემბერი', 'სადღესასწაულო'),
  song('s1', 'ხასანბეგურა'), song('s2', 'ჩაკრულო'), song('s3', 'ლილე'), song('s4', 'ხასანბეგურა'), song('s5', 'ურმული'),
];

test('a recording\'s question: a feast\'s chant asks for the feast, another chant for its name, a song for its name', () => {
  for (let seed = 1; seed < 20; seed++) {
    const rnd = mulberry32(seed);
    const f = listenItem(POOL[5], POOL, rnd)!;
    assert.match(f.q, /დღესასწაულის/);
    assert.equal(f.a[0], 'შობა');
    assert.equal(f.a.length, 4);
    assert.equal(new Set(f.a.map(answerKey)).size, 4);
    assert.ok(f.a.slice(1).every(x => ['ნათლისღება', 'ფერისცვალება', 'ხარება'].includes(x)));
    const c = listenItem(POOL[0], POOL, rnd)!;
    assert.equal(c.a[0], 'ღმერთო ჩემო');
    // its own service has three others: the wrong ones are of წირვა
    assert.ok(c.a.slice(1).every(x => ['ქერუბიმთა', 'მამაო ჩვენო', 'წმიდაო ღმერთო'].includes(x)));
    const s = listenItem(POOL[10], POOL, rnd)!;
    assert.equal(s.a[0], 'ხასანბეგურა');
    assert.ok(!s.a.slice(1).includes('ხასანბეგურა'));
    assert.equal(s.id, 'l:s1');
    assert.equal(s.topic, LISTEN);
    assert.equal(s.url, 'https://x/s1');
    assert.ok(s.from! >= 0.05 && s.from! < 0.55);
  }
  // a service of one chant borrows the other chants (not the feasts); three songs are not enough for four answers
  const vespers = listenItem(POOL[4], POOL, mulberry32(2))!;
  assert.ok(vespers.a.slice(1).every(x => ['ღმერთო ჩემო', 'ქერუბიმთა', 'მამაო ჩვენო', 'წმიდაო ღმერთო'].includes(x)));
  assert.equal(listenItem(POOL[10], POOL.filter(p => p.id !== 's5'), mulberry32(2)), null);
});

test('a game draws its topics, the recordings for „მოისმინე“, every question once', () => {
  const bank = [item('a1', 'a'), item('a2', 'a'), item('a3', 'a'), item('b1', 'b'), item('b2', 'b')];
  const g = drawOtkhi({ bank, topics: ['a', 'b', LISTEN], count: 6, seen: [], pool: POOL, rnd: mulberry32(5) });
  assert.equal(g.length, 6);
  assert.equal(new Set(g.map(q => q.id)).size, 6);
  assert.equal(g.filter(q => q.topic === LISTEN).length, 2);
  assert.ok(g.filter(q => q.topic === LISTEN).every(q => q.url && q.id.startsWith('l:')));
  // the ones asked before come last
  const later = drawOtkhi({ bank, topics: ['a'], count: 2, seen: ['a1', 'a2'], rnd: mulberry32(1) });
  assert.deepEqual(later.map(q => q.id).sort(), ['a1', 'a3']);
  // no recordings: their slots go to the written ones
  const none = drawOtkhi({ bank, topics: [LISTEN, 'b'], count: 3, seen: [], rnd: mulberry32(1) });
  assert.deepEqual(none.map(q => q.topic), ['b', 'b']);
});

test('the phone remembers the written questions asked, not the recordings\'', () => {
  assert.deepEqual(rememberOtkhi(['a', 'b', 'c'], ['b', 'l:s1', 'd']), ['a', 'c', 'b', 'd']);
  const many = Array.from({ length: SEEN_KEEP + 10 }, (_, i) => `q${i}`);
  assert.equal(rememberOtkhi([], many).length, SEEN_KEEP);
  assert.equal(rememberOtkhi([], many)[0], 'q10');
});

test('my own questions as the phone keeps them; a broken one is left out', () => {
  const ok = { id: 'm:1', q: ' კითხვა ', a: ['სწორი', 'ბ', '', 'გ', 'დ'], note: 'ნოტი' };
  assert.deepEqual(parseMine([ok]), [{ id: 'm:1', topic: MINE, q: 'კითხვა', a: ['სწორი', 'ბ', 'გ', 'დ'], note: 'ნოტი' }]);
  assert.deepEqual(parseMine([
    { id: 'x:2', q: 'q', a: ['a', 'b'] },
    { id: 'm:3', q: '', a: ['a', 'b'] },
    { id: 'm:4', q: 'q', a: ['a'] },
    { id: 'm:5', q: 'q', a: ['', 'b'] },
    null, 'text',
  ]).map(x => x.id), []);
  assert.deepEqual(parseMine([{ id: 'm:6', q: 'q', a: ['a', 'b'] }, ok, { ...ok }]).map(x => x.id), ['m:6', 'm:1']);
  assert.deepEqual(parseMine('nope'), []);
  assert.equal(parseMine([{ id: 'm:7', q: 'q'.repeat(400), a: ['a'.repeat(100), 'b'] }])[0].q.length, Q_MAX);
});

test('the written bank: ids once, known topics, four answers each that differ, every one a round', () => {
  const topics = new Set(OTKHI_TOPICS.map(t => t.id));
  assert.ok(OTKHI_QUESTIONS.length >= 100);
  assert.equal(new Set(OTKHI_QUESTIONS.map(q => q.id)).size, OTKHI_QUESTIONS.length);
  for (const t of OTKHI_TOPICS) assert.ok(OTKHI_QUESTIONS.filter(q => q.topic === t.id).length >= 10, t.id);
  for (const q of OTKHI_QUESTIONS) {
    assert.ok(topics.has(q.topic), q.id);
    assert.ok(q.q.trim() && q.q.length <= Q_MAX, q.id);
    assert.equal(q.a.length, 4, q.id);
    assert.ok(q.a.every(a => a.trim() && a.length <= A_MAX), q.id);
    assert.equal(new Set(q.a.map(answerKey)).size, 4, q.id);
    assert.ok(!q.note || q.note.length <= Q_MAX, q.id);
    const r = toRound(q, mulberry32(9))!;
    assert.ok(OTKHI_RULES.valid(r), q.id);
    assert.equal(r.options.length, 4, q.id);
  }
});

test('a round in the room: the players see no right answer until the reveal, the quicker right one earns more', () => {
  const rounds = [toRound(item('a1', 'a'), mulberry32(1))!, toRound(item('a2', 'a'), mulberry32(2))!];
  const players = ['ა', 'ბ', 'გ'].map((name, i) => ({ uid: `u${i}`, name }));
  let s = newRounds(players, { game: 'otkhi', rounds, sound: 'all', now: 1000 })!;
  const v = publicView(s).q as Partial<OtkhiQ>;
  assert.equal(v.right, undefined);
  assert.equal(v.id, undefined);
  assert.equal(v.options?.length, 4);
  const right = rounds[0].right;
  const wrong = (right + 1) % 4;
  const key = roundKey(s);
  s = answerRound(s, 0, { key, pick: right, ms: 3000 });
  s = answerRound(s, 1, { key, pick: right, ms: 24_000 });
  // no fifth answer
  assert.equal(answerRound(s, 2, { key, pick: 4, ms: 1000 }), s);
  s = nextStep(answerRound(s, 2, { key, pick: wrong, ms: 1000 }));
  assert.equal(s.phase, 'reveal');
  assert.deepEqual(s.gained, [950, 600, 0]);
  assert.equal((publicView(s).q as Partial<OtkhiQ>).right, right);
  // the host's state comes back as written
  assert.deepEqual(parseRoundsState(JSON.stringify(s)), s);
});
