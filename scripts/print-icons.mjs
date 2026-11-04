// node scripts/print-icons.mjs — writes src/print/icons.js: the lucide icons the print kits name (any quoted word in
// src/print/**/*.js, or in an app module they import, that is a lucide icon's file name), each with the drawing of lucide-react's
// own module, so a kit draws the app's very icons. The drawings are copied, not imported: an import would put them into the app's
// first bundle (vite.config.ts keeps every lucide module in vendor-ui). Run it again after a kit names a new icon (the kit then
// stops with „not in src/print/icons.js“) or after lucide-react is updated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS = path.join(ROOT, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
// an alias's module (grid.js → grid-3x3.js) has no node of its own: only the icons' own names count
const known = new Set(fs.readdirSync(ICONS).filter(f => f.endsWith('.js') && fs.readFileSync(path.join(ICONS, f), 'utf8').includes('export { __iconNode')).map(f => f.slice(0, -3)));
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name) && e.name !== 'icons.js') files.push(p); } };
walk(path.join(ROOT, 'src', 'print'));
// the app's modules the kits import can name icons too (a deck's icon in data/khaziCards.ts…): their words count as well
const appFiles = new Set();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/from '(\.\.?\/[^']+)'/g)) {
  const base = path.resolve(path.dirname(f), m[1]);
  if (base.startsWith(path.join(ROOT, 'src', 'print'))) continue;
  for (const ext of ['', '.ts', '.tsx', '.js']) if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) { appFiles.add(base + ext); break; }
}
const used = new Set();
for (const f of [...files, ...appFiles]) for (const m of fs.readFileSync(f, 'utf8').matchAll(/['"`]([a-z][a-z0-9-]*)['"`]/g)) if (known.has(m[1])) used.add(m[1]);
const names = [...used].sort();
const nodes = await Promise.all(names.map(async n => (await import(pathToFileURL(path.join(ICONS, `${n}.js`)).href)).__iconNode));
// React's keys are no part of the drawing
const drawing = node => JSON.stringify(node.map(([tag, attrs]) => [tag, Object.fromEntries(Object.entries(attrs).filter(([k]) => k !== 'key'))]));
const out = `// made by \`node scripts/print-icons.mjs\` from lucide-react ${JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'lucide-react', 'package.json'), 'utf8')).version} — never edit by hand
export const ICONS = {
${names.map((n, i) => `  '${n}': ${drawing(nodes[i])},`).join('\n')}
};
`;
fs.writeFileSync(path.join(ROOT, 'src', 'print', 'icons.js'), out);
console.log(`${names.length} icons`);
