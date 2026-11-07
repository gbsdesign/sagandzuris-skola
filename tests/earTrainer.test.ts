import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HIGHER_OPTIONS, INTERVAL_NAMES, OLD_WORDS, PLAIN_RHYTHMS, RHYTHMS, RHYTHM_BPM, SCHOOLS, alongScore, breathScore, breathSeconds,
  centsOff, chordQuiz, contourOf, dictTask, echoTask, higherQuiz, homeTask, intervalQuiz, intervalSingTask, judgeSinging, judgeTaps,
  judgeTempo, lettersQuiz, notesNeeded, pcDiff, readTask, rhythmPlay, rhythmQuiz, sirenScore, steadyScore, straightScore,
  type Frame,
} from '../src/utils/earTrainer';
import { BASIC_KINDS } from '../src/utils/akordi';

// „ოსტატობის გზა“'s trainers (utils/earTrainer.ts): the questions are well formed and the microphone's frames judged fairly.

const seeded = (s: number) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

/** the microphone's frames (every 40 ms, t in ms) of notes sung one after another, each `ms` long */
const sung = (notes: (number | null)[], ms = 400, rms = 0.05): Frame[] => {
  const out: Frame[] = [];
  notes.forEach((m, i) => { for (let t = 0; t < ms; t += 40) out.push({ t: i * ms + t, midi: m, rms: m === null ? 0.001 : rms }); });
  return out;
};

test('an octave off is the same note', () => {
  assert.equal(pcDiff(72, 60), 0);
  assert.equal(pcDiff(61, 60), 1);
  assert.equal(pcDiff(59, 60), -1);
  assert.ok(Math.abs(pcDiff(48.3, 60) - 0.3) < 1e-9);
  assert.equal(Math.abs(pcDiff(66, 60)), 6);
  assert.deepEqual([1, 2, 3, 4, 6].map(notesNeeded), [1, 2, 3, 3, 5]);
});

test('ear questions: the right answer is the one that sounds', () => {
  for (const s of SEEDS) {
    const h = higherQuiz(48, seeded(s));
    const d = h.play[1][2] - h.play[0][2];
    assert.equal(HIGHER_OPTIONS[h.right], d < 0 ? 'დაბლა' : d === 0 ? 'იგივე' : 'მაღლა');

    const set = [7, 3, 12, 5];
    const q = intervalQuiz(60, set, seeded(s));
    assert.deepEqual(q.options, [3, 5, 7, 12].map(i => INTERVAL_NAMES[i]));
    assert.equal(INTERVAL_NAMES[q.play[1][2] - q.play[0][2]], q.options[q.right]);

    const c = chordQuiz(BASIC_KINDS, seeded(s));
    assert.equal(c.options.length, BASIC_KINDS.length);
    assert.ok(c.right >= 0 && c.right < c.options.length);
    assert.ok(c.note, 'the chant it comes from');
    assert.equal(c.play.length, 9);
  }
});

test('the old letters: four different readings, the right one among them', () => {
  for (const [word, right, ...wrong] of OLD_WORDS) {
    assert.ok(!wrong.slice(0, 3).includes(right), word);
    assert.equal(new Set([right, ...wrong.slice(0, 3)]).size, 4, word);
  }
  for (const s of SEEDS) {
    const q = lettersQuiz(seeded(s));
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.right >= 0);
    assert.ok(q.show.length > 0);
  }
});

test('singing tasks: as many notes as asked, in the voice\'s range', () => {
  for (const base of [48, 60]) {
    for (const s of SEEDS) {
      for (const n of [1, 3, 5]) {
        const e = echoTask(n, 'scale', base, seeded(s));
        assert.equal(e.target.length, n);
        assert.ok(e.target.every(m => m >= base && m <= base + 12));
        const ch = echoTask(n, 'chant', base, seeded(s));
        assert.equal(ch.target.length, n);
        assert.ok(ch.from);
        assert.ok(Math.abs(ch.target[0] - (base + 5)) <= 18, `${ch.from} ${ch.target}`);
      }
      assert.equal(echoTask(3, 'turn', base, seeded(s)).target.length, 3);

      const iv = intervalSingTask(base, [3, 4, 7], true, seeded(s));
      assert.ok([3, 4, 7].includes(Math.abs(iv.target[0] - iv.cue[0][2])));
      assert.ok(iv.label!.endsWith(iv.target[0] > iv.cue[0][2] ? 'ზემოთ' : 'ქვემოთ'));

      const home = homeTask(base, seeded(s));
      assert.ok(home.target[0] >= base - 7 && home.target[0] <= base + 5);
      assert.equal(home.cue[0][2], home.target[0], 'the home sounds first');

      const r = readTask(3, base, seeded(s));
      assert.equal(r.target.length, 3);
      assert.deepEqual(r.shown, r.target.map(x => (base < 60 ? x + 12 : x)), 'a man reads the treble an octave up');

      const dt = dictTask(5, s % 2 === 0, base, seeded(s));
      assert.equal(dt.notes.length, 5);
      assert.deepEqual(dt.answer, contourOf(dt.notes));
      if (dt.voice) assert.equal(dt.play.length, 6, 'the held voice beside the five');
    }
  }
});

