// „მკითხე“'s matching (utils/mkitkhe.ts): every ready question finds its own answer, and so do a few of its paraphrases;
// a question of faith gets the „not about the app“ text; words near nothing find nothing (then the AI, where it is on).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HELP_PAGES, MK_ANSWERS, MK_FREQUENT, MK_TOPICS } from '../src/data/mkitkhe';
import { matchQuestion, mkStem, parseMkReply, relatedOf } from '../src/utils/mkitkhe';

const idOf = (q: string) => {
  const m = matchQuestion(q);
  return m.kind === 'answer' ? m.id : m.kind;
};

test('forty answers, ids 1–40, one to three sentences, five topics as the plan counts them', () => {
  assert.deepEqual(MK_ANSWERS.map(a => a.id), Array.from({ length: 40 }, (_, i) => i + 1));
  for (const a of MK_ANSWERS) assert.ok(a.answer.length >= 1 && a.answer.length <= 3, `${a.id}`);
  const count = (t: number) => MK_ANSWERS.filter(a => a.topic === t).length;
  assert.deepEqual(MK_TOPICS.map(t => count(t.id)), [9, 8, 6, 6, 11]);
  for (const id of [...MK_FREQUENT, ...Object.values(HELP_PAGES).flat()]) assert.ok(MK_ANSWERS.some(a => a.id === id), `${id}`);
});

test('every ready question finds its own answer', () => {
  for (const a of MK_ANSWERS) assert.equal(idOf(a.question), a.id, a.question);
  // without its question mark, in other letters' case, with a typo of spacing
  for (const a of MK_ANSWERS) assert.equal(idOf(a.question.replace(/[?„“]/g, '').toUpperCase()), a.id, a.question);
});

const PARAPHRASES: [number, string[]][] = [
  [1, ['სად არის ნოტები', 'ნოტებს ვერ ვპოულობ', 'საგალობლის ნოტები როგორ გავხსნა']],
  [2, ['მარტო ჩემი ხმის მოსმენა მინდა', 'სხვა ხმები როგორ გავაჩუმო ნოტებში', 'მხოლოდ ბანის მოსმენა']],
  [3, ['საგალობლის სწავლა როგორ დავიწყო', 'როგორ დავისწავლო გალობა']],
  [4, ['ჩემი ხმის ჩაწერა', 'სად ჩავწერო ჩემი ნამღერი', 'სტუდია სად არის']],
  [5, ['ინტერნეტის გარეშე როგორ ვიმუშაო', 'ოფლაინ ნოტები', 'როგორ ჩამოვწერო მსახურება']],
  [6, ['ტემპის შეცვლა', 'როგორ დავუკრა უფრო ნელა', 'ტონის დაწევა']],
  [7, ['ნოტები ძალიან პატარაა', 'ღამის ფურცელი ნოტებზე', 'ნოტების ზომის გაზრდა']],
  [8, ['ნოტების გაზიარება', 'ნოტების PDF როგორ გადმოვწერო', 'QR კოდი სად არის']],
  [9, ['ტაძრის რეჟიმი რა არის', 'ეკრანი რომ არ ჩაქრეს ტაძარში']],
  [10, ['კლასში როგორ მოვხვდე', 'კლასში დამამატეთ']],
  [11, ['კლასის პროგრამა', 'რას ვსწავლობთ კლასში']],
  [12, ['შემდეგი გაკვეთილი როდისაა', 'გაკვეთილების ცხრილი']],
  [13, ['მასწავლებელთან მიწერა', 'მასწავლებელს წერილი როგორ გავუგზავნო']],
  [14, ['კლასთან ზარი', 'ვიდეოზარი კლასში']],
  [15, ['ხმოვანი შეტყობინება', 'აუდიო წერილის გაგზავნა']],
  [16, ['დავალება სად არის', 'ჩემი დავალებები']],
  [17, ['ჩემი კანონი', 'რომელი კათიზმა მაქვს', 'ფსალმუნის კითხვა ჯგუფში']],
  [18, ['დილის ლოცვები', 'საღამოს ლოცვა სად არის']],
  [19, ['ლოცვის ტექსტი ძალიან წვრილია', 'ლოცვის შრიფტის გაზრდა']],
  [20, ['სიბნელეში კითხვა', 'ღამით რომ ვკითხულობ ლოცვას თვალს მჭრის']],
  [21, ['ტექსტი თავისით რომ ავიდეს', 'ავტომატური გადახვევა']],
  [22, ['სახარებაში სად გავჩერდი', 'სამოციქულოს კითხვა სად შევჩერდი']],
  [23, ['დღის წმინდანი', 'დღევანდელი საკითხავი', 'კალენდარი სად არის']],
  [24, ['საგანძურის გზა რა არის']],
  [25, ['ჩვევის მონიშვნა', 'ჩვევა როგორ მოვნიშნო შესრულებულად']],
  [26, ['ახალი ჩვევის დამატება', 'ჩვევის წაშლა']],
  [27, ['რაც ვისწავლე სად ჩანს', 'ნასწავლი საგალობლები', 'გუშინ რაღაც საგალობელს ვსწავლობდი და ვეღარ ვპოულობ']],
  [28, ['მარგალიტი რას ნიშნავს', 'რატომ ბრწყინავს მარგალიტი']],
  [29, ['ჩოხა სად არის', 'ჩემი ჩოხა', 'ქართული კაბა']],
  [30, ['შეხსენების ჩართვა', 'ლოცვის შეხსენება', 'შემახსენოს ლოცვის დრო']],
  [31, ['ღამით ტელეფონი რომ არ წკრიალებდეს', 'ჩუმი საათები']],
  [32, ['ასოების გადიდება მთელ აპში', 'ტექსტის ზომა ყველგან']],
  [33, ['მუქი ფონი', 'შავი ფონის ჩართვა']],
  [34, ['ხუცური რა არის', 'ძველი ასოებით კითხვა']],
  [35, ['აპის დაყენება', 'აიფონზე როგორ დავაყენო', 'მთავარ ეკრანზე ხატულა']],
  [36, ['ვიჯეტი', 'ვიჯეტის დამატება']],
  [37, ['გაკვეთილები ტელეფონის კალენდარში', 'გუგლ კალენდარში ჩამატება']],
  [38, ['ფოტოს შეცვლა', 'სახელის შეცვლა', 'პროფილის სურათი']],
  [39, ['სხვა ტელეფონიდან შესვლა', 'ახალ ტელეფონზე შესვლა', 'კომპიუტერიდან როგორ შევიდე']],
  [40, ['ანგარიშის წაშლა', 'პროფილის წაშლა სამუდამოდ']],
];

