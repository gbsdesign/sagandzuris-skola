import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, ChevronRight, Disc3, Download, Headphones, LoaderCircle, MapPin, Pause, Play, RotateCw } from 'lucide-react';
import { CENTRE_SONG_ALBUMS } from '../../data/centreSongs';
import { FOLK_SONGS, FolkSong, centreRecId, getFolkRegion } from '../../data/songsData';
import { usePlacements } from '../../data/placements';
import { albumRight, useAlbumAccess } from '../../data/albumAccess';
import { AUDIO_PROXY } from '../../data/chantMediaRegistry';
import { useAuth } from '../../context';
import { MoveSheet, MoveTarget } from '../archive/MoveSheet';
import { openSongPage, songTakes } from './SongPage';
import { clock, useAlbumPlayer } from '../../utils/useAlbumPlayer';
import { triggerHaptic } from '../../utils/haptics';

// One song album, as the school's Drive keeps it (data/centreSongs.ts): every recording in the folder's order, one
// sounding at a time. ▶ and ⬇ follow the album's rights (data/albumAccess.ts: staff all; a member what an admin turned
// on — a member without any never gets here, the list under the map leaves the album out). A recording a song holds
// shows that song („გურია · ამირანი ›“, a tap opens it); the owner and the superadmins move a recording to a song
// („გადატანა“) — the album keeps it either way.
// The list is public/centre/<folder id>.json, fetched when the album opens (and kept by the service worker).

/** id, title, note, and — when the site already had this recording from an older folder — that file's id */
type Track = [id: string, title: string, note?: string, same?: string];

const useAlbumTracks = (id: string) => {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setFailed(false);
    fetch(`/centre/${id}.json`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { tracks: Track[] }) => { if (live) setTracks(d.tracks); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [id, attempt]);
  return { tracks, failed, retry: () => setAttempt(a => a + 1) };
};

