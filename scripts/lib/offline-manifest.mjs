// Offline packs: which files under public/ the app keeps on the device (src/utils/offlineFiles.ts).
// auto-* packs are light and download by themselves; notes-<book> (a chant book's page pictures) and lives only when
// turned on in „ოფლაინ რეჟიმი“. Every file carries its size and a content hash, so a phone fetches only what changed
// after a new version is published. The build writes offline/index.json + offline/<pack>.json into dist; the dev
// server answers the same paths (vite.config.ts).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (root, dir, out = []) => {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(root, rel, out);
    else out.push(rel);
  }
  return out;
};

const packOf = (path, books) => {
  const [top, folder, sub] = path.split('/');
  if (top === 'notes') {
    if (path.endsWith('.json')) return 'auto-notes';
    if (sub === 'i') return 'auto-thumbs';
    return books.has(folder) ? `notes-${folder}` : 'auto-notes';
  }
  if (top === 'hymn') return 'auto-hymn';
  if (top === 'prayers' || top === 'bible') return 'auto-prayers';
  if (top === 'mtkmeli') return 'auto-mtkmeli';
  if (top === 'lives') return 'lives';
  return null;
};

const hash = (data) => createHash('sha1').update(data).digest('hex').slice(0, 10);

/** { index: { packs: [{ id, v, n, b, c? }] }, lists: { [id]: { files: [[path, bytes, hash]] } } } */
export function buildOfflinePacks(publicDir) {
  const notes = join(publicDir, 'notes');
  // a book folder is one with notes JSON; its chants are counted for the list (c)
  const books = new Map();
  if (existsSync(notes)) {
    for (const d of readdirSync(notes, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const n = readdirSync(join(notes, d.name)).filter(f => f.endsWith('.json')).length;
      if (n) books.set(d.name, n);
    }
  }
  const lists = {};
  for (const top of ['notes', 'hymn', 'prayers', 'bible', 'mtkmeli', 'lives']) {
    for (const path of walk(publicDir, top).sort()) {
      const id = packOf(path, books);
      if (!id) continue;
      const data = readFileSync(join(publicDir, path));
      (lists[id] ??= { files: [] }).files.push([path, data.length, hash(data)]);
    }
  }
  const packs = Object.entries(lists).map(([id, { files }]) => ({
    id,
    v: hash(files.map(f => f.join(':')).join('\n')),
    n: files.length,
    b: files.reduce((s, f) => s + f[1], 0),
    ...(id.startsWith('notes-') ? { c: books.get(id.slice(6)) } : {}),
  }));
  return { index: { packs }, lists };
}

/** Vite plugin: emits the lists at build time, serves them in dev. */
export function offlinePacks(publicDir) {
  let built = null;
  const get = () => (built ??= buildOfflinePacks(publicDir));
  return {
    name: 'offline-packs',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = /^\/offline\/([a-z0-9-]+)\.json(\?|$)/.exec(req.url || '');
        if (!m) return next();
        const { index, lists } = get();
        const body = m[1] === 'index' ? index : lists[m[1]];
        if (!body) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(JSON.stringify(body));
      });
    },
    generateBundle() {
      const { index, lists } = get();
      this.emitFile({ type: 'asset', fileName: 'offline/index.json', source: JSON.stringify(index) });
      for (const [id, list] of Object.entries(lists)) {
        this.emitFile({ type: 'asset', fileName: `offline/${id}.json`, source: JSON.stringify(list) });
      }
    },
  };
}
