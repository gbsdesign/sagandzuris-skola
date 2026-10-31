import { AUDIO_PROXY } from './chantMediaRegistry';
import { FOLK_SONGS, type MapRegionId } from './songsData';
import { recordingsAreHidden } from './runtimeRecordings';
import { KUTKHE_REGIONS, type KutkheSong, type KutkheTake } from '../utils/kutkhe';

// „საიდანაა სიმღერა?“'s recordings (utils/kutkhe.ts): every folk song of the map's regions with a whole take — the
// archive's ensembles and singers, the Folklore Centre's mp3s, a song's own full version (not its voices or phrases). The
// albums opened per member (data/albumAccess.ts) stay out: the whole class hears a round. Empty while the recordings are
// hidden (guests, members without the recordings feature).

// a song's own versions that are a part, not the song (a phrase, one voice, the opening)
const PART = /ფრაზა|ნაწილი|შესავალი|ხმა|სოლო|ტონი/;
// a version named only „whole“ / „choir“ (maybe with its year) says nothing of who sings
const PLAIN = /^(სრული|გუნდი)(\s|\(|$)/;
const url = (id: string) => `${AUDIO_PROXY}/${id}`;

const build = (): KutkheSong[] => FOLK_SONGS.flatMap(s => {
  const region = KUTKHE_REGIONS.indexOf(s.region as MapRegionId);
  if (s.ownerOnly || region < 0) return [];
  const takes: KutkheTake[] = [];
  for (const v of s.versions) {
    const label = v.label.trim();
    if (v.tracks.all && !PART.test(label)) takes.push({ id: v.tracks.all, url: url(v.tracks.all), ...(PLAIN.test(label) ? {} : { who: label }) });
  }
  for (const r of s.recs ?? []) takes.push({ id: r.id, url: url(r.id), who: r.who });
  for (const c of s.centre ?? []) if (c.mp3) takes.push({ id: c.mp3, url: url(c.mp3), who: c.who });
  const unique = [...new Map(takes.map(t => [t.id, t])).values()];
  if (!unique.length) return [];
  const place = [s.area, s.municipality].filter(Boolean).join(', ');
  return [{ id: s.id, song: s.title.trim(), region, ...(place ? { place } : {}), takes: unique }];
});

let cache: { hidden: boolean; songs: KutkheSong[] } | null = null;

/** the pool, built once per recordings state */
export const kutkhePool = (): KutkheSong[] => {
  const hidden = recordingsAreHidden();
  if (!cache || cache.hidden !== hidden) cache = { hidden, songs: hidden ? [] : build() };
  return cache.songs;
};
