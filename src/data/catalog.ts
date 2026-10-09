import { SERVICE_LISTS } from './chantLookup';
import {
  AKATHIST_GROUPS, APOSTLE, BibleBook, GOSPELS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, PSALTER_RULE, WEEK_DAYS,
  bibleChapterId, weekPrayerId,
} from './prayers';
import { FOLK_SONGS, getFolkRegion } from './songsData';
import { ANCESTORS } from './ancestorsBios';
import { FEAST_GROUPS } from './library/feasts';
import { loadLivesIndex } from './saintLives';
import { MONTHS_GE } from '../utils/dateNames';
import { ADMIN_TABS, LIBRARY_SHORT, SERVICES, TEACHER_TABS, labelled, shortcutLabel } from '../utils/shortcuts';

// Everything a button can be made of, as a tree to unfold: the prayer book, the chants by service, the library's
// books down to their chapters, the habits, songs by region, the great chanters and the app's own pages. The
// search panel shows it when picking (a habit's buttons, the home page's buttons). A node with an `id` can be
// picked — the id is a home-button id (utils/shortcuts), which also opens it.

export interface CatalogNode {
  key: string;
  title: string;
  sub?: string;
  /** the button id, when this can be picked */
  id?: string;
  /** a button id whose icon the row shows (its own id when not set) */
  icon?: string;
  children?: CatalogNode[];
  /** children that come from a lazy book */
  load?: () => Promise<CatalogNode[]>;
}

export interface CatalogWho {
  signedIn: boolean;
  owner: boolean;
  hasClass: boolean;
  /** the member's habits, in their order */
  habits: { id: string; label: string; own: boolean }[];
  /** roles and the admin's hidden sections */
  allowed: (id: string) => boolean;
}

/** a node for a button id, named as its button is */
const btn = (key: string, id: string, title?: string, sub?: string): CatalogNode => {
  const l = shortcutLabel(id);
  return { key, id, title: title ?? l?.label ?? id, sub: sub ?? l?.sub };
};
const branch = (key: string, title: string, children: CatalogNode[], extra: Partial<CatalogNode> = {}): CatalogNode => ({
  key, title, children, ...extra,
});

/** drops what this member may not use, and groups left empty */
const prune = (nodes: CatalogNode[], ok: (id: string) => boolean): CatalogNode[] =>
  nodes.flatMap(n => {
    if (n.id && !ok(n.id)) return [];
    if (!n.children) return [n];
    const children = prune(n.children, ok);
    return children.length || n.id || n.load ? [{ ...n, children }] : [];
  });

const bibleBooks = (prefix: string, books: BibleBook[], gospel: boolean): CatalogNode[] =>
  books.map(b => branch(`${prefix}:${b.id}`, gospel ? `სახარება — ${b.title}` : b.title,
    Array.from({ length: b.chapters }, (_, i) => btn(`${prefix}:${b.id}:${i + 1}`, `prayer:${bibleChapterId(b.id, i + 1)}`, `თავი ${i + 1}`, '')),
    { sub: `${b.chapters} თავი`, icon: 'section:biblioteka' }));

/** the prayer book; `p` keeps the keys apart where it shows twice (on its own and on the library shelf) */
const prayerBook = (p: string, who: CatalogWho): CatalogNode[] => [
  branch(`${p}:me`, 'დილის და საღამოს ლოცვები', [
    ...MORNING_EVENING.map(x => btn(`${p}:me:${x.id}`, `prayer:${x.id}`)),
    btn(`${p}:me:comm`, 'special:commemoration'),
  ], { icon: 'prayer:dila' }),
  branch(`${p}:hours`, 'შვიდგზის ლოცვა', PRAYER_HOURS.map(h => btn(`${p}:hours:${h.id}`, `prayer:${h.id}`)), { icon: `prayer:${PRAYER_HOURS[0].id}` }),
  branch(`${p}:week`, 'კვირის დღეების ლოცვები',
    WEEK_DAYS.map((day, d) => branch(`${p}:week:${d}`, day, (['dila', 'dzili'] as const).map(part =>
      btn(`${p}:week:${d}:${part}`, `prayer:${weekPrayerId(d, part)}`, part === 'dila' ? 'დილით' : 'დაწოლისას', '')))),
    { icon: `prayer:${weekPrayerId(0, 'dila')}` }),
  branch(`${p}:psalms`, 'ფსალმუნები', [
    ...(who.signedIn ? [btn(`${p}:psalms:mine`, 'special:kathisma')] : []),
    btn(`${p}:psalms:group`, 'section:medavitneoba', 'ფსალმუნთა ჯგუფი'),
    btn(`${p}:psalms:rule`, `prayer:${PSALTER_RULE.id}`),
    ...KATHISMAS.map(k => btn(`${p}:psalms:${k.id}`, `prayer:${k.id}`)),
  ], { icon: 'section:medavitneoba' }),
  branch(`${p}:gospel`, 'სახარება', bibleBooks(`${p}:gospel`, GOSPELS, true), { icon: 'habit:habit_2' }),
  branch(`${p}:apostle`, 'სამოციქულო', bibleBooks(`${p}:apostle`, APOSTLE, false), { icon: 'habit:habit_3' }),
  branch(`${p}:ak`, 'დაუჯდომლები', AKATHIST_GROUPS.map((g, gi) =>
    branch(`${p}:ak:${gi}`, g.title, g.items.map(a => btn(`${p}:ak:${a.id}`, `prayer:${a.id}`, a.title, '')), { sub: `${g.items.length}` })),
  { icon: 'prayer:akathist', sub: `${AKATHIST_GROUPS.reduce((n, g) => n + g.items.length, 0)}` }),
];

