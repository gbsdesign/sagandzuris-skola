// A member's calendar for the phone (Google Calendar, iPhone): the church's great feasts and fasts and the lessons of
// the member's classes, as an iCalendar feed the calendar app fetches by itself (GET /cal/<secret>.ics).
// The feasts and fasts are reckoned here (new-style dates of the Georgian Church); the lessons repeat weekly.

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const plus = (d, n) => new Date(d.getTime() + n * 86400000);

/** Orthodox Pascha in the civil (new-style) calendar, 1900–2099 */
export const pascha = (y) => {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31);
  const dd = ((d + e + 114) % 31) + 1;
  return plus(day(y, m, dd), 13);
};

const FIXED_FEASTS = [
  [1, 7, 'შობა ქრისტესი'], [1, 14, 'წინადაცვეთა'], [1, 19, 'ნათლისღება'], [1, 27, 'წმ. ნინოს ხსენება'],
  [2, 15, 'მირქმა'], [4, 7, 'ხარება'], [5, 6, 'გიორგობა'], [6, 1, 'წმ. ნინოს საქართველოში შემოსვლა'],
  [7, 7, 'იოანე ნათლისმცემლის შობა'], [7, 12, 'პეტრე-პავლობა'], [8, 19, 'ფერისცვალება'], [8, 28, 'მარიამობა'],
  [9, 11, 'თავის კვეთა'], [9, 21, 'ღვთისმშობლის შობა'], [9, 27, 'ჯვართამაღლება'], [10, 14, 'სვეტიცხოვლობა, მცხეთობა'],
  [11, 23, 'გიორგობა'], [12, 4, 'ღვთისმშობლის ტაძრად მიყვანება'],
];

/** the year's great feasts and fasts: { start, end (inclusive), title, kind } */
export const churchYear = (y) => {
  const p = pascha(y);
  const out = FIXED_FEASTS.map(([m, d, title]) => ({ start: day(y, m, d), end: day(y, m, d), title, kind: 'feast' }));
  for (const [n, title] of [[-7, 'ბზობა'], [0, 'აღდგომა'], [39, 'ამაღლება'], [49, 'სულთმოფენობა']]) {
    out.push({ start: plus(p, n), end: plus(p, n), title, kind: 'feast' });
  }
  const fast = (start, end, title) => out.push({ start, end, title, kind: 'fast' });
  fast(plus(p, -48), plus(p, -1), 'დიდი მარხვა');
  const apostles = plus(p, 57);
  if (apostles <= day(y, 7, 11)) fast(apostles, day(y, 7, 11), 'პეტრე-პავლეს მარხვა');
  fast(day(y, 8, 14), day(y, 8, 27), 'მარიამობის მარხვა');
  fast(day(y, 11, 28), day(y + 1, 1, 6), 'შობის მარხვა');
  fast(day(y, 1, 18), day(y, 1, 18), 'მარხვა — ნათლისღების წინადღე');
  fast(day(y, 9, 11), day(y, 9, 11), 'მარხვა — თავის კვეთა');
  fast(day(y, 9, 27), day(y, 9, 27), 'მარხვა — ჯვართამაღლება');
  return out.sort((a, b) => a.start - b.start);
};

const esc = (s) => String(s).replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

// lines are folded at 75 bytes, never inside a letter (Georgian letters are 3 bytes)
const enc = new TextEncoder();
export const fold = (line) => {
  const parts = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join('\r\n ');
};

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** the first `weekday` on or after `from` (a UTC date) */
const onOrAfter = (from, weekday) => plus(from, (weekday - from.getUTCDay() + 7) % 7);

/**
 * The feed. `classes`: [{ id, name, schedule: [{ day, start, end?, note? }] }] — the member's classes in use;
 * `now`: the moment it is made (feasts of last year, this one and the next).
 */
export const buildIcs = (classes, now = new Date()) => {
  const y = now.getUTCFullYear();
  const stamp = `${now.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const L = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//sagandzureli.ge//calendar//KA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:საგანძური', 'X-WR-TIMEZONE:Asia/Tbilisi', 'REFRESH-INTERVAL;VALUE=DURATION:PT12H', 'X-PUBLISHED-TTL:PT12H',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Tbilisi', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0400', 'TZOFFSETTO:+0400',
    'TZNAME:+04', 'END:STANDARD', 'END:VTIMEZONE',
  ];
  for (const yy of [y - 1, y, y + 1]) {
    for (const e of churchYear(yy)) {
      L.push('BEGIN:VEVENT', `UID:${e.kind}-${ymd(e.start)}-${ymd(e.end)}@sagandzureli.ge`, `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${ymd(e.start)}`, `DTEND;VALUE=DATE:${ymd(plus(e.end, 1))}`, `SUMMARY:${esc(e.title)}`,
        'TRANSP:TRANSPARENT', `CATEGORIES:${e.kind === 'fast' ? 'მარხვა' : 'დღესასწაული'}`, 'END:VEVENT');
    }
  }
  const from = day(y, 1, 1);
  for (const c of classes) {
    (c.schedule || []).forEach((slot, i) => {
      const m = TIME.exec(slot?.start || '');
      if (!m || !(slot.day >= 0 && slot.day <= 6)) return;
      const e = TIME.exec(slot.end || '');
      const startMin = Number(m[1]) * 60 + Number(m[2]);
      const endMin = e && Number(e[1]) * 60 + Number(e[2]) > startMin ? Number(e[1]) * 60 + Number(e[2]) : startMin + 90;
      const first = ymd(onOrAfter(from, slot.day));
      const t = (min) => `${pad(Math.floor(min / 60) % 24)}${pad(min % 60)}00`;
      L.push('BEGIN:VEVENT', `UID:lesson-${c.id}-${i}-${slot.day}-${t(startMin)}@sagandzureli.ge`, `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Asia/Tbilisi:${first}T${t(startMin)}`, `DTEND;TZID=Asia/Tbilisi:${first}T${t(Math.min(endMin, 23 * 60 + 59))}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[slot.day]}`, `SUMMARY:${esc(`გაკვეთილი — ${c.name || 'კლასი'}`)}`,
        ...(slot.note ? [`LOCATION:${esc(slot.note)}`] : []), 'END:VEVENT');
    });
  }
  L.push('END:VCALENDAR');
  return `${L.map(fold).join('\r\n')}\r\n`;
};
