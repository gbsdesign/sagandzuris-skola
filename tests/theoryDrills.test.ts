// Run: npm test  (node:test through tsx)
// The endless abituri practice: hundreds of generated tasks, each answer checked another way (abcjs reads the notes back).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import abcjs from 'abcjs';
import { DICTATIONS } from '../src/data/abituriDictations';
import { CHANTS, SIGHT_READING } from '../src/data/abituriProgram';
import { findVersion } from '../src/data/chantLookup';
import { intervalName, midi, scale, steps } from '../src/utils/musicTheory';
import {
  isRight, makeChord, makeEarChord, makeEarInterval, makeGrouping, makeInterval, makeLetter, makeMockTest, makeMode, makeRest,
  makeTranspose, seeded, startState, type Meter, type Task, type TaskState,
} from '../src/utils/theoryDrills';

const N = 300;
const read = (abc: string) => {
  const [t] = abcjs.parseOnly(`X:1\n${abc}`);
  assert.deepEqual(t.warnings ?? [], [], abc);
  return t.setUpAudio({}).tracks.flat()
    .flatMap(e => (e.cmd === 'note' ? [{ pitch: e.pitch, start: e.start, dur: e.duration }] : []))
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
};

test('intervals: the answer is the asked interval', () => {
  const r = seeded(1);
  for (let i = 0; i < N; i++) {
    const t = makeInterval(r);
    assert.equal(intervalName(t.given, t.answer), t.label, JSON.stringify(t));
    assert.ok(Math.abs(t.answer.alt) <= 1);
  }
});

test('chords: built on the given bass, stacked upwards', () => {
  const r = seeded(2);
  for (let i = 0; i < N; i++) {
    const t = makeChord(r);
    assert.deepEqual(t.answer[0], t.bass);
    assert.ok(midi(t.answer[0]) < midi(t.answer[1]) && midi(t.answer[1]) < midi(t.answer[2]));
  }
});

test('modes: eight notes, one per step, no double signs', () => {
  const r = seeded(3);
  for (let i = 0; i < N; i++) {
    const t = makeMode(r);
    assert.equal(t.answer.length, 8);
    assert.ok(t.answer.every((n, k) => n.step === (t.tonic.step + k) % 7 && Math.abs(n.alt) <= 1));
    assert.deepEqual(steps(t.answer), steps(scale(t.tonic, t.mode)));
  }
});

test('transposition: every note moves by the same interval, the rhythm stays', () => {
  const r = seeded(4);
  const semis: Record<string, number> = { 'დ.2': 2, 'პ.2': 1, 'პ.3': 3, 'დ.3': 4, 'წ.4': 5, 'წ.5': 7 };
  for (let i = 0; i < 120; i++) {
    const t = makeTranspose(r);
    const a = read(t.given), b = read(t.answer);
    const shift = (t.down ? -1 : 1) * semis[t.label];
    assert.deepEqual(b.map(e => e.pitch), a.map(e => e.pitch + shift), `${t.given}\n→\n${t.answer}`);
    assert.deepEqual(b.map(e => [e.start, e.dur]), a.map(e => [e.start, e.dur]));
  }
});

