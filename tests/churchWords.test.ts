// The old church words' dictionary (src/data/churchWords.ts) and its matching (src/utils/churchWords.ts): a word in any of its
// case forms and old spellings finds its entry; ordinary words find none; every form belongs to one entry only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { CHURCH_WORDS } from '../src/data/churchWords';
import { buildWordIndex, lookupWord, normWord, sentenceAround, WORD_RE } from '../src/utils/churchWords';

const ix = buildWordIndex(CHURCH_WORDS);
const entry = (token: string) => {
  const i = lookupWord(ix, token);
  return i < 0 ? null : CHURCH_WORDS[i].w;
};

test('old spellings turn into today\'s letters', () => {
  assert.equal(normWord('შეგჳწყალენ'), 'შეგვიწყალენ');
  assert.equal(normWord('რაჲთა'), 'რაითა');
  assert.equal(normWord('ჩუენ'), 'ჩვენ');
  assert.equal(normWord('ქუეყანასა'), 'ქვეყანასა');
  assert.equal(normWord('დამჴსნელო'), 'დამხსნელო');
  assert.equal(normWord('ქრისტჱს'), 'ქრისტეს');
  assert.equal(normWord('ჵ'), 'ჰოი');
  // a word-initial „უ“ and one after a vowel stay
  assert.equal(normWord('უფალო'), 'უფალო');
  assert.equal(normWord('მეუფეო'), 'მეუფეო');
  // Mtavruli capitals
  assert.equal(normWord('ᲠᲐᲟᲐᲛᲡ'), 'რაჟამს');
});

test('a word finds its entry in its forms', () => {
  const cases: [string, string][] = [
    ['რაჟამს', 'რაჟამს'],
    ['მეუფეო', 'მეუფე'], ['მეუფისა', 'მეუფე'], ['მეუფესა', 'მეუფე'],
    ['ნუგეშინისმცემელო', 'ნუგეშინისმცემელი'],
    ['შეგჳწყალენ', 'შეგჳწყალენ'], ['შეგვიწყალენ', 'შეგჳწყალენ'], ['შემიწყალე', 'შეგჳწყალენ'],
    ['რაჲთა', 'რაითა'], ['რაჲ', 'რაი'],
    ['ღუაწლითა', 'ღუაწლი'], ['ღუაწლისა', 'ღუაწლი'],
    ['უშჯულოებანი', 'უშჯულოება'], ['უსჯულოებათა', 'უშჯულოება'], ['უშჯულოთა', 'უშჯულო'],
    ['სასუფეველსა', 'სასუფეველი'], ['სასუფევლისა', 'სასუფეველი'],
    ['ცხორებისა', 'ცხორება'], ['ცხორებაჲ', 'ცხორება'],
    ['ჴორცთა', 'ხორცი'], ['ხორციელთა', 'ხორციელი'],
    ['საკჳრველთმოქმედო', 'საკჳრველთმოქმედი'],
    ['ივერთა', 'ივერია'], ['ივერიისაჲ', 'ივერია'],
    ['დიდებაჲ', 'დიდებაჲ'],
    ['ჵ', 'ჰოი'], ['ჰოჲ', 'ჰოი'],
    ['უწინარეს', 'უწინარეს'],
    ['ცათა', 'ცანი'],
    ['ღირსო', 'ღირსი'], ['ღირსნო', 'ღირსი'],
  ];
  for (const [token, w] of cases) assert.equal(entry(token), w, token);
  // the stem's own entry wins over a shorter one
  assert.equal(entry('ძლევაშემოსილო'), 'ძლევაშემოსილი');
});

test('ordinary words find nothing', () => {
  for (const t of ['და', 'მე', 'შენ', 'სიყვარული', 'უფალო', 'ღმერთო', 'მადლობა', 'ქვეყანა', 'ჩვენ', 'მუნჯი', 'სერაფიმე', 'ერთი', 'ერთხელ', 'დიდება']) {
    assert.equal(entry(t), null, t);
  }
});

test('the dictionary: about three hundred words, each with a plain meaning and forms of its own', () => {
  assert.ok(CHURCH_WORDS.length >= 250, `only ${CHURCH_WORDS.length}`);
  const owner = new Map<string, string>();
  for (const w of CHURCH_WORDS) {
    assert.ok(w.w && w.m && w.f.length, w.w);
    assert.ok(/[.!?]$/.test(w.m), `${w.w}: the meaning ends a sentence`);
    assert.ok(w.m.length <= 140, `${w.w}: one short sentence`);
    for (const f of w.f) {
      const key = normWord(f);
      assert.ok(!owner.has(key), `${f} is in „${owner.get(key)}“ and „${w.w}“`);
      owner.set(key, w.w);
      // a stem is long enough not to catch ordinary words
      if (f.endsWith('*')) assert.ok([...f].length - 1 >= 4, `${f}: a stem of 4 letters or more`);
    }
  }
});

test('most entries are met in the prayers', () => {
  const words = new Set<string>();
  for (const name of readdirSync('public/prayers')) {
    if (!name.endsWith('.json')) continue;
    const html: string = JSON.parse(readFileSync(`public/prayers/${name}`, 'utf8')).html ?? '';
    for (const m of html.replace(/<[^>]+>/g, ' ').matchAll(WORD_RE)) words.add(m[0]);
  }
  const met = new Set<number>();
  for (const t of words) { const i = lookupWord(ix, t); if (i >= 0) met.add(i); }
  assert.ok(met.size / CHURCH_WORDS.length >= 0.8, `${met.size} of ${CHURCH_WORDS.length} met`);
});

test('the sentence a word was met in', () => {
  const text = 'რაჟამს აღდგე ძილისაგან, უწინარეს ყოვლისა საქმისა, წარსდეგ კრძალვით. სხვა წინადადება.';
  assert.equal(sentenceAround(text, 0, 6), 'რაჟამს აღდგე ძილისაგან, უწინარეს ყოვლისა საქმისა, წარსდეგ…');
  const at = text.indexOf('უწინარეს');
  assert.equal(sentenceAround(text, at, 8, 2), '…აღდგე ძილისაგან, უწინარეს ყოვლისა საქმისა,…');
});
