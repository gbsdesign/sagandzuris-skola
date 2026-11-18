// „ხშირად გახსნილი“ of the search page: how many times each row was opened on this device, {key: count}, the 30 most opened.

const OFTEN_KEY = 'sg-search-often';
const KEEP = 30;

const readCounts = (): Record<string, number> => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(OFTEN_KEY) || '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => typeof e[1] === 'number' && e[1] > 0));
  } catch { return {}; }
};

/** the keys, the most opened first */
export const readOften = (): string[] =>
  Object.entries(readCounts()).sort((a, b) => b[1] - a[1]).map(([k]) => k);

/** one more opening of `key`; on a tie the one opened now stays in the 30 */
export const countOpen = (key: string) => {
  const counts = readCounts();
  const mine: [string, number] = [key, (counts[key] || 0) + 1];
  const rest = Object.entries(counts).filter(([k]) => k !== key);
  const kept = [mine, ...rest].sort((a, b) => b[1] - a[1]).slice(0, KEEP);
  try { localStorage.setItem(OFTEN_KEY, JSON.stringify(Object.fromEntries(kept))); } catch { /* storage off */ }
};
