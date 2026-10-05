// Prayer texts from the ლოცვანი at orthodox.ge (https://orthodox.ge/locvani).
// Each text lives in public/prayers/<id>.json as { html } and is fetched only when opened.

export interface PrayerRef {
  id: string;
  title: string;
}

export const MORNING_EVENING: PrayerRef[] = [
  { id: 'dila', title: 'დილის ლოცვები' },
  { id: 'dzili', title: 'ძილად მისვლის ლოცვები' },
];

// index = Date.getDay(): 0 is Sunday
export const WEEK_DAYS = ['კვირიაკე', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];
const WEEK_DAYS_DAT = ['კვირიაკეს', 'ორშაბათს', 'სამშაბათს', 'ოთხშაბათს', 'ხუთშაბათს', 'პარასკევს', 'შაბათს'];

export const weekPrayerId = (day: number, part: 'dila' | 'dzili') => `week-${day}-${part}`;

export interface PrayerHour {
  id: string;
  hour: number; // 0–23; the midnight prayer is 0
  label: string;
}

export const PRAYER_HOURS: PrayerHour[] = [
  { id: 'hour-6', hour: 6, label: 'დილის 6 საათზე' },
  { id: 'hour-9', hour: 9, label: 'დილის 9 საათზე' },
  { id: 'hour-12', hour: 12, label: 'დღის 12 საათზე' },
  { id: 'hour-15', hour: 15, label: 'დღის 3 საათზე' },
  { id: 'hour-18', hour: 18, label: 'საღამოს 6 საათზე' },
  { id: 'hour-21', hour: 21, label: 'საღამოს 9 საათზე' },
  { id: 'hour-24', hour: 0, label: 'ღამის 12 საათზე' },
];

export const hourClock = (h: PrayerHour) => `${String(h.hour).padStart(2, '0')}:00`;

// Akathists ("დაუჯდომლები"). akathist-1…18 come from orthodox.ge, akathist-<slug> from orthodoxy.ge.
export interface AkathistGroup {
  title: string;
  items: PrayerRef[];
}

const ak = (id: string, title: string): PrayerRef => ({ id: id.startsWith('akathist-') ? id : `akathist-${id}`, title });

