import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildServices, feastTideOf, guessRank, hymnsOf, lentPsalter, matinsKathismas, vespersKathisma, greatFeastOf, periodOf, PATRON_PRESETS, type Patron } from '../src/utils/dayService';
import { orthodoxEaster } from '../src/data/churchFeasts';
const easterOffsetOf = (iso: string) => Math.round((Date.parse(iso) - Date.parse(orthodoxEaster(Number(iso.slice(0, 4))))) / 864e5);

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
  assert.ok(at('2026-02-24').find(s => s.id === 'matins')!.steps.some(s => s.title.includes('ალილუია')));
  assert.match(lit('2026-04-10')[0], /წირვა არ აღესრულება/); // Holy Friday
  assert.equal(at('2026-04-13')[2].steps[0].title, 'პასექის ჟამნი'); // Bright Monday
  assert.ok(lit('2026-05-03').some(t => t.includes('ანგელოზი ღაღადებს'))); // the Paschal season
});

test('stage 4: the movable days, compline, Holy Week, afterfeasts, own services', () => {
  const sv = (iso: string, patron: Patron | null = null) => buildServices({ iso, day: cal[iso] ?? null, tone: 1, rank: guessRank(iso, cal[iso] ?? null, patron), patron });
  const ids = (iso: string) => sv(iso).map(s => s.id).join(' ');
  const roles = (x: { troparia: { role: string; glory?: string; e?: number }[]; kontakia: { role: string; glory?: string; e?: number }[] }) =>
    [x.troparia.map(h => h.role + (h.e !== undefined ? h.e : '')).join(' '), x.kontakia.map(h => h.role + (h.e !== undefined ? h.e : '') + (h.glory ? ':' + h.glory : '')).join(' ')];
  const H = (iso: string, at: 'vespers' | 'matins' | 'hours' | 'liturgy', patron: Patron | null = null) =>
    roles(hymnsOf({ iso, day: cal[iso] ?? null, tone: 1, rank: guessRank(iso, cal[iso] ?? null, patron), patron }, at));
  // Great Compline on Lent's Monday–Thursday evenings; St Andrew in its first week (Lent 2026 began on 23 February)
  assert.equal(ids('2026-02-24'), 'vespers compline matins hours liturgy');
  assert.ok(sv('2026-02-24')[1].steps.some(s => s.title.includes('ანდრია კრიტელის')));
  assert.ok(!sv('2026-03-03')[1].steps.some(s => s.title.includes('ანდრია კრიტელის')));
  assert.equal(ids('2026-02-28'), 'vespers matins hours liturgy'); // Saturday: none
  // Lent's Sundays: the resurrection's troparion with the Sunday's, its kontakion last; the Orthodoxy Sunday
  assert.deepEqual(H('2026-03-01', 'liturgy'), ['resurrection triodion-42', 'resurrection triodion-42:now']);
  assert.deepEqual(H('2026-03-01', 'hours'), ['resurrection triodion-42', 'triodion-42']);
  // the Publican's Sunday has no troparion of its own: its kontakion at the hours, last at the liturgy
  assert.deepEqual(H('2026-02-01', 'hours'), ['resurrection saint', 'triodion-70']);
  // the Saturdays of the departed, Holy Week, Lazarus: the day's own hymns alone
  assert.deepEqual(H('2026-03-14', 'liturgy'), ['triodion-57', 'triodion-57']);
  assert.deepEqual(H('2026-04-06', 'liturgy'), ['triodion-6', 'triodion-6']);
  // the movable feasts take their hymns from ჟამნი 25; the Pentecostarion's weekdays end with Pascha's kontakion
  assert.deepEqual(H('2026-05-21', 'liturgy'), ['feast39', 'feast39']);
  assert.ok(H('2026-04-28', 'liturgy')[1].endsWith('triodion0:now'));
  // afterfeasts: Ascension's (movable), the Nativity of the Theotokos' (fixed, by the calendar's words)
  assert.deepEqual(H('2026-05-26', 'liturgy'), ['triodion39 saint', 'saint:glory triodion39:now']);
  const tide = hymnsOf({ iso: '2026-09-23', day: cal['2026-09-23'], tone: 1, rank: 'simple', patron: null }, 'liturgy');
  assert.equal(tide.troparia[0].role, 'feast');
  assert.equal(tide.troparia[0].md, '09-08');
  // Holy Week: the Bridegroom's matins, the Presanctified with the Gospel, the twelve Gospels, the Royal Hours
  assert.ok(sv('2026-04-06').find(s => s.id === 'matins')!.title.includes('სიძის'));
  assert.ok(sv('2026-04-06').find(s => s.id === 'liturgy')!.steps.some(s => s.title === 'სახარება'));
  const fri = sv('2026-04-10');
  assert.ok(fri.find(s => s.id === 'matins')!.steps[0].note!.includes('ინ. 13:31'));
  assert.equal(fri.find(s => s.id === 'hours')!.title, 'სამეუფო ჟამები');
  assert.ok(sv('2026-04-11').find(s => s.id === 'liturgy')!.steps.some(s => s.title.includes('აღდეგ')));
  // the Great Canon's Thursday and the Akathist Saturday
  assert.ok(sv('2026-03-26').find(s => s.id === 'matins')!.steps.some(s => s.note?.includes('დიდი კანონი')));
  assert.ok(sv('2026-03-28').find(s => s.id === 'matins')!.steps.some(s => s.extras?.some(x => x.kind === 'book' && x.coll === 'x' && x.n === 24)));
  // a saint with an own service: Abo of Tbilisi (8 Jan old style)
  const abo = sv('2027-01-21');
  assert.ok(abo[0].note?.includes('აბო'));
  assert.ok(abo[0].steps.some(s => s.extras?.some(x => x.kind === 'book' && x.coll === 'x' && x.n === 1)));
});

