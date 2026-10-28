import type { SitqvaCandidate } from '../utils/sitqva';

// The bank „დღის სიტყვა“ draws from on a day whose calendar gives no feast or saint of 4–6 letters: church words a
// pupil of the school meets, and the regions, towns, rivers and holy places of Georgia. Only words of 4–6 of today's
// letters; a word's hint is its kind (utils/sitqva.ts KIND_HINT). Names of saints are not here — the calendar gives them.

const CHURCH = [
  'ტაძარი', 'ჯვარი', 'ხატი', 'ლოცვა', 'მარხვა', 'კანონი', 'გალობა', 'ბერი', 'ლავრა', 'სავანე', 'უდაბნო', 'მოწამე', 'წმიდა',
  'ნეტარი', 'ღირსი', 'მადლი', 'სული', 'სამება', 'იესო', 'ქრისტე', 'მეუფე', 'ზარი', 'კელია', 'ხუცესი', 'ემბაზი', 'ოლარი',
  'ზატიკი', 'ალილო', 'ჭონა', 'დიდება', 'მწუხრი', 'წირვა', 'ჟამნი', 'ირმოსი', 'ისონი', 'გუნდი', 'ფელონი', 'მიტრა', 'ენქერი',
  'ფრესკა', 'ნათლია', 'ბისონი', 'კმევა', 'სქემა', 'ბანი', 'ცხება', 'მამაო', 'ღმერთი', 'უფალი', 'ცოდვა', 'რწმენა', 'იმედი',
  'ღვაწლი', 'მირონი', 'კვირა', 'შაბათი', 'კრება', 'ზეთი', 'ძელი', 'ლიტია', 'ზეცა', 'ედემი', 'ანბანი', 'წიგნი', 'სიტყვა',
  'შობა', 'ხარება', 'მირქმა', 'ბზობა', 'პური', 'ღვინო', 'მრწამსი', 'კვერი', 'ამბიონი', 'ნიში', 'ტრაპეზი', 'სეფე',
].filter(w => w.length >= 4 && w.length <= 6);

const REGION = [
  'გურია', 'კახეთი', 'რაჭა', 'აჭარა', 'ხევი', 'თუშეთი', 'ფშავი', 'ქართლი', 'ლაზეთი', 'ქიზიყი', 'ჰერეთი', 'ერწო', 'ოკრიბა',
  'სამცხე', 'იბერია', 'ეგრისი', 'მცხეთა', 'ბათუმი', 'გელათი', 'ვარძია', 'ბოდბე', 'შატილი', 'უშგული', 'მესტია', 'თელავი',
  'გორი', 'ფოთი', 'ონი', 'რიონი', 'არაგვი', 'ენგური', 'ლიახვი', 'ჭოროხი', 'შხარა', 'უშბა', 'ხაშური', 'ახმეტა', 'დუშეთი',
  'ხონი', 'სენაკი', 'ხობი', 'აბაშა', 'წალკა', 'კასპი', 'ქარელი', 'ცაგერი', 'სოხუმი', 'გაგრა', 'გალი', 'ჯავა', 'სურამი',
  'მეტეხი', 'სიონი', 'ჯვარი', 'ალვანი', 'ომალო', 'ლაილაში', 'ზედაზენი', 'იყალთო', 'ნეკრესი', 'მარანი',
].filter(w => w.length >= 4 && w.length <= 6);

export const ANSWER_BANK: SitqvaCandidate[] = [
  ...CHURCH.map(word => ({ word, kind: 'church' as const })),
  ...REGION.map(word => ({ word, kind: 'region' as const })),
];

/** the words a guess may always be, even when the dictionary did not load */
export const ANSWER_WORDS = new Set(ANSWER_BANK.map(c => c.word));
