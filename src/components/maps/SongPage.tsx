import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileText, Headphones, Music, TextAlignStart } from 'lucide-react';
import {
  FOLK_SONGS, FolkSong, getFolkRegion, songDocUrl, songRecMedia, songVersionMedia, soundcloudEmbedUrl,
} from '../../data/songsData';
import type { ChantMediaItem } from '../../data/chantMediaRegistry';
import { ChantPlayer } from '../ChantPlayer';
import { triggerHaptic } from '../../utils/haptics';
import { stopPreview } from '../../utils/listPreview';

// One recording of a song: the school's own versions (voices) first, then the archive's performers
export interface SongTake {
  label: string;
  sub?: string;
  media: ChantMediaItem;
}

export const songTakes = (s: FolkSong): SongTake[] => [
  ...s.versions.map(v => ({
    label: v.label,
    sub: v.tracks.v1 || v.tracks.v2 || v.tracks.v3 ? 'ხმებით' : undefined,
    media: songVersionMedia(s, v),
  })),
  ...(s.recs ?? []).map(r => ({ label: r.who, sub: r.note, media: songRecMedia(s, r) })),
];

// A song's page over the whole screen: one recording (player with MP3 download) and the words.
// It is a history entry (sgSong = "songId~take"), so the phone's back gesture closes it.
const SONG_EVENT = 'sg-open-song';
const historySong = (): string | null => {
  try { return (window.history.state || {}).sgSong ?? null; } catch { return null; }
};

export const openSongPage = (songId: string, take: number) =>
  window.dispatchEvent(new CustomEvent(SONG_EVENT, { detail: `${songId}~${take}` }));

// words not written in the song itself come from public/song-texts/<id>.json, fetched when the page opens
interface SongText { text: string; source?: string }
const useSongText = (song?: FolkSong) => {
  const [text, setText] = useState<SongText | null>(null);
  useEffect(() => {
    setText(null);
    if (!song || song.lyrics) return;
    let gone = false;
    fetch(`/song-texts/${song.id}.json`)
      .then(r => (r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null))
      .then(j => { if (!gone && j?.text) setText(j); })
      .catch(() => {});
    return () => { gone = true; };
  }, [song]);
  return song?.lyrics ? { text: song.lyrics } : text;
};

