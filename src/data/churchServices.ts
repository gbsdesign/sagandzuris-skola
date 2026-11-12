// „მსახურებები“ (2026-11-12, the user's screenshot of a Facebook post's comments — „სად აღევლინება წირვა ყოველდღე?“): which
// churches serve every day, written by hand from what their parishioners said. Shown only to admins and teachers (the user:
// „მარტო ადმინები და მასწავლებლებისთვის“) — on the churches' first screen as a fourth tile „მსახურებები“ (list `services`) and
// in a church's window as a box. Nothing here was confirmed by the churches: the hours are not published anywhere online, and
// the one old line found (orthodoxy.ge's directory on ჯვართამაღლება) says otherwise — `checked` keeps such a note. Every church
// was matched to churches.json by its place (each within 70 m of its Wikipedia / map point).

export type ServiceTime = 'morning' | 'night';

/** one service: when in the day, what, which days, the hour if known */
export interface ServiceSlot { when: ServiceTime; what: string; days: string; time?: string }

export interface ChurchService {
  /** the church's id in churches.json */
  id: string;
  /** the shorter name people use, for the list */
  name: string;
  /** the services; a plain „every day“ counts as the morning's (the user's pick, 2026-11-12) */
  slots: ServiceSlot[];
  /** what else the parishioners said */
  note?: string;
  /** what an online source says, when it is different or adds something */
  checked?: string;
}

export const SERVICES_SOURCE = 'მრევლის ცნობით (Facebook-ის კომენტარები, 2026 ნოემბერი) — ტაძარს არ დაუდასტურებია';

const daily = (what = 'წირვა'): ServiceSlot => ({ when: 'morning', what, days: 'ყოველდღე' });

export const CHURCH_SERVICES: ChurchService[] = [
  { id: 'fd2ecc55', name: 'სიონი', slots: [daily()] },
  { id: '639e3591', name: 'ქაშვეთი', slots: [daily('მსახურება')] },
  { id: 'd0870591', name: 'მეტეხი', slots: [daily()] },
  { id: '1960dc5d', name: 'მამადავითი (მთაწმინდის პანთეონი)', slots: [daily('წირვა და ლოცვა')] },
  { id: '5a71e310', name: 'დიდუბის ღვთისმშობელი (დიდუბის პანთეონი)', slots: [daily()] },
  { id: 'd4709d02', name: 'ვაკის მაცხოვრის ფერისცვალება', slots: [daily()] },
  {
    id: '1123e93', name: 'ვაკის წმინდა სამება', slots: [daily()],
    note: 'დიდ დღესასწაულებზე — ორი წირვა (თუ ის დღე სახელმწიფო უქმე არ არის)',
  },
  {
    id: 'cb95626b', name: 'ჯვართამაღლება (ფანასკერტელის ქუჩა)',
    slots: [daily(), { when: 'night', what: 'ღამის წირვა', days: 'ოთხშაბათი, შაბათი', time: '23:00' }],
    checked: 'orthodoxy.ge-ს ძველ ცნობარში წერია: წირვა შაბათ-კვირას და დღესასწაულებზე. შეიძლება მოძველებულია.',
  },
  { id: '9e7f145c', name: 'წმინდა ნიკოლოზი (ვორონცოვთან)', slots: [daily()] },
  { id: '33b3b6b9', name: 'წმინდა ალექსანდრე ნეველი', slots: [daily()] },
  { id: '1ee6e253', name: 'იოანე ღვთისმეტყველი (ვერაზე)', slots: [daily()] },
  { id: 'cd44b09a', name: 'სამთავროს დედათა მონასტერი (მცხეთა)', slots: [daily()] },
];

const BY_ID = new Map(CHURCH_SERVICES.map(s => [s.id, s]));
export const serviceOf = (id: string) => BY_ID.get(id);
export const hasTime = (s: ChurchService, when: ServiceTime | 'all') => when === 'all' || s.slots.some(x => x.when === when);
