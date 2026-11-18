// The dark look (src/design/tokens.css `html.sg-dark`, settings → „იერი“): its values agree with tokens.ts's DARK, and its
// words are readable on its grounds (4.5 : 1), the accents' grounds under white words too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLOR, DARK, DARK_WORDS } from '../src/design/tokens';

const css = readFileSync('src/design/tokens.css', 'utf8');
const block = /html\.sg-dark\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
const dark: Record<string, string> = Object.fromEntries(
  [...block.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map(m => [m[1], m[2].trim()]),
);
const kebab = (s: string) => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

test('the dark block and tokens.ts DARK say the same', () => {
  assert.ok(block, 'tokens.css has an html.sg-dark block');
  for (const [name, hex] of Object.entries(DARK)) assert.equal(dark[`color-${kebab(name)}`], hex, name);
  const named = Object.keys(dark).filter(k => k.startsWith('color-') && k !== 'color-track');
  assert.equal(named.length, Object.keys(DARK).length, 'a colour is in one file and not in the other');
  // every name it changes exists in the light look
  for (const k of named) assert.ok(k.replace('color-', '').split('-').reduce((a, p, i) => a + (i ? p[0].toUpperCase() + p.slice(1) : p), '') in COLOR, k);
});

const lum = (hex: string) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('dark: words are readable on their grounds (4.5 : 1)', () => {
  const d = DARK;
  const w = DARK_WORDS;
  const pairs: [string, string, string][] = [
    ['ink on page', d.ink, d.page], ['ink on surf', d.ink, d.surf], ['ink on soft', d.ink, d.soft], ['ink on tint', d.ink, d.tint],
    ['mut on page', d.mut, d.page], ['mut on surf', d.mut, d.surf], ['mut on soft', d.mut, d.soft], ['mut on tint', d.mut, d.tint],
    ['wine word on page', w.wine, d.page], ['wine word on surf', w.wine, d.surf], ['wine word on tint', w.wine, d.tint],
    ['danger word on page', w.danger, d.page], ['danger word on surf', w.danger, d.surf],
    ['sea word on surf', w.sea, d.surf], ['sea word on sea-tint', w.sea, d.seaTint],
    ['gold-ink on surf', d.goldInk, d.surf], ['gold-ink on gold-tint', d.goldInk, d.goldTint],
    ['leaf-ink on surf', d.leafInk, d.surf], ['leaf-ink on leaf-tint', d.leafInk, d.leafTint],
    // the accents' grounds keep their colour and their white words
    ['white on wine', COLOR.surf, COLOR.wine], ['white on danger', COLOR.surf, COLOR.danger],
  ];
  for (const [name, a, b] of pairs) assert.ok(contrast(a, b) >= 4.5, `${name}: ${contrast(a, b).toFixed(2)}`);
  // a hairline and a switched-off track can be seen on a card (not text: 1.3 : 1 is enough to tell)
  assert.ok(contrast(d.line, d.surf) >= 1.2, 'line on surf');
  assert.ok(contrast(d.dim, d.surf) >= 1.5, 'dim on surf');
});
