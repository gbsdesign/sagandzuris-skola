import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BREATH_QUESTION, FAITH_ANSWER, LATE_QUESTION, breathAnswer, foldWord, glossaryOf, isFaithQuestion, lateAnswer, lateStart,
  pickAskWord, prepAnswer, readQuestion, readyQuestions, schoolAnswer,
} from '../src/utils/aiAsk';

test('faith questions are told apart from chant questions', () => {
  assert.ok(isFaithQuestion('რა არის ცოდვა?'));
  assert.ok(isFaithQuestion('ღმერთი ყველაფერს ხედავს?'));
  assert.ok(isFaithQuestion('რატომ უნდა ვილოცო?'));
  assert.ok(isFaithQuestion('ზიარებამდე რა უნდა ვჭამო?'));
  assert.ok(isFaithQuestion('მარხვაში შეიძლება სიმღერა?'));
  assert.ok(isFaithQuestion('სად მიდის სული?'));
  assert.ok(!isFaithQuestion('სად მოვითქვა სული ამ ფრაზაში?'));
  assert.ok(!isFaithQuestion('სულ ასე დაბლა ვმღერი?'));
  assert.ok(!isFaithQuestion('რომელ ხმაზე ვმღერი?'));
  assert.ok(!isFaithQuestion('რომელი ლოცვაა ეს?'));
});

test('a few chant words the school knows, old letters folded', () => {
  assert.match(glossaryOf('ალილუია') ?? '', /ადიდეთ უფალი/);
  assert.match(glossaryOf('ამინ.') ?? '', /ჭეშმარიტად/);
  assert.match(glossaryOf('საბაოთ') ?? '', /ძალთა/);
  assert.equal(glossaryOf('გაკურთხევთ'), null);
  assert.equal(foldWord('ღმრთისაჲ'), 'ღმრთისა');
  assert.equal(foldWord('ჴორცი'), 'ხორცი');
});

test('the ready word: one the school knows, else the longest — never a word of faith', () => {
  assert.equal(pickAskWord(['შენ გიგალობთ, შენ გაკურთხევთ']), 'გაკურთხევთ');
  assert.equal(pickAskWord(['ალილუია, ალილუია']), 'ალილუია');
  assert.equal(pickAskWord(['წმიდაო ღმერთო,', 'წმიდაო ძლიერო']), 'წმიდაო');
  assert.equal(pickAskWord(['მხოლოდ-შობილი ძე და სიტყუაჲ ღმრთისაჲ']), 'მხოლოდ');
  assert.equal(pickAskWord(['და შენ']), null);
});

test('the class\'s approved questions answer a word they name', () => {
  const qs = [{ q: 'რას ნიშნავს „გაკურთხევთ“?', a: 'გაკურთხევთ — გადიდებთ, კურთხევას გეტყვით.' }];
  assert.equal(prepAnswer('გაკურთხევთ', qs), qs[0].a);
  assert.equal(prepAnswer('გიგალობთ', qs), null);
});

// a three-voice phrase: I starts at beat 0, II and III at beat 2
const V: [number, number, number][][] = [
  [[0, 1, 67], [1, 1, 69], [2, 2, 71], [4, 1, 69], [5, 1, 67]],
  [[2, 2, 67], [4, 1, 65], [6, 2, 64]],
  [[2, 4, 55], [6, 2, 52]],
];

test('a late start is read from the voices', () => {
  const late = lateStart(V, 1, 0, 8);
  assert.deepEqual(late, { first: 0, seconds: 2, on: 3, after: false });
  assert.equal(lateStart(V, 0, 0, 8), null);
  assert.match(lateAnswer(late), /I ხმა \(მთქმელი\) იწყებს/);
  assert.match(lateAnswer(late), /2 წამის მერე/);
  assert.match(lateAnswer(late), /მის მესამე ნოტზე/);
  assert.match(lateAnswer(null), /გვიან არ იწყებს/);
});

test('the breath: rests, else after the longest note, else before the phrase', () => {
  // II has a rest after its second note (beats 5–6)
  assert.match(breathAnswer(V[1], 0, 8), /მეორე ნოტის შემდეგ/);
  // I: no rest, its long third note
  assert.match(breathAnswer(V[0], 0, 8), /მესამე ნოტის მერე/);
  assert.match(breathAnswer([[0, 1, 60], [1, 1, 62]], 0, 2), /ფრაზა მოკლეა/);
  assert.match(breathAnswer([], 0, 2), /არ მღერის/);
  // a repeated pitch counts once, as the teacher counts
  assert.match(breathAnswer([[0, 1, 60], [1, 1, 60], [3, 1, 62]], 0, 4), /პირველი ნოტის შემდეგ/);
});

test('ready questions follow the phrase', () => {
  assert.deepEqual(readyQuestions({ word: 'გაკურთხევთ', late: true }).map(q => q.kind), ['meaning', 'late', 'breath']);
  assert.deepEqual(readyQuestions({ word: null, late: false }).map(q => q.text), [BREATH_QUESTION]);
  assert.equal(readyQuestions({ word: 'ამინ', late: true })[1].text, LATE_QUESTION);
});

test('a written question is read and answered from the school first', () => {
  const m = { prep: [], breath: 'B', late: 'L' };
  assert.equal(readQuestion('სად ჩავისუნთქო?').kind, 'breath');
  assert.equal(readQuestion('რატომ ვიწყებ გვიან?').kind, 'late');
  assert.deepEqual(readQuestion('რას ნიშნავს „საბაოთ“?'), { kind: 'meaning', text: 'რას ნიშნავს „საბაოთ“?', word: 'საბაოთ', written: true });
  assert.equal(readQuestion('რას ნიშნავს ოსანა').word, 'ოსანა');
  assert.equal(schoolAnswer(readQuestion('სად ჩავისუნთქო?'), m)?.text, 'B');
  assert.equal(schoolAnswer(readQuestion('რას ნიშნავს „საბაოთ“?'), m)?.source, 'school');
  assert.equal(schoolAnswer(readQuestion('რას ნიშნავს „ტკბილად“?'), m), null);
  assert.equal(schoolAnswer(readQuestion('როგორ ავიღო მაღალი ნოტი?'), m), null);
  assert.deepEqual(schoolAnswer(readQuestion('რა არის ცოდვა?'), m), { text: FAITH_ANSWER, source: 'faith' });
  assert.equal(schoolAnswer(readQuestion('სად მოვითქვა სული?'), m)?.text, 'B');
});
