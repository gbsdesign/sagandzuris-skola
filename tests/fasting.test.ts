import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarFoodNote, foodOf } from '../src/utils/fasting';

// Pascha 2027 = 2 May (new style); Lent from 15 March
test('the fast-free weeks and the great fasts', () => {
  assert.equal(foodOf('2027-05-05').food, 'free'); // Bright Wednesday
  assert.equal(foodOf('2027-01-08').food, 'free'); // Christmastide
  assert.equal(foodOf('2027-02-24').food, 'free'); // Wednesday after the Publican
  assert.equal(foodOf('2027-03-10').food, 'meatless'); // Cheesefare Wednesday
  assert.equal(foodOf('2027-03-15').food, 'strict'); // Clean Monday
  assert.equal(foodOf('2027-03-24').food, 'dry'); // a Lent Wednesday
  assert.equal(foodOf('2027-03-27').food, 'oil'); // a Lent Saturday
  assert.equal(foodOf('2027-03-22').food, 'oil'); // the forty martyrs
  assert.equal(foodOf('2027-04-07').food, 'fish'); // Annunciation in Lent
  assert.equal(foodOf('2027-04-25').food, 'fish'); // Palm Sunday
  assert.equal(foodOf('2027-04-30').food, 'none'); // Holy Friday
  assert.equal(foodOf('2027-06-21').food, 'free'); // the week after Pentecost (Pentecost 20 June)
});

test('Wednesdays, Fridays and the small fasts', () => {
  assert.equal(foodOf('2026-11-18').food, 'dry'); // an ordinary Wednesday
  assert.equal(foodOf('2026-11-18', 'doxology').food, 'oil');
  assert.equal(foodOf('2026-11-20', 'vigil').food, 'fish');
  assert.equal(foodOf('2026-11-17').food, 'free'); // Tuesday
  assert.equal(foodOf('2026-12-01').food, 'oil'); // Nativity fast, Tuesday
  assert.equal(foodOf('2026-12-05').food, 'fish'); // Nativity fast, Saturday
  assert.equal(foodOf('2026-12-04').food, 'fish'); // the Entry of the Theotokos
  assert.equal(foodOf('2027-01-03').food, 'oil'); // after 20 Dec old style: Sunday, no fish
  assert.equal(foodOf('2027-01-06').food, 'strict'); // Christmas Eve
  assert.equal(foodOf('2027-01-18').food, 'strict'); // Theophany Eve
  assert.equal(foodOf('2027-07-05').food, 'dry'); // the Apostles' fast, Monday
  assert.equal(foodOf('2027-07-04').food, 'fish'); // the Apostles' fast, Sunday
  assert.equal(foodOf('2027-08-19').food, 'fish'); // the Transfiguration in the Dormition fast
  assert.equal(foodOf('2027-08-17').food, 'dry'); // the Dormition fast, Tuesday
  assert.equal(foodOf('2027-09-27').food, 'oil'); // the Exaltation of the Cross
  assert.equal(foodOf('2027-05-12').food, 'oil'); // a Wednesday in the Pentecostarion
});

test("the calendar's own note", () => {
  assert.equal(calendarFoodNote('… ხსნილია თევზით. …'), 'ხსნილია თევზით.');
  assert.equal(calendarFoodNote('ლიტურგია. მარხვა. ცისკ.'), 'მარხვა.');
  assert.equal(calendarFoodNote('სადაგი დღე'), null);
  assert.equal(foodOf('2026-04-07', 'great', 'ხსნილია თევზით.').cal, 'ხსნილია თევზით.');
});

test("ჟამნი's marks, Lazarus Saturday, the Annunciation in Holy Week (the audit of 2026-11-19)", () => {
  // a Wednesday or a Friday relaxed by the saint's mark in ჟამნი, not by his rank
  assert.equal(foodOf('2027-01-20').food, 'fish'); // 7 January, old style: the Synaxis of the Forerunner — „ხსნილი თევზითა“
  assert.equal(foodOf('2027-01-27').food, 'dry'); // St Nino on a Wednesday: the calendars print only „მარხვა“
  assert.equal(foodOf('2027-11-26').food, 'oil'); // 13 November: St John Chrysostom — wine and oil
  assert.equal(foodOf('2027-07-14').food, 'oil'); // 1 July: the Unmercenaries
  // the small fasts: a marked saint on a Monday, Wednesday or Friday — wine and oil
  assert.equal(foodOf('2027-12-13').food, 'oil'); // 30 November: St Andrew, a Monday
  assert.equal(foodOf('2027-12-17').food, 'oil'); // 4 December: St Barbara, a Friday
  assert.equal(foodOf('2027-12-15').food, 'dry');
  assert.equal(foodOf('2027-12-06', 'doxology').food, 'oil'); // a Monday is as strict as Wednesday and Friday
  // Lent: a saint's rank relaxes nothing — only the marked days, the Great Canon's Thursday, the temple's own day
  assert.equal(foodOf('2027-03-23', 'doxology').food, 'dry');
  assert.equal(foodOf('2027-03-23', 'vigil').food, 'oil');
  assert.equal(foodOf('2027-04-08').food, 'oil'); // 26 March: the Archangel's synaxis
  assert.equal(foodOf('2027-04-15').food, 'oil'); // the Great Canon's Thursday
  assert.equal(foodOf('2027-04-24').food, 'fish'); // Lazarus Saturday, as the Georgian calendars have it
  assert.equal(foodOf('2026-04-07').food, 'oil'); // the Annunciation on Great Tuesday: wine and oil, no fish
});
