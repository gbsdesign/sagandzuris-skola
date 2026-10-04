export interface ManeraItemType {
  num: string;
  title: string;
  defaultEff: string;
  advice: string;
}

// Habits with a menu open prayers to read right there (see data/prayers).
export type HabitMenu = 'morning-evening' | 'hours' | 'akathists';

export interface HabitItemType {
  id: string;
  label: string;
  menu?: HabitMenu;
}

export const MANERA_ITEMS: ManeraItemType[] = [
  { num: '1', title: 'დიაფრაგმის გამოყენება', defaultEff: '', advice: 'მასზე ბგერის დასმა კარგი და მძლავრი ჰაერნაკადი.' },
  { num: '2', title: 'გულმკერდის არეს ჩართვა', defaultEff: '', advice: 'მასში გამოტარებისას ჩვენი პიროვნული ძალის ჩადება სიტყვისთვის ძალის მისაცემად. ენერგიის, ძალის მინიჭება ხმოვნებში (ა, ე, ი, ო, უ) გასაჟღერებლად. ძალა მოდის გულმკერდიდან.' },
  { num: '3', title: 'ყელის თავისუფალი მდგომარეობა', defaultEff: '', advice: 'ყელი უნდა იყოს მოდუნებული, თავისუფალი. ის მხოლოდ ბგერებს იღებს, ძალა მოდის გულმკერდის არედან დიაფრაგმაზე დასმული.' },
  { num: '4', title: 'სახის ნიღაბის ჩართვა', defaultEff: '', advice: 'ცხვირხახის წიაღების სწორი გამოყენება. ძალა და ბგერა სწორად მიმართე:\n• მაღალი ბგერებისას: ზედა ნაწილში შუბლის წიაღებში, ზედა სასა.\n• საშუალო ბგერებისას: ცხვირი, თვალებს შუა წერტილი და წინ გამოთქმით.\n• დაბალი ბგერებისას: დაბლა, დაახლოებით ნიკაპის და წინ გამოთქმით.' },
  { num: '5', title: 'გამართული დიქცია', defaultEff: '', advice: 'თანხმოვნები არ ჩაყლაპო, გამოთქვი კარგად.' },
  { num: '6', title: 'პირის აპარატის მოქნილობა', defaultEff: '', advice: 'მოქნილი და თავისუფალი უნდა გემორჩილებოდეს. აკეთე სავარჯიშოები დრო და დრო. ბგერები ერთ დარგზე უნდა იყოს მოჭრილი გალობისას.' },
  { num: '7', title: 'ხმოვნების ძალა', defaultEff: '', advice: 'მასში იდება პიროვნული ძალა შენი პიროვნული სიღრმიდან ბგერებზე (ა, ე, ი, ო, უ). მაგალითად: „წმიდაო“ — ბგერებს არ მოეფერო, არ დაარბილო, არ დატკბე ზედმეტად. უნდა ჩადო ხმოვნებში ძალა გულმკერდიდან წამოსული შენი პიროვნების სათქმელი ძალა.' },
  { num: '8', title: 'ბუნებრივად მორგება', defaultEff: '', advice: 'მოირგე ეს ყველა რჩევა ბუნებრივად ისე, რომ დაძაბულობა არ გქონდეს და გაითავისე როგორც პიროვნებამ და მხნეობით ღვთის სადიდებლად იგალობე.' },
  { num: '9', title: 'სწორი შინაგანი დგომა', defaultEff: '', advice: 'ბგერები უნდა ჟღერდეს თვითრწმენით, თქვენი პიროვნული სიღრმიდან.' }
];

export interface HabitGroupType {
  id: string;
  title: string;
  items: HabitItemType[];
}

// Ids stay fixed: students' saved marks are keyed by them.
export const HABIT_GROUPS: HabitGroupType[] = [
  {
    id: 'daily',
    title: 'ყოველდღე',
    items: [
      { id: 'habit_1', label: 'დილის და საღამოს ლოცვების კითხვა', menu: 'morning-evening' },
      { id: 'habit_13', label: 'შვიდგზის ლოცვა', menu: 'hours' },
      { id: 'habit_2', label: 'სახარების კითხვა' },
      { id: 'habit_3', label: 'სამოციქულოს კითხვა' },
      { id: 'habit_4', label: 'სულიერი ლიტერატურა — დღეში 3–5 გვერდი მაინც' },
      { id: 'habit_5', label: 'იესოს ლოცვა — რაც უფრო ხშირად, მით უკეთესი' },
      { id: 'habit_6', label: 'ფსალმუნების კითხვა — სასურველია 1 კანონი ან დიდება მაინც' },
    ],
  },
  {
    id: 'weekly',
    title: 'ყოველკვირა',
    items: [
      { id: 'habit_11', label: 'წირვაზე დასწრება' },
      { id: 'habit_12', label: 'ლოცვაზე დასწრება' },
    ],
  },
  {
    id: 'monthly',
    title: 'თვეში 2–3-ჯერ მაინც',
    items: [
      { id: 'habit_7', label: 'დაუჯდომლები', menu: 'akathists' },
      { id: 'habit_8', label: 'სამადლობელი პარაკლისი' },
    ],
  },
  {
    id: 'sacraments',
    title: 'საიდუმლოები',
    items: [
      { id: 'habit_9', label: 'აღსარება' },
      { id: 'habit_10', label: 'ზიარება' },
    ],
  },
];

export const HABIT_ITEMS: HabitItemType[] = HABIT_GROUPS.flatMap((group) => group.items);
