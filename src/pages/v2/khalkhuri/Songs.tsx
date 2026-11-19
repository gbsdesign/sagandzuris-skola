import React, { useMemo } from 'react';
import { BookmarkCheck, Music } from 'lucide-react';
import { Dot, Note, Row, Rows } from '../../../components/ui2';
import { getFolkRegion, songRecordingCount, type FolkSong } from '../../../data/songsData';
import { openSongPage, songTakes } from '../../../components/maps/SongPage';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useAccess } from '../../../hooks/useAccess';
import { toggleAudioPreview } from '../../../utils/listPreview';
import { matchScore, searchNormalize } from '../../../utils/searchMatch';
import { triggerHaptic } from '../../../utils/haptics';
import { Chev, LockMark, PlayDot, usePaged } from './parts';

// A region's songs and the songs' search in the new look (board x-kutkhe): one row a song — a quick ▶ of its first recording,
// the name, how many recordings it has, ✓ when it is in my list; a tap opens the song's page (x-simghera). A guest sees the
// names and places only: the row asks to sign in.

// songs with a recording come first in a list
const hasRecording = (s: FolkSong) => songRecordingCount(s) > 0 || Boolean(s.soundcloud);
export const byRecordings = (a: FolkSong, b: FolkSong) => Number(hasRecording(b)) - Number(hasRecording(a));

// what the search looks through: title, place, genre and (for members) the performers
const searchText = (s: FolkSong, withPerformers: boolean) => searchNormalize([
  s.title, getFolkRegion(s.region).nameGe, s.area, s.municipality, s.genre,
  ...(withPerformers ? [...s.versions.map(v => v.label), ...(s.recs ?? []).map(r => r.who), ...(s.centre ?? []).map(r => r.who)] : []),
].filter(Boolean).join(' · '));

/** the songs that fit the words, the title's hits first (null without words) — as the old map's search */
export const useSongSearch = (songs: FolkSong[], query: string, withPerformers: boolean) => {
  const texts = useMemo(() => songs.map(s => searchText(s, withPerformers)), [songs, withPerformers]);
  return useMemo(() => {
    const q = searchNormalize(query);
    if (!q) return null;
    return songs
      .map((s, i) => {
        const t = matchScore(searchNormalize(s.title), q);
        const any = matchScore(texts[i], q);
        return { s, score: t !== null ? t : any !== null ? any + 10 : null };
      })
      .filter((x): x is { s: FolkSong; score: number } => x.score !== null)
      .sort((a, b) => a.score - b.score || byRecordings(a.s, b.s) || a.s.title.localeCompare(b.s.title, 'ka'))
      .map(x => x.s);
  }, [songs, texts, query]);
};

const countLine = (s: FolkSong) => {
  const n = songRecordingCount(s);
  return n > 0 ? `${n} ჩანაწერი` : s.soundcloud ? 'SoundCloud' : s.pendingWma ? 'ჩანაწერი მზადდება' : 'ჩანაწერი ჯერ არ არის';
};

const SongRow: React.FC<{ song: FolkSong; showRegion?: boolean; guest: boolean; selected: boolean }> = ({ song, showRegion, guest, selected }) => {
  const place = [showRegion && getFolkRegion(song.region).nameGe, song.area, song.municipality].filter(Boolean).join(' · ');
  // the first recording's address, for the quick ▶ (members only)
  const url = useMemo(() => {
    if (guest) return undefined;
    const t = songTakes(song).find(x => !x.embed && x.media.tracks.some(Boolean));
    return t ? t.media.tracks[3] || t.media.tracks.find(Boolean) : undefined;
  }, [song, guest]);
  const first = guest ? undefined : songTakes(song)[0];
  const open = () => {
    triggerHaptic(10);
    if (guest) askSignIn(`სიმღერა „${song.title}“`);
    else openSongPage(song.id, 0);
  };
  const row = (lead?: React.ReactNode) => (
    <Row
      lead={lead}
      title={song.title}
      sub={guest ? [place, song.genre].filter(Boolean).join(' · ') || undefined : [countLine(song), place].filter(Boolean).join(' · ')}
      onClick={open}
      className="min-w-0 flex-1"
      right={guest ? <LockMark /> : selected ? <><BookmarkCheck aria-label="ჩემს სიაშია" className="size-[18px] shrink-0 text-leaf" strokeWidth={2} /><Chev /></> : undefined}
    />
  );
  // the quick ▶ is a button of its own beside the row's (a button may not hold another)
  if (!url) return row(<Dot icon={<Music />} color={guest ? 'soft' : 'tint'} />);
  return (
    <div className="flex items-center">
      <span className="flex shrink-0 pl-4">
        <PlayDot id={`${song.id}~0`} label={song.title} onToggle={() => toggleAudioPreview(`${song.id}~0`, url, { title: song.title, artist: first?.label })} />
      </span>
      {row()}
    </div>
  );
};

/** the songs in rows of one card, 60 at a time */
export const SongRows: React.FC<{ songs: FolkSong[]; showRegion?: boolean; selected: Record<string, unknown>; empty: string }> = ({
  songs, showRegion, selected, empty,
}) => {
  const guest = !useAccess().member;
  const { shown, more } = usePaged(songs, 60);
  if (!songs.length) return <Note className="py-8 text-center">{empty}</Note>;
  return (
    <>
      <Rows>
        {shown.map(s => <SongRow key={s.id} song={s} showRegion={showRegion} guest={guest} selected={!!selected[s.id]} />)}
      </Rows>
      {more}
    </>
  );
};