export const SongPage: React.FC = () => {
  const [state, setState] = useState<string | null>(historySong);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // a quick listen started from a list stops when the page opens: its own player takes over
  useEffect(() => { if (state) stopPreview(); }, [state]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (!next) return;
      // switching performers on an open page replaces its entry; opening one adds an entry
      try {
        if (historySong()) window.history.replaceState({ ...(window.history.state || {}), sgSong: next }, '');
        else window.history.pushState({ ...(window.history.state || {}), sgSong: next }, '');
      } catch { /* still opens */ }
      setState(next);
    };
    const onPop = () => setState(historySong());
    window.addEventListener(SONG_EVENT, onOpen);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener(SONG_EVENT, onOpen);
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  const [songId, takeStr] = (state ?? '').split('~');
  const song = state ? FOLK_SONGS.find(s => s.id === songId) : undefined;
  const takes = song ? songTakes(song) : [];
  const takeIdx = Math.min(Math.max(Number(takeStr) || 0, 0), Math.max(takes.length - 1, 0));
  const take = takes[takeIdx];
  const words = useSongText(song);

  useEffect(() => {
    if (!song) { setVisible(false); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { html.style.overflow = prev; };
  }, [song]);

  // a new song starts at its top
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [songId]);

  useEffect(() => {
    if (!song) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!song) return null;
  const region = getFolkRegion(song.region);
  const place = [region.nameGe, song.area, song.municipality].filter(Boolean).join(' · ');

  function close() {
    triggerHaptic(8);
    if (historySong()) window.history.back();
    else setState(null);
  }

  return (
    <div
      ref={scrollRef}
      className={`fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#faf6ef] transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-label={song.title}
    >
      {/* top bar */}
      <div className="sticky top-0 z-10 safe-top bg-[#faf6ef]/95 backdrop-blur border-b border-[#e4d8c4]">
        <div className="safe-x"><div className="max-w-2xl mx-auto h-14 px-3 flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[#574739] hover:bg-[#f1e9dc] active:scale-95 transition cursor-pointer"
            aria-label="უკან"
            title="უკან"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#2a2017]">{song.title}</span>
        </div></div>
      </div>

      <div className="safe-x safe-bottom"><div className="max-w-2xl mx-auto px-4 pt-5 pb-10 flex flex-col gap-5">
        {/* title */}
        <header className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#8c7c6b]">
            <span className="w-3 h-3 rounded-[4px] border border-black/10" style={{ background: region.color }} />
            {place}
          </span>
          <h1 className="text-[26px] sm:text-[30px] font-black leading-tight text-[#2a2017] break-words">{song.title}</h1>
          {song.genre && (
            <span className="self-start mt-0.5 px-2.5 py-1 rounded-full bg-[#fcf1df] border border-[#efd6a6] text-[12px] font-bold text-[#8a4b12]">
              {song.genre}
            </span>
          )}
        </header>

        {/* performers */}
        {takes.length > 1 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-0.5 text-[12px] font-extrabold text-[#8c7c6b]">შესრულებები · {takes.length}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {takes.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { triggerHaptic(10); openSongPage(song.id, i); }}
                  aria-pressed={i === takeIdx}
                  className={`min-h-12 px-2 py-1.5 rounded-[10px] border text-[12px] font-bold leading-tight flex flex-col items-center justify-center gap-px text-center transition-all cursor-pointer active:scale-[0.97] ${
                    i === takeIdx
                      ? 'bg-[#fcf1df] text-[#2a2017] border-[#e8b866] shadow-[0_0_0_3px_rgba(180,98,14,0.12)]'
                      : 'bg-white text-[#2a2017] border-[#e2d3bb] hover:border-[#d9a55a]'
                  }`}
                >
                  <span className="break-words">{t.label}</span>
                  {t.sub && <span className="text-[10px] font-semibold text-[#a0907c]">{t.sub}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* the recording */}
        {take ? (
          <section className="rounded-2xl border border-[#efd6a6] bg-white shadow-[0_12px_26px_-18px_rgba(133,80,44,0.55)] px-2 pb-2.5 pt-2">
            <p className="px-2 pt-1 pb-1.5 flex items-center gap-1.5 text-[13px] font-extrabold text-[#7a2028]">
              <Headphones className="w-4 h-4 shrink-0" />
              <span className="min-w-0 break-words">{take.label}{take.sub ? ` · ${take.sub}` : ''}</span>
            </p>
            <ChantPlayer
              key={`${song.id}-${takeIdx}`}
              media={take.media}
              title={song.title}
              subtitle={`${region.nameGe} · ${take.label}`}
              hideNotesButton
            />
          </section>
        ) : song.soundcloud ? (
          <section className="rounded-2xl border border-[#efd6a6] bg-white overflow-hidden">
            <iframe title={song.title} src={soundcloudEmbedUrl(song.soundcloud)} className="block w-full h-[166px] border-0" allow="autoplay" loading="lazy" />
          </section>
        ) : (
          <section className="flex flex-col items-center text-center gap-1.5 py-6 px-3 rounded-2xl bg-white border border-dashed border-[#d6c8b1]">
            <Music className="w-6 h-6 text-[#cdbfa9]" />
            <p className="text-sm font-bold text-[#574739]">{song.pendingWma ? 'ჩანაწერი მზადდება' : 'ამ სიმღერის ჩანაწერი ჯერ არ არის'}</p>
          </section>
        )}

        {/* words */}
        <section className="rounded-2xl bg-white border border-[#e4d8c4] px-4 pt-3.5 pb-4">
          <h2 className="flex items-center gap-1.5 text-[13px] font-extrabold text-[#7a2028] mb-2">
            <TextAlignStart className="w-4 h-4" /> ტექსტი
          </h2>
          {words ? (
            <>
              <p className="text-[16px] leading-[1.75] text-[#2a2017] whitespace-pre-line">{words.text}</p>
              {words.source && <p className="mt-3 text-[11.5px] text-[#a0907c]">{words.source}</p>}
            </>
          ) : (
            <p className="text-[13px] text-[#a0907c]">ამ სიმღერის ტექსტი ჯერ არ დამატებულა</p>
          )}
        </section>

        {song.docs && song.docs.length > 0 && (
          <section className="flex flex-wrap gap-2">
            {song.docs.map(doc => (
              <a
                key={doc.id}
                href={songDocUrl(doc)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-10 px-3 py-1.5 rounded-xl border border-[#e2d3bb] bg-white hover:border-[#d9a55a] text-xs font-bold text-[#574739] inline-flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-[#b4620e]" />
                {doc.name}
              </a>
            ))}
          </section>
        )}
      </div></div>
    </div>
  );
};