export const AKATHIST_GROUPS: AkathistGroup[] = [
  {
    title: 'უფლისა',
    items: [
      ak('akathist-1', 'ყოვლადწმიდა სამება'),
      ak('akathist-2', 'უფალი ჩვენი იესუ ტკბილი'),
      ak('qristeshoba', 'ქრისტეს შობა'),
      ak('feristsvalebis', 'უფლის ფერისცვალება'),
      ak('svetitskhoveli', 'სვეტიცხოველი და კვართი საუფლო'),
    ],
  },
  {
    title: 'ღვთისმშობლისა',
    items: [
      ak('akathist-3', 'ყოვლადწმიდა ღვთისმშობელი'),
      ak('akathist-4', 'ივერიის ღვთისმშობელი'),
      ak('iveriis_qartuli', 'ივერიის ხატი, ქართულად წოდებული'),
      ak('didubis', 'დიდუბის ღვთისმშობელი'),
      ak('kazanis', 'ყაზანის ღვთისმშობელი'),
      ak('mstsraflshemsmeneli', '„მსწრაფლშემსმენელი“'),
      ak('moulodneli_sikharuli', '„მოულოდნელი სიხარული“'),
      ak('sami_sikharuli', '„სამი სიხარული“'),
      ak('dashrite_mtsukhareba_chemi', '„დაშრიტე მწუხარება ჩემი“'),
      ak('uchknobi_kvavili', '„დაუჭკნობელი ყვავილი“'),
      ak('me_var_tqventana', '„მე ვარ თქვენთანა“'),
      ak('agmzrdeli', '„აღმზრდელი“'),
      ak('baraqis', 'პურთა სიუხვის მომნიჭებელი ხატი'),
    ],
  },
  {
    title: 'ანგელოზთა და წინასწარმეტყველთა',
    items: [
      ak('akathist-5', 'წმიდა ანგელოზნი'),
      ak('akathist-6', 'მთავარანგელოზი მიქაელი'),
      ak('ioane_natlismtsemeli', 'იოანე ნათლისმცემელი'),
      ak('elia', 'წინასწარმეტყველი ელია'),
    ],
  },
  {
    title: 'ქართველი წმინდანები',
    items: [
      ak('akathist-8', 'მოციქულთასწორი ნინო'),
      ak('akathist-10', 'გაბრიელ აღმსარებელი და სალოსი'),
      ak('akathist-13', 'შიო მღვიმელი'),
      ak('13asureli', 'ცამეტი ასურელი მამა'),
      ak('davit-garejeli', 'დავით გარეჯელი'),
      ak('dodo', 'დოდო გარეჯელი'),
      ak('6000garejeli', 'ექვსი ათასი გარეჯელი ბერი'),
      ak('grigol_khantsteli', 'გრიგოლ ხანძთელი'),
      ak('atonelebi', 'ათონელი ქართველი მამები'),
      ak('giorgi-mtatsmindeli', 'გიორგი მთაწმიდელი'),
      ak('abo', 'აბო ტფილელი'),
      ak('100atasi', 'ასი ათასი ტფილისელი მოწამე'),
      ak('davit_konstantine', 'დავით და კონსტანტინე არგვეთელები'),
      ak('archil', 'მეფე არჩილი'),
      ak('vakhtang', 'ვახტანგ გორგასალი'),
      ak('davit-agmashenebeli', 'დავით აღმაშენებელი'),
      ak('tamari1', 'მეფე თამარი'),
      ak('tamari2', 'მეფე თამარი (მეორე)'),
      ak('shalva', 'შალვა ახალციხელი'),
      ak('bidziba_shalva_elizbari', 'ბიძინა, შალვა და ელიზბარ ქსნის ერისთავები'),
      ak('qetevan1', 'დედოფალი ქეთევანი'),
      ak('qetevan2', 'დედოფალი ქეთევანი (მეორე)'),
      ak('luarsab', 'მეფე ლუარსაბი'),
      ak('iotam', 'იოთამ ზედგენიძე'),
      ak('ilia_martali', 'ილია მართალი'),
      ak('ambrosi', 'ამბროსი აღმსარებელი (ხელაია)'),
      ak('aleqsi_beri', 'ალექსი ბერი (შუშანია)'),
    ],
  },
  {
    title: 'სხვა წმინდანები',
    items: [
      ak('akathist-7', 'ნიკოლოზ საკვირველთმოქმედი'),
      ak('nikoloz2', 'ნიკოლოზ საკვირველთმოქმედი (მეორე)'),
      ak('akathist-9', 'დიდმოწამე გიორგი'),
      ak('giorgi3', 'დიდმოწამე გიორგი (მეორე)'),
      ak('akathist-11', 'პანტელეიმონ მკურნალი'),
      ak('akathist-12', 'დიდმოწამე ბარბარე'),
      ak('barbare2', 'დიდმოწამე ბარბარე (მეორე)'),
      ak('ekaterine', 'დიდმოწამე ეკატერინე'),
      ak('marine', 'დიდმოწამე მარინე'),
      ak('akathist-15', 'სპირიდონ ტრიმიფუნტელი'),
      ak('akathist-16', 'კვიპრიანე და იუსტინა'),
      ak('guri_samon_abibo', 'გური, სამონ და აბიბოსი'),
      ak('7efeseli', 'შვიდი ეფესელი ყრმა'),
      ak('bonifante', 'მოწამე ბონიფანტე'),
      ak('zotike', 'ზოტიკე ობოლთმზრდელი'),
      ak('iobi', 'იობ მრავალვნებული'),
      ak('mariam_egvipteli2', 'მარიამ მეგვიპტელი'),
      ak('serafime', 'სერაფიმე საროველი'),
      ak('sergi_radonejeli', 'სერგი რადონეჟელი'),
      ak('akathist-14', 'ნეტარი მატრონა'),
      ak('qsenia', 'ნეტარი ქსენია პეტერბურგელი'),
    ],
  },
  {
    title: 'სხვადასხვა',
    items: [
      ak('akathist-17', 'მიცვალებულთა სულთა შეწევნისათვის'),
      ak('akathist-18', '„იტირე სულო“ (მარხვაში)'),
      ak('sinanulis', 'სინანულის აკათისტო დედათათვის'),
    ],
  },
];

export const AKATHISTS: PrayerRef[] = AKATHIST_GROUPS.flatMap(g => g.items);

// The Psalter: twenty kathismas ("კანონები") and the rule for reading them.
const KATHISMA_PSALMS = ['1–8', '9–16', '17–23', '24–31', '32–36', '37–45', '46–54', '55–63', '64–69', '70–76', '77–84', '85–90', '91–100', '101–104', '105–108', '109–117', '118', '119–133', '134–142', '143–150'];

export interface Kathisma extends PrayerRef {
  n: number;
  psalms: string;
}

export const KATHISMAS: Kathisma[] = KATHISMA_PSALMS.map((psalms, i) => ({ id: `kathisma-${i + 1}`, n: i + 1, psalms, title: `კანონი ${i + 1}` }));
export const PSALTER_RULE: PrayerRef = { id: 'psalter-rule', title: 'ფსალმუნთა კითხვის წესი' };

