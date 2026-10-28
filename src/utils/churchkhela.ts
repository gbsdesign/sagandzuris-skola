// „ცხელი ჩურჩხელა“ (games hub, 2026-10-28, live, Hot Potato): the phone plays a recording of the school through its
// speaker while a churchkhela (or the phone itself) goes round the circle; the music stops at a moment nobody knows, and
// whoever holds it then is „burnt“: a task card comes up (sing the next phrase, name the chant, say which region…). Pure;
// tests in tests/churchkhela.test.ts; the page pages/games/ChurchkhelaGame.tsx; the recordings data/hangiPool.ts.

export type TaskKind = 'sing' | 'name' | 'where' | 'fun';
export interface Task { id: string; kind: TaskKind; text: string }

export const TASKS: Task[] = [
  { id: 'sing-next', kind: 'sing', text: 'იმღერე შემდეგი ფრაზა — იქიდან, სადაც მუსიკა გაჩერდა' },
  { id: 'sing-line', kind: 'sing', text: 'იმღერე ამ საგალობლის ან სიმღერის ერთი სტრიქონი შენი ხმით' },
  { id: 'sing-voice', kind: 'sing', text: 'იმღერე ერთი ფრაზა იმ ხმაში, რომელსაც ჩვეულებრივ არ მღერი' },
  { id: 'sing-start', kind: 'sing', text: 'იმღერე ამ ჰანგის დასაწყისი — პირველი სიტყვებიდან' },
  { id: 'name-title', kind: 'name', text: 'დაასახელე, რა ისმოდა — საგალობელი თუ სიმღერა, და რა ჰქვია' },
  { id: 'name-voice', kind: 'name', text: 'რომელი ხმა ისმოდა ყველაზე კარგად — მთქმელი, მოძახილი თუ ბანი?' },
  { id: 'name-kind', kind: 'name', text: 'რა სახის ჰანგია — სადიდებელი, სუფრული, ნანა თუ საცეკვაო?' },
  { id: 'where-region', kind: 'where', text: 'რომელი კუთხის სიმღერაა ან რომელი სკოლის გალობა?' },
  { id: 'where-service', kind: 'where', text: 'რომელ მსახურებაზე იგალობება — წირვაზე, მწუხრზე თუ ცისკარზე?' },
  { id: 'where-when', kind: 'where', text: 'როდის მღერიან ამას — დღესასწაულზე, სუფრაზე, საქმეზე თუ ბავშვის დასაძინებლად?' },
  { id: 'fun-clap', kind: 'fun', text: 'ტაშით დაუკარი ამ ჰანგის რიტმი' },
  { id: 'fun-teach', kind: 'fun', text: 'ასწავლე მეზობელს ამ ჰანგის პირველი სიტყვები' },
  { id: 'fun-word', kind: 'fun', text: 'თქვი ერთი სიტყვა, რაც ამ ჰანგმა გაგახსენა' },
  { id: 'fun-kind', kind: 'fun', text: 'უთხარი მარჯვენა მეზობელს ერთი კეთილი სიტყვა' },
  { id: 'fun-hum', kind: 'fun', text: 'ჩაიბურტყუნე ჰანგი პირმოკუმული — სხვებმა გამოიცნონ' },
];

export const KIND_LABEL: Record<TaskKind, string> = { sing: 'იმღერე', name: 'დაასახელე', where: 'საიდანაა', fun: 'სახალისო' };

export type TaskMode = 'random' | TaskKind | 'none';
export type Source = 'all' | 'chant' | 'song' | 'voice';

/** how long the music plays before it stops: [min, max] seconds */
export const RANGES: { id: number; label: string; min: number; max: number }[] = [
  { id: 0, label: 'მოკლე · 5–15 წმ', min: 5, max: 15 },
  { id: 1, label: 'საშუალო · 10–30 წმ', min: 10, max: 30 },
  { id: 2, label: 'გრძელი · 20–45 წმ', min: 20, max: 45 },
];
export const ROUNDS_CHOICES = [5, 10, 15, 0] as const; // 0 = until „მორჩა“

export interface ChurchkhelaSettings { source: Source; range: number; tasks: TaskMode; rounds: number }
export const DEFAULT_SETTINGS: ChurchkhelaSettings = { source: 'all', range: 1, tasks: 'random', rounds: 10 };

export const roundSeconds = (range: number, rnd: () => number) => {
  const r = RANGES[range] ?? RANGES[1];
  return r.min + Math.min(r.max - r.min, Math.floor(rnd() * (r.max - r.min + 1)));
};

/** the next task card — never the same card twice in a row */
export const pickTask = (mode: TaskMode, rnd: () => number, lastId?: string): Task | null => {
  if (mode === 'none') return null;
  const list = mode === 'random' ? TASKS : TASKS.filter(t => t.kind === mode);
  const fresh = list.filter(t => t.id !== lastId);
  const from = fresh.length ? fresh : list;
  return from[Math.min(from.length - 1, Math.floor(rnd() * from.length))] ?? null;
};

/** the next recording — not one of the last few */
export const pickItem = <T extends { id: string }>(pool: T[], rnd: () => number, recent: string[]): T | undefined => {
  if (!pool.length) return undefined;
  const fresh = pool.filter(p => !recent.includes(p.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.min(from.length - 1, Math.floor(rnd() * from.length))];
};

/** where in the recording to start, so the same chant gives a different moment each time (0 for a short one) */
export const startOffset = (duration: number, seconds: number, rnd: () => number) =>
  Number.isFinite(duration) && duration > seconds + 15 ? Math.floor(rnd() * (duration - seconds - 10)) : 0;

export interface Round { title: string; sub: string; task: Task | null; ok: boolean | null }
export const tally = (rounds: Round[]) => ({ played: rounds.length, ok: rounds.filter(r => r.ok === true).length, failed: rounds.filter(r => r.ok === false).length });
