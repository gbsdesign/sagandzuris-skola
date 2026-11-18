// Swaps a computed church year (scripts/calendar-gen, days marked c: 1) for orthodoxy.ge's own pages once they are out.
// Run every day by .github/workflows/calendar-update.yml; by hand: node scripts/calendar-official.mjs
// For the current and the next old-style year: if src/data/calendar/<year>.json is missing or still computed and
// orthodoxy.ge has the year's first page, scripts/fetch-church-calendar.mjs fetches it; every day orthodoxy.ge gave
// replaces the computed one, a day it did not give stays computed (the year keeps "computed" until none is left).
// Prints the years it changed; writes them to $GITHUB_OUTPUT as changed=<years> for the workflow.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fileOf = (y) => path.join(ROOT, 'src', 'data', 'calendar', `${y}.json`);
const read = async (y) => JSON.parse(await fs.readFile(fileOf(y), 'utf8'));

const old = new Date(Date.now() - 13 * 864e5); // old style ≈ 13 days behind
const now = old.getUTCFullYear();
const changed = [];

for (const y of [now, now + 1]) {
  let before = null;
  try { before = await read(y); } catch { before = null; }
  if (before && !before.computed) continue;
  const res = await fetch(`https://www.orthodoxy.ge/calendar/${y}/v2/01/0101.htm`).catch(() => null);
  if (!res || !res.ok) { console.log(`${y}: orthodoxy.ge has not published it yet`); continue; }
  console.log(`${y}: orthodoxy.ge has it — fetching`);
  execFileSync('node', [path.join(ROOT, 'scripts', 'fetch-church-calendar.mjs'), String(y)], { stdio: 'inherit' });
  const got = await read(y).catch(() => null);
  const official = got?.days ?? {};
  const n = Object.keys(official).length;
  if (!n) {
    if (before) await fs.writeFile(fileOf(y), JSON.stringify(before));
    console.log(`${y}: no day came — kept as it was`);
    continue;
  }
  const days = { ...official };
  let left = 0;
  for (const [iso, d] of Object.entries(before?.days ?? {})) {
    if (!days[iso]) { days[iso] = d; left++; }
  }
  const sorted = Object.fromEntries(Object.keys(days).sort().map((k) => [k, days[k]]));
  const year = { ...got, days: sorted };
  if (left) year.computed = true; else delete year.computed;
  await fs.writeFile(fileOf(y), JSON.stringify(year));
  console.log(`${y}: ${n} official days${left ? `, ${left} still computed` : ''}`);
  changed.push(y);
}

if (changed.length) {
  execFileSync('node', [path.join(ROOT, 'scripts', 'build-widget-days.mjs')], { stdio: 'inherit' });
}
if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `changed=${changed.join(' ')}\n`);
console.log(changed.length ? `changed: ${changed.join(' ')}` : 'nothing changed');
