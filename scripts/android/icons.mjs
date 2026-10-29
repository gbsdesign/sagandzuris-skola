// The Android app's widget and menu icons: lucide's own drawings (the site's icons) as Android vector drawables,
// android/app/src/main/res/drawable/lc_<name>.xml — black strokes, tinted where they are shown.
// Run: node scripts/android/icons.mjs   (after adding a name below) — never edit the output by hand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ICON_DIR = path.join(ROOT, 'node_modules', 'lucide-react', 'dist', 'esm', 'icons');
const OUT = path.join(ROOT, 'android', 'app', 'src', 'main', 'res', 'drawable');

const NAMES = [
  // the habits' own icons (src/data/habitLooks.ts HABIT_ICON_IDS)
  'sunrise', 'moon', 'clock', 'book-open', 'scroll-text', 'library', 'heart', 'music', 'notebook-pen', 'church',
  'bell', 'star', 'hand-heart', 'message-circle-heart', 'grape', 'cross', 'feather', 'flower', 'sprout', 'bird',
  'mic-vocal', 'users', 'hourglass', 'sparkle',
  // the buttons (as on the home shelf, components/home/ShortcutShelf.tsx)
  'music-2', 'music-4', 'guitar', 'sparkles', 'compass', 'book-marked', 'calendar-days', 'graduation-cap', 'gem', 'flame', 'sun',
  'check', 'plus', 'refresh-cw', 'layout-grid',
];

const node = (name) => {
  const src = fs.readFileSync(path.join(ICON_DIR, `${name}.js`), 'utf8');
  const m = /__iconNode = (\[[\s\S]*?\]);\n/.exec(src);
  if (!m) throw new Error(`icon ${name}: no node`);
  return new Function(`return ${m[1]}`)();
};

const n = (v) => Number(v || 0);
const arc = (cx, cy, rx, ry) => `M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 ${-2 * rx},0`;
const toPath = ([tag, a]) => {
  switch (tag) {
    case 'path': return a.d;
    case 'circle': return arc(n(a.cx), n(a.cy), n(a.r), n(a.r));
    case 'ellipse': return arc(n(a.cx), n(a.cy), n(a.rx), n(a.ry));
    case 'line': return `M${a.x1},${a.y1}L${a.x2},${a.y2}`;
    case 'polyline': return `M${a.points.trim().split(/[\s,]+/).reduce((s, v, i) => s + (i && i % 2 === 0 ? 'L' : i ? ',' : '') + v, '')}`;
    case 'polygon': return `${toPath(['polyline', a])}Z`;
    case 'rect': {
      const x = n(a.x), y = n(a.y), w = n(a.width), h = n(a.height), r = Math.min(n(a.rx || a.ry), w / 2, h / 2);
      if (!r) return `M${x},${y}h${w}v${h}h${-w}Z`;
      return `M${x + r},${y}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - 2 * r)}a${r},${r} 0 0 1 ${r},${-r}Z`;
    }
    default: throw new Error(`tag ${tag}`);
  }
};

fs.mkdirSync(OUT, { recursive: true });
for (const name of NAMES) {
  const paths = node(name).map((el) => `    <path android:pathData="${toPath(el)}" android:strokeColor="#FF000000" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round" />`);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- lucide "${name}" (ISC licence), made by scripts/android/icons.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
${paths.join('\n')}
</vector>
`;
  fs.writeFileSync(path.join(OUT, `lc_${name.replace(/-/g, '_')}.xml`), xml);
}
// the long-press menu's icons (res/xml/shortcuts.xml): the same drawing in wine on a soft round plate
const SHORTCUTS = ['music', 'book-open', 'sprout', 'book-marked'];
for (const name of SHORTCUTS) {
  const paths = node(name).map((el) => `        <path android:pathData="${toPath(el)}" android:strokeColor="#FF7A2028" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round" />`);
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<!-- lucide "${name}" (ISC licence) on a plate, made by scripts/android/icons.mjs -->
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="48dp" android:height="48dp" android:viewportWidth="48" android:viewportHeight="48">
    <path android:pathData="M24,0a24,24 0 1,0 0.01,0Z" android:fillColor="#FFF3E7E4" />
    <group android:translateX="12" android:translateY="12">
${paths.join('\n')}
    </group>
</vector>
`;
  fs.writeFileSync(path.join(OUT, `sc_${name.replace(/-/g, '_')}.xml`), xml);
}
console.log(NAMES.length, 'icons +', SHORTCUTS.length, 'menu icons →', path.relative(ROOT, OUT));
