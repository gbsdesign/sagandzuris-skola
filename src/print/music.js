// The musical games' print kits (2026-11-01): a chant's or a song's opening from its book notes — /notes/<book>/NNN.json,
// the very files the app's synthesizer plays — written as ABC and drawn on staves by abcjs (the app's own copy) inside the
// frame the kit is laid out in (makeKit.ts). A kit puts `staff(abc)` boxes in its pages, `head` loads abcjs and `script`
// draws every box before the pages become pictures. The notes are the book's, read by OMR: no bar lines, no words.
// A kit reads its notes at once (`loadScore`): the button fetches them first — the kit's `scores` in kits.js.
import ABCJS_URL from 'abcjs/dist/abcjs-basic-min.js?url';
import { notesBase } from '../utils/notesBase';
import { esc } from './lib.js';

const pad3 = n => String(n).padStart(3, '0');
const keyOf = (book, num) => `${book}/${pad3(num)}`;
const SCORES = new Map();
const urlOf = (book, num) => `${notesBase(book)}${pad3(num)}.json`;

/** fetches the notes a kit will read, [book, num] pairs (the button, before the kit's module runs) */
export const preloadScores = async (pairs) => {
  const todo = [...new Map(pairs.map(([b, n]) => [keyOf(b, n), [b, n]])).entries()].filter(([k]) => !SCORES.has(k));
  await Promise.all(todo.map(async ([k, [b, n]]) => {
    const r = await fetch(urlOf(b, n));
    if (!r.ok) throw new Error(`notes ${k}: ${r.status}`);
    SCORES.set(k, await r.json());
  }));
};

/** a book's notes, fetched before (`preloadScores`); a scripts/ tool sets `globalThis.__sgLoadScore` to read the files.
 *  Notes nobody fetched are read at once, with a warning: the kit's `scores` in kits.js should name them. */
export const loadScore = (book, num) => {
  const k = keyOf(book, num);
  if (SCORES.has(k)) return SCORES.get(k);
  if (globalThis.__sgLoadScore) return globalThis.__sgLoadScore(book, num);
  console.warn(`print kit: notes ${k} were not fetched first — add them to the kit's scores in src/print/kits.js`);
  const x = new XMLHttpRequest();
  x.open('GET', urlOf(book, num), false);
  x.send();
  if (x.status !== 200) throw new Error(`notes ${k}: ${x.status}`);
  const score = JSON.parse(x.responseText);
  SCORES.set(k, score);
  return score;
};

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
/** the same length in pieces a staff can draw, to be tied (voices of one score must keep their time exactly): eighths on a
 * 32nd's grid (a run of seven notes in one beat is written as 32nds) */
const PIECES = [8, 6, 4, 3, 2, 1.5, 1, 0.75, 0.5, 0.25];
const piecesOf = beats => {
  let e = Math.max(0.25, Math.round(beats * 8) / 4);
  const out = [];
  while (e > 1e-6) {
    const p = PIECES.find(x => x <= e + 1e-6) ?? 0.25;
    out.push(p === 1 ? '' : Number.isInteger(p) ? String(p) : (p * 4) % 2 ? `${p * 4}/4` : `${p * 2}/2`);
    e -= p;
  }
  return out;
};

/** a beat in 32nds: the grid of a score's voices */
const GRID = 8;
const onGridAt = t => Math.round(t * GRID) / GRID;
/**
 * A score's voice on the grid: each note's start and end rounded as times counted from the score's start, not one length after
 * another (rounding each short note of a fast run up would push the rest of its voice late), never two notes on one point.
 */
const onGrid = (notes, to) => {
  const starts = [];
  notes.forEach(n => starts.push(Math.max(onGridAt(n.beat), (starts[starts.length - 1] ?? -Infinity) + 1 / GRID)));
  return notes.map((n, i) => {
    const next = starts[i + 1] ?? Math.max(starts[i] + 1 / GRID, onGridAt(to));
    return { beat: starts[i], beats: Math.max(1 / GRID, Math.min(onGridAt(n.beat + n.beats), next) - starts[i]) };
  });
};