test('the voice heard: notes in order, an octave off counts, a wrong one missed', () => {
  assert.deepEqual(judgeSinging([60, 62, 64], sung([72, 74, 76])).hits, [true, true, true]);
  assert.deepEqual(judgeSinging([60, 62, 64], sung([60, 63, 64])).hits, [true, false, true]);
  assert.deepEqual(judgeSinging([60, 62, 64], sung([60, null, 62, 64])).hits, [true, true, true], 'a breath between');
  assert.deepEqual(judgeSinging([67], sung([55.3])).hits, [true]);
  assert.deepEqual(judgeSinging([67], sung([66])).hits, [false]);
  assert.deepEqual(judgeSinging([60, 62], []).hits, [false, false]);
  assert.equal(centsOff(60, sung([60.2], 800)), 20);
  assert.equal(centsOff(60, sung([71.9], 800)), -10);
  assert.equal(centsOff(60, sung([60], 120)), null, 'too short to say');
});

test('rhythms: four beats each; the counted taps judged within a quarter beat', () => {
  for (const p of RHYTHMS) assert.equal(p.reduce((a, b) => a + b, 0), 4, String(p));
  assert.equal(PLAIN_RHYTHMS.length, 9);
  const beat = 60000 / RHYTHM_BPM;
  const p = rhythmPlay([2, 1, 1]);
  assert.equal(p.start, 3);
  assert.equal(p.end, 6);
  assert.equal(p.play.length, 4 + 3);
  const taps = (pattern: number[], scale = 1, jitter: number[] = []) => {
    let at = 0;
    return pattern.map((d, i) => { const t = 500 + at * beat * scale + (jitter[i] ?? 0); at += d; return t; });
  };
  assert.equal(judgeTaps([2, 1, 1], taps([2, 1, 1])), true);
  assert.equal(judgeTaps([2, 1, 1], taps([2, 1, 1], 1.1)), true, 'a little slower');
  assert.equal(judgeTaps([2, 1, 1], taps([2, 1, 1], 1, [0, 90, -60])), true);
  assert.equal(judgeTaps([2, 1, 1], taps([1, 1, 2])), false, 'another rhythm');
  assert.equal(judgeTaps([2, 1, 1], taps([2, 1])), false, 'a tap missing');
  for (const s of SEEDS) {
    const q = rhythmQuiz(seeded(s));
    assert.equal(q.options.length, 3);
    assert.equal(q.options[q.right], q.pattern);
  }
});

test('keeping the tempo: even taps on the beat score whole, a slowing hand less', () => {
  const even = Array.from({ length: 9 }, (_, i) => i * 750);
  assert.equal(judgeTempo(even, 80).score, 100);
  const slower = Array.from({ length: 9 }, (_, i) => i * 825);
  const r = judgeTempo(slower, 80);
  assert.ok(r.score < 60 && r.drift > 0.09, JSON.stringify(r));
  assert.equal(judgeTempo([0, 750, 1500], 80).score, 0, 'too few taps');
});

test('a held voice measured: steady, straight, the breath, along a line, the siren', () => {
  assert.equal(steadyScore(sung([60], 5000), 60, 5), 100);
  assert.equal(steadyScore(sung([72.2], 5000), 60, 5), 100, 'an octave up and a little sharp');
  const half = steadyScore([...sung([60], 2500), ...sung([61], 2500).map(f => ({ ...f, t: f.t + 2500 }))], 60, 5);
  assert.ok(half >= 45 && half <= 55, String(half));
  assert.ok(steadyScore(sung([60], 2500), 60, 5) < 60, 'half the time sung');

  assert.equal(straightScore(sung([60], 5000), 5).score, 100);
  const vibrato = sung([60], 5000).map((f, i) => ({ ...f, midi: 60 + 0.5 * Math.sin(i / 1.5) }));
  assert.ok(straightScore(vibrato, 5).score < 50);

  const breath = [...sung([null], 320), ...sung([60], 16000).map(f => ({ ...f, t: f.t + 320 }))];
  assert.ok(Math.abs(breathSeconds(breath) - 16) < 0.2, String(breathSeconds(breath)));
  assert.equal(breathScore(15), 80);
  assert.equal(breathScore(20), 100);

  const line: [number, number, number][] = [[0, 1, 60], [1, 1, 62], [2, 1, 64]];
  const late = sung([60, 62, 64], 1000).map(f => ({ t: (f.t + 200) / 1000, midi: f.midi }));
  assert.equal(alongScore(late, line), 100, 'the phone\'s lag forgiven');
  const third = sung([57, 59, 61], 1000).map(f => ({ t: f.t / 1000, midi: f.midi }));
  assert.equal(alongScore(third, line, -3), 100, 'a study voice a third under');
  assert.ok(alongScore(third, line) < 20);

  const glide = Array.from({ length: 100 }, (_, i) => ({ t: i * 40, midi: 50 + (12 * Math.min(i, 99 - i)) / 50, rms: 0.05 }));
  assert.ok(sirenScore(glide).score >= 90, JSON.stringify(sirenScore(glide)));
  assert.ok(sirenScore(sung([50, null, null, 60], 400)).gaps >= 1);
});

test('the three schools: their books\' numbers', () => {
  assert.equal(SCHOOLS.length, 3);
  for (const s of SCHOOLS) {
    assert.ok(s.nums.length > 20, s.name);
    assert.equal(new Set(s.nums).size, s.nums.length);
  }
  assert.equal(SCHOOLS[1].nums[0], 120);
  assert.equal(SCHOOLS[2].nums.length, 187);
});
