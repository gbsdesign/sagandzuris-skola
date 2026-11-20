// The reader's books first (utils/readerBooks): the order on the reader's front page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { READER_BOOKS, otherBooks, readerBooks } from '../src/utils/readerBooks';
import { WIGNEBI_COLLECTIONS, WIGNEBI_SHELVES } from '../src/data/wignebi';

test('the reader\'s books: ჟამნი, დავითნი and the Apostle lead, every one is found', () => {
  const mine = readerBooks();
  assert.equal(mine.length, READER_BOOKS.length);
  assert.deepEqual(mine.slice(0, 3).map(b => b.title), ['ჟამნი', 'დავითნი', 'სამოციქულო']);
  for (const b of mine) {
    assert.ok(b.title && b.sub, b.id);
    assert.doesNotMatch(b.title, /­/, b.id);
    // a one-book shelf opens its book at once
    const coll = /^w:c:(.+)$/.exec(b.to)?.[1];
    assert.ok(coll && WIGNEBI_COLLECTIONS[coll], `${b.id} → ${b.to}`);
  }
});

test('no shelf is lost: each stands once — among the reader\'s or under „სხვა წიგნები“', () => {
  const mine = readerBooks().map(b => b.id);
  const rest = otherBooks().map(b => b.id);
  assert.equal(new Set([...mine, ...rest]).size, mine.length + rest.length);
  for (const s of WIGNEBI_SHELVES) assert.ok(mine.includes(s.id) || rest.includes(s.id), s.id);
  // the Apostle is a book of the Bible's shelf, which stays whole among the rest
  assert.ok(rest.includes('biblia'));
  assert.ok(WIGNEBI_SHELVES.find(s => s.id === 'biblia')!.collections.includes('samociqulo'));
  for (const b of otherBooks()) assert.match(b.to, /^w:(c|s):/, b.id);
});
