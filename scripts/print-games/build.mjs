// node scripts/print-games/build.mjs [game-id …] [--previews=<dir>]
// Prints the board games' sheets to public/games/print/<id>.pdf (Chromium through Playwright); with --previews
// every page also becomes a PNG in that folder (pdftoppm). Fonts are fetched once into scripts/print-games/fonts.
import { build } from './lib.mjs';

const args = process.argv.slice(2);
const ids = args.filter(a => !a.startsWith('--'));
const previews = args.find(a => a.startsWith('--previews='))?.slice('--previews='.length) ?? null;
const ALL = ['mepis-kari', 'samshvildis-game', 'okros-khana', 'lurji-supra'];

for (const id of ids.length ? ids : ALL) {
  const game = await import(`./games/${id}.mjs`);
  await build(game, { previews });
}
