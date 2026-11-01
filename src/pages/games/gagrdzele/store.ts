// „გააგრძელე!“'s songs asked lately on this phone, the oldest first (the next games ask others first); the best run alone is
// rounds/soloStore.ts.

const SEEN = 'sg-gagrdzele-seen';
const KEEP = 60;

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };

export const readSeen = (): string[] => {
  const v = load(SEEN);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};
export const rememberAsked = (ids: string[]) => save(SEEN, [...readSeen().filter(x => !ids.includes(x)), ...ids].slice(-KEEP));