test('every chant a step names is in the books', async () => {
  const { SERVICE_LISTS } = await import('../src/data/chantLookup');
  const ids = new Set(SERVICE_LISTS.flatMap(([, list]) => list.map(c => c.id)));
  for (const iso of ['2026-11-09', '2026-11-15', '2026-11-21', '2026-02-25', '2026-03-01', '2026-05-03'])
    for (const sv of buildServices({ iso, day: cal[iso] ?? null, tone: 3, rank: guessRank(iso, cal[iso] ?? null, null), patron: george }))
      for (const st of sv.steps) for (const id of st.chants ?? []) assert.ok(ids.has(id), `${iso} ${st.title}: ${id}`);
});

test('stage 4b: the eves, the blessings, the Annunciation on a movable day', () => {
  const sv = (iso: string) => buildServices({ iso, day: cal[iso] ?? null, tone: 1, rank: guessRank(iso, cal[iso] ?? null, null), patron: null });
  const svc = (iso: string, id: string) => sv(iso).find(s => s.id === id)!;
  // Christmas Eve 2027 is a Wednesday: the Royal Hours, St Basil's liturgy with vespers
  assert.match(svc('2027-01-06', 'hours').steps[0].title, /სამეუფო ჟამები/);
  assert.equal(svc('2027-01-06', 'liturgy').when, 'ბასილი დიდისა, მწუხრთან ერთად');
  // Theophany Eve 2026 was a Sunday: the Royal Hours on Friday the 16th, Basil's liturgy on the feast (Monday the 19th)
  assert.match(svc('2026-01-16', 'hours').steps[0].title, /სამეუფო ჟამები/);
  assert.equal(svc('2026-01-19', 'liturgy').when, 'ბასილი დიდისა');
  assert.ok(svc('2026-01-19', 'liturgy').steps.some(s => s.title.startsWith('დიდი აიაზმა')));
  assert.ok(svc('2026-09-27', 'matins').steps.some(s => s.title === 'ჯვრის ამაღლება'));
  assert.ok(svc('2026-02-15', 'liturgy').steps.some(s => s.title === 'სანთლის კურთხევა'));
  assert.ok(svc('2026-04-05', 'matins').steps.some(s => s.title === 'ბზის კურთხევა')); // Palm Sunday 2026
  // the Annunciation on Holy Saturday (2029: Pascha 8 April): the day's hymns first, then the feast's
  const h = hymnsOf({ iso: '2029-04-07', day: null, tone: 1, rank: 'great', patron: null }, 'liturgy');
  assert.deepEqual(h.troparia.map(x => x.role + (x.e ?? '')), ['triodion-1', 'feast']);
});

