// The app's own modules for the scripts/ tools: esbuild bundles the TypeScript data modules (they import each other without
// extensions, so plain `node` cannot load them) — and the print kits of src/print/ — into one ES module held in memory. Their
// import chain reaches the recordings store (firebase, React), which only the site needs: those imports become an inert stub,
// and so does a file asked for by its address (`…?url`, abcjs for the print frame).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const STUB = `const f = new Proxy(function () {}, { get: (_, k) => (typeof k === 'symbol' || k === 'then' || k === '__esModule' ? undefined : f), apply: () => f, construct: () => f });
module.exports = f;`;

/** `{ 'data/amikhseniWords': ['WORD_CATEGORIES'], 'print/melodies.js': ['CHANTS'], … }` (paths under src/) → one object with
 * those exports. A kit that reads book notes needs `globalThis.__sgLoadScore(book, num)` set first (src/print/music.js). */
export const appData = async (wanted) => {
  const contents = Object.entries(wanted).map(([file, names]) =>
    `export { ${names.join(', ')} } from ${JSON.stringify(path.join(ROOT, 'src', file))};`).join('\n');
  const out = await build({
    stdin: { contents, resolveDir: path.join(ROOT, 'src'), loader: 'ts', sourcefile: 'app-data.ts' },
    bundle: true, write: false, format: 'esm', platform: 'node', target: 'node20', logLevel: 'error',
    define: { 'import.meta.env': '{}' },
    plugins: [{
      name: 'site-only',
      setup(b) {
        b.onResolve({ filter: /\?url$/ }, a => ({ path: a.path, namespace: 'url' }));
        b.onLoad({ filter: /.*/, namespace: 'url' }, () => ({ contents: 'export default ""', loader: 'js' }));
        b.onResolve({ filter: /^(react|react-dom|firebase)(\/.*)?$|\/firebase$/ }, a => ({ path: a.path, namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: STUB, loader: 'js' }));
      },
    }],
  });
  return import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
};
