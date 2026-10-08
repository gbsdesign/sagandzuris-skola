// Run: npm test  (node:test through tsx)
// The abituri theory lessons: the university's test sample solved, and every written example checked by abcjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import abcjs from 'abcjs';
import { chord, interval, intervalName, letter, midi, note, scale, steps, syllable, type Note } from '../src/utils/musicTheory';
import {
  GROUP_24, GROUP_34, LESSONS, SAMPLE_DICTATION, SAMPLE_MELODY, SAMPLE_MELODY_DOWN, SAMPLE_RHYTHM, SAMPLE_RHYTHM_GROUPED,
  TRANSPOSE_DOWN, TRANSPOSE_UP, type StaffSpec,
} from '../src/data/abituriLessons';

const L = (ns: Note[]) => ns.map(letter).join(' ');

test('the sample: intervals from the given notes', () => {
  const cases: [string, string, string][] = [
    ['E4', 'დ.3', 'Gis'], ['A4', 'წ.1', 'A'], ['F4', 'წ.5', 'C'], ['A4', 'პ.2', 'B'], ['G4', 'პ.6', 'Es'],
    ['F4', 'წ.4', 'B'], ['E4', 'დ.2', 'Fis'], ['F4', 'დ.7', 'E'], ['G4', 'პ.3', 'B'], ['D4', 'წ.8', 'D'],
  ];
  for (const [g, l, want] of cases) assert.equal(letter(interval(note(g), l)), want, `${g} ${l}`);
});

test('the sample: chords from the given (lowest) notes', () => {
  assert.equal(L(chord(note('F4'), 'მაჟ.', '5/3')), 'F A C');
  assert.equal(L(chord(note('E4'), 'მაჟ.', '6')), 'E G C');
  assert.equal(L(chord(note('A4'), 'მაჟ.', '6/4')), 'A D Fis');
  assert.equal(L(chord(note('G4'), 'მინ.', '5/3')), 'G B D');
  assert.equal(L(chord(note('D4'), 'მინ.', '6')), 'D Fis H');
  assert.equal(L(chord(note('G4'), 'მინ.', '6/4')), 'G C Es');
});

test('the sample: modes', () => {
  assert.equal(L(scale(note('D4'), 'მიქსოლიდიური')), 'D E Fis G A H C D');
  assert.equal(L(scale(note('C4'), 'დორიული')), 'C D Es F G A B C');
  assert.equal(L(scale(note('G4'), 'ლიდიური')), 'G A H Cis D E Fis G');
  assert.equal(L(scale(note('B3'), 'ფრიგიული')), 'H C D E Fis G A H');
  assert.deepEqual(steps(scale(note('C4'), 'მაჟორი')), ['ტ', 'ტ', 'ნ', 'ტ', 'ტ', 'ტ', 'ნ']);
  assert.deepEqual(steps(scale(note('A4'), 'ნატურალური მინორი')), ['ტ', 'ნ', 'ტ', 'ტ', 'ნ', 'ტ', 'ტ']);
});

test('the sample: letter and syllable names', () => {
  assert.equal(syllable(note('A4')), 'ლა');
  assert.equal(syllable(note('C#4')), 'დო დიეზი');
  assert.equal(syllable(note('Db4')), 'რე ბემოლი');
  assert.equal(letter(note('Bb4')), 'B');
  assert.equal(letter(note('G#4')), 'Gis');
  assert.deepEqual(['Eb4', 'Ab4', 'B4', 'Cb4', 'F##4', 'Bbb4', 'Ebb4'].map(s => letter(note(s))), ['Es', 'As', 'H', 'Ces', 'Fisis', 'Heses', 'Eses']);
});

test('interval names go both ways', () => {
  const labels = ['წ.1', 'პ.2', 'დ.2', 'პ.3', 'დ.3', 'წ.4', 'გად.4', 'შემც.5', 'წ.5', 'პ.6', 'დ.6', 'პ.7', 'დ.7', 'წ.8'];
  for (const s of ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'F#4', 'Bb3']) {
    for (const l of labels) {
      const up = interval(note(s), l);
      assert.equal(intervalName(note(s), up), l, `${s} ${l}`);
      assert.equal(intervalName(interval(up, l, true), up), l, `down ${s} ${l}`);
    }
  }
});