test('a fixed feast\'s leave-taking is the feast\'s alone', () => {
  const h = hymnsOf({ iso: '2027-01-13', day: cal['2027-01-13'], tone: 1, rank: 'simple', patron: null }, 'liturgy');
  assert.deepEqual(h.troparia.map(x => x.role), ['feast']);
  assert.deepEqual(h.kontakia.map(x => x.role), ['feast']);
});

test('Lent\'s psalter (Typikon ch. 17): matins, the hours, vespers', () => {
  // Lent 2027: Monday 15 March … the 5th week from Monday 12 April; Holy Week from 26 April
  assert.deepEqual(matinsKathismas('2027-03-16', 'simple'), [10, 11, 12]); // Tuesday, 1st week
  assert.deepEqual(matinsKathismas('2027-03-17', 'doxology'), [19, 20, 1]); // Wednesday
  assert.deepEqual(matinsKathismas('2027-04-15', 'simple'), [8]); // the Great Canon's Thursday
  assert.deepEqual(matinsKathismas('2027-04-27', 'simple'), [9, 10, 11]); // Holy Tuesday
  assert.deepEqual(matinsKathismas('2027-02-23', 'simple'), [7, 8, 9]); // before the Prodigal's Sunday (28 Feb): winter
  assert.deepEqual(matinsKathismas('2027-03-02', 'simple'), [7, 8]); // after the Prodigal's Sunday: the summer order
  assert.equal(vespersKathisma('2027-03-15', 'simple'), null); // Sunday evening (forgiveness)
  assert.equal(vespersKathisma('2027-03-16', 'simple'), 18); // Monday evening
  assert.equal(vespersKathisma('2027-04-13', 'simple'), 10); // the 5th week's Monday evening
  assert.equal(vespersKathisma('2027-04-16', 'simple'), null); // the Great Canon's Thursday evening
  assert.deepEqual(lentPsalter(easterOffsetOf('2027-03-16'))?.h, { 1: 13, 3: 14, 6: 15, 9: 16 });
  const hours = buildServices({ iso: '2027-03-16', day: null, tone: 1, rank: 'simple', patron: null }).find(s => s.id === 'hours')!;
  assert.ok(hours.steps[1].read!.some(r => 'kathisma' in r && r.kathisma === 14));
});

test('the eves of Christmas and Theophany, the Holy Spirit\'s Monday', () => {
  const sv = (iso: string) => buildServices({ iso, day: cal[iso] ?? null, tone: 1, rank: guessRank(iso, cal[iso] ?? null, null), patron: null });
  // Christmas Eve 2027 (Wednesday): the liturgy begins with vespers and its eight readings
  const eve = sv('2027-01-06').find(s => s.id === 'liturgy')!.steps.map(s => s.title);
  assert.equal(eve[0], '„კურთხეულ არს მეუფება“');
  assert.ok(eve.some(t => t.startsWith('8 საწინასწარმეტყველო')));
  // Christmas: the vigil is Great Compline with the litya, matins from the six psalms
  const xmas = sv('2027-01-07');
  assert.equal(xmas[0].title, 'დიდი სერობა — ღამისთევა');
  assert.ok(!xmas.find(s => s.id === 'matins')!.steps.some(s => s.title === 'ფსალმუნები 19 და 20'));
  // the Monday of the Holy Spirit is the feast's second day
  assert.equal(guessRank('2027-06-21', cal['2027-06-21'], null), 'great');
  assert.equal(hymnsOf({ iso: '2027-06-21', day: cal['2027-06-21'], tone: 1, rank: 'great', patron: null }, 'liturgy').troparia[0].e, 49);
});

// ----- the audit of 2026-11-19: Lent as ჟამნი sets it, the Annunciation in Lent, Holy Week and Bright Week -----
const cal27 = JSON.parse(readFileSync(new URL('../src/data/calendar/2027.json', import.meta.url), 'utf8')).days;
const both: Record<string, typeof cal[string]> = { ...cal, ...cal27 };
const dayOf = (iso: string) => both[iso] ?? null;
const prevOf = (iso: string) => both[new Date(Date.parse(`${iso}T12:00:00Z`) - 864e5).toISOString().slice(0, 10)] ?? null;
const full = (iso: string) => buildServices({ iso, day: dayOf(iso), prev: prevOf(iso), tone: 3, rank: guessRank(iso, dayOf(iso), null), patron: null });
const titles = (iso: string, id: string) => full(iso).find(s => s.id === id)!.steps.map(s => s.title);
const stepOf = (iso: string, id: string, title: string) => full(iso).find(s => s.id === id)!.steps.find(s => s.title === title)!;

