// The rank the day service guesses below the polyeleos (utils/dayService guessRank): the great doxology belongs to a feast's
// leave-taking, to a saint ჟამნი relaxes the fast for, and to a red saint of the calendar — not to a day whose only red
// name says that a feast goes on (its forefeast or afterfeast).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guessRank, redSaint, type DayInput } from '../src/utils/dayService';
import { addDays } from '../src/data/churchFeasts';

const root = new URL('../', import.meta.url);
const cal: Record<string, NonNullable<DayInput['day']>> = {
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2026.json', root), 'utf8')).days,
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2027.json', root), 'utf8')).days,
};
const rank = (iso: string) => guessRank(iso, cal[iso], null);
const red = (iso: string) => cal[iso].s.filter(s => s.b).map(s => s.n);

test('a red name that only says the feast goes on is not a red saint', () => {
  assert.equal(redSaint('მიძინების შემდგომი დღესასწაული'), false);
  assert.equal(redSaint('ნათლისღების წინადღესასწაული'), false);
  assert.equal(redSaint('წინადღესასწაული ქრისტესშობისა. ქრისტეშობის წინა შაბათი'), false);
  assert.equal(redSaint('წინადღესასწაული და წინადღე ქრისტესშობისა'), false);
  // the feast's tide and a commemoration of its own in one name
  assert.equal(redSaint('შემდგომი დღესასწაული ქრისტესშობისა. კრება ყოვლადწმიდისა ღმრთისმშობელისა'), true);
  assert.equal(redSaint('მიძინების დღესასწაულის წარგზავნა'), true);
  assert.equal(redSaint('წმ. სილიბისტრო რომის პაპისა'), true);
});

test('an afterfeast or forefeast weekday is served by its own saint: no great doxology from the feast\'s name alone', () => {
  // the Transfiguration's and Theophany's afterfeast, the Meeting's forefeast — only the feast's title is red
  for (const iso of ['2026-08-20', '2026-01-22', '2026-02-13', '2027-09-04']) {
    assert.ok(red(iso).length > 0 && red(iso).every(n => !redSaint(n)), `${iso}: ${red(iso).join(' ‖ ')}`);
    assert.equal(rank(iso), 'simple', iso);
  }
  // … with a red saint beside the feast's title it is the saint's day
  assert.ok(red('2026-08-25').some(redSaint));
  assert.equal(rank('2026-08-25'), 'doxology');
});

test('a feast\'s leave-taking is sung with the great doxology', () => {
  assert.equal(rank('2026-09-05'), 'doxology');   // the Dormition's
  assert.equal(rank('2026-05-29'), 'doxology');   // the Ascension's
  // the Exaltation's, 21 September old style — in 2027 no name of that day is red
  assert.equal(red('2027-10-04').length, 0);
  assert.equal(rank('2027-10-04'), 'doxology');
});

test('a saint ჟამნი relaxes the fast for has the great doxology, red in the calendar or not', () => {
  // St Barbara (4 December old style), Sts Cosmas and Damian (1 July), St Mary Magdalene (22 July)
  for (const iso of ['2026-12-17', '2026-07-14', '2026-08-04']) {
    assert.equal(red(iso).length, 0, iso);
    assert.equal(rank(iso), 'doxology', iso);
  }
});

test('what stays as it was: a plain day, a Lent weekday, the higher ranks', () => {
  assert.equal(rank('2026-11-20'), 'simple');
  assert.equal(rank('2026-11-21'), 'polyeleos');          // the Archangels
  assert.equal(rank('2026-11-22'), 'vigil');              // a Sunday
  // Lent's weekday keeps ჟამნი's order whatever the day's saint: the Annunciation's leave-taking, 26 March old style
  assert.equal(rank('2027-04-08'), 'simple');
  // every guess through two years is one of the five ranks, and only days with a sign of their own rise above a plain day
  for (let iso = '2026-01-14'; iso <= '2027-12-31'; iso = addDays(iso, 1)) {
    if (!cal[iso]) continue;
    assert.ok(['great', 'vigil', 'polyeleos', 'doxology', 'simple'].includes(rank(iso)), iso);
  }
});
