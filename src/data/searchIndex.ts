// Everything the one search (components/search) can find, in one list: the app's functions, the chants of the
// six services, prayers and the New Testament, the psalter, folk songs, the great chanters and the feasts.
import { SERVICE_LISTS, ServiceName } from './chantLookup';
import {
  AKATHIST_GROUPS, APOSTLE, GOSPELS, KATHISMAS, MORNING_EVENING, PRAYER_HOURS, PSALTER_RULE, WEEK_DAYS,
  bibleChapterId, hourClock, prayerTitle, weekPrayerId,
} from './prayers';
import { FOLK_SONGS, getFolkRegion } from './songsData';
import { ANCESTORS } from './ancestorsBios';
import { FEAST_GROUPS, feastDates } from './library/feasts';
import { daysBetween, fromIso, todayIso, weekdayGe } from './churchCalendar';
import { MONTHS_GE } from '../utils/dateNames';
import { SECTIONS, SectionId } from './sections';
import { SPECIALS, labelled, sectionOfShortcut } from '../utils/shortcuts';
import { kathismaOfPsalm, matchScore, psalmNumber, searchNormalize, splitTrailingNumber } from '../utils/searchMatch';

export type SearchGroupId = 'fn' | 'chant' | 'prayer' | 'psalter' | 'song' | 'ancestor' | 'feast';

export const SEARCH_GROUPS: { id: SearchGroupId; title: string }[] = [
  { id: 'fn', title: 'ფუნქციები' },
  { id: 'chant', title: 'საგალობლები' },
  { id: 'prayer', title: 'ლოცვები' },
  { id: 'psalter', title: 'ფსალმუნი' },
  { id: 'song', title: 'სიმღერები' },
  { id: 'ancestor', title: 'წინაპრები' },
  { id: 'feast', title: 'დღესასწაულები' },
];

export type LibraryTab = 'book' | 'feasts' | 'lives';

/** What a result opens. */
export type SearchOpen =
  | { kind: 'shortcut'; id: string } // a section, prayer or special, as the home buttons open them
  | { kind: 'chant'; service: ServiceName; chantId: string; title: string }
  | { kind: 'song'; id: string }
  | { kind: 'ancestor'; id: number }
  | { kind: 'feast'; iso: string }
  | { kind: 'library'; tab: LibraryTab };

export interface SearchItem {
  key: string; // unique; also what "ბოლოს გახსნილი" remembers
  group: SearchGroupId;
  title: string;
  sub?: string;
  /** a shortcut id whose icon the row shows */
  icon?: string;
  section: SectionId | null; // whose access rules apply
  open: SearchOpen;
  nTitle: string;
  nKeys: string;
}

export interface SearchWho {
  signedIn: boolean;
  owner: boolean; // only the owner sees the owner's private songs
  teacher: boolean;
  hasClass: boolean;
}

const item = (
  key: string, group: SearchGroupId, title: string, open: SearchOpen,
  extra: { sub?: string; keys?: string; icon?: string; section?: SectionId | null } = {}
): SearchItem => ({
  key, group, title, open,
  sub: extra.sub,
  icon: extra.icon,
  section: extra.section ?? null,
  nTitle: searchNormalize(title),
  nKeys: searchNormalize(`${extra.sub || ''} ${extra.keys || ''}`),
});

// the church calendar lives in the footer, open to everyone (the home buttons count it under the library)
const shortcut = (id: string, group: SearchGroupId, title: string, sub?: string, keys?: string) =>
  item(id, group, title, { kind: 'shortcut', id }, { sub, keys, icon: id, section: id === 'special:calendar' ? null : sectionOfShortcut(id) });

// the sections: a line under each name, and the words they are also found by
const SECTION_TEXT: Partial<Record<SectionId, [string, string]>> = {
  galoba: ['საგალობლები ღვთისმსახურებების მიხედვით', 'საგალობელი წირვა მწუხრი ცისკარი ნოტები'],
  simghera: ['ხალხური სიმღერები კუთხეების რუკაზე', 'სიმღერები რუკა'],
  mtkmeli: ['ავტორები და ნაწარმოებები რუკაზე', 'პოეზია ლექსები მწერლები'],
  sakravebi: ['ხალხური საკრავები', 'ინსტრუმენტები ჩონგური ფანდური'],
  medavitneoba: ['ფსალმუნთა ჯგუფი', 'ფსალმუნი კანონი კათისმა ფსალმუნთა კითხვა'],
  chvevebi: ['ლოცვითი ჩვევები', 'ლოცვები დღის წესი'],
  tsinaprebi: ['ცნობილი მგალობლები და ჰიმნოგრაფები', 'წინაპრები ბიოგრაფია'],
  gza: ['ჩემი სამუშაო, ჩვევები და მანერა', 'დამოუკიდებელი სამუშაო გეგმა'],
  biblioteka: ['საღმრთო ისტორია, დღესასწაულები, ცხოვრებები', 'წიგნები'],
};
const SPECIAL_TEXT: Record<string, [string, string]> = {
  liturgy: ['რეგენტის პროგრამა', 'პროგრამა წირვის საგალობლები'],
  commemoration: ['სახელების სიები', 'სახელები ცოცხალთა მიცვალებულთა აღსავლენი'],
  calendar: ['დღის წმიდანები და დღესასწაულები', 'კალენდარი დღეს წმიდანი'],
  kathisma: ['ამ ციკლში ჩემი წასაკითხი', 'ფსალმუნი კათისმა'],
  class: ['კლასის გვერდი', 'კლასი მასწავლებელი'],
  teacher: ['კლასები და მოსწავლეები', 'მასწავლებელი'],
};
const LIBRARY_TABS: { tab: LibraryTab; title: string; sub: string; keys: string }[] = [
  { tab: 'book', title: 'საღმრთო ისტორია', sub: 'ბიბლიოთეკა · სვიმონ მჭედლიძე', keys: 'ძველი აღთქმა ბიბლია' },
  { tab: 'feasts', title: 'დღესასწაულების სია', sub: 'ბიბლიოთეკა · ამ წლის თარიღები', keys: 'დღესასწაული' },
  { tab: 'lives', title: 'წმიდანთა ცხოვრება', sub: 'ბიბლიოთეკა', keys: 'წმიდანები ცხოვრებანი' },
];

