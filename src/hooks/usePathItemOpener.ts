import { useNavigation } from '../context';
import { useNotes } from '../context/NotesContext';
import { canOpenNotes, findVersion } from '../data/chantLookup';
import { FOLK_SONGS } from '../data/songsData';
import { categoryOf } from '../utils/pathItems';
import { requestOpen } from '../utils/searchOpen';
import { triggerHaptic } from '../utils/haptics';
import { openSaintLife } from '../data/saintLives';
import { openFilm } from '../components/attach/openFilm';

/** What tapping an item's name does: a chant opens its notes, a song its place on the map; null when neither can.
 *  Used by the path (PathOrbs), the class program (ClassProgram), its lessons and the assignments' cards (2026-11-04:
 *  moved here from PathOrbs, so the assignments — which PathOrbs shows — can use it without a circle of imports). */
export const usePathItemOpener = () => {
  const { openNotes } = useNotes();
  const { navigateTo } = useNavigation();
  return (id: string, title?: string): (() => void) | null => {
    const kind = categoryOf(id);
    // pinned from the other sections (2026-11-23): a film plays in its window, a book opens in the library, a life over the
    // page, an admission piece on its list
    if (kind === 'video') return () => { triggerHaptic(10); openFilm(id.slice(2), title ?? 'ვიდეო'); };
    if (kind === 'wigni') {
      const at = id.slice(2);
      if (at.startsWith('life:')) return () => { triggerHaptic(10); openSaintLife(at.slice(5)); };
      return () => { triggerHaptic(10); requestOpen('biblioteka', at); navigateTo('biblioteka'); };
    }
    if (kind === 'abituri') return () => { triggerHaptic(10); navigateTo('abituri'); };
    if (kind === 'galoba') {
      const v = findVersion(id);
      return v && canOpenNotes(v.chant, v.variant) ? () => { triggerHaptic(10); openNotes(id, 'bookmark'); } : null;
    }
    if (kind === 'simghera' && FOLK_SONGS.some(x => x.id === id)) {
      return () => { triggerHaptic(10); requestOpen('simghera', id); navigateTo('simghera'); };
    }
    return null;
  };
};