// every bar of the answer is full, and it sounds exactly like the given line (ties joined)
const barsFull = (abc: string, eighths: number) => {
  for (const bar of abc.split('\n').pop()!.split('|').map(s => s.replace(/[\]\-]/g, '').trim()).filter(Boolean)) {
    let len = 0;
    for (const m of bar.matchAll(/[A-Ga-gz][,']*(\d*)/g)) len += m[1] ? Number(m[1]) : 1;
    assert.equal(len, eighths, `bar „${bar}“ in\n${abc}`);
  }
};
test('grouping: full bars, same rhythm, the 4/4 middle shown', () => {
  const r = seeded(5);
  const bar: Record<Meter, number> = { '2/4': 4, '3/4': 6, '4/4': 8, '3/8': 3, '6/8': 6 };
  for (let i = 0; i < 200; i++) {
    const t = makeGrouping(r);
    assert.deepEqual(read(t.answer).map(e => [e.start, e.dur]), read(t.given).map(e => [e.start, e.dur]), `${t.given}\n${t.answer}`);
    barsFull(t.answer, bar[t.meter]);
    if (t.meter === '4/4') {
      // no note that starts after the downbeat runs over the middle of the bar
      for (const b of t.answer.split('\n').pop()!.split('|')) {
        let pos = 0;
        for (const m of b.matchAll(/([Fz])(\d*)/g)) {
          const len = m[2] ? Number(m[2]) : 1;
          assert.ok(!(pos > 0 && pos < 4 && pos + len > 4), `middle hidden in „${b}“`);
          pos += len;
        }
      }
    }
  }
});

test('letters and rests: four different options, the answer among them', () => {
  const r = seeded(6);
  for (let i = 0; i < N; i++) {
    const l = makeLetter(r);
    assert.equal(l.options.length, 4);
    assert.equal(new Set(l.options).size, 4);
    assert.ok(l.options.includes(l.answer));
    const p = makeRest(r);
    assert.equal(new Set(p.options).size, 4);
    assert.ok(p.options.includes(p.dur));
  }
});

// the answer a perfect student gives
const perfect = (t: Task): TaskState => {
  const s = startState(t);
  switch (t.kind) {
    case 'mode': return { ...s, alts: t.answer.map(n => n.alt) };
    case 'interval': return { ...s, picks: [t.answer] };
    case 'chord': return { ...s, picks: [t.answer[1], t.answer[2]] };
    case 'transpose': case 'group': case 'dictation': return { ...s, self: true };
    case 'letter': return { ...s, choice: t.answer };
    case 'rest': return { ...s, choice: t.dur };
    case 'earInterval': return { ...s, choice: t.label };
    case 'earChord': return { ...s, choice: `${t.chordKind} ${t.shape}` };
    default: return s;
  }
};
test('the mock test: the sample\'s parts, full marks for right answers only', () => {
  const r = seeded(8);
  for (let i = 0; i < 20; i++) {
    const items = makeMockTest(r);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(sec => items.filter(it => it.section === sec).length), [4, 10, 6, 1, 1, 5, 5]);
    for (const { task } of items) {
      assert.ok(isRight(task, perfect(task)), JSON.stringify(task));
      if (task.kind === 'letter') assert.ok(!isRight(task, { ...perfect(task), choice: task.options.find(o => o !== task.answer)! }));
      if (task.kind === 'interval') assert.ok(!isRight(task, { ...perfect(task), picks: [{ ...task.answer, alt: task.answer.alt === 1 ? 0 : 1 }] }));
    }
  }
});

test('dictations: three voices, four full bars, the end on unison, octave or fifth', () => {
  DICTATIONS.forEach((d, n) => {
    const [t] = abcjs.parseOnly(`X:1\n${d.abc}`);
    assert.deepEqual(t.warnings ?? [], [], d.title);
    const tracks = t.setUpAudio({}).tracks.map(tr => tr.flatMap(e => (e.cmd === 'note' ? [e] : [])));
    assert.equal(tracks.length, 3, d.title);
    const [num, den] = d.meter.split('/').map(Number);
    for (const tr of tracks) assert.equal(Math.max(...tr.map(e => e.start + e.duration)), (4 * num) / den, d.title);
    const last = tracks.map(tr => tr[tr.length - 1].pitch);
    for (const a of last) for (const b of last) assert.ok([0, 5, 7].includes(Math.abs(a - b) % 12), `${d.title}: the last chord`);
    if (n === 0) return; // the university's own keeps its seconds and sevenths
    // the school's: no second, seventh or tritone between two voices on a beat
    for (let x = 0; x < (4 * num) / den; x += 0.25) {
      const now = tracks.map(tr => tr.find(e => e.start <= x + 1e-9 && e.start + e.duration > x + 1e-9)!.pitch);
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
        assert.ok(![1, 2, 6, 10, 11].includes(Math.abs(now[i] - now[j]) % 12), `${d.title} at ${x}: voices ${i + 1}–${j + 1}`);
      }
    }
  });
});

test('motifs: 3–4 even notes or 5–7 with a rhythm, in the voice\'s range', () => {
  const r = seeded(9);
  for (let i = 0; i < 200; i++) {
    const hard = i % 2 === 0, low = i % 4 < 2;
    const t = makeMotif(r, hard, low);
    const ev = read(t.abc);
    assert.ok(hard ? ev.length >= 5 && ev.length <= 7 : ev.length >= 3 && ev.length <= 4, t.abc);
    assert.equal(t.abc.includes('clef=bass'), low);
    const pitches = ev.map(e => e.pitch);
    assert.ok(Math.max(...pitches) - Math.min(...pitches) <= 12, t.abc);
    assert.ok(low ? Math.max(...pitches) <= 64 : Math.min(...pitches) >= 52, t.abc);
  }
});

test('sight-reading: every chant opens on its notes page, none from the program', () => {
  const program = new Set(CHANTS.map(c => c.vid));
  for (const s of SIGHT_READING) {
    const v = findVersion(s.vid);
    assert.ok(v, s.vid);
    assert.deepEqual(v!.variant.bookNums, [s.num], s.vid);
    assert.ok(!program.has(s.vid), s.vid);
  }
});

test('by ear: the task is one of its options', () => {
  const r = seeded(7);
  for (let i = 0; i < N; i++) {
    const e = makeEarInterval(r, i % 2 === 0);
    assert.ok(e.options.includes(e.label));
    const c = makeEarChord(r, i % 2 === 0);
    assert.ok(c.options.includes(`${c.chordKind} ${c.shape}`));
  }
});
