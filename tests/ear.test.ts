import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanFrames, earFollower, earReport, hearPitch } from '../src/utils/ear';
import { oldDetectPitch } from '../src/utils/earOld';
import { breath, reseed, voice, type VoiceOpts } from './lib/madeVoice';

const RATE = 48000;
const WIN = 2048;
const STEP = 1920; // a look every 40 ms
const midi = (hz: number) => 69 + 12 * Math.log2(hz / 440);

/** how an ear hears a made voice: looks right (within 0.6 of a semitone), wrong, and not heard at all */
const hear = (ear: (b: Float32Array) => number | null, f0: number, o: VoiceOpts) => {
  reseed(Math.round(f0 * 7));
  const x = voice(() => f0, 0.3, RATE, o);
  let right = 0, wrong = 0, none = 0;
  for (let at = WIN; at <= x.length; at += STEP) {
    const hz = ear(x.subarray(at - WIN, at));
    if (hz === null) none++;
    else if (Math.abs(midi(hz) - midi(f0)) < 0.6) right++;
    else wrong++;
  }
  return { right, wrong, none };
};
const newEar = (b: Float32Array) => hearPitch(b, RATE)?.hz ?? null;
const oldEar = (b: Float32Array) => oldDetectPitch(b, RATE);

// bass · man · woman · child
const VOICES = [73, 98, 131, 196, 262, 392, 523, 784];

test('every voice from a deep bass to a child is heard in its own octave', () => {
  for (const f0 of VOICES) for (const vowel of ['a', 'i', 'u', 'm']) {
    for (const o of [{}, { vibrato: 0.4 }, { noise: 0.2 }, { phone: true, noise: 0.1 }]) {
      const r = hear(newEar, f0, { vowel, ...o });
      assert.equal(r.wrong + r.none, 0, `${f0} Hz „${vowel}“ ${JSON.stringify(o)}: ${JSON.stringify(r)}`);
    }
  }
});

test('a quiet voice is heard where the first ear heard nothing', () => {
  let was = 0, now = 0, all = 0;
  for (const f0 of VOICES) {
    const o = { amp: 0.02, noise: 0.15 };
    const a = hear(oldEar, f0, o), b = hear(newEar, f0, o);
    all += b.right + b.wrong + b.none;
    was += a.right;
    now += b.right;
    assert.equal(b.wrong, 0, `${f0} Hz`);
  }
  assert.equal(now, all);
  assert.ok(was < all * 0.8, `the first ear: ${was} of ${all}`);
});

test('a deep bass is heard where the first ear lost every fifth look', () => {
  let was = 0, now = 0, all = 0;
  for (const f0 of [65, 69, 73, 78, 82]) for (const vowel of ['a', 'o', 'm']) {
    const a = hear(oldEar, f0, { vowel }), b = hear(newEar, f0, { vowel });
    all += b.right + b.wrong + b.none;
    was += a.right;
    now += b.right;
  }
  assert.equal(now, all);
  assert.ok(was < all * 0.9, `the first ear: ${was} of ${all}`);
});

test('a rough voice keeps its note, and so does a voice whose lowest partial the phone lost', () => {
  let right = 0, all = 0;
  for (const f0 of VOICES) for (const o of [{ fry: 0.5, phone: true }, { fry: 0.3 }, { weak: 0.05 }, { weak: 0, noise: 0.05 }]) {
    const r = hear(newEar, f0, o);
    right += r.right;
    all += r.right + r.wrong + r.none;
  }
  assert.ok(right >= all * 0.9, `${right} of ${all}`);
});

test('breath, noise and silence are no note', () => {
  reseed(99);
  const b = breath(1, RATE);
  for (let at = WIN; at <= b.length; at += STEP) assert.equal(hearPitch(b.subarray(at - WIN, at), RATE), null);
  assert.equal(hearPitch(new Float32Array(WIN), RATE), null);
  // a voice far too quiet to be the singer
  assert.equal(hearPitch(voice(() => 220, 0.1, RATE, { amp: 0.003 }).subarray(0, WIN), RATE), null);
});

