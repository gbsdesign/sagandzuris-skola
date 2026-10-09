import { useNavigation } from '../../context';
import { openChurchCalendar } from '../../data/churchCalendar';
import { SearchOpen } from '../../data/searchIndex';
import { requestOpen } from '../../utils/searchOpen';
import { useOpenShortcut } from '../home/ShortcutShelf';

/** Opens what a search row points at — from the search, or from a habit it was tied to. */
export const useOpenSearchTarget = () => {
  const { navigateTo, setSelectedService, setExpandedChantId, setChantSearch } = useNavigation();
  const openShortcut = useOpenShortcut();
  return (o: SearchOpen) => {
    switch (o.kind) {
      case 'shortcut': openShortcut(o.id); return;
      case 'chant':
        // the service's list, narrowed to this chant and unfolded
        navigateTo('galoba');
        setSelectedService(o.service);
        setExpandedChantId(o.chantId);
        setChantSearch(o.title);
        window.scrollTo({ top: 0 });
        return;
      case 'song': requestOpen('simghera', o.id); navigateTo('simghera'); return;
      case 'ancestor': requestOpen('tsinaprebi', String(o.id)); navigateTo('tsinaprebi'); return;
      // the page first (it closes an open book), then the book: already on the shelf, the page takes it at once
      case 'library': navigateTo('biblioteka'); requestOpen('biblioteka', o.tab); return;
      case 'feast': openChurchCalendar(o.iso); return;
    }
  };
};