/** Drive file id → the song (and its take) that holds it, after the moves */
const useWhereIs = () => {
  const placed = usePlacements();
  return useMemo(() => {
    const map = new Map<string, { song: FolkSong; take: number }>();
    for (const song of FOLK_SONGS) {
      if (!song.recs?.length && !song.centre?.length) continue;
      const takes = songTakes(song);
      const at = (id: string) => takes.findIndex(t => t.recId === id);
      for (const r of song.recs ?? []) map.set(r.id, { song, take: at(r.id) });
      for (const c of song.centre ?? []) {
        const key = centreRecId(c);
        if (!key) continue;
        for (const id of [c.mp3, ...(c.voices ?? [])]) if (id) map.set(id, { song, take: at(key) });
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed]);
};

/** Saves one recording as an mp3 (the Worker answers a page's fetch, which carries the site's Origin) */
const saveTrack = async (id: string, title: string) => {
  const res = await fetch(`${AUDIO_PROXY}/${id}`);
  if (!res.ok) throw new Error(String(res.status));
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'ჩანაწერი'}.mp3`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const SongAlbumPage: React.FC<{ albumId: string }> = ({ albumId }) => {
  const album = CENTRE_SONG_ALBUMS.find(a => a[0] === albumId);
  useAlbumAccess(); // an admin's switch applies at once
  const right = albumRight(albumId);
  const { isSuperAdmin } = useAuth();
  // ⬇ per recording: saving / saved / failed
  const [saving, setSaving] = useState<Record<string, 'busy' | 'done' | 'failed'>>({});
  const save = (id: string, title: string) => {
    if (saving[id] === 'busy') return;
    triggerHaptic(10);
    setSaving(s => ({ ...s, [id]: 'busy' }));
    saveTrack(id, title).then(
      () => setSaving(s => ({ ...s, [id]: 'done' })),
      () => setSaving(s => ({ ...s, [id]: 'failed' }))
    );
  };
  const { tracks, failed, retry } = useAlbumTracks(albumId);
  const player = useAlbumPlayer();
  const whereIs = useWhereIs();
  const [moving, setMoving] = useState<MoveTarget | null>(null);

  // an album one may neither hear nor save is not there for them at all
  if (!album || (!right.listen && !right.download)) return null;
  const [, name, count] = album;
  const placeOf = (t: Track) => whereIs.get(t[0]) ?? (t[3] ? whereIs.get(t[3]) : undefined);
  const placedCount = tracks ? tracks.filter(t => placeOf(t)).length : 0;

  return (
    <div className="galoba-font w-full flex flex-col items-center animate-in fade-in duration-200">
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <header className="mx-1 flex items-start gap-3">
          <span className="w-12 h-12 shrink-0 rounded-2xl bg-[#7a2028] text-[#f6e7c8] flex items-center justify-center shadow-[0_6px_16px_-8px_rgba(122,32,40,0.7)]">
            <Disc3 className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex flex-col gap-1">
            <h1 className="font-serif-ge text-[21px] sm:text-2xl font-bold leading-tight text-[#7a2028] text-balance break-words">{name}</h1>
            <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-[#b4620e]">
              <span className="inline-flex items-center gap-1.5"><Headphones className="w-3.5 h-3.5" />{count} ჩანაწერი</span>
              {tracks && placedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[#6f8a4c]"><MapPin className="w-3.5 h-3.5" />{placedCount} სიმღერებშია</span>
              )}
            </p>
          </div>
        </header>

        {failed ? (
          <div className="px-4 py-6 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[#8a7a6a]">ალბომი ვერ ჩაიტვირთა. შეამოწმეთ ინტერნეტი.</p>
            <button
              type="button"
              onClick={() => { triggerHaptic(10); retry(); }}
              className="min-h-11 px-5 rounded-full bg-white ring-1 ring-[#e2d3bb] text-[14px] font-bold text-[#574739] inline-flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <RotateCw className="w-4 h-4" />
              თავიდან ცდა
            </button>
          </div>
        ) : !tracks ? (
          <div className="py-10 flex justify-center text-[#b4620e]"><LoaderCircle className="w-6 h-6 animate-spin" aria-label="იტვირთება" /></div>
        ) : (
          <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.06)] overflow-hidden">
            <ul className="divide-y divide-[#efe5d4]">
              {tracks.map((track, i) => {
                const [id, title, note, same] = track;
                const on = player.cur === id;
                const phase = on ? player.phase : 'paused';
                const where = placeOf(track);
                return (
                  <li key={id} className={`px-3.5 py-3 flex flex-col gap-2 transition-colors ${on ? 'bg-[#fcf6ea]' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {right.listen && (
                      <button
                        type="button"
                        onClick={() => player.toggle(id)}
                        className={`shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#b4620e] ${
                          on ? 'bg-[#dc8a22] text-white shadow-[0_6px_14px_-6px_rgba(180,98,14,0.75)]' : 'bg-[#dc8a22]/[0.1] text-[#b4620e] hover:bg-[#dc8a22]/[0.16]'
                        }`}
                        aria-label={phase === 'playing' ? `პაუზა: ${title}` : `მოსმენა: ${title}`}
                      >
                        {phase === 'loading' ? (
                          <LoaderCircle className="w-5 h-5 animate-spin" />
                        ) : phase === 'playing' ? (
                          <Pause className="w-[18px] h-[18px] fill-current" />
                        ) : (
                          <Play className="w-[18px] h-[18px] fill-current translate-x-[1px]" />
                        )}
                      </button>
                      )}
                                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                        <span className="text-[15.5px] font-bold leading-snug text-[#2a2017] break-words">
                          <span className="mr-1.5 text-[12px] font-semibold tabular-nums text-[#b3a48f]">{i + 1}.</span>
                          {title}
                        </span>
                        {note && <span className="text-[12.5px] leading-snug text-[#8c7c6b] break-words">{note}</span>}
                        {where && (
                          <button
                            type="button"
                            onClick={() => { triggerHaptic(10); player.stop(); openSongPage(where.song.id, Math.max(0, where.take)); }}
                            className="self-start mt-0.5 min-h-8 max-w-full pl-2 pr-1.5 rounded-full bg-[#eef3e6] text-[#4d6b2f] text-[12.5px] font-bold inline-flex items-center gap-1 cursor-pointer hover:bg-[#e3ecd6] active:scale-[0.98]"
                          >
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="min-w-0 truncate">{getFolkRegion(where.song.region).nameGe} · {where.song.title}</span>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                      {right.download && (
                        <button
                          type="button"
                          onClick={() => save(id, title)}
                          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                            saving[id] === 'failed' ? 'text-[#9a3412] bg-[#fdeee8]' : saving[id] === 'done' ? 'text-[#4d6b2f] bg-[#eef3e6]' : 'text-[#b4620e] hover:bg-[#fcf1df]'
                          }`}
                          title={saving[id] === 'failed' ? 'ვერ ჩამოიწერა — სცადე თავიდან' : 'ჩამოწერა (MP3)'}
                          aria-label={`ჩამოწერა: ${title}`}
                        >
                          {saving[id] === 'busy' ? <LoaderCircle className="w-[18px] h-[18px] animate-spin" /> : saving[id] === 'done' ? <Check className="w-[18px] h-[18px]" /> : <Download className="w-[18px] h-[18px]" />}
                        </button>
                      )}
                      {/* a recording the site had before moves from its song's page, not from here */}
                      {isSuperAdmin && !(where && same && !whereIs.has(id)) && (
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic(10);
                            setMoving({
                              id,
                              from: where ? { kind: 'song', region: where.song.region, title: where.song.title } : undefined,
                              title: title.replace(/ · I{1,3} ხმა$/, ''),
                              who: name,
                              centre: { who: name, note, album: albumId },
                            });
                          }}
                          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#b4620e] hover:bg-[#fcf1df] cursor-pointer"
                          title="გადატანა"
                          aria-label={`გადატანა: ${title}`}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {on && (
                      <div className="flex items-center gap-2.5 pl-[58px] max-[359px]:pl-0">
                        <span className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{clock(player.time)}</span>
                        <input
                          type="range"
                          min={0}
                          max={player.dur || 0}
                          step={0.5}
                          value={Math.min(player.time, player.dur || 0)}
                          onChange={e => player.seek(Number(e.target.value))}
                          disabled={!player.dur}
                          className="flex-1 min-w-0 h-8 accent-[#dc8a22] cursor-pointer disabled:opacity-40"
                          aria-label="გადახვევა"
                        />
                        <span className="w-9 text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{player.dur ? clock(player.dur) : '–:––'}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      {moving && <MoveSheet target={moving} onClose={() => setMoving(null)} />}
    </div>
  );
};
