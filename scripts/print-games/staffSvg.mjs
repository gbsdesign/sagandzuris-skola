// Staves drawn by hand for the print kits of „ექო“ and „მფრინავი ნოტები“ (2026-11-01): five lines, abcjs's own clef, note
// head and accidental signs (node_modules/abcjs, MIT — the app's notation library, read at build time, the same signs as the
// app's flying notes in pages/games/mprinavi/glyphs.ts) and the notes evenly after the clef, so a word under every note
// never runs into the next one (abcjs's own layout squeezes words). Every size is in mm; the SVG's user unit is a mm.
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, esc } from './lib.mjs';

const require = createRequire(import.meta.url);
const glyphs = require(path.join(ROOT, 'node_modules', 'abcjs', 'src', 'write', 'creation', 'glyphs.js'));
/** abcjs draws a line space 7.75 of its units */
const UNIT = 7.75;
const pathOf = name => {
  const p = glyphs.getPathForSymbol(0, 0, name, 1, 1);
  if (!p) throw new Error(`no glyph ${name}`);
  return p.map(([c, ...n]) => c + n.map(v => +v.toFixed(3)).join(' ')).join('');
};
const SIGN = {
  treble: pathOf('clefs.G'), bass: pathOf('clefs.F'), quarter: pathOf('noteheads.quarter'), whole: pathOf('noteheads.whole'),
  sharp: pathOf('accidentals.sharp'), flat: pathOf('accidentals.flat'), nat: pathOf('accidentals.nat'), eight: pathOf('8'),
};
const WIDTH = { treble: 19.05, bass: 20.15, quarter: 9.81, whole: 14.99, sharp: 8.25, flat: 6.75, nat: 5.4, eight: 10.93 };

/** a pitch class → its letter (C = 0 … B = 6) and sign, spelled as the app spells it (utils/eqo.ts `pitchName`) */
const SPELL = [[0, ''], [0, 'sharp'], [1, ''], [2, 'flat'], [2, ''], [3, ''], [3, 'sharp'], [4, ''], [4, 'sharp'], [5, ''], [6, 'flat'], [6, '']];
const spell = midi => { const pc = ((midi % 12) + 12) % 12; return { letter: SPELL[pc][0], acc: SPELL[pc][1], oct: Math.floor(midi / 12) }; };
const diatonic = midi => { const s = spell(midi); return s.oct * 7 + s.letter; };

/** each clef's bottom line; the octave-down treble clef (the chant books' low voices) is written an octave over its sound */
export const CLEFS = { treble: { bottom: 64, shift: 0, sign: 'treble' }, 'treble-8': { bottom: 64, shift: 12, sign: 'treble' }, bass: { bottom: 43, shift: 0, sign: 'bass' } };
/** a note's place on a clef's staff: 0 = the bottom line, 8 = the top one, negative under it */
export const posOf = (midi, clef) => diatonic(midi + CLEFS[clef].shift) - diatonic(CLEFS[clef].bottom);
/** a sung line's clef: the treble clef or the octave-down one (the chant books' low voices), whichever needs fewer ledger lines */
export const clefFor = midis => {
  const out = clef => midis.reduce((s, m) => { const p = posOf(m, clef); return s + Math.max(0, -1 - p) + Math.max(0, p - 9); }, 0);
  return out('treble-8') < out('treble') ? 'treble-8' : 'treble';
};

const f = n => +n.toFixed(3);

/**
 * A staff `width` mm wide: its clef, then the notes evenly — each { midi, over?, under?, under2?, color?, wordColor? } or null
 * for a gap, its
 * words centred over the staff or under it, in rows. `space`: a line space; `head`: 'quarter' (with a stem) or 'whole';
 * `room`: line spaces kept over and under the staff (ledger lines, the clef); `over` / `under`: the rows' heights; `font`: the
 * words' size; `trail`: a colour for speed lines behind each note. A sharp or flat stands on every note that has one and a
 * natural after it (a line without bars). Returns
 * { svg, height } — the SVG `width` × `height` mm.
 */