test('a Lent weekday as ჟამნი sets it', () => {
  assert.equal(guessRank('2027-03-23', dayOf('2027-03-23'), null), 'simple'); // a red saint is still a weekday in Lent
  const m = titles('2027-03-16', 'matins');
  assert.ok(m.includes('„ალილუია“ და სამების საგალობლები'));
  assert.ok(m.includes('„ტაძარსა ამას დიდებისა შენისასა მდგომარენი“'));
  assert.ok(!m.includes('განტევება') && !m.some(t => t.startsWith('დიდი დიდებამაღალიანი')));
  assert.equal(m.at(-1), 'პირველი ჟამი');
  assert.deepEqual(titles('2027-03-16', 'hours').slice(1, 5), ['მესამე ჟამი', 'მეექვსე ჟამი', 'მეცხრე ჟამი', 'სადილის ჟამი']);
  assert.match(stepOf('2027-03-16', 'hours', 'მეექვსე ჟამი').note!, /^წინასწარმეტყველება: ეს\. 1: 19/);
  assert.match(titles('2027-03-16', 'liturgy')[0], /არ აღესრულება/);
  // its vespers followed the hours of the day before: that day's two readings, Lent's ending
  const v = full('2027-03-16').find(s => s.id === 'vespers')!.steps;
  assert.equal(v[0].title, 'მწუხრი ჟამებს მოსდევს');
  assert.match(v.find(s => s.title === 'წარდგომა და საკითხავები')!.note!, /^დაბ\. 1: 1-13/);
  assert.ok(v.some(s => s.title.startsWith('მარხვის ტროპარნი')));
  // after a Presanctified liturgy vespers is not served apart
  assert.equal(titles('2027-03-18', 'vespers').length, 1);
  // Sunday evenings: the two great prokeimena take turns
  const prok = (iso: string) => { const x = stepOf(iso, 'vespers', 'დიდი წარდგომა').extras![0]; return x.kind === 'text' ? String(x.src.after) : ''; };
  assert.notEqual(prok('2027-03-15'), prok('2027-03-22'));
  assert.equal(prok('2027-03-15'), prok('2027-03-29'));
});

test('the Presanctified, the feasts kept in Lent, Cheesefare', () => {
  for (const iso of ['2027-03-17', '2027-03-19', '2027-04-15', '2027-03-22']) assert.ok(titles(iso, 'liturgy').includes('„აწ ძალნი ცათანი“'), iso);
  // the Forty Martyrs on a Lent Monday: the polyeleos, the Presanctified with their Epistle and Gospel, the doxology read
  assert.equal(guessRank('2027-03-22', dayOf('2027-03-22'), null), 'polyeleos');
  assert.ok(titles('2027-03-22', 'liturgy').includes('სახარება'));
  const m = titles('2027-03-22', 'matins');
  assert.ok(m.some(t => t.startsWith('პოლიელეოსი')) && m.includes('„შენდა დიდება შვენის“ და დიდებამაღალიანი') && !m.includes('განტევება'));
  // from Mid-Lent's Wednesday the litany of those preparing for illumination
  const lit = (iso: string) => stepOf(iso, 'liturgy', 'კვერექსები').note!;
  assert.ok(!lit('2027-03-17').includes('განმზადებულთა') && lit('2027-04-09').includes('განმზადებულთა'));
  // no Great Compline on the evening of the Great Canon's matins
  assert.ok(!full('2027-04-15').some(s => s.id === 'compline') && full('2027-04-14').some(s => s.id === 'compline'));
  // Cheesefare's Wednesday and Friday: no liturgy, the day in Lent's way; Thursday — an ordinary liturgy
  for (const iso of ['2027-03-10', '2027-03-12']) {
    assert.match(titles(iso, 'liturgy')[0], /არ აღესრულება/, iso);
    assert.ok(titles(iso, 'matins').includes('„ალილუია“ და სამების საგალობლები'), iso);
  }
  assert.ok(titles('2027-03-11', 'liturgy').length > 20);
  // the Cross in mid-Lent
  assert.ok(titles('2027-04-04', 'matins').includes('ჯვრის გამოსვენება და თაყვანისცემა'));
  assert.ok(titles('2027-04-04', 'liturgy').includes('„ჯუარსა შენსა თაყუანის-ვსცემთ“'));
  assert.equal(titles('2027-04-05', 'matins').at(-1), 'ჯვრის თაყვანისცემა');
});

