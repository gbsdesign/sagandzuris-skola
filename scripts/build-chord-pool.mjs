// The chords of „ქართული აკორდი“ (2026-11-01): real three-voice chords of the app's chants and songs, read from their book
// notes (public/notes/<book>/NNN.json — the very files the synthesizer plays): a moment where all three voices strike together
// and each holds a beat or more, its voices in order (no crossing), sorted into the game's kinds by its exact spacing over
// the bass (utils/akordi.ts CHORD_KINDS: 1-5-8 = the middle voice a fifth over the bass, the top an octave). Per kind up to
// PER_KIND chords, each from another piece — the games' well-known chants first (data/chantGamePool.ts), then the rest in a
// fixed shuffled order, the bass notes spread. Writes src/data/chordPool.ts:
//   node scripts/build-chord-pool.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appData } from './lib/appData.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'chordPool.ts');
const PER_KIND = 20;

const app = await appData({
  'data/chantLookup.ts': ['NOTES_LISTS', 'BOOK_NAMES'],
  'data/chantGamePool.ts': ['knownChants'],
  'utils/chantRounds.ts': ['nameKey'],
  'utils/pearls.ts': ['chantName'],
  'utils/otkheuli.ts': ['mulberry32'],
  'utils/amikhseni.ts': ['shuffle'],
  'utils/akordi.ts': ['CHORD_KINDS', 'kindOfChord'],
});
const { NOTES_LISTS, BOOK_NAMES, knownChants, nameKey, chantName, mulberry32, shuffle, CHORD_KINDS, kindOfChord } = app;

const volume = book => (BOOK_NAMES[book] ?? book).split(', ').pop();
const known = new Set(knownChants().map(c => nameKey(c.title)));

// every piece with its own notes in the repo (the anthology's notes live in R2), one entry per file; a tone's heirmos or another
// piece under a list's general name („ხმა ა“) is named by its opening words too
const pieces = [];
const files = new Set();
for (const [service, list] of NOTES_LISTS) {
  for (const chant of list) {
    for (const v of chant.variants ?? []) {
      const book = v.book || 'book';
      const num = v.bookNums?.[0];
      if (!num || /^a\d/.test(book)) continue;
      const file = path.join(ROOT, 'public', 'notes', book, `${String(num).padStart(3, '0')}.json`);
      if (files.has(file) || !fs.existsSync(file)) continue;
      files.add(file);
      const song = service === 'სიმღერა';
      const name = chantName(chant.title);
      // a heirmos of vol. VIII stands under its tone („ხმა ა“): its ode and opening words name it
      const opening = v.source ? chantName(v.source) : '';
      const title = book !== 'v8' || !opening ? name : nameKey(opening) === nameKey(name) ? `${name} · ${v.version}` : `${v.version}, ${name} · „${opening}“`;
      pieces.push({ key: nameKey(title), song, title, ref: song ? `ხალხური სიმღერა · ${v.label.split(' · ')[0]}` : `${volume(book)} · №${num}`, file, known: known.has(nameKey(name)) });
    }
  }
}

/** a piece's chords, by kind: [top, middle, bass] of each moment the three strike together, a beat or longer */
const chordsOf = file => {
  const s = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = {};
  if (s.voices.length !== 3) return out;
  const starts = new Set();
  s.voices.forEach(v => v.forEach(([t]) => starts.add(t)));
  for (const t of [...starts].sort((a, b) => a - b)) {
    const struck = s.voices.map(v => v.find(([a]) => Math.abs(a - t) < 1e-6));
    if (struck.some(n => !n) || Math.min(...struck.map(n => n[1])) < 1) continue;
    const notes = struck.map(n => n[2]);
    const kind = kindOfChord(notes);
    if (kind) (out[kind] ??= []).push(notes);
  }
  return out;
};

const found = pieces.map(p => ({ ...p, chords: chordsOf(p.file) }));
// the games' well-known chants give at most KNOWN of a kind, the rest come from every book in a fixed shuffled order
const KNOWN = 8;
const others = shuffle(found.filter(p => !p.known && !p.song), mulberry32(20261101));
const famous = found.filter(p => p.known);
// the admission program's folk songs give up to SONGS of a kind
const SONGS = 5;
const songs = found.filter(p => p.song);

const rows = [];
for (const { id } of CHORD_KINDS) {
  const basses = new Map();
  const names = new Map();
  let taken = 0;
  const take = (list, max) => {
    let n = 0;
    for (const p of list) {
      if (taken >= PER_KIND || n >= max) return;
      const chords = p.chords[id];
      // one chord a piece, at most two pieces of one name
      if (!chords?.length || (names.get(p.key) ?? 0) >= 2 || rows.some(r => r[0] === id && r[5] === p.ref && r[4] === p.title)) continue;
      // the bass notes spread: this piece's chord on the least used bass
      const pick = [...chords].sort((a, b) => (basses.get(a[2]) ?? 0) - (basses.get(b[2]) ?? 0))[0];
      basses.set(pick[2], (basses.get(pick[2]) ?? 0) + 1);
      names.set(p.key, (names.get(p.key) ?? 0) + 1);
      rows.push([id, ...pick, p.title, p.ref]);
      taken += 1;
      n += 1;
    }
  };
  take(songs, SONGS);
  take(famous, KNOWN);
  take(others, PER_KIND);
  take(famous, PER_KIND);
  console.log(id.padEnd(8), taken);
}

const q = s => JSON.stringify(s);
const body = `// Generated by \`node scripts/build-chord-pool.mjs\` — never edit by hand.
// „ქართული აკორდი“: real chords of the app's chants and songs from their book notes — [kind, top, middle, bass (MIDI), the
// piece, where it is]. The kinds: utils/akordi.ts CHORD_KINDS.
import type { ChordSample } from '../utils/akordi';

export const CHORD_POOL: readonly ChordSample[] = [
${rows.map(r => `  [${r.map(q).join(', ')}],`).join('\n')}
];
`;
fs.writeFileSync(OUT, body);
console.log(`${rows.length} chords → ${path.relative(ROOT, OUT)}`);
