import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_STATIONS, MAX_TEAMS, MIN_STATIONS, SOLO_STATIONS, TASK_KINDS, chestCheck, codeLabel, daySeed, dzebnaDay, dzebnaMeta, dzebnaShare,
  huntCode, huntKinds, huntTask, letterAt, letterOrder, newSoloRun, nextFor, packPlace, parseHuntCode, parseSoloRun, parseStationRequest,
  pauseRun, readDay, resumeRun, routeOf, runSeconds, soloChest, soloHunt, soloLetters, soloMap, soloNext, soloStars, soloTask, startOf,
  stationRequest, stationUrl, taskAt, teamWords, unpackPlace, PENALTY, type HuntConf, type TaskKind,
} from '../src/utils/dzebna';
import { dzebnaPools, huntBank } from '../src/data/dzebnaPools';

const pools = dzebnaPools();
const bank = huntBank();

test('the pools hold enough of every kind', () => {
  assert.ok(pools.quiz.length >= 100);
  assert.ok(pools.places.length >= 100);
  assert.equal(pools.regionNames.length, 13);
  assert.ok(pools.regionNames.every(Boolean));
  assert.ok(pools.year.length >= 60 && pools.year.length % 3 === 0);
  assert.ok(pools.old.length >= 100);
  assert.ok(pools.chant.length >= 12);
  // a dated task's three are decades apart
  for (let i = 0; i < pools.year.length; i += 3) {
    const [a, b, c] = pools.year.slice(i, i + 3).map(y => y.when);
    assert.ok(Math.abs(a - b) >= 10 && Math.abs(a - c) >= 10 && Math.abs(b - c) >= 10, `triple ${i / 3}`);
  }
  for (let n = MIN_STATIONS; n <= MAX_STATIONS; n++) {
    assert.ok(bank.filter(w => [...w.word].length === n).length >= 40, `${n}-letter words`);
  }
});

test('a hunt\'s code keeps its settings and catches a typo', () => {
  let typos = 0;
  let caught = 0;
  for (let k = 0; k < 400; k++) {
    const kinds = TASK_KINDS.filter((_, i) => ((k * 7 + 3) % 31 + 1) & (1 << i));
    const c: HuntConf = { seed: (k * 97) % 1024, stations: MIN_STATIONS + (k % 5), teams: 1 + (k % MAX_TEAMS), kinds };
    const code = huntCode(c);
    assert.match(code, /^\d{8}$/);
    assert.deepEqual(parseHuntCode(code), c);
    assert.deepEqual(parseHuntCode(codeLabel(code)), c, 'the space between the halves is fine');
    // one digit changed
    const at = k % 8;
    const d = (Number(code[at]) + 1 + (k % 9)) % 10;
    const typo = code.slice(0, at) + d + code.slice(at + 1);
    typos++;
    if (!parseHuntCode(typo)) caught++;
  }
  assert.ok(caught / typos > 0.95, `caught ${caught}/${typos}`);
  assert.equal(parseHuntCode('1234'), null);
  assert.equal(parseHuntCode(''), null);
});

test('every team gets a word of its own letters, as long as the stations', () => {
  for (let seed = 0; seed < 60; seed++) {
    for (let stations = MIN_STATIONS; stations <= MAX_STATIONS; stations++) {
      const words = teamWords({ seed, stations, teams: MAX_TEAMS }, bank);
      assert.equal(words.length, MAX_TEAMS);
      assert.ok(words.every(w => [...w.word].length === stations));
      const keys = words.map(w => [...w.word].sort().join(''));
      assert.equal(new Set(keys).size, words.length);
      // a team keeps its word when more teams join
      assert.deepEqual(teamWords({ seed, stations, teams: 2 }, bank), words.slice(0, 2));
    }
  }
});

test('the letters come scrambled along the route, every one once', () => {
  for (let seed = 0; seed < 40; seed++) {
    const c = { seed, stations: MIN_STATIONS + (seed % 5), teams: 1 + (seed % MAX_TEAMS) };
    teamWords(c, bank).forEach((w, t) => {
      const order = letterOrder(c, t, w.word);
      assert.deepEqual([...order].sort((a, b) => a - b), Array.from({ length: c.stations }, (_, i) => i));
      const walked = routeOf(c, t).map(s => letterAt(c, t, w.word, s)).join('');
      if (new Set(w.word).size > 1) assert.notEqual(walked, w.word, `${w.word} would read itself`);
      assert.equal([...walked].sort().join(''), [...w.word].sort().join(''));
    });
  }
});

test('the teams start apart and walk round the stations', () => {
  const c = { stations: 6, teams: 3 };
  assert.deepEqual([0, 1, 2].map(t => startOf(c, t)), [0, 2, 4]);
  assert.deepEqual(routeOf(c, 1), [2, 3, 4, 5, 0, 1]);
  assert.equal(nextFor(c, 1, [2], 2), 3);
  assert.equal(nextFor(c, 1, [2, 3, 5], 3), 4, 'a station found out of turn is skipped');
  assert.equal(nextFor(c, 1, [2, 3, 4, 5, 0], 0), 1);
  assert.equal(nextFor(c, 1, [0, 1, 2, 3, 4, 5], 1), null, 'all found: the chest');
  // one team, any number of stations: every station once
  assert.deepEqual(routeOf({ stations: 5, teams: 1 }, 0), [0, 1, 2, 3, 4]);
});

