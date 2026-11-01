import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CLASS_PARTS, ROLES, VARIANTS, activeAt, bpmAt, chordAt, droneOf, hitsOf, loopsOf, meterOf, nextPart, onPanduri, parseClass,
  parseStage, patternWords, randomStage, roleLines, sliceLine, songMeter, strumsOf, trackOf,
  type BookNote, type GundiLoop, type SongScore,
} from '../src/utils/gundi';
import { mulberry32 } from '../src/utils/otkheuli';

// „ჩემი გუნდი“ (utils/gundi.ts): the phrases of the program's songs that loop, and what each of the six performers plays in one.

const song = (n: number): SongScore => JSON.parse(fs.readFileSync(`public/notes/song/${String(n).padStart(3, '0')}.json`, 'utf8'));
const SONGS = [1, 2, 3, 4, 5, 6, 7, 8];

test('every song of the program with notes gives phrases to loop: whole bars, six to twenty-two seconds, every voice in', () => {
  for (const n of SONGS) {
    const s = song(n);
    const loops = loopsOf(s);
    assert.ok(loops.length >= 1 && loops.length <= 3, `song ${n}: ${loops.length} phrases`);
    loops.forEach((l, i) => {
      const sec = (l.beats * 60) / bpmAt(s, l.a);
      assert.ok(sec >= 6 && sec <= 22, `song ${n}: ${sec} s`);
      assert.equal(l.b - l.a, l.beats);
      assert.equal(l.beats % l.meter, 0, `song ${n}: ${l.beats} beats in bars of ${l.meter}`);
      assert.equal(l.lines.length, 3);
      for (const line of l.lines) {
        assert.ok(line.length >= 4);
        for (const x of line) assert.ok(x.at >= 0 && x.len > 0 && x.at + x.len <= l.beats + 1e-6);
      }
      assert.ok(l.q >= 0 && l.q <= 1);
      if (i) assert.ok(loops[i - 1].b <= l.a + 1, `song ${n}: phrases overlap`);
    });
    // the best one goes back into its start well
    assert.ok(Math.max(...loops.map(l => l.q)) >= 0.5, `song ${n}`);
  }
});

test('a song whose bars are clear loops from its bar lines', () => {
  // ალილო begins with an upbeat: its bars of two start on the odd beats; ჯვარი წინასა goes in threes
  assert.deepEqual(songMeter(roleLines(song(1).voices)), { m: 2, o: 1, sure: true });
  assert.deepEqual(songMeter(roleLines(song(3).voices)), { m: 3, o: 0, sure: true });
  for (const l of loopsOf(song(1))) assert.equal((l.a - 1) % 2, 0);
  for (const l of loopsOf(song(3))) assert.equal(l.a % 3, 0);
});

test('a song that repeats itself loops exactly where it repeats', () => {
  // four bars of eight beats sung twice, then a different ending
  const verse: BookNote[][] = [
    [[0, 2, 67], [2, 2, 69], [4, 2, 67], [6, 2, 65]],
    [[0, 2, 64], [2, 2, 65], [4, 2, 64], [6, 2, 62]],
    [[0, 2, 55], [2, 2, 57], [4, 2, 55], [6, 2, 53]],
  ];
  const voices = verse.map((line, v) => [
    ...line, ...line.map(([b, d, m]) => [b + 8, d, m] as BookNote),
    [16, 4, [72, 67, 48][v]] as BookNote, [20, 2, [71, 67, 55][v]] as BookNote, [22, 2, [72, 64, 48][v]] as BookNote,
  ]);
  const loops = loopsOf({ dur: 24, tempos: [[0, 60]], voices }, 1);
  assert.equal(loops.length, 1);
  assert.equal(loops[0].a, 0);
  assert.equal(loops[0].beats, 8);
  assert.equal(loops[0].q, 1);
  // no song without three voices
  assert.deepEqual(loopsOf({ dur: 24, tempos: [[0, 60]], voices: voices.slice(0, 2) }), []);
});

test('a phrase keeps a note sounding at its start and cuts one going past its end', () => {
  const line: BookNote[] = [[0, 3, 60], [3, 2, 62], [5, 4, 64]];
  assert.deepEqual(sliceLine(line, 2, 7), [{ at: 0, len: 1, midi: 60 }, { at: 1, len: 2, midi: 62 }, { at: 3, len: 2, midi: 64 }]);
  // a song for two choirs: each voice sings in both
  const six: BookNote[][] = [[[0, 1, 70]], [[0, 1, 65]], [[0, 1, 58]], [[1, 1, 72]], [[1, 1, 67]], [[1, 1, 60]]];
  assert.deepEqual(roleLines(six), [[[0, 1, 70], [1, 1, 72]], [[0, 1, 65], [1, 1, 67]], [[0, 1, 58], [1, 1, 60]]]);
});

