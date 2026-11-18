import type { PageType, ServiceType } from '../context/NavigationContext';

// Every page's own address (redesign stage 2, „ბმული ყველა გვერდს“): /p/<page>[/<what>] — the service of the chant lists, a
// class, a prayer, a chat, or the item open on a map / in a book. Copied from the address bar or shared, it opens the same
// place; the router still decides whether the person may see it. The site answers every /p/… with the app (Cloudflare Pages
// serves index.html where no file is, and the service worker gives pages from the site). Kept apart from /?c=&v= (notes),
// /?p= (the program) and /?open= (links from notices), which keep working on top of any page address.

export interface PageSnap { page: PageType; service: ServiceType; classId: string | null; prayerId: string | null; mapItem?: string | null; dmId?: string | null }

const SERVICES: [Exclude<ServiceType, null>, string][] = [
  ['წირვა', 'tsirva'], ['მწუხრი', 'mtsukhri'], ['ცისკარი', 'tsiskari'], ['სადღესასწაულო', 'dghesastsaulo'], ['მარხვანი', 'markhvani'],
  ['ზატიკი', 'zatiki'], ['პანაშვიდი', 'panashvidi'], ['ჯვრისწერა', 'jvristsera'], ['ხელდასხმა', 'kheldaskhma'], ['პარაკლისი', 'paraklisi'],
  ['მომიხსენენი', 'momikhsenen'], ['ძლისპირები', 'dzlispirebi'], ['კატაბასიები', 'katabasiebi'], ['დასადებლები', 'dasadeblebi'],
];

/** pages a link may open (a student's page and the old ones are left out) */
const LINKABLE: PageType[] = [
  'profile', 'galoba', 'simghera', 'mtkmeli', 'sakravebi', 'gz', 'tsinaprebi', 'admin', 'class', 'prayer', 'commemoration',
  'biblioteka', 'psalter', 'messages', 'dm', 'abituri', 'birthdays', 'medavitneoba', 'games', 'videos', 'churches', 'notices',
  'search', 'settings', 'calendar',
];

const enc = (s: string) => encodeURIComponent(s);

export const addressOf = (s: PageSnap): string => {
  if (s.page === 'home' || !LINKABLE.includes(s.page)) return '/';
  const what = s.page === 'galoba' ? SERVICES.find(x => x[0] === s.service)?.[1]
    : s.page === 'class' ? s.classId
    : s.page === 'prayer' ? s.prayerId
    : s.page === 'dm' ? s.dmId
    : s.mapItem;
  return `/p/${s.page}${what ? `/${enc(what)}` : ''}`;
};

/** the page an address names, or null (the home page, or not a page address) */
export const snapOfAddress = (pathname: string): PageSnap | null => {
  const m = /^\/p\/([a-z]+)(?:\/([^/]+))?\/?$/.exec(pathname);
  if (!m) return null;
  const page = m[1] as PageType;
  if (!LINKABLE.includes(page)) return null;
  let what: string | null = null;
  try { what = m[2] ? decodeURIComponent(m[2]) : null; } catch { what = null; }
  return {
    page,
    service: page === 'galoba' ? SERVICES.find(x => x[1] === what)?.[0] ?? null : null,
    classId: page === 'class' ? what : null,
    prayerId: page === 'prayer' ? what : null,
    dmId: page === 'dm' ? what : null,
    mapItem: page === 'galoba' || page === 'class' || page === 'prayer' || page === 'dm' ? null : what,
  };
};
