import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Disc3 } from 'lucide-react';
import { CENTRE_SONG_ALBUMS } from '../../data/centreSongs';
import { CENTRE_MTKMELI_ALBUMS } from '../../data/centreOther';
import { albumShown, useAlbumAccess } from '../../data/albumAccess';
import { useNavigation } from '../../context';
import { matchScore, searchNormalize } from '../../utils/searchMatch';
import { triggerHaptic } from '../../utils/haptics';

// The albums under the songs map (or, with `list`, the მთქმელი map's) — only those the signed-in person may hear or save (data/albumAccess.ts: staff all,
// a member what an admin turned on; with none the block is not there at all): the first ones, then „ყველა ალბომი“. With a
// search in the map's field, only the albums whose name matches. An album opens as the map's item
// `album:<Drive folder id>` (SongAlbumPage), so the top bar's „←“ comes back here.

const FIRST = 8;
const NAMES = new Map([...CENTRE_SONG_ALBUMS, ...CENTRE_MTKMELI_ALBUMS].map(a => [a[0], searchNormalize(a[1])]));
type Album = (typeof CENTRE_SONG_ALBUMS)[number];

/** The albums there for the signed-in person (re-checked when the rights change) */
export const useShownAlbums = (list: Album[] = CENTRE_SONG_ALBUMS) => {
  const v = useAlbumAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => list.filter(a => albumShown(a[0])), [v, list]);
};

const AlbumRow: React.FC<{ album: Album }> = ({ album: [id, name, count] }) => {
  const { openMapItem } = useNavigation();
  return (
    <li>
      <button
        type="button"
        onClick={() => { triggerHaptic(10); openMapItem(`album:${id}`); }}
        className="w-full min-h-[52px] px-3 py-2 flex items-center gap-3 text-left cursor-pointer hover:bg-[#fbf6ec] active:bg-[#f6eedf] transition-colors focus-visible:outline-none focus-visible:bg-[#fbf6ec]"
      >
        <span className="w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center">
          <Disc3 className="w-[18px] h-[18px]" />
        </span>
        <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-[#2a2017] break-words">{name}</span>
        <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#a0907c]">{count}</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#c4b49c]" />
      </button>
    </li>
  );
};

export const CentreAlbums: React.FC<{ query?: string; list?: Album[] }> = ({ query = '', list }) => {
  const [all, setAll] = useState(false);
  const albums = useShownAlbums(list);
  const total = useMemo(() => albums.reduce((n, a) => n + a[2], 0), [albums]);
  const q = searchNormalize(query);
  const found = useMemo(() => {
    if (!q) return null;
    return albums
      .map(a => ({ a, score: matchScore(NAMES.get(a[0]) ?? '', q) }))
      .filter((x): x is { a: Album; score: number } => x.score !== null)
      .sort((x, y) => x.score - y.score)
      .map(x => x.a);
  }, [q, albums]);

  if (albums.length === 0 || (found && found.length === 0)) return null;
  const shown = found ? found.slice(0, 30) : all ? albums : albums.slice(0, FIRST);

  return (
    <section className="w-full mt-2 flex flex-col gap-2" aria-labelledby="centre-albums-title">
      <div className="px-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 id="centre-albums-title" className="text-[17px] font-black leading-tight text-[#2a2017]">
            ალბომები
          </h3>
          {!found && (
            <p className="mt-0.5 text-[12px] font-semibold text-[#b4620e]">
              {albums.length} ალბომი · {total.toLocaleString('ka-GE')} ჩანაწერი
            </p>
          )}
        </div>
        {found && <span className="shrink-0 text-[12px] font-semibold text-[#a0907c] tabular-nums">{found.length}</span>}
      </div>
      <ul className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.06)] overflow-hidden divide-y divide-[#efe5d4]">
        {shown.map(a => <AlbumRow key={a[0]} album={a} />)}
      </ul>
      {!found && albums.length > FIRST && (
        <button
          type="button"
          onClick={() => { triggerHaptic(10); setAll(v => !v); }}
          aria-expanded={all}
          className="self-center min-h-11 px-5 rounded-full bg-white ring-1 ring-[#e2d3bb] text-[14px] font-bold text-[#574739] inline-flex items-center gap-2 cursor-pointer hover:bg-[#fbf6ec] active:scale-[0.98]"
        >
          {all ? 'ნაკლები' : `ყველა ალბომი (${albums.length})`}
          <ChevronDown className={`w-4 h-4 transition-transform ${all ? 'rotate-180' : ''}`} />
        </button>
      )}
      {found && found.length > shown.length && (
        <p className="px-1 text-center text-[12px] font-semibold text-[#a0907c]">ნაჩვენებია {shown.length} / {found.length} — დააზუსტეთ ძებნა</p>
      )}
    </section>
  );
};