test('the bar is three beats only when the notes lean on it', () => {
  const threes = [[{ at: 0, len: 2, midi: 60 }, { at: 2, len: 1, midi: 62 }, { at: 3, len: 2, midi: 64 }, { at: 5, len: 1, midi: 62 }]];
  assert.equal(meterOf(threes, 6), 3);
  assert.equal(meterOf(threes, 8), 2);
  assert.equal(meterOf(threes, 9), 3);
  const twos = [[{ at: 0, len: 2, midi: 60 }, { at: 2, len: 2, midi: 62 }, { at: 4, len: 2, midi: 64 }]];
  assert.equal(meterOf(twos, 6), 2);
});

test('claps and the drum: their bars one after another, the last cut at the phrase end', () => {
  assert.deepEqual(hitsOf(4, 2, 'tanabrad').map(h => h.at), [0, 1, 2, 3]);
  assert.deepEqual(hitsOf(6, 3, 'dzlierze').map(h => h.at), [0, 3]);
  assert.deepEqual(hitsOf(3, 2, 'tati').map(h => h.at), [0, 1, 1.5, 2]);
  // a pattern of two bars takes them in turn
  const svla = hitsOf(8, 2, 'svla');
  assert.deepEqual(svla.map(h => `${h.at}${h.kind}`), ['0dum', '1tek', '2dum', '2.5dum', '3tek', '3.5tek', '4dum', '5tek', '6dum', '6.5dum', '7tek', '7.5tek']);
  // the strong beat is the loudest
  for (const h of hitsOf(12, 3, 'satsekvao')) if (h.at % 3) assert.ok(h.gain < 1);
  // an unknown pattern is the even one
  assert.deepEqual(hitsOf(2, 2, 'x').map(h => h.kind), ['clap', 'clap']);
});

test('the syllables of the patterns', () => {
  assert.equal(patternWords(2, 'tati'), 'ტა ტი-ტი');
  assert.equal(patternWords(3, 'tati'), 'ტა ტი-ტი ტა');
  assert.equal(patternWords(2, 'dzlierze'), 'ტა ·');
  assert.equal(patternWords(2, 'dumteki'), 'დუმ ტეკ');
  assert.equal(patternWords(2, 'satsekvao'), 'დუმ-ტეკ დუმ-ტეკ');
  assert.equal(patternWords(2, 'svla'), 'დუმ ტეკ | დუმ-დუმ ტეკ-ტეკ');
  assert.equal(patternWords(2, 'nothing'), '');
  // the panduri, as a class says it
  assert.equal(patternWords(2, 'chamokvra'), 'დრინ დრინ-დრინ');
  assert.equal(patternWords(3, 'chamokvra'), 'დრინ დრინ დრინ');
  assert.equal(patternWords(2, 'umpa'), 'ბუმ ჩიკ');
  assert.equal(patternWords(3, 'umpa'), 'ბუმ ჩიკ ჩიკ');
});

const LOOP: GundiLoop = {
  a: 0, b: 4, beats: 4, meter: 2, q: 1,
  lines: [
    [{ at: 0, len: 2, midi: 76 }, { at: 2, len: 2, midi: 74 }],
    [{ at: 0, len: 4, midi: 72 }],
    [{ at: 0, len: 1, midi: 43 }, { at: 1, len: 1, midi: 45 }, { at: 2, len: 2, midi: 43 }],
  ],
};