const ANCESTOR_GROUP: Record<string, string> = { hymnographers: 'ძველი ჰიმნოგრაფი', keepers: 'გალობის მცველი' };

const inDays = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

export const buildSearchIndex = (who: SearchWho): SearchItem[] => {
  const out: SearchItem[] = [];

  // the app's functions
  for (const s of SECTIONS) {
    if (!s.page) continue;
    const [sub, keys] = SECTION_TEXT[s.id] || ['', ''];
    out.push(shortcut(`section:${s.id}`, 'fn', s.label, sub, keys));
  }
  for (const [id, label] of Object.entries(SPECIALS)) {
    if (id === 'kathisma' && !who.signedIn) continue;
    if (id === 'class' && !who.hasClass) continue;
    if (id === 'teacher' && !who.teacher) continue;
    const [sub, keys] = SPECIAL_TEXT[id] || ['', ''];
    out.push(shortcut(`special:${id}`, 'fn', id === 'calendar' ? 'საეკლესიო კალენდარი' : label, sub, keys));
  }
  for (const t of LIBRARY_TABS)
    out.push(item(`library:${t.tab}`, 'fn', t.title, { kind: 'library', tab: t.tab }, { sub: t.sub, keys: t.keys, icon: 'section:biblioteka', section: 'biblioteka' }));

  // the chants, one row per chant of each service (its versions are picked on the chant page)
  for (const [service, list] of SERVICE_LISTS) {
    for (const chant of list) {
      if (!chant.variants?.length) continue;
      const title = chant.title.replace(/[;\s]+$/, '');
      const names = [...new Set(chant.variants.map(v => v.chantName).filter(n => n && n !== chant.title))].join(' ');
      const n = chant.variants.length;
      out.push(item(`chant:${service}:${chant.id}`, 'chant', title, { kind: 'chant', service, chantId: chant.id, title },
        { sub: `${service} · ${n} ვერსია`, keys: names, section: 'galoba' }));
    }
  }

  // prayers
  for (const p of MORNING_EVENING)
    out.push(shortcut(`prayer:${p.id}`, 'prayer', p.title, 'ლოცვანი', p.id === 'dzili' ? 'საღამოს ლოცვები' : ''));
  for (const h of PRAYER_HOURS)
    out.push(shortcut(`prayer:${h.id}`, 'prayer', `ლოცვა ${h.label}`, `შვიდგზის ლოცვა · ${hourClock(h)}`, 'შვიდგზის'));
  WEEK_DAYS.forEach((day, d) => {
    for (const part of ['dila', 'dzili'] as const)
      out.push(shortcut(`prayer:${weekPrayerId(d, part)}`, 'prayer', prayerTitle(weekPrayerId(d, part)), 'კვირის დღის ლოცვა', day));
  });
  for (const g of AKATHIST_GROUPS)
    for (const a of g.items)
      out.push(shortcut(`prayer:${a.id}`, 'prayer', a.title, `დაუჯდომელი · ${g.title}`, 'აკათისტო'));
  for (const b of GOSPELS)
    out.push(shortcut(`prayer:${bibleChapterId(b.id, 1)}`, 'prayer', `სახარება — ${b.title}`, `${b.chapters} თავი`, 'ახალი აღთქმა'));
  for (const b of APOSTLE)
    out.push(shortcut(`prayer:${bibleChapterId(b.id, 1)}`, 'prayer', b.title, `სამოციქულო · ${b.chapters} თავი`, 'ეპისტოლე ახალი აღთქმა'));

  // the psalter
  out.push(shortcut(`prayer:${PSALTER_RULE.id}`, 'psalter', PSALTER_RULE.title, 'ფსალმუნნი', 'კათისმა'));
  for (const k of KATHISMAS)
    out.push(shortcut(`prayer:${k.id}`, 'psalter', `კანონი ${k.n}`, `ფსალმუნები ${k.psalms}`, `კათისმა ${k.n} ფსალმუნი`));

  // folk songs
  for (const s of FOLK_SONGS) {
    if (s.ownerOnly && !who.owner) continue;
    const region = getFolkRegion(s.region);
    const place = s.area || s.municipality;
    out.push(item(`song:${s.id}`, 'song', s.title, { kind: 'song', id: s.id },
      { sub: place ? `${region.nameGe} · ${place}` : region.nameGe, keys: `${s.municipality || ''} სიმღერა`, section: 'simghera' }));
  }

  // the great chanters
  for (const a of ANCESTORS) {
    const g = ANCESTOR_GROUP[a.group];
    out.push(item(`ancestor:${a.id}`, 'ancestor', a.name, { kind: 'ancestor', id: a.id },
      { sub: a.years ? `${g} · ${a.years}` : g, keys: 'მგალობელი', section: 'tsinaprebi' }));
  }

  // feasts, with their next day (this year or the next)
  const today = todayIso();
  const year = fromIso(today).getFullYear();
  FEAST_GROUPS.forEach((g, gi) => g.feasts.forEach((f, fi) => {
    const next = [...feastDates(f, year), ...feastDates(f, year + 1)].filter(d => d >= today).sort()[0];
    if (!next) return;
    const d = fromIso(next);
    out.push(item(`feast:${gi}:${fi}`, 'feast', f.name, { kind: 'feast', iso: next },
      { sub: `${d.getDate()} ${MONTHS_GE[d.getMonth()]}, ${weekdayGe(next)} · ${inDays(daysBetween(today, next))}`, keys: `${g.title} ${f.rule || ''}` }));
  }));

  return out;
};

