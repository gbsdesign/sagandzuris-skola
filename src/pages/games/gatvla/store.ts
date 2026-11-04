import { BUILT_IN_RHYMES, MAX_NAMES, cleanName, type Rhyme } from '../../../utils/gatvla';

// „გათვლა“'s things kept on this phone (`sg-gatvla`, since 2026-10-28): the names of the one-phone circle, the teacher's own
// rhymes (the room's rounds take them too), the rhyme chosen and how often the wheel asked each one.

export interface GatvlaStore { names: string[]; own: Rhyme[]; rhymeId: string; counts: Record<string, number> }

const KEY = 'sg-gatvla';

export const readStore = (): GatvlaStore => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<GatvlaStore> | null;
    const names = (o?.names ?? []).map(n => cleanName(String(n))).filter(Boolean).slice(0, MAX_NAMES);
    const own = (o?.own ?? []).filter(r => r && typeof r.id === 'string' && typeof r.text === 'string').map(r => ({ id: r.id, title: String(r.title || '').slice(0, 40), text: String(r.text).slice(0, 600), own: true }));
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(o?.counts ?? {})) if (typeof v === 'number' && names.includes(k)) counts[k] = v;
    return { names: [...new Set(names)], own, rhymeId: o?.rhymeId || BUILT_IN_RHYMES[0].id, counts };
  } catch { return { names: [], own: [], rhymeId: BUILT_IN_RHYMES[0].id, counts: {} }; }
};
export const writeStore = (s: GatvlaStore) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

/** every rhyme this phone knows: the app's, then the teacher's own */
export const allRhymes = (): Rhyme[] => [...BUILT_IN_RHYMES, ...readStore().own];
