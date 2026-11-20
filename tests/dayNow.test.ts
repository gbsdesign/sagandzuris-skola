// „ახლა“ on the reader's page (utils/dayService: nowPart, serviceNow, serviceAfter): the page opens by itself on the church
// day and the service that is served at this hour — in the evening on the next day's vespers, in the morning on the day's
// own first service — and „შემდეგი მსახურება“ leads on in the order the services are served.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_ORDER, buildServices, guessRank, inTime, nowPart, nowWord, serviceAfter, serviceNow, type DayInput, type ServiceId, type TempleOrder,
} from '../src/utils/dayService';
import { addDays } from '../src/data/churchFeasts';

const root = new URL('../', import.meta.url);
const cal: Record<string, DayInput['day']> = {
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2026.json', root), 'utf8')).days,
  ...JSON.parse(readFileSync(new URL('src/data/calendar/2027.json', root), 'utf8')).days,
};
const VIGIL: TempleOrder = { sat: 'vigil', weekday: 'apart' };
const JOINED: TempleOrder = { sat: 'litya', weekday: 'joined' };
const services = (iso: string, order: TempleOrder = DEFAULT_ORDER) => {
  const day = cal[iso] ?? null;
  return buildServices({ iso, day, prev: cal[addDays(iso, -1)] ?? null, tone: 7, rank: guessRank(iso, day, null), patron: null, order });
};
const ids = (iso: string, order?: TempleOrder) => inTime(services(iso, order)).map(s => s.id);

// 2027: Pascha is 2 May — Great Friday 30 April, Great Saturday 1 May, Holy Monday 26 April
const PASCHA = '2027-05-02';

test('the hour picks the church day: the morning is the day\'s own, from two o\'clock the next day\'s evening', () => {
  assert.deepEqual(nowPart('2026-11-20', 0), { iso: '2026-11-20', part: 'day' });
  assert.deepEqual(nowPart('2026-11-20', 13), { iso: '2026-11-20', part: 'day' });
  assert.deepEqual(nowPart('2026-11-20', 14), { iso: '2026-11-21', part: 'eve' });
  assert.deepEqual(nowPart('2026-11-20', 23), { iso: '2026-11-21', part: 'eve' });
  // the year's last evening leads into the next year
  assert.deepEqual(nowPart('2026-12-31', 18), { iso: '2027-01-01', part: 'eve' });
  // Great Friday's and Pascha's own vespers are served in their afternoon
  assert.deepEqual(nowPart('2027-04-30', 15), { iso: '2027-04-30', part: 'late' });
  assert.deepEqual(nowPart('2027-04-30', 17), { iso: '2027-05-01', part: 'eve' });
  assert.deepEqual(nowPart(PASCHA, 16), { iso: PASCHA, part: 'late' });
  assert.deepEqual(nowPart(PASCHA, 19), { iso: '2027-05-03', part: 'eve' });
});

test('every service says when it is served, and its words agree', () => {
  let n = 0;
  for (let iso = '2026-11-19'; iso <= '2027-11-18'; iso = addDays(iso, 1)) {
    for (const order of [DEFAULT_ORDER, JOINED]) {
      for (const s of services(iso, order)) {
        n++;
        const at = `${iso} ${s.id} „${s.when}“ → ${s.slot}`;
        assert.ok(['prev', 'eve', 'night', 'day', 'late', 'with'].includes(s.slot), at);
        if (/საღამოს/.test(s.when)) assert.equal(s.slot, 'eve', at);
        if (/^დილით|, დილით/.test(s.when)) assert.equal(s.slot, 'day', at);
        if (/შუადღის შემდეგ/.test(s.when)) assert.equal(s.slot, 'late', at);
        if (/ღამეს/.test(s.when)) assert.equal(s.slot, 'night', at);
        if (s.id === 'hours' || s.id === 'liturgy') assert.equal(s.slot, 'day', at);
        if (s.id === 'compline') assert.equal(s.slot, 'eve', at);
      }
    }
  }
  assert.ok(n > 2500);
});

test('an ordinary week: the evening opens on vespers, the morning on the first morning service', () => {
  // Saturday 21 November 2026, a weekday's order „only vespers“: matins is served in the morning
  assert.equal(serviceNow(services('2026-11-21'), 'eve', 17), 'vespers');
  assert.equal(serviceNow(services('2026-11-21'), 'day', 8), 'matins');
  // the temple serves a weekday's matins in the evening: the morning begins with the hours
  assert.equal(serviceNow(services('2026-11-21', JOINED), 'eve', 17), 'vespers');
  assert.equal(serviceNow(services('2026-11-21', JOINED), 'day', 8), 'hours');
  // Sunday 22 November: the vigil on Saturday evening, the hours on Sunday morning
  assert.equal(serviceNow(services('2026-11-22', VIGIL), 'eve', 18), 'vespers');
  assert.equal(serviceNow(services('2026-11-22', VIGIL), 'day', 9), 'hours');
  assert.equal(serviceNow(services('2026-11-22'), 'day', 9), 'matins');
});