test('the pitch is right to a few cents and the tone is called clear', () => {
  for (const f0 of [82.4, 146.8, 220, 329.6, 440, 659.3, 987.8]) {
    const h = hearPitch(voice(() => f0, 0.1, RATE).subarray(0, WIN), RATE);
    assert.ok(h && Math.abs(midi(h.hz) - midi(f0)) < 0.08, `${f0} → ${h?.hz}`);
    assert.ok(h!.clarity > 0.8);
  }
});

test('as it comes: a look an octave off is put back, a held octave is a real leap', () => {
  const follow = earFollower();
  const at = (m: number) => ({ hz: 440 * 2 ** ((m - 69) / 12), clarity: 0.9 });
  const out: (number | null)[] = [];
  const line = [57, 57, 57, 69, 57, 57, 45, 45, 57, 57, 69, 69, 69, 69, 69, 69];
  line.forEach((m, i) => out.push(follow(at(m), i * 40)));
  assert.deepEqual(out.slice(0, 10).map(v => Math.round(v!)), Array(10).fill(57));
  // the leap is believed from its fourth look on
  assert.deepEqual(out.slice(10).map(v => Math.round(v!)), [57, 57, 57, 69, 69, 69]);
  assert.equal(follow(null, 700), null);
  // after a silence the voice may come back anywhere
  assert.equal(Math.round(follow(at(69), 1500)!), 69);
  assert.equal(Math.round(earFollower()(at(45), 0)!), 45);
});

test('in hindsight: a short octave slip, a stray look and a tiny gap are mended; real notes stay', () => {
  const f = (list: (number | null)[]) => list.map((m, i) => ({ t: i * 40, midi: m, rms: 0.1 }));
  const r = (frames: { midi: number | null }[]) => frames.map(x => (x.midi === null ? null : Math.round(x.midi * 10) / 10));
  // the take begins an octave high for three looks
  assert.deepEqual(r(cleanFrames(f([72, 72, 72, 60, 60, 60, 60, 60, 60, 60]))), Array(10).fill(60));
  // a slip in the middle, a stray look, a gap of two looks inside a note
  assert.deepEqual(r(cleanFrames(f([60, 60, 60, 60, 60, 48, 48, 60, 60, 60, 66, 60, 60, null, null, 60, 60, 60]))), Array(18).fill(60));
  // a sung octave leap, a step, a real silence and a long other note are left as they are
  const real = [60, 60, 60, 60, 60, 60, 72, 72, 72, 72, 72, 72, 74, 74, 74, 74, 74, null, null, null, null, 67, 67, 67, 67, 67, 67];
  assert.deepEqual(r(cleanFrames(f(real))), real);
  // the loudness and the times come through untouched
  const one = cleanFrames(f([72, 60, 60, 60, 60, 60]))[0];
  assert.deepEqual([one.t, one.rms, one.midi], [0, 0.1, 60]);
  assert.deepEqual(cleanFrames([]), []);
});

test('the trial page\'s numbers: heard, broken, slipped', () => {
  const looks = 50;
  const sounding = Array.from({ length: looks }, (_, i) => i >= 5 && i < 45);
  const steady = Array.from({ length: looks }, (_, i) => ({ t: i * 40, midi: sounding[i] ? 57 + 0.1 * Math.sin(i) : null }));
  const good = earReport(steady, sounding);
  assert.equal(good.looks, 32);            // the first and last tenth of the voice are left out
  assert.deepEqual([good.voiced, good.breaks, good.slips], [32, 0, 0]);
  assert.ok(Math.abs(good.middle! - 57) < 0.2 && good.wobble < 0.3);
  const poor = steady.map((x, i) => (i % 7 === 3 ? { ...x, midi: null } : i % 9 === 4 && x.midi !== null ? { ...x, midi: x.midi + 12 } : x));
  const bad = earReport(poor, sounding);
  assert.ok(bad.voiced < 32 && bad.breaks >= 4 && bad.slips >= 3, JSON.stringify(bad));
  assert.deepEqual(earReport(steady, Array(looks).fill(false)), { looks: 0, voiced: 0, breaks: 0, slips: 0, wobble: 0, middle: null });
});