test('the chest knows whose word it is', () => {
  const words = [{ word: 'ბორჯომი', hint: '' }, { word: 'ნიკორა', hint: '' }];
  assert.deepEqual(chestCheck(words, ' ნიკორა '), { team: 1 });
  assert.deepEqual(chestCheck(words, 'ნიკ ორა!'), { team: 1 });
  assert.deepEqual(chestCheck(words, 'ორანიკ'), { near: 1 });
  assert.deepEqual(chestCheck(words, 'ბათუმი'), { none: true });
  assert.deepEqual(chestCheck(words, ''), { none: true });
});

test('a hiding place rides in the card\'s link', () => {
  for (const place of ['სამზარეულოს კართან', 'მე-2 სართული, ფანჯარა.', '„წიგნები“ — თარო 3!', 'Room A1 (ეზო)', 'ხე?']) {
    const packed = packPlace(place);
    assert.match(packed, /^[A-Za-z0-9_~]*$/);
    assert.equal(unpackPlace(packed), place);
  }
  assert.equal(unpackPlace(packPlace('ა'.repeat(80))).length, 40);
  const code = huntCode({ seed: 5, stations: 6, teams: 3, kinds: ['quiz', 'old'] });
  const url = new URL(stationUrl('https://sagandzureli.ge', code, 2, 'ბიბლიოთეკის თაროზე'));
  assert.equal(url.searchParams.get('open'), 'dzebna');
  const req = stationRequest(url.searchParams.get('h')!, url.searchParams.get('s')!, url.searchParams.get('n') ?? '');
  const st = parseStationRequest(req);
  assert.ok(st);
  assert.equal(st.s, 2);
  assert.equal(st.code, code);
  assert.equal(st.next, 'ბიბლიოთეკის თაროზე');
  assert.equal(parseStationRequest(stationRequest(code, '7', '')), null, 'no seventh card in a hunt of six');
  assert.equal(parseStationRequest(stationRequest(code, '3', ''))?.next, '');
  assert.equal(parseStationRequest('st:12345678:1:'), null);
});

const validTask = (kind: TaskKind, t: NonNullable<ReturnType<typeof taskAt>>) => {
  assert.equal(t.kind, kind);
  assert.ok(t.options.length >= 2 && t.options.length <= 4);
  assert.equal(new Set(t.options).size, t.options.length, `${t.id}: options alike`);
  assert.ok(t.right >= 0 && t.right < t.options.length);
  assert.ok(t.ask.length > 0);
};

test('every kind makes good tasks from the app\'s data', () => {
  for (const kind of TASK_KINDS) {
    for (let seed = 0; seed < 80; seed++) {
      const t = taskAt(pools, seed, [kind], 0);
      assert.ok(t, `${kind} ${seed}`);
      validTask(kind, t);
      if (kind === 'region') {
        const p = pools.places.find(x => x.id === t.id)!;
        assert.equal(t.options[t.right], pools.regionNames[p.region]);
      }
      if (kind === 'year') {
        const ids = t.id.split('+');
        const ev = ids.map(id => pools.year.find(y => y.id === id)!);
        const first = ev.reduce((a, b) => (b.when < a.when ? b : a));
        assert.equal(t.options[t.right], first.text);
        assert.equal(t.note?.split('\n').length, 3);
      }
      if (kind === 'old') {
        assert.ok(t.old);
        assert.equal(t.options[t.right], t.old.word);
        assert.ok(t.options.every(o => Math.abs([...o].length - [...t.old!.word].length) <= 1));
      }
      if (kind === 'chant') {
        const c = pools.chant.find(x => x.id === t.id)!;
        assert.deepEqual(t.tune, { book: c.book, num: c.num });
        assert.equal(t.options[t.right], c.title);
        assert.equal(t.options.length, 4);
      }
    }
  }
});

test('a hunt asks nothing twice and every phone works it out alike', () => {
  for (let seed = 0; seed < 120; seed++) {
    const c: HuntConf = { seed, stations: MAX_STATIONS, teams: 3, kinds: [...TASK_KINDS] };
    const kinds = huntKinds(c);
    assert.equal(kinds.length, MAX_STATIONS);
    assert.ok(TASK_KINDS.every(k => kinds.includes(k)), 'eight stations hold every chosen kind');
    const tasks = kinds.map((_, s) => huntTask(pools, c, s));
    assert.ok(tasks.every(Boolean));
    assert.equal(new Set(tasks.map(t => t!.id)).size, tasks.length);
    assert.deepEqual(tasks, kinds.map((_, s) => huntTask(pools, parseHuntCode(huntCode(c))!, s)));
  }
});

