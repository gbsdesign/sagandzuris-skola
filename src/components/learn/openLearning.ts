import { useNavigation } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { findVersion } from '../../data/chantLookup';
import { FOLK_SONGS } from '../../data/songsData';
import { parseSongPiece, songPiece } from '../../utils/learn';
import { requestLearn } from '../../utils/learnOpen';
import type { Voice } from '../../utils/pathItems';
import { requestOpen } from '../../utils/searchOpen';
import { triggerHaptic } from '../../utils/haptics';
import { openSongPage, songTakes } from '../maps/SongPage';

/** The piece a chant version or a song is learned as: the version with book notes, or the song's first recording
 *  that plays here (not an outside player). Null when it has no learning mode. */
export const learnPieceOf = (id: string): string | null => {
  const info = findVersion(id);
  if (info) return info.variant.bookNums?.length ? id : null;
  const song = FOLK_SONGS.find(s => s.id === id);
  const take = song ? songTakes(song).findIndex(t => !t.embed) : -1;
  return song && take >= 0 ? songPiece(song.id, take) : null;
};

/** Opens a piece straight in its learning mode (the notes page or the song's page), on the given voice. */
export const useOpenLearning = () => {
  const { navigateTo } = useNavigation();
  const { openNotes } = useNotes();
  return (piece: string, voice?: Voice) => {
    triggerHaptic(10);
    requestLearn(piece, voice);
    const song = parseSongPiece(piece);
    if (!song) { openNotes(piece, 'list'); return; }
    // the songs' map, then the song's page over it (the map listens once it is on screen)
    requestOpen('simghera', song.songId);
    navigateTo('simghera');
    window.setTimeout(() => openSongPage(song.songId, song.take), 350);
  };
};
