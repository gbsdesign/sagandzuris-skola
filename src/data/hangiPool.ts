// The daily game's pool („დღის ჰანგი“, utils/hangi.ts): every recording the app plays — the chant versions bound in code
// (chantMediaRegistry's VARIANT_MEDIA), the other choirs' recordings (chantRecordings) and the folk songs with an mp3.
// The day's pick is one of these; the player names it from the pool's titles. Guests and members without the
// recordings feature get an empty pool (the recordings are hidden from them everywhere).
import { AUDIO_PROXY, codeBoundMedia } from './chantMediaRegistry';
import { CHANT_RECORDINGS } from './chantRecordings';
import { NOTES_LISTS, SCHOOL_NAMES, findVersion, schoolOf } from './chantLookup';
import { FOLK_SONGS, getFolkRegion } from './songsData';
import { recordingsAreHidden } from './runtimeRecordings';

export interface HangiItem {
  id: string;
  title: string;
  /** where it is from: the service and the school, or the region of the song */
  sub: string;
  url: string;
  kind: 'chant' | 'song';
}

const cleanTitle = (t: string) => t.replace(/[;\s]+$/, '').replace(/\s+/g, ' ').trim();

let cache: { hidden: boolean; items: HangiItem[] } | null = null;

const build = (): HangiItem[] => {
  const items: HangiItem[] = [];
  const seen = new Set<string>();
  const add = (it: HangiItem) => {
    if (!it.url || !it.title || seen.has(it.id)) return;
    seen.add(it.id);
    items.push(it);
  };

  // the chants of the services, by id, with the service each is listed in
  const chants = new Map<string, { title: string; service: string }>();
  NOTES_LISTS.forEach(([service, list]) => list.forEach(c => { if (!chants.has(c.id)) chants.set(c.id, { title: cleanTitle(c.title), service }); }));

  codeBoundMedia().forEach(([key, media]) => {
    const [chantId, code] = key.split('|');
    const chant = chants.get(chantId);
    if (!chant) return;
    const url = media.tracks[3] || media.allVoicesUrl || media.tracks[0] || media.tracks[1] || media.tracks[2] || '';
    add({ id: `v:${key}`, title: chant.title, sub: `${chant.service} · ${SCHOOL_NAMES[schoolOf(code)] ?? code}`, url, kind: 'chant' });
  });

  Object.entries(CHANT_RECORDINGS).forEach(([variantId, recs]) => {
    const info = findVersion(variantId);
    if (!info) return;
    recs.forEach(r => add({ id: `r:${r.id}`, title: cleanTitle(info.chant.title), sub: `${info.service} · ${r.who}`, url: `${AUDIO_PROXY}/${r.id}`, kind: 'chant' }));
  });

  FOLK_SONGS.filter(s => !s.ownerOnly).forEach(s => {
    const url = s.versions.map(v => v.tracks.all).find(Boolean) || '';
    add({ id: `s:${s.id}`, title: cleanTitle(s.title), sub: `ხალხური სიმღერა · ${getFolkRegion(s.region)?.nameGe ?? ''}`.replace(/ · $/, ''), url, kind: 'song' });
  });

  return items;
};

/** The pool, built once per recordings state (empty while the recordings are hidden). */
export const hangiPool = (): HangiItem[] => {
  const hidden = recordingsAreHidden();
  if (!cache || cache.hidden !== hidden) cache = { hidden, items: hidden ? [] : build() };
  return cache.items;
};

/** The titles the player may name, each once. */
export const hangiTitles = (pool: HangiItem[]) => [...new Set(pool.map(p => p.title))].sort((a, b) => a.localeCompare(b, 'ka'));
