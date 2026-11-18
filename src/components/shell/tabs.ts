import type { PageType } from '../../context/NavigationContext';

// The new look's bottom menu (redesign stage 2): which of its four places a page belongs to, and the pages that show no
// menu. From the prototypes (design2 boards with the menu): the path holds the class, the psalter, the library, the
// birthdays; the letters hold the private chats; the profile holds the admin panel and the settings; the rest is home's.

export type Tab = 'home' | 'gz' | 'messages' | 'profile';

const PATH_PAGES: PageType[] = ['gz', 'class', 'psalter', 'teacher', 'biblioteka', 'birthdays', 'student'];

export const tabOf = (page: PageType, mapItem: string | null): Tab => {
  // the prayer book is a shelf of the library, but it is opened from home (ლოცვანი)
  if (page === 'biblioteka' && (mapItem ?? '').split(':')[0] === 'prayers') return 'home';
  if (PATH_PAGES.includes(page)) return 'gz';
  if (page === 'messages' || page === 'dm') return 'messages';
  if (page === 'profile' || page === 'admin' || page === 'settings') return 'profile';
  return 'home';
};

/** pages with a field or tools of their own at the bottom, or a whole-screen task: the menu steps aside */
export const NO_NAV: PageType[] = ['dm', 'student', 'settings', 'search'];

/** the menu's own pages: a big name and no „უკან“ (the menu is the way out) */
export const TOP_PAGES: PageType[] = ['gz', 'messages', 'profile'];