const chants = (): CatalogNode[] =>
  SERVICE_LISTS.filter(([service]) => (SERVICES as readonly string[]).includes(service)).map(([service, list]) =>
    branch(`ch:${service}`, service, list.filter(c => c.variants?.length).map(c => {
      const title = c.title.replace(/[;\s]+$/, '');
      // the versions with sheet music open their notes page straight away
      const noted = c.variants!.filter(v => v.bookNums?.length);
      return {
        ...btn(`ch:${service}:${c.id}`, labelled(`chantof:${service}/${c.id}`, title, service), title, `${c.variants!.length} ვერსია`),
        icon: 'section:galoba',
        ...(noted.length ? { children: noted.map(v => btn(`ch:${service}:${c.id}:${v.id}`, `chant:${v.id}`, v.code || v.label, '')) } : {}),
      };
    }), { id: `service:${service}`, sub: `${list.filter(c => c.variants?.length).length} საგალობელი` }));

// the saints' lives by (church) month and day, as the book lists them
const lives = async (): Promise<CatalogNode[]> => {
  const all = await loadLivesIndex();
  return Array.from({ length: 12 }, (_, i) => i + 1).flatMap(m => {
    const inMonth = all.filter(l => l.m === m && !l.x);
    if (!inMonth.length) return [];
    const days = [...new Set(inMonth.map(l => l.d || 0))].sort((a, b) => a - b);
    const month = MONTHS_GE[m - 1];
    return [{
      ...btn(`lv:m${m}`, labelled(`library:lives:m${m}`, month, 'წმიდანთა ცხოვრება'), month, `${inMonth.length} ცხოვრება`),
      icon: 'library:lives',
      children: days.map(d => branch(`lv:m${m}:${d}`, d ? `${d} ${month}` : month,
        inMonth.filter(l => (l.d || 0) === d).map(l => btn(`lv:${l.id}`, labelled(`life:${l.id}`, l.t, d ? `${d} ${month}` : month), l.t, '')))),
    }];
  });
};

const bookChapters = (key: string, tab: string, title: string, load: () => Promise<{ chapters: { n: number; title: string }[] }>) => async () => {
  const book = await load();
  return book.chapters.map(c => {
    const name = c.title ? `${c.n}. ${c.title}` : `თავი ${c.n}`;
    return btn(`${key}:${c.n}`, labelled(`library:${tab}:${c.n}`, name, title), name, '');
  });
};

