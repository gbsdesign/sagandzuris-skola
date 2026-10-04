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

export const AKATHISTS: PrayerRef[] = [
  'ყოვლადწმიდისა სამებისა',
  'უფლისა ჩვენისა იესუ ტკბილისა',
  'ყოვლადწმიდისა ღვთისმშობელისა',
  'ყოვლადწმიდისა ღმრთისმშობელისა წოდებულისა ივერიისად',
  'წმიდათა ანგელოზთა',
  'წმიდისა მთავარანგელოზისა მიქაელისა',
  'წმიდისა ნიკოლოზისა',
  'წმიდისა მოციქულთა სწორისა დედისა ჩვენისა ნინოსი',
  'წმიდისა გიორგისი',
  'წმიდისა გაბრიელისა აღმსარებელისა და სალოსისა',
  'წმიდისა პანტელეიმონისა',
  'წმიდისა ბარბარესი',
  'ღირსისა შიო მღვიმელისა',
  'ნეტარი დედა მატრონასადმი',
  'მღუდელმთავრისა სპირიდონისა ტრიმიფუნტელისა',
  'მღუდელ-მოწამისა კვიპრიანესი და მოწამისა იუსტინასი',
  'მიცვალებულთა სულთა შეწევნისათვის',
  'იტირე სულო',
].map((title, i) => ({ id: `akathist-${i + 1}`, title }));

// Title shown on the prayer page for any id.
export const prayerTitle = (id: string): string => {
  const plain = [...MORNING_EVENING, ...AKATHISTS].find(p => p.id === id);
  if (plain) return plain.id.startsWith('akathist') ? `დაუჯდომელი — ${plain.title}` : plain.title;
  const hour = PRAYER_HOURS.find(h => h.id === id);
  if (hour) return `ლოცვა ${hour.label}`;
  const week = /^week-(\d)-(dila|dzili)$/.exec(id);
  if (week) return `${WEEK_DAYS_DAT[Number(week[1])]} ${week[2] === 'dila' ? 'დილით' : 'დაწოლისას'}`;
  return 'ლოცვა';
};

export const isPrayerId = (id: string) => prayerTitle(id) !== 'ლოცვა';
