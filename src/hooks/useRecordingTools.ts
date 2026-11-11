import { useRealAuth } from '../context/AuthContext';
import { useSections } from './useSections';

/** The recordings' ⬇ MP3 and ☁ offline buttons (2026-11-12, the user: an admin hides or shows them for everyone at once —
 *  ⚙ „სკოლა“ → განყოფილებები → „ჩანაწერების ჩამოწერა“ / „ჩანაწერების ოფლაინი“). Teachers and admins always keep them;
 *  an album's own ⬇ right (data/albumAccess.ts) still applies on top. */
export const useRecordingTools = () => {
  const { isTeacher } = useRealAuth();
  const { state } = useSections();
  return {
    download: isTeacher || state.recDownload !== 'hidden',
    offline: isTeacher || state.recOffline !== 'hidden',
  };
};
