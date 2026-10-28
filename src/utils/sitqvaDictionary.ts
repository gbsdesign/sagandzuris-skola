// The words „დღის სიტყვა“ accepts as a guess: data/sitqvaWords.ts (made by scripts/build-sitqva-words.mjs), loaded only
// when the game opens — it is a chunk of the build, so the PWA keeps it for offline play. null when it could not load.
let cache: Promise<Set<string> | null> | undefined;

export const loadSitqvaWords = (): Promise<Set<string> | null> =>
  (cache ??= import('../data/sitqvaWords').then(m => new Set(m.default.split('\n').filter(Boolean))).catch(() => null));