// New Testament, translation of St George the Athonite (orthodoxy.ge). Texts: public/bible/<id>.json { chapters }.
export interface BibleBook {
  id: string;
  title: string;
  chapters: number;
}

export const GOSPELS: BibleBook[] = [
  { id: 'mate', title: 'მათე', chapters: 28 },
  { id: 'markozi', title: 'მარკოზი', chapters: 16 },
  { id: 'luka', title: 'ლუკა', chapters: 24 },
  { id: 'iovane', title: 'იოანე', chapters: 21 },
];

export const APOSTLE: BibleBook[] = [
  { id: 'sakme', title: 'საქმე მოციქულთა', chapters: 28 },
  { id: 'iakobi', title: 'იაკობის ეპისტოლე', chapters: 5 },
  { id: '1petre', title: 'პეტრეს I ეპისტოლე', chapters: 5 },
  { id: '2petre', title: 'პეტრეს II ეპისტოლე', chapters: 3 },
  { id: '1iovane', title: 'იოანეს I ეპისტოლე', chapters: 5 },
  { id: '2iovane', title: 'იოანეს II ეპისტოლე', chapters: 1 },
  { id: '3iovane', title: 'იოანეს III ეპისტოლე', chapters: 1 },
  { id: 'iuda', title: 'იუდას ეპისტოლე', chapters: 1 },
  { id: 'romaelta', title: 'რომაელთა მიმართ', chapters: 16 },
  { id: '1korintelta', title: 'კორინთელთა მიმართ I', chapters: 16 },
  { id: '2korintelta', title: 'კორინთელთა მიმართ II', chapters: 13 },
  { id: 'galatelta', title: 'გალატელთა მიმართ', chapters: 6 },
  { id: 'efeselta', title: 'ეფესელთა მიმართ', chapters: 6 },
  { id: 'pilipelta', title: 'ფილიპელთა მიმართ', chapters: 4 },
  { id: 'kolaselta', title: 'კოლასელთა მიმართ', chapters: 4 },
  { id: '1tesalonikelta', title: 'თესალონიკელთა მიმართ I', chapters: 5 },
  { id: '2tesalonikelta', title: 'თესალონიკელთა მიმართ II', chapters: 3 },
  { id: '1timote', title: 'ტიმოთეს მიმართ I', chapters: 6 },
  { id: '2timote', title: 'ტიმოთეს მიმართ II', chapters: 4 },
  { id: 'tite', title: 'ტიტეს მიმართ', chapters: 3 },
  { id: 'filimoni', title: 'ფილიმონის მიმართ', chapters: 1 },
  { id: 'ebraelta', title: 'ებრაელთა მიმართ', chapters: 13 },
];

export const bibleChapterId = (book: string, chapter: number) => `bible-${book}-${chapter}`;

export const parseBibleId = (id: string): { book: BibleBook; chapter: number; gospel: boolean } | null => {
  const m = /^bible-([0-9a-z]+)-(\d+)$/.exec(id);
  if (!m) return null;
  const gospel = GOSPELS.find(b => b.id === m[1]);
  const book = gospel || APOSTLE.find(b => b.id === m[1]);
  const chapter = Number(m[2]);
  if (!book || chapter < 1 || chapter > book.chapters) return null;
  return { book, chapter, gospel: Boolean(gospel) };
};

// Title shown on the prayer page for any id.
export const prayerTitle = (id: string): string => {
  const plain = MORNING_EVENING.find(p => p.id === id);
  if (plain) return plain.title;
  const akathist = AKATHISTS.find(p => p.id === id);
  if (akathist) return `დაუჯდომელი — ${akathist.title}`;
  const kathisma = KATHISMAS.find(k => k.id === id);
  if (kathisma) return `ფსალმუნნი — კანონი ${kathisma.n}`;
  if (id === PSALTER_RULE.id) return PSALTER_RULE.title;
  const bible = parseBibleId(id);
  if (bible) return `${bible.gospel ? 'სახარება — ' : ''}${bible.book.title}, თავი ${bible.chapter}`;
  const hour = PRAYER_HOURS.find(h => h.id === id);
  if (hour) return `ლოცვა ${hour.label}`;
  const week = /^week-(\d)-(dila|dzili)$/.exec(id);
  if (week) return `${WEEK_DAYS_DAT[Number(week[1])]} ${week[2] === 'dila' ? 'დილით' : 'დაწოლისას'}`;
  return 'ლოცვა';
};

export const isPrayerId = (id: string) => prayerTitle(id) !== 'ლოცვა';
