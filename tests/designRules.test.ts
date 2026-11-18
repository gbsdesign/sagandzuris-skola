// The redesign's design rules (src/design/tokens.css): the values, their readability, and that the rebuilt parts of
// the app use nothing else. A folder is added to LOCKED once its screens are rebuilt for the new look.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { COLOR, RADIUS_PX, TAP_PX, TEXT_PX } from '../src/design/tokens';

const css = readFileSync('src/design/tokens.css', 'utf8');
const vars: Record<string, string> = Object.fromEntries(
  [...css.matchAll(/^\s*--([a-z0-9-]+):\s*([^;]+);/gm)].map(m => [m[1], m[2].trim()]),
);
const kebab = (s: string) => s.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
const px = (v: string) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v));

test('tokens.ts says what tokens.css says', () => {
  for (const [name, hex] of Object.entries(COLOR)) assert.equal(vars[`color-${kebab(name)}`], hex, name);
  const cssColours = Object.keys(vars).filter(k => k.startsWith('color-') && k !== 'color-track');
  assert.equal(cssColours.length, Object.keys(COLOR).length, 'a colour is in one file and not in the other');
  for (const [name, size] of Object.entries(TEXT_PX)) assert.equal(px(vars[`text-${name}`]), size, name);
  for (const [name, r] of Object.entries(RADIUS_PX)) assert.equal(px(vars[`radius-${name}`]), r, name);
  for (const [name, d] of Object.entries(TAP_PX)) assert.equal(vars[`spacing-${kebab(name)}`], `${d}px`, name);
});

test('seven text sizes, none under 12px; nothing tappable under 44px', () => {
  const sizes = Object.keys(vars).filter(k => /^text-[a-z]+$/.test(k));
  assert.equal(sizes.length, 7);
  for (const k of sizes) assert.ok(px(vars[k]) >= 12, k);
  assert.ok(TAP_PX.tap >= 44 && TAP_PX.tapLg >= 48);
});

const lum = (hex: string) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('words are readable on their grounds (4.5 : 1), marks are visible on theirs (3 : 1)', () => {
  const c = COLOR;
  const text: [string, string, string][] = [
    ['ink on surf', c.ink, c.surf], ['ink on page', c.ink, c.page], ['ink on soft', c.ink, c.soft],
    ['mut on surf', c.mut, c.surf], ['mut on page', c.mut, c.page], ['mut on soft', c.mut, c.soft], ['mut on tint', c.mut, c.tint],
    ['wine on surf', c.wine, c.surf], ['wine on page', c.wine, c.page], ['wine on tint', c.wine, c.tint],
    ['gold-ink on surf', c.goldInk, c.surf], ['gold-ink on page', c.goldInk, c.page], ['gold-ink on gold-tint', c.goldInk, c.goldTint],
    ['leaf-ink on surf', c.leafInk, c.surf], ['leaf-ink on page', c.leafInk, c.page], ['leaf-ink on leaf-tint', c.leafInk, c.leafTint],
    ['sea on surf', c.sea, c.surf], ['sea on page', c.sea, c.page], ['sea on sea-tint', c.sea, c.seaTint],
    ['danger on surf', c.danger, c.surf], ['danger on page', c.danger, c.page],
    ['white on wine', c.surf, c.wine], ['white on danger', c.surf, c.danger],
    ['night-ink on night-surf', c.nightInk, c.nightSurf], ['night-ink on ink', c.nightInk, c.ink],
    ['blush on ink', c.blush, c.ink], ['blush on night-surf', c.blush, c.nightSurf],
  ];
  for (const [name, a, b] of text) assert.ok(contrast(a, b) >= 4.5, `${name}: ${contrast(a, b).toFixed(2)}`);
  // an icon or a bold big word on a coloured round mark
  for (const mark of [c.gold, c.leaf, c.sea, c.plum, c.clay]) assert.ok(contrast(c.surf, mark) >= 3, mark);
});

// ——— the lock ———

/** folders whose screens are rebuilt for the new look: only the design rules' names may style them */
const LOCKED = ['src/components/ui2', 'src/components/aiLesson', 'src/components/shell', 'src/pages/shell', 'src/pages/v2'];

/** a line a rule may be broken on, with the reason (keep it short and rare) */
const ALLOWED: { file: string; has: string; why: string }[] = [];

const filesOf = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesOf(p) : /\.(tsx|ts|css)$/.test(name) ? [p] : [];
  });

const PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|dusk';
const PAINT = 'text|bg|border|ring|fill|stroke|from|via|to|outline|decoration|divide|accent|caret|shadow|placeholder';
const RULES: [RegExp, string][] = [
  [/#[0-9a-fA-F]{3,8}\b/, 'a hex colour — use a colour name of the design rules (or COLOR from design/tokens.ts)'],
  [/\brgba?\(/, 'an rgb() colour — use a colour name with an opacity, like bg-ink/10'],
  [new RegExp(`\\b(?:${PAINT})-(?:${PALETTE})-\\d{2,3}\\b`), 'a colour of the stock palette — use a colour name of the design rules'],
  [/\btext-\[\s*[\d.]/, 'a one-off text size — use text-cap · meta · body · lead · head · title · hero'],
  [/\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/, 'a stock text size — use text-cap · meta · body · lead · head · title · hero'],
  [/\brounded(?:-[trblse]{1,2})?-(?:\[|xs\b|sm\b|md\b|lg\b|xl\b|[23]xl\b)/, 'a one-off corner — use rounded-card · tile · field · chip · full'],
  [/\brounded(?![-\w])/, 'a bare corner — use rounded-card · tile · field · chip · full'],
  [/\bshadow-(?:\[|xs\b|sm\b|md\b|lg\b|xl\b|2xl\b)/, 'a one-off shadow — use shadow-float · lift · wine · knob · sheet'],
];

/** code without its comments, line numbers kept */
const bare = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, lead: string) => lead + ' '.repeat(m.length - lead.length));

test('the rebuilt parts of the app use only the design rules', () => {
  const broken: string[] = [];
  for (const file of LOCKED.flatMap(filesOf)) {
    bare(readFileSync(file, 'utf8')).split('\n').forEach((line, i) => {
      for (const [rule, why] of RULES) {
        if (!rule.test(line)) continue;
        if (ALLOWED.some(a => file.endsWith(a.file) && line.includes(a.has))) continue;
        broken.push(`${file}:${i + 1} — ${why}\n    ${line.trim().slice(0, 140)}`);
      }
    });
  }
  assert.equal(broken.length, 0, '\n' + broken.join('\n'));
});
