// Folklore Centre songs, step 1 of 3: the app's songs as JSON for songs.py (node scripts/centre/dump-songs.mjs <out.json>).
// Run it on the data without the Centre's takes (centreSongs.ts emptied) so the matching sees only the older songs.
import { appData } from '../print-games/appData.mjs';
import { writeFileSync } from 'node:fs';
const d = await appData({ 'data/songsData': ['FOLK_SONGS', 'FOLK_REGIONS', 'FOLK_EXTRA_REGIONS', 'FOLK_SUB_AREAS'] });
const out = d.FOLK_SONGS.map(s => ({ id: s.id, title: s.title, region: s.region, area: s.area, municipality: s.municipality, genre: s.genre, versions: s.versions.length, recs: (s.recs ?? []).map(r => [r.id, r.who, r.note ?? '']), centre: (s.centre ?? []).map(c => c.who) }));
writeFileSync(process.argv[2], JSON.stringify({ songs: out, regions: [...d.FOLK_REGIONS, ...d.FOLK_EXTRA_REGIONS].map(r => ({ id: r.id, name: r.nameGe })), areas: d.FOLK_SUB_AREAS }));
console.log(out.length, 'songs');
