// The Android app's day and saying widgets (android/ DayWidget, QuoteWidget) read one small file a year:
// public/widget/days-<year>.json = { days: { "2026-10-29": { t, s: [[name, feast?], …] } }, sayings: [[text, author], …] }.
// Made from the church calendar (src/data/calendar/<year>.json) and the home page's holy fathers' words.
// Run: node scripts/build-widget-days.mjs   (after the calendar is fetched for a new year) — never edit the output by hand.
import fs from 'node:fs';
import path from 'node:path';
import { appData } from './print-games/appData.mjs';
import { ROOT } from './print-games/lib.mjs';

const SHOWN = 4;
const MAX = 90;
const short = (t) => (t.length > MAX ? `${t.slice(0, MAX - 1).trimEnd()}…` : t);

const { SAYINGS_ABOVE, SAYINGS_BELOW } = await appData({ 'data/sayings': ['SAYINGS_ABOVE', 'SAYINGS_BELOW'] });
const sayings = [...SAYINGS_ABOVE, ...SAYINGS_BELOW].map((s) => [s.text, s.author]);

const dir = path.join(ROOT, 'src/data/calendar');
const outDir = path.join(ROOT, 'public/widget');
fs.mkdirSync(outDir, { recursive: true });
// a church year's file runs into the next new-style year: every day goes to the file of its own new-style year
const byYear = {};
for (const f of fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).sort()) {
  const { days } = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const [iso, d] of Object.entries(days)) {
    const s = (d.s || []).slice(0, SHOWN).map((x) => (x.b ? [short(x.n), 1] : [short(x.n)]));
    (byYear[iso.slice(0, 4)] ||= {})[iso] = { t: d.t, s };
  }
}
for (const [year, days] of Object.entries(byYear)) {
  const file = path.join(outDir, `days-${year}.json`);
  fs.writeFileSync(file, JSON.stringify({ days, sayings }));
  console.log(path.relative(ROOT, file), Object.keys(days).length, 'days', `${Math.round(fs.statSync(file).size / 1024)} KB`);
}