export const staffSvg = ({
  clef, notes, width, space = 2.2, head = 'quarter', room = 2.5, over = 0, under = 0, font = 2.9, padRight = 1.5, clefGap = null,
  ink = '#3b2a1f', overInk = '#9a8b7b', underInk = '#4a3426', cls = '', trail = null,
}) => {
  const k = space / UNIT;
  const top = over + room * space;
  const bottom = top + 4 * space;
  const height = bottom + room * space + under;
  const yOf = pos => bottom - pos * (space / 2);
  const sign = CLEFS[clef].sign;
  const clefX = 0.6 * space;
  const clefW = WIDTH[sign] * k;
  const start = clefX + clefW + (clefGap ?? 1.1 * space);
  const step = (width - start - padRight) / Math.max(1, notes.length);
  const headW = WIDTH[head] * k;
  const out = [];
  for (let l = 0; l <= 8; l += 2) out.push(`<line x1="0" x2="${f(width)}" y1="${f(yOf(l))}" y2="${f(yOf(l))}" stroke="${ink}" stroke-width="${f(space * 0.075)}"/>`);
  out.push(`<path d="${SIGN[sign]}" transform="translate(${f(clefX)} ${f(yOf(sign === 'treble' ? 2 : 6))}) scale(${f(k)})" fill="${ink}"/>`);
  if (clef === 'treble-8') {
    const s = 0.42 * k;
    out.push(`<path d="${SIGN.eight}" transform="translate(${f(clefX + clefW / 2 - (WIDTH.eight * s) / 2 - 0.1 * space)} ${f(yOf(2) + (19.6 + 1.2) * k + 15 * s)}) scale(${f(s)})" fill="${ink}"/>`);
  }
  const held = {};
  notes.forEach((n, i) => {
    if (!n) return; // an empty slot: a gap between groups of notes
    const pos = posOf(n.midi, clef);
    const sp = spell(n.midi + CLEFS[clef].shift);
    const cx = start + step * (i + 0.5);
    const x = cx - headW / 2;
    const y = yOf(pos);
    const color = n.color ?? ink;
    const ledger = [];
    for (let l = -2; l >= pos; l -= 2) ledger.push(l);
    for (let l = 10; l <= pos; l += 2) ledger.push(l);
    ledger.forEach(l => out.push(`<line x1="${f(x - 0.4 * space)}" x2="${f(x + headW + 0.4 * space)}" y1="${f(yOf(l))}" y2="${f(yOf(l))}" stroke="${ink}" stroke-width="${f(space * 0.09)}"/>`));
    const key = `${sp.letter}.${sp.oct}`;
    const acc = sp.acc || (held[key] ? 'nat' : '');
    held[key] = sp.acc;
    if (acc) out.push(`<path d="${SIGN[acc]}" transform="translate(${f(x - (WIDTH[acc] + 2.2) * k)} ${f(y)}) scale(${f(k)})" fill="${color}"/>`);
    // „მფრინავი ნოტები“: three speed lines behind a flying note (it flies to the left, towards the clef)
    if (trail) [-0.42, 0, 0.42].forEach((d, j) => out.push(`<line x1="${f(x + headW + 0.5 * space + j * 0.35 * space)}" x2="${f(x + headW + (2.6 - j * 0.5) * space)}" y1="${f(y + d * space)}" y2="${f(y + d * space)}" stroke="${trail}" stroke-width="${f(space * 0.16)}" stroke-linecap="round"/>`));
    out.push(`<path d="${SIGN[head]}" transform="translate(${f(x)} ${f(y)}) scale(${f(k)})" fill="${color}"/>`);
    if (head === 'quarter') {
      const up = pos < 4;
      const sx = up ? x + headW - 0.06 * space : x + 0.06 * space;
      out.push(`<line x1="${f(sx)}" x2="${f(sx)}" y1="${f(up ? y - 0.15 * space : y + 0.15 * space)}" y2="${f(up ? y - 3.4 * space : y + 3.4 * space)}" stroke="${color}" stroke-width="${f(space * 0.1)}"/>`);
    }
    if (n.over) out.push(`<text x="${f(cx)}" y="${f(over - 0.9)}" text-anchor="middle" font-size="${f(font * 0.9)}" fill="${n.overColor ?? overInk}">${esc(n.over)}</text>`);
    if (n.under) out.push(`<text x="${f(cx)}" y="${f(bottom + room * space + font + 0.3)}" text-anchor="middle" font-size="${f(font)}" fill="${n.wordColor ?? underInk}">${esc(n.under)}</text>`);
    if (n.under2) out.push(`<text x="${f(cx)}" y="${f(bottom + room * space + font * 2.2 + 0.3)}" text-anchor="middle" font-size="${f(font * 0.85)}" fill="${overInk}">${esc(n.under2)}</text>`);
  });
  return {
    height,
    svg: `<svg class="staff ${cls}" viewBox="0 0 ${f(width)} ${f(height)}" width="${f(width)}mm" height="${f(height)}mm" font-family="SansKa, sans-serif" font-weight="700">${out.join('')}</svg>`,
  };
};
