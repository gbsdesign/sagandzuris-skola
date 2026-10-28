import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, FileText, GraduationCap, Headphones, Music } from 'lucide-react';
import {
  FOLK_SONGS, FolkSong, centreRecMedia, getFolkRegion, songDocUrl, songRecMedia, songVersionMedia, soundcloudEmbedUrl,
} from '../../data/songsData';
import { audiomackEmbedUrl } from '../../data/folkCentre';
import { useCanDownloadCentre } from '../../hooks/useCentreDownload';
import type { ChantMediaItem } from '../../data/chantMediaRegistry';
import { ChantPlayer } from '../ChantPlayer';
import { triggerHaptic } from '../../utils/haptics';
import { stopPreview } from '../../utils/listPreview';
import { useAuth } from '../../context';
import { usePlacements } from '../../data/placements';
import { MoveSheet } from '../archive/MoveSheet';
import { SongWords } from './SongWords';
import { LearnAudio } from '../learn/LearnAudio';
import { songPiece } from '../../utils/learn';
import { takeLearn } from '../../utils/learnOpen';
import type { Voice } from '../../utils/pathItems';
import { BackBtn, Tabs, useScrolledAway } from '../ui/kit';

// One recording of a song: the school's own versions (voices) first, then the archive's performers
export interface SongTake {
  label: string;
  sub?: string;
  media: ChantMediaItem;
  recId?: string; // an archive recording: it can be moved („გადატანა“)
  embed?: string; // a Folklore Centre recording not yet in the Drive: Audiomack's own player
  centre?: boolean; // the Folklore Centre's: saving it (MP3 / offline) only for members an admin allowed
}

export const songTakes = (s: FolkSong): SongTake[] => [
  ...s.versions.map(v => ({
    label: v.label,
    sub: v.tracks.v1 || v.tracks.v2 || v.tracks.v3 ? 'ხმებით' : undefined,
    media: songVersionMedia(s, v),
  })),
  ...(s.recs ?? []).map(r => ({ label: r.who, sub: r.note, media: songRecMedia(s, r), recId: r.id })),
  ...(s.centre ?? []).map(r => ({
    label: r.who, sub: r.note, media: centreRecMedia(s, r), centre: true, embed: r.mp3 ? undefined : audiomackEmbedUrl(r.page),
  })),
];

/** One take's player: the school's player, or Audiomack's for a Centre recording the Drive does not have yet. */
export const TakePlayer: React.FC<{ take: SongTake; title: string; subtitle: string; hideNotesButton?: boolean; pauseToken?: number }> = ({ take, title, subtitle, hideNotesButton, pauseToken }) => {
  const canSave = useCanDownloadCentre();
  if (take.embed) {
    return <iframe title={`${title} · ${take.label}`} src={take.embed} className="block w-full h-[280px] border-0 rounded-xl" allow="autoplay" loading="lazy" />;
  }
  return <ChantPlayer media={take.media} title={title} subtitle={subtitle} hideNotesButton={hideNotesButton} noDownload={take.centre && !canSave} pauseToken={pauseToken} />;
};

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
  // the owner and the superadmins move a recording to another region, song or to the chants
  const { isSuperAdmin } = useAuth();
  const [moving, setMoving] = useState(false);
  const [learning, setLearning] = useState(false);
  usePlacements();
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
  // the bar names the song only once its big title has scrolled under it
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleAway = useScrolledAway(titleRef, scrollRef, songId);
  const words = useSongText(song);
  // the home page's review line opens a song straight in its learning mode
  const [learnVoice, setLearnVoice] = useState<Voice | undefined>();
  useEffect(() => {
    const asked = song && take && !take.embed ? takeLearn(songPiece(song.id, takeIdx)) : null;
    if (asked) { setLearnVoice(asked.voice); setLearning(true); }
  }, [song, take, takeIdx]);

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !moving) close(); };
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
          <BackBtn onClick={close} />
          <span
            aria-hidden
            className={`min-w-0 flex-1 truncate text-[15px] font-bold text-[#2a2017] transition-opacity duration-200 ${titleAway ? 'opacity-100' : 'opacity-0'}`}
          >
            {song.title}
          </span>
        </div></div>
      </div>

      <div className="safe-x safe-bottom"><div className="max-w-2xl mx-auto px-4 pt-5 pb-10 flex flex-col gap-5">
        {/* title */}
        <header className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#8c7c6b]">
            <span className="w-3 h-3 rounded-[4px] border border-black/10" style={{ background: region.color }} />
            {place}
          </span>
          <h1 ref={titleRef} className="text-[26px] sm:text-[30px] font-black leading-tight text-[#2a2017] break-words">{song.title}</h1>
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
            <Tabs
              cols="wide"
              items={takes.map((t, i) => ({ id: String(i), label: t.label, under: t.sub }))}
              value={String(takeIdx)}
              onChange={id => openSongPage(song.id, Number(id))}
            />
          </section>
        )}

        {/* the recording */}
        {take ? (
          <section className="rounded-2xl border border-[#efd6a6] bg-white shadow-[0_12px_26px_-18px_rgba(133,80,44,0.55)] px-2 pb-2.5 pt-2">
            <p className="px-2 pt-1 pb-1.5 flex items-center gap-1.5 text-[13px] font-extrabold text-[#7a2028]">
              <Headphones className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-0 break-words">{take.label}{take.sub ? ` · ${take.sub}` : ''}</span>
              {isSuperAdmin && take.recId && (
                <button
                  type="button"
                  onClick={() => { triggerHaptic(10); setMoving(true); }}
                  className="shrink-0 min-h-9 px-3 rounded-full border border-[#e2d3bb] bg-white text-[12px] font-bold text-[#574739] inline-flex items-center gap-1.5 hover:border-[#d9a55a] cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#b4620e]" />
                  გადატანა
                </button>
              )}
            </p>
            {!take.embed && take.media.tracks.some(Boolean) && (
              <button
                type="button"
                onClick={() => { triggerHaptic(10); setLearning(true); }}
                className="mx-1 mb-2 w-[calc(100%-8px)] min-h-12 px-4 rounded-xl bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.12] text-[#7a2028] inline-flex items-center gap-2.5 text-left cursor-pointer transition active:scale-[0.99]"
              >
                <GraduationCap className="w-5 h-5 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-bold leading-tight">სასწავლო რეჟიმი</span>
                  <span className="block text-[12px] text-[#8c6a5a] leading-tight">ნაწილ-ნაწილ: მოსმენა წრეზე, ნელა, შენი სიმღერა</span>
                </span>
              </button>
            )}
            <TakePlayer
              key={`${song.id}-${takeIdx}`}
              take={take}
              title={song.title}
              subtitle={`${region.nameGe} · ${take.label}`}
              hideNotesButton
              pauseToken={learning ? 1 : 0}
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

        <SongWords songId={song.id} words={words} />

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
      {learning && take && !take.embed && (
        <LearnAudio
          piece={songPiece(song.id, takeIdx)}
          media={take.media}
          title={song.title}
          subtitle={take.label}
          words={words?.text}
          voice={learnVoice}
          onClose={() => { setLearning(false); setLearnVoice(undefined); }}
        />
      )}
      {moving && take?.recId && (
        <MoveSheet
          target={{
            id: take.recId,
            from: { kind: 'song', region: song.region, title: song.title },
            who: take.label,
            songRecIds: (song.recs ?? []).map(r => r.id),
          }}
          onClose={() => {
            setMoving(false);
            // the song's last recording went elsewhere: the page has nothing left to show
            if (!FOLK_SONGS.some(s => s.id === song.id)) close();
          }}
        />
      )}
    </div>
  );
};