// ---------- the written examples, read back by abcjs ----------

interface Ev { pitch: number; start: number; dur: number }
const events = (abc: string, voice?: number): Ev[] => {
  const [t] = abcjs.parseOnly(`X:1\n${abc}`);
  return t.setUpAudio({}).tracks
    .flatMap((tr, i) => (voice != null && i !== voice ? [] : tr))
    .flatMap(e => (e.cmd === 'note' ? [{ pitch: e.pitch, start: e.start, dur: e.duration }] : []))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
};
const warnings = (abc: string) => abcjs.parseOnly(`X:1\n${abc}`)[0].warnings ?? [];

test('the sample melody moved down a major second', () => {
  const a = events(SAMPLE_MELODY), b = events(SAMPLE_MELODY_DOWN);
  assert.equal(a.length, 12);
  assert.deepEqual(b.map(e => e.pitch), a.map(e => e.pitch - 2));
  assert.deepEqual(b.map(e => e.dur), a.map(e => e.dur));
});

test('the transposition exercises', () => {
  const up = [events(TRANSPOSE_UP[0]), events(TRANSPOSE_UP[1])];
  assert.deepEqual(up[1].map(e => e.pitch), up[0].map(e => e.pitch + 2));
  const down = [events(TRANSPOSE_DOWN[0]), events(TRANSPOSE_DOWN[1])];
  assert.deepEqual(down[1].map(e => e.pitch), down[0].map(e => e.pitch - 3));
});

// grouped rhythms sound exactly like the given ones (ties joined) and fill every bar
const barsFull = (abc: string, beats: number) => {
  for (const bar of abc.split('\n').pop()!.split('|').map(s => s.replace(/[\]\-]/g, '').trim()).filter(Boolean)) {
    let len = 0;
    for (const m of bar.matchAll(/[A-Ga-gz][,']*(\d*)/g)) len += m[1] ? Number(m[1]) : 1;
    assert.equal(len, beats, `bar „${bar}“`);
  }
};
test('the grouping answers', () => {
  for (const [given, grouped, beats] of [[SAMPLE_RHYTHM, SAMPLE_RHYTHM_GROUPED, 8], [GROUP_24[0], GROUP_24[1], 4], [GROUP_34[0], GROUP_34[1], 6]] as const) {
    assert.deepEqual(events(grouped).map(e => [e.start, e.dur]), events(given).map(e => [e.start, e.dur]));
    barsFull(grouped, beats);
  }
});

test('the dictation sample: three voices of four 4/4 bars', () => {
  for (const v of [0, 1, 2]) {
    const ev = events(SAMPLE_DICTATION, v);
    assert.equal(Math.max(...ev.map(e => e.start + e.dur)), 4, `voice ${v + 1}`);
  }
  // it ends on A–A–E (unison and fifth)
  assert.deepEqual([2, 1, 0].map(v => events(SAMPLE_DICTATION, v).pop()!.pitch), [57, 57, 64]);
});

test('every staff in the lessons reads without warnings', () => {
  const staffs: StaffSpec[] = [];
  for (const l of LESSONS) {
    for (const b of l.blocks) {
      if ('exam' in b) { if (b.staff) staffs.push(b.staff); } else if ('staff' in b) staffs.push(b.staff);
      if ('ex' in b) for (const e of b.ex) { if (e.abc) staffs.push({ abc: e.abc }); if (e.aAbc) staffs.push({ abc: e.aAbc }); }
    }
  }
  assert.ok(staffs.length > 40);
  for (const s of staffs) assert.deepEqual(warnings(s.abc), [], s.abc);
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
  assert.deepEqual(LESSONS.flatMap(l => (l.task ? [l.task] : [])).sort(), [1, 2, 3, 4, 5, 6, 7]);
});

test('midi numbers', () => {
  assert.equal(midi(note('C4')), 60);
  assert.equal(midi(note('A4')), 69);
  assert.equal(midi(note('B3')), 59);
});