export interface SearchHit {
  item: SearchItem;
  score: number;
}

/** Results for a query, by group (the group with the best match first). */
export const runSearch = (index: SearchItem[], query: string): { group: SearchGroupId; hits: SearchHit[] }[] => {
  const q = searchNormalize(query);
  if (!q) return [];
  const byGroup = new Map<SearchGroupId, SearchHit[]>();
  const add = (hit: SearchHit) => {
    const list = byGroup.get(hit.item.group) || [];
    list.push(hit);
    byGroup.set(hit.item.group, list);
  };

  // "ფს 50" or "50": the psalm, in its kathisma. "ფს 50" asks for nothing else; a bare number also finds
  // titles with that number as a word ("კანონი 5", "ლოცვა დილის 6 საათზე"), not every date that contains it
  const psalm = psalmNumber(query);
  if (psalm) {
    const k = kathismaOfPsalm(psalm, KATHISMAS.map(x => x.psalms));
    if (k) add({ score: -1, item: shortcut(`prayer:kathisma-${k}`, 'psalter', `ფსალმუნი ${psalm}`, `კანონი ${k} · ფს. ${KATHISMAS[k - 1].psalms}`) });
  }
  const bareNumber = /^\d+$/.test(q);
  // "მათე 5", "რომაელთა 8": that chapter
  const chapter = splitTrailingNumber(query);
  if (chapter) {
    const words = searchNormalize(chapter.words);
    for (const [b, gospel] of [...GOSPELS.map(b => [b, true] as const), ...APOSTLE.map(b => [b, false] as const)]) {
      if (chapter.n < 1 || chapter.n > b.chapters || matchScore(searchNormalize(b.title), words) === null) continue;
      const id = bibleChapterId(b.id, chapter.n);
      add({ score: -1, item: shortcut(`prayer:${id}`, 'prayer', `${gospel ? 'სახარება — ' : ''}${b.title}, თავი ${chapter.n}`, gospel ? 'სახარება' : 'სამოციქულო') });
    }
  }

  if (!psalm || bareNumber) index.forEach(it => {
    const t = matchScore(it.nTitle, q);
    if (bareNumber) { if (t !== null && t <= 1) add({ item: it, score: t }); return; }
    const k = t === null ? matchScore(it.nKeys, q) : null;
    if (t !== null) add({ item: it, score: t });
    else if (k !== null) add({ item: it, score: 4 + k });
  });

  const order = SEARCH_GROUPS.map(g => g.id);
  return [...byGroup.entries()]
    .map(([group, hits]) => ({ group, hits: hits.map((h, i) => ({ h, i })).sort((a, b) => a.h.score - b.h.score || a.i - b.i).map(x => x.h) }))
    .sort((a, b) => a.hits[0].score - b.hits[0].score || order.indexOf(a.group) - order.indexOf(b.group));
};

/** A search row as a button id (utils/shortcuts) — what picking it for a button keeps. */
export const shortcutOfSearch = (it: SearchItem): string => {
  const o = it.open;
  switch (o.kind) {
    case 'shortcut': return o.id;
    case 'chant': return labelled(`chantof:${o.service}/${o.chantId}`, o.title, o.service);
    case 'song': return labelled(`song:${o.id}`, it.title, it.sub);
    case 'ancestor': return labelled(`ancestor:${o.id}`, it.title, it.sub);
    case 'library': return `library:${o.tab}`;
    // "feast:<group>:<n>" is the row's key; its line (the next date) would go stale
    case 'feast': return labelled(it.key, it.title);
  }
};