/** the clef of a voice: a low one on the octave-down treble clef, as the chant books write the bass */
const clefOf = notes => (notes.reduce((s, n) => s + n.midi, 0) / Math.max(1, notes.length) < 59 ? 'treble-8' : 'treble');

/**
 * One voice's notes in ABC: a sharp or flat on every note that has one and a natural after it (no bar lines to end them),
 * rests between the notes, and `marks` — text over the n-th note (1-based), the ladder of „დღის ჰანგი“. `exact`: from beat
 * `from` to beat `to`, long notes and rests tied in pieces (the voices of one score); else every length at most a dotted
 * whole. `breaks`: the notes (0-based) that start a new line of the staff (a long phrase in two lines).
 */
const voiceOf = (notes, { marks = {}, clef, exact = null, breaks = null }) => {
  const shift = clef === 'treble-8' ? 12 : 0;
  const held = {};
  const len = (beats, tie) => (exact ? piecesOf(beats).map((p, i, all) => (i < all.length - 1 && tie ? `${p}-` : p)) : [lengthOf(beats)]);
  const timed = exact ? onGrid(notes, exact.to) : null;
  let t = exact ? onGridAt(exact.from) : notes[0]?.beat ?? 0;
  const out = [];
  notes.forEach((n0, i) => {
    const n = timed ? { ...n0, ...timed[i] } : n0;
    if (i > 0 && breaks?.has(i)) out.push('\n');
    // a score writes every rest, however short (its voices keep time); one line skips a breath under a fifth of a beat
    if (n.beat - t > (exact ? 1e-6 : 0.2)) out.push(len(n.beat - t, false).map(p => `z${p}`).join(' '));
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
  if (exact && onGridAt(exact.to) - t > 1e-6) out.push(len(onGridAt(exact.to) - t, false).map(p => `z${p}`).join(' '));
  return out.join(' ');
};

/** One voice as an ABC tune (its clef by its range unless named); `breaks` — the notes that begin a new line, every line then
 * stretched over the box. */
export const abcOf = (notes, { marks = {}, clef = null, breaks = null } = {}) => {
  const c = clef ?? clefOf(notes);
  return `X:1\nM:none\nL:1/8\n${breaks?.size ? '%%stretchlast\n' : ''}%%annotationfont SansKa 10\nK:C clef=${c}\n${voiceOf(notes, { marks, clef: c, breaks })} |]`;
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

/** the kit's `head`: abcjs itself, loaded by the frame the kit is laid out in */
export const musicHead = () => `<script src="${ABCJS_URL}"></script>`;
/** the kit's `script`: every box drawn at its own width (`staffwidth` in the box's CSS pixels times `zoom`, or the box's own);
 * a line too full for it (abcjs then draws past its end) is drawn again wider — smaller notes — until it fits */
export const musicScript = (zoom = 1.25) => `document.querySelectorAll('.abc').forEach(el => {
  let w = el.clientWidth * (parseFloat(el.dataset.zoom) || ${zoom});
  for (let n = 0; n < 4; n++) {
    ABCJS.renderAbc(el, el.dataset.abc, { staffwidth: w, responsive: 'resize', paddingtop: 0, paddingbottom: 0, paddingleft: 0, paddingright: 0, add_classes: false, foregroundColor: '#3b2a1f' });
    const svg = el.querySelector('svg');
    const vb = svg && svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width) break;
    const box = svg.getBBox();
    if (box.x + box.width <= vb.width + 1) break;
    w *= ((box.x + box.width) / vb.width) * 1.03;
  }
});`;

export const musicCss = `
.abc{width:100%}
.abc svg{display:block;width:100%;height:auto;overflow:visible}
`;