const library = (who: CatalogWho): CatalogNode[] => [
  btn('lib:all', 'section:biblioteka', 'ბიბლიოთეკა — თარო'),
  btn('lib:cal', 'special:calendar', 'საეკლესიო კალენდარი'),
  {
    ...btn('lib:book', 'library:book', undefined, 'ძველი აღთქმა'),
    load: bookChapters('lib:book', 'book', LIBRARY_SHORT.book, () => import('./library/dzveliAgtqma.json').then(m => m.default as unknown as { chapters: { n: number; title: string }[] })),
  },
  { ...btn('lib:lives', 'library:lives', undefined, 'თვეებისა და დღეების მიხედვით'), load: lives },
  {
    ...btn('lib:feasts', 'library:feasts', undefined, ''),
    children: FEAST_GROUPS.map((g, gi) => branch(`lib:feasts:${gi}`, g.title,
      g.feasts.map((f, fi) => btn(`lib:feasts:${gi}:${fi}`, labelled(`feast:${gi}:${fi}`, f.name, g.title), f.name, f.rule)), { sub: `${g.feasts.length}` })),
  },
  { ...btn('lib:prayers', 'library:prayers', undefined, ''), children: prayerBook('lib:pr', who) },
  {
    ...btn('lib:sas', 'library:sasuliero', undefined, 'წმიდა მამები'),
    load: async () => {
      const { BOOKS } = await import('../pages/library/SpiritualBooksTab');
      return BOOKS.map(b => ({
        ...btn(`lib:sas:${b.id}`, labelled(`library:sasuliero:${b.id}`, b.title, b.author), b.title, b.author),
        icon: 'library:sasuliero',
        load: bookChapters(`lib:sas:${b.id}`, `sasuliero:${b.id}`, b.title, b.load),
      }));
    },
  },
];

const songs = (who: CatalogWho): CatalogNode[] => {
  const byRegion = new Map<string, typeof FOLK_SONGS>();
  for (const s of FOLK_SONGS) {
    if (s.ownerOnly && !who.owner) continue;
    const name = getFolkRegion(s.region).nameGe;
    byRegion.set(name, [...(byRegion.get(name) || []), s]);
  }
  return [...byRegion].map(([region, list]) => branch(`sg:${region}`, region,
    list.map(s => btn(`sg:${s.id}`, labelled(`song:${s.id}`, s.title, s.area || s.municipality || region), s.title, s.area || s.municipality)),
    { sub: `${list.length}`, icon: 'section:simghera' }));
};

export const buildCatalog = (who: CatalogWho): CatalogNode[] => prune([
  branch('prayers', 'ლოცვანი', prayerBook('pr', who), { icon: 'library:prayers', sub: 'ლოცვები, ფსალმუნი, სახარება' }),
  branch('galoba', 'გალობა', [
    btn('gal:all', 'section:galoba', 'გალობა — ყველა საგალობელი'),
    btn('gal:lit', 'special:liturgy'),
    btn('gal:abit', 'page:abituri'),
    ...chants(),
  ], { icon: 'section:galoba', sub: 'ღვთისმსახურებების მიხედვით' }),
  branch('library', 'ბიბლიოთეკა', library(who), { icon: 'section:biblioteka', sub: 'წიგნები თავებამდე' }),
  branch('habits', 'ჩვევები', [
    btn('hb:all', 'section:chvevebi', 'ჩვევები — ყველა'),
    ...who.habits.map(h => btn(`hb:${h.id}`, h.own ? labelled(`habit:${h.id}`, h.label, 'ჩვევა') : `habit:${h.id}`, h.label, h.own ? 'ჩემი ჩვევა' : undefined)),
  ], { icon: 'section:chvevebi' }),
  branch('songs', 'სიმღერა', [btn('sg:all', 'section:simghera', 'სიმღერა — რუკა'), ...songs(who)], { icon: 'section:simghera', sub: 'კუთხეების მიხედვით' }),
  branch('ancestors', 'გაიცანი წინაპრები', [
    btn('an:all', 'section:tsinaprebi', 'წინაპრები — ყველა'),
    ...ANCESTORS.map(a => btn(`an:${a.id}`, labelled(`ancestor:${a.id}`, a.name, a.years), a.name, a.years)),
  ], { icon: 'section:tsinaprebi' }),
  branch('study', 'სწავლა', [
    btn('st:gza', 'section:gza'),
    ...(who.hasClass ? [btn('st:class', 'special:class')] : []),
    ...(who.signedIn ? [btn('st:msg', 'page:messages')] : []),
    btn('st:mtk', 'section:mtkmeli'),
    btn('st:sak', 'section:sakravebi'),
  ], { icon: 'section:gza' }),
  branch('teacher', 'მასწავლებელი', [btn('t:panel', 'special:teacher'), ...Object.keys(TEACHER_TABS).map(t => btn(`t:${t}`, `teacher:${t}`))],
    { icon: 'special:teacher' }),
  branch('admin', 'ადმინი', Object.keys(ADMIN_TABS).map(t => btn(`a:${t}`, `admin:${t}`)), { icon: 'admin:users' }),
], who.allowed);

/** Prunes a lazy book's children the same way as the rest. */
export const pruneLoaded = (nodes: CatalogNode[], who: Pick<CatalogWho, 'allowed'>) => prune(nodes, who.allowed);