test('the panduri strums the singers’ chord, its strings between C3 and C5', () => {
  assert.equal(onPanduri(43), 55);
  assert.equal(onPanduri(76), 64);
  assert.equal(onPanduri(60), 60);
  assert.deepEqual(chordAt(LOOP.lines, 1), [45, 72, 76]);
  // a voice resting: its next note, when it comes within a beat
  assert.deepEqual(chordAt([[{ at: 0.5, len: 1, midi: 60 }], [{ at: 0, len: 1, midi: 55 }]], 0), [55, 60]);
  assert.deepEqual(chordAt([[{ at: 1.5, len: 1, midi: 60 }], [{ at: 0, len: 1, midi: 55 }]], 0), [55]);
  const strums = strumsOf(LOOP, 'chamokvra');
  const first = strums.filter(s => s.at < 0.5);
  assert.deepEqual(first.map(s => s.midi), [55, 64, 72]);
  assert.ok(first[1].at > first[0].at);
  // an up-stroke goes from the top string down
  const up = strums.filter(s => s.at >= 1.5 && s.at < 2);
  assert.deepEqual(up.map(s => s.midi), [72, 64, 57]);
  // bass, then the chord without it
  const umpa = strumsOf(LOOP, 'umpa');
  assert.deepEqual(umpa.filter(s => s.at < 0.5).map(s => s.midi), [55]);
  assert.deepEqual(umpa.filter(s => s.at >= 1 && s.at < 1.5).map(s => s.midi), [64, 72]);
});

test('the bass’s drone: its most sung pitch, struck every two bars', () => {
  assert.deepEqual(droneOf(LOOP), [{ at: 0, len: 4, midi: 43 }]);
  assert.deepEqual(droneOf({ ...LOOP, beats: 6, meter: 2 }).map(n => [n.at, n.len]), [[0, 4], [4, 2]]);
  assert.deepEqual(droneOf({ ...LOOP, lines: [[], [], []] }), []);
});

test('what each performer plays', () => {
  assert.deepEqual(trackOf(LOOP, 'mtqmeli').map(e => e.kind === 'note' && e.midi), [76, 74]);
  assert.deepEqual(trackOf(LOOP, 'modzakhili', 'hangi').map(e => e.kind === 'note' && e.midi), [72]);
  assert.equal(trackOf(LOOP, 'bani').length, 3);
  assert.equal(trackOf(LOOP, 'bani', 'burdoni').length, 1);
  assert.ok(trackOf(LOOP, 'tashi').every(e => e.kind === 'clap'));
  assert.ok(trackOf(LOOP, 'doli', 'satsekvao').every(e => e.kind === 'dum' || e.kind === 'tek'));
  assert.ok(trackOf(LOOP, 'panduri').every(e => e.kind === 'pluck'));
  // a variant that is not there is the first
  assert.deepEqual(trackOf(LOOP, 'bani', 'zzz'), trackOf(LOOP, 'bani', 'hangi'));
});

test('a performer is busy while a note sounds (not in its last moment) and just after a stroke', () => {
  const bass = trackOf(LOOP, 'bani');
  assert.ok(activeAt(bass, 0.5));
  assert.ok(!activeAt(bass, 0.95));
  const claps = trackOf(LOOP, 'tashi', 'dzlierze');
  assert.ok(activeAt(claps, 0.1));
  assert.ok(!activeAt(claps, 1));
});

test('the settings on the device', () => {
  const songs = [1, 2, 3];
  assert.deepEqual(parseStage(null, songs), { song: 1, loop: 0, speed: 1, variant: {}, on: [] });
  assert.deepEqual(
    parseStage({ song: 3, loop: 2, speed: 1.15, variant: { bani: 'burdoni', tashi: 'zzz' }, on: ['bani', 'doli', 'bani', 'x'] }, songs),
    { song: 3, loop: 2, speed: 1.15, variant: { bani: 'burdoni' }, on: ['bani', 'doli'] },
  );
  assert.equal(parseStage({ song: 9, speed: 2, loop: -1 }, songs).song, 1);
  assert.equal(parseStage({ speed: 2 }, songs).speed, 1);
  const c = parseClass({ parts: { bani: 'class', doli: 'none', tashi: 'x' }, record: true }, songs);
  assert.deepEqual(c.parts, { ...CLASS_PARTS, bani: 'class', doli: 'none' });
  assert.equal(c.record, true);
  assert.equal(parseClass({}, songs).record, false);
  assert.equal(nextPart('phone'), 'class');
  assert.equal(nextPart('class'), 'none');
  assert.equal(nextPart('none'), 'phone');
});

test('a random stage: three to five performers, the bass or the drum always in', () => {
  for (let seed = 1; seed < 200; seed++) {
    const r = randomStage(mulberry32(seed));
    assert.ok(r.on.length >= 3 && r.on.length <= 5);
    assert.ok(r.on.includes('bani') || r.on.includes('doli'));
    assert.deepEqual(r.on, ROLES.filter(x => r.on.includes(x)));
    for (const role of ROLES) assert.ok(VARIANTS[role].some(v => v.id === r.variant[role]));
  }
});
