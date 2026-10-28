// Builds the word bank of „დღის სიტყვა“ (src/data/sitqvaWords.ts, one string, loaded lazily so the PWA keeps it offline):
// every Georgian word of 4–6 letters that the
// app's own texts use at least twice — prayers, the Bible, the saint lives, the მთქმელი texts, the library books and
// the church calendar. The player's guesses must be in this bank; the day's answer comes from data/sitqvaAnswers.ts.
// Run: node scripts/build-sitqva-words.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['public/prayers', 'public/bible', 'public/lives', 'public/mtkmeli', 'src/data/library', 'src/data/calendar'];
const MIN_COUNT = 2;
const WORD = /[ა-ჰ]+/g; // the 33 letters of today's alphabet; a word with an old letter (ჱ, ჲ, ჳ…) stays out

const files = [];
const walk = dir => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.json')) files.push(p); } };
ROOTS.forEach(walk);

const count = new Map();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const w of text.match(WORD) || []) {
    if (w.length < 4 || w.length > 6) continue;
    count.set(w, (count.get(w) || 0) + 1);
  }
}
const words = [...count].filter(([, c]) => c >= MIN_COUNT).map(([w]) => w).sort((a, b) => a.localeCompare(b, 'ka'));
const out = `// Made by scripts/build-sitqva-words.mjs — do not edit by hand. ${words.length} Georgian words of 4–6 letters that the app's
// own texts use at least twice: the words „დღის სიტყვა“ accepts as a guess. Loaded lazily (utils/sitqvaDictionary.ts).
export default \`
${words.join('\n')}
\`;
`;
writeFileSync('src/data/sitqvaWords.ts', out);
console.log(`${files.length} files, ${count.size} distinct words of 4–6 letters, ${words.length} used ≥${MIN_COUNT} times → src/data/sitqvaWords.ts (${Math.round(Buffer.byteLength(out) / 1024)} KB)`);