test('paraphrases find their answer', () => {
  for (const [id, qs] of PARAPHRASES) for (const q of qs) assert.equal(idOf(q), id, q);
});

test('a question of faith is not answered', () => {
  for (const q of ['მარხვაში რა შეიძლება ვჭამო?', 'რატომ უნდა ვილოცო?', 'რა არის ცოდვა?', 'როგორ მოვემზადო ზიარებისთვის?', 'ღმერთი არსებობს?'])
    assert.equal(idOf(q), 'faith', q);
  // the app's own page named „ღვთისმსახურება“ is no question of faith
  assert.equal(idOf('სად არის ღვთისმსახურების ნოტები?'), 1);
});

test('nothing near: no answer', () => {
  for (const q of ['გამარჯობა', 'რა ამინდია ხვალ?', 'ფეხბურთის შედეგები', 'როგორ ხარ?', ''])
    assert.equal(idOf(q), 'none', q);
  // the app's, but none of the forty: the AI's turn
  for (const q of ['სიმღერები სად არის', 'სად არის თამაშები']) assert.equal(idOf(q), 'none', q);
  // a word only an answer's sentence says („გვერდიდან“, „ვეღარ“) does not make it the answer
  assert.equal(idOf('გუშინ რაღაცას ვმღეროდი და ვეღარ ვიპოვე ის გვერდი'), 'none');
});

test('stems drop the case endings', () => {
  assert.equal(mkStem('ნოტებს'), 'ნოტ');
  assert.equal(mkStem('ნოტების'), 'ნოტ');
  assert.equal(mkStem('კლასში'), 'კლას');
  assert.equal(mkStem('ჩავიწერო'), 'ჩავიწერ');
});

test('related questions are of the same topic', () => {
  assert.deepEqual(relatedOf(4), [5, 6, 7]);
  assert.deepEqual(relatedOf(9), [1, 2, 3]);
  for (const id of relatedOf(17)) assert.equal(MK_ANSWERS.find(a => a.id === id)?.topic, 2);
});

test('the AI reply is read leniently and checked', () => {
  assert.deepEqual(parseMkReply('```json\n{"app": true, "text": "**ნოტები** მეტშია.", "target": 7}\n```'), { app: true, text: 'ნოტები მეტშია.', target: 7 });
  assert.deepEqual(parseMkReply('{"app": true, "text": "კი.", "target": 99}'), { app: true, text: 'კი.', target: null });
  assert.deepEqual(parseMkReply('{"app": false, "text": "", "target": null}'), { app: false, text: '', target: null });
  assert.equal(parseMkReply('{"app": true, "text": ""}'), null);
  assert.equal(parseMkReply('არ ვიცი'), null);
});