test('a page opened again goes on in the service the reader marked a place in', () => {
  const sv = services('2026-11-22', VIGIL);
  const marked = (list: ServiceId[]) => (id: ServiceId) => list.includes(id);
  assert.equal(serviceNow(sv, 'eve', 19, marked(['vespers'])), 'vespers');
  assert.equal(serviceNow(sv, 'eve', 19, marked(['vespers', 'matins'])), 'matins');
  // a place marked in the morning's liturgy while preparing does not pull the evening there
  assert.equal(serviceNow(sv, 'eve', 19, marked(['liturgy'])), 'vespers');
  assert.equal(serviceNow(sv, 'day', 10, marked(['hours', 'liturgy'])), 'liturgy');
});

test('Holy Week and Pascha', () => {
  // Holy Monday: the Bridegroom's matins the evening before; in the morning the hours (the vespers' tab only points to the liturgy)
  assert.equal(serviceNow(services('2027-04-26'), 'eve', 18), 'matins');
  assert.equal(serviceNow(services('2027-04-26'), 'day', 9), 'hours');
  // Great Friday: the twelve Gospels on Thursday evening, the Royal Hours in the morning, the vespers in the afternoon
  assert.equal(serviceNow(services('2027-04-30'), 'eve', 18), 'matins');
  assert.equal(serviceNow(services('2027-04-30'), 'day', 9), 'hours');
  assert.equal(serviceNow(services('2027-04-30'), 'late', 15), 'vespers');
  assert.deepEqual(ids('2027-04-30'), ['matins', 'hours', 'liturgy', 'vespers']);
  // Pascha: its matins on Saturday night and after midnight, the hours later in the day, its own vespers in the afternoon
  const { iso, part } = nowPart('2027-05-01', 22);
  assert.equal(iso, PASCHA);
  assert.equal(serviceNow(services(PASCHA), part, 22), 'matins');
  assert.equal(serviceNow(services(PASCHA), 'day', 0), 'matins');
  assert.equal(serviceNow(services(PASCHA), 'day', 9), 'hours');
  assert.equal(serviceNow(services(PASCHA), 'late', 16), 'vespers');
  assert.equal(nowWord('eve', services(PASCHA).find(s => s.id === 'matins')!.slot), 'ამ ღამით');
});

test('„შემდეგი მსახურება“ follows the order the services are served in', () => {
  const sv = services('2026-11-22', VIGIL);
  assert.deepEqual(ids('2026-11-22', VIGIL), ['vespers', 'matins', 'hours', 'liturgy']);
  assert.equal(serviceAfter(sv, 'vespers')?.id, 'matins');
  assert.equal(serviceAfter(sv, 'matins')?.id, 'hours');
  assert.equal(serviceAfter(sv, 'hours')?.id, 'liturgy');
  assert.equal(serviceAfter(sv, 'liturgy'), null);
  // Great Friday's vespers is the day's last service though its tab stands first
  assert.equal(serviceAfter(services('2027-04-30'), 'liturgy')?.id, 'vespers');
  assert.equal(serviceAfter(services('2027-04-30'), 'vespers'), null);
});

test('through a whole year the page always has a service to open on, and names its time', () => {
  for (let iso = '2026-11-19'; iso <= '2027-11-18'; iso = addDays(iso, 1)) {
    for (const order of [DEFAULT_ORDER, JOINED]) {
      const sv = services(iso, order);
      for (const [part, hour] of [['day', 8], ['eve', 18]] as const) {
        const id = serviceNow(sv, part, hour);
        const s = sv.find(x => x.id === id);
        assert.ok(s, `${iso} ${part}: ${id} is not among the day's services`);
        assert.notEqual(s.slot, 'with', `${iso} ${part}: opened on a tab that only points to the liturgy`);
        assert.notEqual(s.slot, 'prev', `${iso} ${part}: opened on a service of the day before`);
        // the words never promise an evening for a morning service
        if (nowWord(part, s.slot) === 'დღეს საღამოს') assert.equal(s.slot, 'eve', `${iso} ${part}`);
        if (nowWord(part, s.slot) === 'დღეს დილით') assert.equal(s.slot, 'day', `${iso} ${part}`);
      }
    }
  }
});
