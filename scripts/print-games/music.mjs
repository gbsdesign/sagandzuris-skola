// The musical games' print kits (2026-11-01): a chant's or a song's opening from its book notes — public/notes/<book>/NNN.json,
// the very files the app's synthesizer plays — written as ABC and drawn on staves by abcjs (the app's own copy in
// node_modules) inside the print's Chromium. A kit puts `staff(abc)` boxes in its pages, `head` loads abcjs and `script` draws
// every box before the print (lib.mjs `build`). The notes are the book's, read by OMR: no bar lines, no words.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, esc } from './lib.mjs';

const pad3 = n => String(n).padStart(3, '0');
export const loadScore = (book, num) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'notes', book, `${pad3(num)}.json`), 'utf8'));

/** a voice as one line of notes, in order: where a voice splits (two singers) the top voice keeps the upper note, the others the lower */
export const lineOf = (score, voice) => {
  const list = [...(score.voices[voice] || [])].sort((a, b) => a[0] - b[0] || (voice === 0 ? b[2] - a[2] : a[2] - b[2]));
  return list.filter((n, i) => i === 0 || n[0] !== list[i - 1][0]).map(([beat, beats, midi]) => ({ beat, beats, midi }));
};

/**
 * The opening of a line: at least `min` notes, then up to the first long note (two beats or more) or rest — the end of
 * its first phrase — but never more than `max` notes. Returns the notes and the beat where the opening ends.
 */
export const openingOf = (line, { min = 6, max = 14 } = {}) => {
  const out = [];
  for (let i = 0; i < line.length && out.length < max; i++) {
    const n = line[i];
    const next = line[i + 1];
    const end = next ? Math.min(n.beat + n.beats, next.beat) : n.beat + n.beats;
    out.push({ ...n, beats: end - n.beat });
    const rest = next ? next.beat - (n.beat + n.beats) : 0;
    if (out.length >= min && (n.beats >= 2 || rest > 0.2)) break;
  }
  const last = out[out.length - 1];
  return { notes: out, end: last ? last.beat + last.beats : 0 };
};

/** a line's notes up to a beat (the other voices under the top voice's opening) */
export const until = (line, end) => line.filter(n => n.beat < end - 1e-6).map(n => ({ ...n, beats: Math.min(n.beats, end - n.beat) }));

// ---------- ABC ----------
const NAMES = ['C', '^C', 'D', '_E', 'E', 'F', '^F', 'G', '^G', 'A', '_B', 'B'];

/** a note's length in ABC with L:1/8 (a beat is a quarter): rounded to sixteenths, at most a dotted whole (a longer
 * recitation note or a rest while another voice sings would not draw) */
const lengthOf = beats => {
  const e = Math.min(12, Math.max(1, Math.round(beats * 4)) / 2);
  return e === 1 ? '' : Number.isInteger(e) ? String(e) : `${e * 2}/2`;
};
/** the same length in pieces a staff can draw, to be tied (voices of one score must keep their time exactly) */
const PIECES = [8, 6, 4, 3, 2, 1.5, 1, 0.5];
const piecesOf = beats => {
  let e = Math.max(0.5, Math.round(beats * 4) / 2);
  const out = [];
  while (e > 1e-6) {
    const p = PIECES.find(x => x <= e + 1e-6) ?? 0.5;
    out.push(p === 1 ? '' : Number.isInteger(p) ? String(p) : `${p * 2}/2`);
    e -= p;
  }
  return out;
};

/** the clef of a voice: a low one on the octave-down treble clef, as the chant books write the bass */
const clefOf = notes => (notes.reduce((s, n) => s + n.midi, 0) / Math.max(1, notes.length) < 59 ? 'treble-8' : 'treble');

/**
 * One voice's notes in ABC: a sharp or flat on every note that has one and a natural after it (no bar lines to end them),
 * rests between the notes, and `marks` — text over the n-th note (1-based), the ladder of „დღის ჰანგი“. `exact`: from beat
 * `from` to beat `to`, long notes and rests tied in pieces (the voices of one score); else every length at most a dotted
 * whole.
 */
const voiceOf = (notes, { marks = {}, clef, exact = null }) => {
  const shift = clef === 'treble-8' ? 12 : 0;
  const held = {};
  const len = (beats, tie) => (exact ? piecesOf(beats).map((p, i, all) => (i < all.length - 1 && tie ? `${p}-` : p)) : [lengthOf(beats)]);
  let t = exact ? exact.from : notes[0]?.beat ?? 0;
  const out = [];
  notes.forEach((n, i) => {
    if (n.beat - t > 0.2) out.push(len(n.beat - t, false).map(p => `z${p}`).join(' '));
    const m = n.midi + shift;
    const name = NAMES[((m % 12) + 12) % 12];
    const acc = name.length > 1 ? name[0] : '';
    const letter = name.slice(-1);
    const oct = Math.floor(m / 12) - 1;
    const key = letter + oct;
    // a sharp or flat on every note that has one (the line has no bars to end it), a natural after one
    const write = acc || (held[key] ? '=' : '');
    held[key] = acc;
    const pitch = oct >= 5 ? letter.toLowerCase() + "'".repeat(oct - 5) : letter + ','.repeat(4 - oct);
    const pieces = len(n.beats, true);
    out.push((marks[i + 1] ? `"^${marks[i + 1]}"` : '') + pieces.map((p, k) => (k ? '' : write) + pitch + p).join(' '));
    t = n.beat + n.beats;
  });
  if (exact && exact.to - t > 0.2) out.push(len(exact.to - t, false).map(p => `z${p}`).join(' '));
  return out.join(' ');
};

