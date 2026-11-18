// Stage 5 of the plan „მედავითნე: წიგნები, კალენდარი, დღის მსახურება“ (2026-11-18): the whole of 2027 and Lent–Pentecost 2028
// (another Pascha) are „served“ day by day — every day has its four services, every text a step opens is found in its book,
// every movable day's and fixed feast's hymn has its text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { buildServices, guessRank, hymnsOf, PATRON_PRESETS, type Patron } from '../src/utils/dayService';
import { sliceOf, type TextSrc } from '../src/utils/serviceTexts';
import { splitHymns, triodionSrc } from '../src/utils/triodion';
import { addDays } from '../src/data/churchFeasts';

const root = new URL('../', import.meta.url);
const cal = JSON.parse(readFileSync(new URL('src/data/calendar/2027.json', root), 'utf8')).days;
const books = new Map<string, { c: { s: [string, string[]][] }[] } | null>();
const book = (coll: string, n: number) => {
  const f = new URL(coll === 'x' ? `public/wignebi-x/${String(n).padStart(2, '0')}.json` : `public/wignebi/${coll}/${String(n).padStart(2, '0')}.json`, root);
  if (!books.has(f.href)) books.set(f.href, existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null);
  return books.get(f.href);
};
const found = (src: TextSrc) => sliceOf(book(src.coll, src.n)?.c[src.part]?.s ?? [], src).length > 0;
const george = PATRON_PRESETS.find(p => p.id === 'giorgoba') as Patron;

test('every day of 2027 and of Lent–Pentecost 2028 is served from its books', () => {
  const days: string[] = [];
  for (let d = '2027-01-01'; d <= '2027-12-31'; d = addDays(d, 1)) days.push(d);
  for (let d = '2028-02-01'; d <= '2028-06-15'; d = addDays(d, 1)) days.push(d);
  const j25 = book('jamni', 25)!.c[0].s;
  assert.ok(days.length > 450);
  for (const iso of days) {
    const day = cal[iso] ?? null;
    for (const patron of [null, george]) {
      const rank = guessRank(iso, day, patron);
      const sv = buildServices({ iso, day, tone: 3, rank, patron });
      for (const id of ['vespers', 'matins', 'hours', 'liturgy']) assert.ok(sv.some(s => s.id === id), `${iso}: no ${id}`);
      for (const s of sv) {
        assert.ok(s.steps.length, `${iso} ${s.id}: empty`);
        for (const st of s.steps) {
          for (const x of st.extras ?? []) {
            if (x.kind === 'text') assert.ok(found(x.src), `${iso} ${s.id} „${st.title}“: ${x.label} not found`);
            if (x.kind === 'book') assert.ok(book(x.coll, x.n), `${iso}: book ${x.coll}/${x.n} missing`);
          }
          for (const r of st.read ?? []) if ('src' in r) assert.ok(found(r.src), `${iso} ${s.id} „${st.title}“: ${r.src.label} not found`);
        }
      }
      for (const at of ['vespers', 'matins', 'hours', 'liturgy'] as const) {
        const h = hymnsOf({ iso, day, tone: 3, rank, patron }, at);
        for (const [k, list] of [['tr', h.troparia], ['ko', h.kontakia]] as const) for (const x of list) {
          if (x.e === undefined) continue;
          const src = triodionSrc(x.e);
          assert.ok(src && splitHymns(sliceOf(j25, src))[k].length, `${iso} ${at}: ${x.label} has no text`);
        }
      }
    }
  }
});