test('the Annunciation on a Lent weekday (2027: Wednesday of the fourth week)', () => {
  const sv = full('2027-04-07');
  assert.deepEqual(sv.map(s => s.id), ['vespers', 'compline', 'matins', 'hours', 'liturgy']);
  // the eve: Lent's vespers with the entrance, the day's two readings and the feast's three
  assert.match(sv[0].steps.find(s => s.title === 'წარდგომა და საკითხავები')!.note!, /ხარებისა: 1\) დაბ\. 28/);
  assert.ok(sv[0].steps.some(s => s.title.startsWith('შესვლა')));
  assert.equal(sv[1].title, 'დიდი სერობა');
  assert.equal(sv[2].steps[0].title, 'ექვსფსალმუნება'); // matins follow Great Compline
  assert.match(sv[4].when, /ოქროპირისა, მწუხრთან ერთად/);
  const lt = sv[4].steps.map(s => s.title);
  assert.ok(lt.includes('„ნათელო მხიარულო“') && lt.includes('ქერუბიმთა გალობა — „რომელნი ქერუბიმთა“') && !lt.includes('ანტიფონები'));
  assert.match(sv[4].steps.find(s => s.title === 'წარდგომანი და საკითხავები')!.note!, /ხარებისა: 1\) გამ\. 3/);
  assert.equal(titles('2027-04-08', 'vespers').length, 1); // the next day's vespers was that liturgy's beginning
  // 2026: the Annunciation on Great Tuesday — St John Chrysostom's liturgy with vespers
  const tue = buildServices({ iso: '2026-04-07', day: dayOf('2026-04-07'), prev: prevOf('2026-04-07'), tone: 1, rank: 'great', patron: null });
  assert.match(tue.find(s => s.id === 'liturgy')!.when, /ოქროპირისა/);
});

test('Holy Week, Bright Week, tides', () => {
  // Great Monday's Gospel is its own alone: the notes' table of the hours' Gospels is no reading of the day
  assert.equal(stepOf('2027-04-26', 'liturgy', 'სახარება').note, 'მათე 24: 3-35');
  assert.ok(titles('2027-04-28', 'liturgy').includes('ეფრემ ასურის ლოცვა — უკანასკნელად'));
  // Bright Week: each evening its own great prokeimenon; St George's matins Gospel on Bright Thursday 2027
  assert.ok(titles('2027-05-03', 'vespers').some(t => t.includes('ვინ არს ღმერთი დიდ')));
  assert.ok(titles('2027-05-06', 'vespers').some(t => t.includes('ყურად-იღე')));
  assert.ok(titles('2027-05-06', 'matins').includes('წარდგომა და სახარება — წმიდანისა'));
  assert.equal(guessRank('2028-05-06', null, null), 'vigil'); // გიორგობა in spring too
  // a tide the computed year keeps in its text alone; Theophany's by the date
  for (const [iso, kind] of [['2027-08-27', 'fore'], ['2027-09-26', 'fore'], ['2027-10-04', 'leave'], ['2027-01-17', 'fore'], ['2027-01-25', 'after']] as const) {
    assert.equal(feastTideOf(dayOf(iso), iso)?.kind, kind, iso);
  }
  // an optional service („თუ უპირატესი ინებებს“) does not raise the day; picked by the reader, its matins Gospel is shown
  assert.equal(guessRank('2026-12-25', dayOf('2026-12-25'), null), 'doxology');
  const sp = buildServices({ iso: '2026-12-25', day: dayOf('2026-12-25'), prev: null, tone: 1, rank: 'polyeleos', patron: null });
  assert.equal(sp.find(s => s.id === 'matins')!.steps.find(s => s.title === 'საცისკრო წარდგომა და სახარება')!.note, 'იოანე 10: 9-16');
});
