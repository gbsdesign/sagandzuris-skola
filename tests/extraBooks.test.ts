import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { EXTRA_BOOKS, EXTRA_GROUPS } from '../src/data/extraBooks';

// „დამატებითი წიგნები“: every book of the menu has its file, in the shape the reader shows
type Book = { t: string; scan?: boolean; pages?: string[]; c: { l: string; s: [string, string[]][] }[] };

test('every extra book has its file and its group', () => {
  const groups = new Set(EXTRA_GROUPS.map(g => g.id));
  const ns = new Set<number>();
  for (const b of EXTRA_BOOKS) {
    assert.ok(groups.has(b.g), `${b.t}: group ${b.g}`);
    assert.ok(!ns.has(b.n), `${b.t}: number ${b.n} twice`); ns.add(b.n);
    const path = `public/wignebi-x/${String(b.n).padStart(2, '0')}.json`;
    assert.ok(existsSync(path), path);
    const book = JSON.parse(readFileSync(path, 'utf8')) as Book;
    assert.equal(book.t, b.t);
    assert.equal(book.c.length, b.c, `${b.t}: parts`);
    assert.equal(Boolean(book.scan), Boolean(b.scan), `${b.t}: scan mark`);
    if (book.pages) {
      assert.ok(book.pages.length > 0);
      for (const p of book.pages) assert.ok(existsSync(`public${p}`), p);
    } else {
      const paras = book.c.flatMap(p => p.s.flatMap(([, ps]) => ps));
      assert.ok(paras.length >= 10, `${b.t}: only ${paras.length} paragraphs`);
      for (const p of book.c) assert.ok(p.l.trim(), `${b.t}: a part without a name`);
      for (const t of paras) assert.ok(t.trim() && !/[\u0000-\u0008]/.test(t), `${b.t}: an empty or broken paragraph`);
    }
  }
});
