import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildServices, guessRank, hymnsOf, matinsKathismas, vespersKathisma, greatFeastOf, periodOf, PATRON_PRESETS, type Patron } from '../src/utils/dayService';

const cal = JSON.parse(readFileSync(new URL('../src/data/calendar/2026.json', import.meta.url), 'utf8')).days;
const george = PATRON_PRESETS.find(p => p.id === 'giorgoba') as Patron;
const dormition = PATRON_PRESETS.find(p => p.id === 'mariamoba') as Patron;

test('rank guesses', () => {
  assert.equal(guessRank('2026-11-09', cal['2026-11-09'], null), 'simple');
  assert.equal(guessRank('2026-11-21', cal['2026-11-21'], null), 'polyeleos'); // archangels: readings at vespers
  assert.equal(guessRank('2026-11-23', cal['2026-11-23'], null), 'vigil'); // გიორგობა
  assert.equal(guessRank('2026-11-15', cal['2026-11-15'], null), 'vigil'); // a Sunday
  assert.equal(guessRank('2027-01-07', cal['2027-01-07'] ?? null, null), 'great');
  assert.equal(guessRank('2026-11-10', cal['2026-11-10'], { name: 'x', kind: 'saint', md: '11-10' }), 'vigil'); // the temple's day
});

test('feasts and periods', () => {
  assert.equal(greatFeastOf('2026-04-12')?.id, 'agdgoma');
  assert.equal(greatFeastOf('2026-05-21')?.id, 'amagleba');
  assert.equal(periodOf('2026-03-01'), 'triodion');
  assert.equal(periodOf('2026-05-01'), 'pentecostarion');
  assert.equal(periodOf('2026-11-09'), 'octoechos');
});

test('kathismas (Typikon ch. 17)', () => {
  assert.deepEqual(matinsKathismas('2026-11-10', 'simple'), [7, 8, 9]); // winter Tuesday
  assert.deepEqual(matinsKathismas('2026-08-04', 'simple'), [7, 8]); // summer Tuesday
  assert.deepEqual(matinsKathismas('2026-11-10', 'polyeleos'), [7, 8]);
  assert.equal(vespersKathisma('2026-11-10', 'simple'), 18);
  assert.equal(vespersKathisma('2026-08-04', 'simple'), 6); // Monday evening, summer
  assert.equal(vespersKathisma('2026-11-15', 'vigil'), 1); // Saturday evening
  assert.equal(vespersKathisma('2026-11-16', 'simple'), null); // Sunday evening
  assert.equal(vespersKathisma('2026-11-21', 'polyeleos'), 'first');
});

test('liturgy troparia by the temple', () => {
  const base = { iso: '2026-11-10', day: cal['2026-11-10'], tone: 6, rank: 'simple' as const };
  const s = hymnsOf({ ...base, patron: george }, 'liturgy');
  assert.deepEqual(s.troparia.map(h => h.role), ['day', 'temple', 'saint']);
  assert.deepEqual(s.kontakia.map(h => [h.role, h.glory]), [['day', undefined], ['temple', undefined], ['saint', 'glory'], ['protection', 'now']]);
  const t = hymnsOf({ ...base, patron: dormition }, 'liturgy');
  assert.deepEqual(t.troparia.map(h => h.role), ['temple', 'day', 'saint']);
  assert.deepEqual(t.kontakia.map(h => [h.role, h.glory]), [['day', undefined], ['saint', 'glory'], ['temple', 'now']]);
  const sun = hymnsOf({ ...base, iso: '2026-11-15', day: cal['2026-11-15'], rank: 'vigil', patron: dormition }, 'liturgy');
  assert.equal(sun.troparia[0].role, 'resurrection');
});

test('services are built for any day', () => {
  for (const iso of ['2026-11-09', '2026-11-15', '2026-11-21', '2026-11-23', '2027-01-07']) {
    const day = cal[iso] ?? null;
    const sv = buildServices({ iso, day, tone: 6, rank: guessRank(iso, day, george), patron: george });
    assert.equal(sv.length, 4);
    for (const s of sv) assert.ok(s.steps.length > 2, `${iso} ${s.id}`);
  }
  const arch = buildServices({ iso: '2026-11-21', day: cal['2026-11-21'], tone: 6, rank: 'polyeleos', patron: null });
  assert.ok(arch[0].steps.some(s => s.title.includes('საკითხავები')));
  assert.ok(arch[1].steps.some(s => s.title.includes('სახარება') && s.note?.includes('მათე')));
});

test('Lent, Holy Week and Bright Week (stage 4)', () => {
  const at = (iso: string) => buildServices({ iso, day: cal[iso] ?? null, tone: 1, rank: guessRank(iso, cal[iso] ?? null, null), patron: null });
  const lit = (iso: string) => at(iso).find(s => s.id === 'liturgy')!.steps.map(s => s.title);
  assert.equal(guessRank('2026-02-24', cal['2026-02-24'], null) === 'polyeleos', false);
  assert.match(lit('2026-02-23')[0], /არ აღესრულება/); // Lent Monday
  assert.ok(lit('2026-02-25').some(t => t.includes('წარემართენ'))); // Wednesday: the Presanctified
  assert.ok(lit('2026-03-01').some(t => t.includes('შენდამი იხარებს'))); // a Lent Sunday: Basil's
  assert.ok(at('2026-02-24')[1].steps.some(s => s.title.includes('ალილუია')));
  assert.match(lit('2026-04-10')[0], /სამეუფო ჟამები/); // Holy Friday
  assert.equal(at('2026-04-13')[2].steps[0].title, 'პასექის ჟამნი'); // Bright Monday
  assert.ok(lit('2026-05-03').some(t => t.includes('ანგელოზი ღაღადებდა'))); // the Paschal season
});

test('every chant a step names is in the books', async () => {
  const { SERVICE_LISTS } = await import('../src/data/chantLookup');
  const ids = new Set(SERVICE_LISTS.flatMap(([, list]) => list.map(c => c.id)));
  for (const iso of ['2026-11-09', '2026-11-15', '2026-11-21', '2026-02-25', '2026-03-01', '2026-05-03'])
    for (const sv of buildServices({ iso, day: cal[iso] ?? null, tone: 3, rank: guessRank(iso, cal[iso] ?? null, null), patron: george }))
      for (const st of sv.steps) for (const id of st.chants ?? []) assert.ok(ids.has(id), `${iso} ${st.title}: ${id}`);
});