/** One voice as an ABC tune (its clef by its range unless named). */
export const abcOf = (notes, { marks = {}, clef = null } = {}) => {
  const c = clef ?? clefOf(notes);
  return `X:1\nM:none\nL:1/8\n%%annotationfont SansKa 10\nK:C clef=${c}\n${voiceOf(notes, { marks, clef: c })} |]`;
};

/**
 * Several voices as one score, their notes under each other (a staff each, bracketed, named, `gap` points apart, stretched
 * over the box): every voice from the earliest note to the latest end, a voice that comes in later starts with a rest.
 */
export const abcScore = (voices, { names = [], gap = 20 } = {}) => {
  const all = voices.flat();
  const from = Math.min(...all.map(n => n.beat)), to = Math.max(...all.map(n => n.beat + n.beats));
  // the staves `gap` points apart (abcjs: 36), the line stretched over the whole box like a printed score
  const head = `X:1\nM:none\nL:1/8\n%%score [${voices.map((_, i) => i + 1).join(' ')}]\n%%sysstaffsep ${gap}\n%%stretchlast\n%%voicefont SansKa 10\n%%annotationfont SansKa 10\nK:C\n`;
  const c = clefOf(all); // one clef for every staff, or a top voice on the plain treble clef looks lower than the next one
  return head + voices.map((notes, i) => {
    return `V:${i + 1} clef=${c}${names[i] ? ` name="${names[i]}"` : ''}\n${voiceOf(notes, { clef: c, exact: { from, to } })} |]`;
  }).join('\n');
};

/**
 * Chords on one staff (2026-11-01, „ქართული აკორდი“): each a list of MIDI notes struck together, `len` eighths long, a note
 * sung by two voices at once drawn once; the accidentals as in a voice (on every note that has one, a natural after), `marks`
 * — text over the n-th chord (1-based).
 */
export const abcChords = (chords, { len = 4, marks = {} } = {}) => {
  const c = clefOf(chords.flat().map(midi => ({ midi })));
  const shift = c === 'treble-8' ? 12 : 0;
  const held = {};
  const body = chords.map((chord, i) => {
    const notes = [...new Set(chord)].sort((a, b) => a - b).map(m0 => {
      const m = m0 + shift;
      const name = NAMES[((m % 12) + 12) % 12];
      const acc = name.length > 1 ? name[0] : '';
      const letter = name.slice(-1);
      const oct = Math.floor(m / 12) - 1;
      const key = letter + oct;
      const write = acc || (held[key] ? '=' : '');
      held[key] = acc;
      return write + (oct >= 5 ? letter.toLowerCase() + "'".repeat(oct - 5) : letter + ','.repeat(4 - oct));
    });
    const mark = marks[i + 1] ? `"^${marks[i + 1]}"` : '';
    return `${mark}${notes.length > 1 ? `[${notes.join('')}]` : notes[0]}${len}`;
  }).join(' ');
  return `X:1\nM:none\nL:1/8\n%%annotationfont SansKa 10\nK:C clef=${c}\n${body} |]`;
};

/** a box the script fills with the staff; `zoom` — its own (more = smaller notes), else the kit's */
export const staff = (abc, { cls = '', zoom = null } = {}) => `<div class="abc ${cls}" data-abc="${esc(abc)}"${zoom ? ` data-zoom="${zoom}"` : ''}></div>`;

const ABCJS = path.join(ROOT, 'node_modules', 'abcjs', 'dist', 'abcjs-basic-min.js');
/** the kit's `head`: abcjs itself, inline (the page is a local file) */
export const musicHead = () => `<script>${fs.readFileSync(ABCJS, 'utf8')}</script>`;
/** the kit's `script`: every box drawn at its own width (`staffwidth` in the box's CSS pixels times `zoom`, or the box's own) */
export const musicScript = (zoom = 1.25) => `document.querySelectorAll('.abc').forEach(el => {
  const w = el.clientWidth * (parseFloat(el.dataset.zoom) || ${zoom});
  ABCJS.renderAbc(el, el.dataset.abc, { staffwidth: w, responsive: 'resize', paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, add_classes: false, foregroundColor: '#3b2a1f' });
});`;

export const musicCss = `
.abc{width:100%}
.abc svg{display:block;width:100%;height:auto;overflow:visible}
`;
