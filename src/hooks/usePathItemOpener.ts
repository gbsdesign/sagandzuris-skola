import { useNavigation } from '../context';
import { useNotes } from '../context/NotesContext';
import { canOpenNotes, findVersion } from '../data/chantLookup';
import { FOLK_SONGS } from '../data/songsData';
import { categoryOf } from '../utils/pathItems';
import { requestOpen } from '../utils/searchOpen';
import { triggerHaptic } from '../utils/haptics';

/** What tapping an item's name does: a chant opens its notes, a song its place on the map; null when neither can.
 *  Used by the path (PathOrbs), the class program (ClassProgram), its lessons and the assignments' cards (2026-11-04:
 *  moved here from PathOrbs, so the assignments — which PathOrbs shows — can use it without a circle of imports). */
export const usePathItemOpener = () => {
  const { openNotes } = useNotes();
  const { navigateTo } = useNavigation();
  return (id: string): (() => void) | null => {
    const kind = categoryOf(id);
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
