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

test('liturgy troparia by the temple — the order of the weekly tibikon (№682)', () => {
  const roles = (x: { troparia: { role: string; glory?: string }[]; kontakia: { role: string; glory?: string }[] }) =>
    [x.troparia.map(h => h.role).join(' '), x.kontakia.map(h => h.role + (h.glory ? ':' + h.glory : '')).join(' ')];
  const base = { iso: '2026-11-09', day: cal['2026-11-09'], tone: 6, rank: 'simple' as const }; // Monday, a plain saint
  assert.deepEqual(roles(hymnsOf({ ...base, patron: george }, 'liturgy')), ['day temple saint', 'day temple saint departed:glory protection:now']);
  assert.deepEqual(roles(hymnsOf({ ...base, patron: dormition }, 'liturgy')), ['temple day saint', 'temple day saint departed:glory protection:now']);
  const dox = { ...base, iso: '2026-11-10', day: cal['2026-11-10'], rank: 'doxology' as const };
  assert.deepEqual(roles(hymnsOf({ ...dox, patron: dormition }, 'liturgy')), ['temple saint', 'saint:glory temple:now']);
  assert.deepEqual(roles(hymnsOf({ ...dox, patron: george }, 'liturgy')), ['temple saint', 'temple saint:glory protection:now']);
  assert.deepEqual(roles(hymnsOf({ ...dox, rank: 'vigil', patron: george }, 'liturgy')), ['saint', 'saint:glory protection:now']);
  const sat = { ...base, iso: '2026-11-14', day: cal['2026-11-14'] };
  assert.deepEqual(roles(hymnsOf({ ...sat, patron: dormition }, 'liturgy')), ['temple day saint', 'saint departed:glory day:now']);
  assert.deepEqual(roles(hymnsOf({ ...sat, patron: george }, 'liturgy')), ['day saint', 'saint departed:glory day:now']);
  const sun = { ...base, iso: '2026-11-15', day: cal['2026-11-15'], rank: 'vigil' as const };
  assert.deepEqual(roles(hymnsOf({ ...sun, patron: dormition }, 'liturgy')), ['resurrection temple saint', 'resurrection saint:glory temple:now']);
  assert.deepEqual(roles(hymnsOf({ ...sun, patron: george }, 'liturgy')), ['resurrection temple saint', 'resurrection temple saint:glory protection:now']);
  // the hours: the saint's; on Sunday the resurrection's, „დიდება“ the saint's, only the resurrection's kontakion
  assert.deepEqual(roles(hymnsOf({ ...base, patron: george }, 'hours')), ['saint', 'saint']);
  assert.deepEqual(roles(hymnsOf({ ...sun, patron: george }, 'hours')), ['resurrection saint', 'resurrection']);
});

test('the temple\'s own order: vespers alone or with matins; the priest\'s parts are marked', () => {
  const titles = (iso: string, rank: 'simple' | 'vigil', order?: { sat: 'apart' | 'vigil' | 'litya'; weekday: 'apart' | 'joined' }) => {
    const sv = buildServices({ iso, day: cal[iso], tone: 6, rank, patron: george, order });
    return { v: sv[0].steps.map(s => s.title), m: sv[1].steps.map(s => s.title), sv };
  };
  // the user's temple: Saturday evening — the great vespers alone with its dismissal, matins in the morning from psalms 19 and 20
  const own = titles('2026-11-15', 'vigil');
  assert.equal(own.v.at(-1), 'განტევება');
  assert.ok(!own.v.some(t => /ლიტია|პურის/.test(t)));
  assert.ok(own.m.includes('ფსალმუნები 19 და 20'));
  const vigil = titles('2026-11-15', 'vigil', { sat: 'litya', weekday: 'apart' });
  assert.ok(vigil.v.includes('ლიტია') && vigil.v.some(t => t.includes('პურის')) && vigil.v.at(-1) === 'ცისკარი იწყება');
  assert.ok(!vigil.m.includes('ფსალმუნები 19 და 20') && !vigil.v.includes('მეცხრე ჟამი'));
  const plain = titles('2026-11-09', 'simple');
  assert.ok(plain.v.includes('მეცხრე ჟამი') && plain.m.includes('ფსალმუნები 19 და 20'));
  assert.ok(!titles('2026-11-09', 'simple', { sat: 'apart', weekday: 'joined' }).m.includes('ფსალმუნები 19 და 20'));
  // a plain day reads the praises and the doxology; no small litany after its kathismas
  assert.ok(plain.m.some(t => t.startsWith('ქებანი')) && plain.m.includes('„ღირს არს ჭეშმარიტად“'));
  const i = plain.m.indexOf('დავითნის კანონი 4');
  assert.ok(i > 0 && plain.m[i + 1] !== 'მცირე კვერექსი');
  // every litany is the priest's part (hidden with „მღვდლის ტექსტები“ off), no reader's text is
  for (const s of own.sv.flatMap(x => x.steps)) {
    if (/კვერექს/.test(s.title) && !/ანტიფონ/.test(s.title)) assert.ok(s.priest, s.title);
    if (s.read) assert.ok(!s.priest && s.who.includes('reader'), s.title);
  }
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
