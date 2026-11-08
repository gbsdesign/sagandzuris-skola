// „ნასწავლი“'s chests (2026-11-08, the user: „სკივრებს საფეხურების მაგივრად … ეწეროს წირვა … დიდხანს დაჭერით იხსნებოდეს
// ანიმაციურად … ამოდიოდეს სკივრის თავზე 3 რიგად გელათი კახური გურული … მარგალიტი … შიგნით … ციფრი“; then „ტოპ 3 სკივრი …
// დანარჩენები პატარა ისარზე … სიმღერების, მთქმელის, ვიდეოების სკივრები … მტევანი, გრაგნილი, მედალიონი“, answers „1ბ 2ა“).
// A chest a service of the chant books (წირვა, მწუხრი…) holds the member's learned chants of it as pearls, counted by the
// three schools; one chest holds the songs and instruments (white grape bunches), one the poems (scrolls), one the films
// watched (enamel medallions). The chests no longer give „ჩემი სამოსი“ its parts. Pure, tested in tests/pathChests.test.ts.

export type ChestToken = 'pearl' | 'grape' | 'scroll' | 'medallion';
export type SchoolId = 'gelati' | 'kakheti' | 'guria';

/** The three rows that rise over a chant chest, with the books' school marks they gather (utils chantLookup schoolOf). */
export const SCHOOL_ROWS: { id: SchoolId; label: string; code: string }[] = [
  { id: 'gelati', label: 'გელათური', code: 'გ.ს.' },
  { id: 'kakheti', label: 'კახური', code: 'ქ.კ.' },
  { id: 'guria', label: 'გურული', code: 'შ.ს.' },
];

export const schoolIdOf = (mark: string | null | undefined): SchoolId | null =>
  SCHOOL_ROWS.find(r => r.code === (mark || '').trim().split(/\s+/)[0])?.id ?? null;

export interface Chest {
  id: string;
  label: string;
  token: ChestToken;
  count: number;
  /** a chant chest's pearls by school (the rest of its count belongs to none of the three) */
  schools?: Record<SchoolId, number>;
}

/** One learned item of the path, as the chests need it. */
export interface ChestItem {
  kind: 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi';
  /** a chant's service (its tab), when it is found in the books */
  service?: string | null;
  /** a chant's school mark („გ.ს.“, „ქ.კ. გამშვ“…) */
  school?: string | null;
}

export const OTHER_CHANTS = 'სხვა გალობა';

/** Every chest in its own order: the services as `services` lists them (empty ones too), then any chant found in no
 *  service, the songs, the poems and the films. */
export const pathChests = (items: ChestItem[], services: readonly string[], videos: number): Chest[] => {
  const zero = (): Record<SchoolId, number> => ({ gelati: 0, kakheti: 0, guria: 0 });
  const chant = new Map<string, Chest>(services.map(s => [s, { id: `s:${s}`, label: s, token: 'pearl' as const, count: 0, schools: zero() }]));
  const other: Chest = { id: 'other', label: OTHER_CHANTS, token: 'pearl', count: 0, schools: zero() };
  const songs: Chest = { id: 'songs', label: 'სიმღერები', token: 'grape', count: 0 };
  const poems: Chest = { id: 'poems', label: 'მთქმელი', token: 'scroll', count: 0 };
  const films: Chest = { id: 'videos', label: 'ვიდეოები', token: 'medallion', count: Math.max(0, videos) };
  for (const it of items) {
    if (it.kind === 'galoba') {
      const c = (it.service && chant.get(it.service)) || other;
      c.count++;
      const s = schoolIdOf(it.school);
      if (s) c.schools![s]++;
    } else if (it.kind === 'mtkmeli') poems.count++;
    else songs.count++;
  }
  return [...chant.values(), ...(other.count ? [other] : []), songs, poems, films];
};

/** The chests on top: the `n` fullest (ties keep their order); with nothing collected yet, the first `n`. */
export const topChests = (chests: Chest[], n = 3): Chest[] =>
  chests
    .map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.count - a.c.count || a.i - b.i)
    .slice(0, n)
    .map(x => x.c);
