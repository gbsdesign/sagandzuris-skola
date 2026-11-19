import { useAuth, useNavigation } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { openSignIn } from '../../../components/access/SignInPrompt';
import { openChurchCalendar } from '../../../data/churchCalendar';
import { MORNING_EVENING } from '../../../data/prayers';
import { mkAnswer, type MkTarget } from '../../../data/mkitkhe';
import { askClassTab, type ClassTab } from '../klasi/nav';
import { lightHelp, lightSoon } from './light';

// „გადამიყვანე იქ“ / „მაჩვენე ეკრანზე“: where an answer's button is on the screen now, it is lit; otherwise the answer's page
// opens (the paths of the new look's menu — მთავარი · გზა · წერილები · პროფილი) and the button is lit once it has come.
// `show` (the page's „?“): a button only on the way there is lit in place too; „მკითხე“ goes on past it.

// the notes page's own parts: a chant has to be open for them
const ON_NOTES: MkTarget[] = ['notes', 'notes-more', 'learn', 'church'];

// a window that was just closed (the „?“ sheet, „მკითხე“) leaves the screen a moment later
const SETTLE_MS = 160;

export const useGoTarget = () => {
  const { user } = useAuth();
  const nav = useNavigation();
  const { notes, closeNotes } = useNotes();
  const classes = useAllMyClasses();

  const openMyClass = (tab: ClassTab) => {
    // the class open now stays (a tab of it is asked for); else my one class, or the list of mine
    const here = nav.currentPage === 'class' ? classes.find(c => c.id === nav.selectedClassId) : undefined;
    const cls = here ?? (classes.length === 1 ? classes[0] : undefined);
    if (cls) {
      askClassTab(cls.id, tab);
      if (!here) nav.openClass(cls.id);
    } else if (classes.length > 1) { classes.forEach(c => askClassTab(c.id, tab)); nav.navigateTo('gz'); nav.openMapItem('klasebi'); }
    else nav.navigateTo('class'); // no class yet: the page says how to get one
  };
  const settings = (item?: string) => {
    // the reminders and the notices are a member's; a guest gets the settings' list
    const to = item && (user || item === 'text' || item === 'theme') ? item : null;
    if (nav.currentPage !== 'settings') nav.navigateTo('settings');
    if (to && nav.mapItem !== to) nav.openMapItem(to);
  };
  const gz = (item: string) => {
    if (nav.currentPage !== 'gz') nav.navigateTo('gz');
    if (nav.mapItem !== item) nav.openMapItem(item);
  };

  const route = (t: MkTarget) => {
    switch (t) {
      // without a chant open the notes cannot open: the chants' list, to pick one
      case 'galoba': case 'notes': case 'notes-more': case 'learn': case 'church': nav.navigateTo('galoba'); return;
      case 'studio': case 'class': openMyClass('program'); return;
      case 'class-chat': openMyClass('chat'); return;
      case 'messages': nav.navigateTo('messages'); return;
      case 'sagandzuri': gz('sagandzuri'); return;
      case 'psalter': nav.navigateTo('psalter'); return;
      case 'prayers': nav.navigateTo('biblioteka'); nav.openMapItem('prayers'); return;
      // a prayer open now stays open
      case 'prayer': if (nav.currentPage !== 'prayer') nav.openPrayer(MORNING_EVENING[0].id); return;
      case 'calendar': openChurchCalendar(); return;
      case 'gz': if (nav.currentPage !== 'gz' || nav.mapItem) nav.navigateTo('gz'); return;
      case 'habits': gz('chvevebi'); return;
      case 'samosi': gz('samosi'); return;
      case 'reminders': case 'notify': case 'text': case 'theme': settings(t); return;
      case 'settings': settings(); return;
      case 'profile': if (user) nav.navigateTo('profile'); else openSignIn(); return;
      case 'signin': if (user) settings(); else openSignIn(); return;
    }
  };

  /** Takes the person to an answer's place (or lights it where it already is). */
  return (id: number, opts: { show?: boolean } = {}) => {
    const a = mkAnswer(id);
    if (!a) return;
    window.setTimeout(() => {
      if (lightHelp(id, !!opts.show)) return;
      if (notes) {
        // on the notes the part is folded away now (a sheet, the player): nothing more to do
        if (ON_NOTES.includes(a.target)) return;
        // the notes lie over every page: close them first (their own history step), then go
        closeNotes();
        window.setTimeout(() => { route(a.target); lightSoon(id); }, 350);
        return;
      }
      route(a.target);
      lightSoon(id);
    }, SETTLE_MS);
  };
};
