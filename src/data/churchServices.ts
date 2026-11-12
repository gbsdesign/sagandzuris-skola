// „მსახურებები“ (2026-11-12, the user's screenshot of a Facebook post's comments — „სად აღევლინება წირვა ყოველდღე?“): which
// churches serve every day, written by hand from what their parishioners said. Shown only to admins and teachers (the user:
// „მარტო ადმინები და მასწავლებლებისთვის“) — on the churches' first screen as a fourth tile „მსახურებები“ (list `services`) and
// in a church's window as a box. Nothing here was confirmed by the churches: the hours are not published anywhere online, and
// the one old line found (orthodoxy.ge's directory on ჯვართამაღლება) says otherwise — `checked` keeps such a note. Every church
// was matched to churches.json by its place (each within 70 m of its Wikipedia / map point).

export interface ChurchService {
  /** the church's id in churches.json */
  id: string;
  /** the shorter name people use, for the list */
  name: string;
  /** one or two words for the list's pill */
  short: string;
  /** what the parishioners said, a line each */
  lines: string[];
  /** what an online source says, when it is different or adds something */
  checked?: string;
}

export const SERVICES_SOURCE = 'მრევლის ცნობით (Facebook-ის კომენტარები, 2026 წლის ნოემბერი) — ტაძრის მიერ დადასტურებული არ არის';

export const CHURCH_SERVICES: ChurchService[] = [
  { id: 'fd2ecc55', name: 'სიონი', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  { id: '639e3591', name: 'ქაშვეთი', short: 'ყოველდღე', lines: ['მსახურება ყოველდღე'] },
  { id: 'd0870591', name: 'მეტეხი', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  { id: '1960dc5d', name: 'მამადავითი (მთაწმინდის პანთეონი)', short: 'ყოველდღე', lines: ['წირვა და ლოცვა ყოველდღე'] },
  { id: '5a71e310', name: 'დიდუბის ღვთისმშობელი (დიდუბის პანთეონი)', short: 'ყოველდღე', lines: ['მსახურება ყოველდღე', 'დილის წირვა ყოველდღე'] },
  { id: 'd4709d02', name: 'ვაკის მაცხოვრის ფერისცვალება', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  {
    id: '1123e93', name: 'ვაკის წმინდა სამება', short: 'ყოველდღე',
    lines: ['წირვა ყოველდღე', 'დიდ დღესასწაულებზე — ორი წირვა (თუ ის დღე სახელმწიფო უქმე არ არის)'],
  },
  {
    id: 'cb95626b', name: 'ჯვართამაღლება (ფანასკერტელის ქუჩა)', short: 'ღამითაც',
    lines: ['წირვა ყოველდღე, დილით', 'ღამის წირვა: ოთხშაბათს და შაბათს, 23:00-ზე'],
    checked: 'orthodoxy.ge-ს ძველ ცნობარში (ფანასკერტელ-ციციშვილის ქ. №14) წერია: წირვა შაბათ-კვირას და დღესასწაულებზე, ოთხშაბათს 11:00-ზე — ჯანმრთელობის პარაკლისი. ეს ცნობა შეიძლება მოძველებულია.',
  },
  { id: '9e7f145c', name: 'წმინდა ნიკოლოზი (ვორონცოვთან)', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  { id: '33b3b6b9', name: 'წმინდა ალექსანდრე ნეველი', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  { id: '1ee6e253', name: 'იოანე ღვთისმეტყველი (ვერაზე)', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
  { id: 'cd44b09a', name: 'სამთავროს დედათა მონასტერი (მცხეთა)', short: 'ყოველდღე', lines: ['წირვა ყოველდღე'] },
];

const BY_ID = new Map(CHURCH_SERVICES.map(s => [s.id, s]));
export const serviceOf = (id: string) => BY_ID.get(id);