test('the day\'s hunt crosses six regions of the map', () => {
  for (let d = 1; d <= 60; d++) {
    const iso = `2026-11-${String((d % 28) + 1).padStart(2, '0')}`;
    const h = soloHunt(pools, bank, daySeed(iso) + d);
    assert.ok(h);
    assert.equal(h.stations.length, SOLO_STATIONS);
    assert.equal(new Set(h.stations.map(s => s.region)).size, SOLO_STATIONS);
    h.stations.forEach(s => {
      assert.equal(s.clues.length, 3);
      assert.ok(s.clues.every(p => p.region === s.region));
      assert.equal(new Set(s.clues.map(p => p.id)).size, 3);
      validTask(s.task.kind, s.task);
      assert.notEqual(s.task.kind, 'region');
    });
    assert.equal([...h.word.word].length, SOLO_STATIONS);
    assert.deepEqual([...h.order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
  assert.deepEqual(soloHunt(pools, bank, daySeed('2026-11-04')), soloHunt(pools, bank, daySeed('2026-11-04')));
});

test('the day\'s record, the card\'s line and the share', () => {
  const day = dzebnaDay('ნიკორა', 187.4, [0, 1, 0, 3, 0, 0, 1]);
  assert.deepEqual(day, { id: 'ნიკორა', guesses: ['t:187', 'x:0103001'], won: true, done: true });
  assert.deepEqual(readDay(day), { secs: 187, miss: [0, 1, 0, 3, 0, 0, 1] });
  assert.equal(readDay(undefined), null);
  assert.equal(soloStars(0), 3);
  assert.equal(soloStars(3), 2);
  assert.equal(soloStars(4), 1);
  assert.equal(dzebnaMeta({ '2026-11-04': day }, '2026-11-04'), 'დღეს: 3:07 · ★');
  assert.equal(dzebnaMeta({ '2026-11-03': day }, '2026-11-04'), 'სერია: 1 დღე');
  assert.equal(dzebnaMeta({}, '2026-11-04'), undefined);
  const share = dzebnaShare('2026-11-04', 187, [0, 1, 0, 3, 0, 0, 1]);
  assert.match(share, /^საგანძურის ძებნა №\d+ · 3:07 · ★\n🟢🟡🟢🔴🟢🟢🗝️\n/);
  assert.ok(!share.includes('ნიკორა'), 'the share keeps the word secret');
});

test('the day\'s hunt is played station by station, and every mistake costs time', () => {
  const h = soloHunt(pools, bank, daySeed('2026-11-04'))!;
  let r = newSoloRun(h, 1000, '2026-11-04');
  assert.equal(r.phase, 'map');
  assert.equal(r.miss.length, SOLO_STATIONS + 1);
  const wrong = (h.stations[0].region + 1) % 13;
  r = soloMap(h, r, wrong);
  assert.deepEqual(r.out, [wrong]);
  assert.equal(r.clues, 2);
  assert.equal(r.penalty, PENALTY.map);
  assert.equal(soloMap(h, r, wrong), r, 'a region crossed out is not tried again');
  r = soloMap(h, r, h.stations[0].region);
  assert.equal(r.phase, 'task');
  const t = h.stations[0].task;
  const bad = (t.right + 1) % t.options.length;
  r = soloTask(h, r, bad);
  assert.deepEqual(r.struck, [bad]);
  assert.equal(r.penalty, PENALTY.map + PENALTY.task);
  assert.equal(r.miss[0], 2);
  assert.deepEqual(soloLetters(h, r), []);
  r = soloTask(h, r, t.right);
  assert.equal(r.phase, 'got');
  assert.deepEqual(soloLetters(h, r), [[...h.word.word][h.order[0]]]);
  r = soloNext(h, r);
  assert.equal(r.at, 1);
  assert.equal(r.phase, 'map');
  assert.equal(r.clues, 1);
  for (let s = 1; s < SOLO_STATIONS; s++) {
    r = soloNext(h, soloTask(h, soloMap(h, r, h.stations[s].region), h.stations[s].task.right));
  }
  assert.equal(r.phase, 'chest');
  assert.equal(soloLetters(h, r).join(''), h.order.map(i => [...h.word.word][i]).join(''));
  r = soloChest(h, r, 'ა'.repeat(SOLO_STATIONS), 5000);
  assert.equal(r.miss[SOLO_STATIONS], 1);
  r = pauseRun(r, 61_000);
  assert.equal(r.t0, 0);
  r = resumeRun(r, 100_000);
  r = soloChest(h, r, h.word.word, 102_000);
  assert.equal(r.phase, 'done');
  assert.equal(r.t0, 0);
  assert.equal(runSeconds(r, 999_999), 62 + PENALTY.map + PENALTY.task + PENALTY.chest);
  assert.deepEqual(resumeRun(r, 200_000), r, 'a finished hunt\'s clock stays stopped');
  // kept on the device and read back (the clock stopped until the page shows)
  const back = parseSoloRun(JSON.parse(JSON.stringify({ ...r, t0: 5 })), h);
  assert.deepEqual(back, { ...r, t0: 0 });
  assert.equal(parseSoloRun({ ...r, seed: r.seed + 1 }, h), null);
  assert.equal(parseSoloRun({ ...r, at: 2 }, h), null, 'the chest only after the last station');
  assert.equal(parseSoloRun(null, h), null);
});
