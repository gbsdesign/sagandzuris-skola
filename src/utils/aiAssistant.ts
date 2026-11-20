import type { LessonSlot } from '../hooks/useClasses';
import { WEEKDAYS_GE } from './dateNames';
import { memberWeek, statusWord, type MemberWeek } from './weekReport';

// „სკოლის AI დამხმარე“ (boards x-ai-damkhmare, -gegma, -klasi): a teacher or an admin writes to the AI in plain words and it
// helps with the school's work. It sees only what the person may see — built on the phone from data they can already read
// (a teacher: their own classes' members; an admin: the whole school) — first names and short refs (p1, c1) only, never an
// e-mail or a phone. It answers in JSON: words, or words + a plan (a private letter to some people, a line in a class chat,
// a new class — admins only). The app shows the plan and does it only after the person's „კი“; every plan is checked here
// first. Pure: no Firebase.

export const MAX_TEXT = 1000;
export const MAX_PEOPLE = 30;
export const MAX_SLOTS = 7;
export const MAX_NAME = 60;
/** the people the AI is told about (class members first) */
export const MAX_CONTEXT_PEOPLE = 300;
/** earlier turns sent with a new request */
export const HISTORY_TURNS = 6;

// ——— a ready request (the lists themselves: utils/programOffers.ts) ———

export interface ReadyAsk { label: string; text: string; /** sent at once; else put in the field to finish */ send: boolean }

// ——— what the AI may see ———

export interface ScopeClassInput {
  id: string;
  name: string;
  teacherIds: string[];
  teachers: { uid: string; name: string }[];
  members: { uid: string; name: string; photoURL?: string }[];
  schedule: LessonSlot[];
}

export interface ScopeInput {
  me: string;
  admin: boolean;
  /** Tbilisi's day, YYYY-MM-DD */
  today: string;
  now: number;
  /** a teacher's own classes; an admin's every class in use */
  classes: ScopeClassInput[];
  /** an admin's other people (the directory) */
  others?: { uid: string; name: string; photoURL?: string }[];
  /** students/{uid} as read (missing = not read) */
  records: Record<string, Record<string, any> | null | undefined>;
  /** the class page it was opened from */
  focusClassId?: string;
}

export interface ScopePerson {
  ref: string;
  uid: string;
  /** the name as the app shows it (the plan's rows) */
  name: string;
  /** what the AI is told: the first name, with a last name's letter when two share it */
  short: string;
  photo?: string;
  classIds: string[];
  /** a class where I teach them: a private letter goes through it; null = the administration's chat (admins) */
  via: string | null;
  beginner: boolean;
  /** days since they last opened the app; null = never / unknown */
  lastActive: number | null;
  week: MemberWeek | null;
  parts: number;
  habitsWeek: number;
  known: boolean;
}

export interface ScopeClass { ref: string; id: string; name: string; size: number; teachers: string; slots: LessonSlot[] }

export interface AssistantScope {
  me: string; admin: boolean; people: ScopePerson[]; classes: ScopeClass[]; focus?: string; today: string;
  /** the open page in words (utils/programOffers `pageName`): the program is told where the person is */
  page?: string;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'უსახელო';

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** the profile says „დამწყები“ (abilities, or the old status) */
export const isBeginner = (data: Record<string, any> | null | undefined) => {
  const p = data?.profile ?? {};
  if (Array.isArray(p.abilities)) return p.abilities.includes('beginner');
  const old = Array.isArray(p.experienceLevel) ? p.experienceLevel : typeof p.experienceLevel === 'string' ? [p.experienceLevel] : [];
  return old.includes('დამწყები');
};

const shiftDay = (iso: string, days: number) => {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const partsOf = (data: Record<string, any>) => {
  const learning = data.learning && typeof data.learning === 'object' ? data.learning : {};
  return Object.values<any>(learning).reduce(
    (n: number, rec) => n + (rec && typeof rec === 'object' ? Object.values<any>(rec).filter(r => (r?.level ?? 0) >= 1).length : 0), 0);
};

const habitsOf = (data: Record<string, any>, today: string) => {
  const from = shiftDay(today, -6);
  const log = data.habitLog && typeof data.habitLog === 'object' ? data.habitLog : {};
  return Object.entries<any>(log).filter(([d, l]) => d >= from && d <= today && Array.isArray(l)).reduce((n, [, l]) => n + l.length, 0);
};

const daysSince = (iso: unknown, now: number): number | null => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null;
};

/** The people and classes the AI may know about, each with a short ref. */
export const buildScope = (input: ScopeInput): AssistantScope => {
  const { me, admin, today, now, records, focusClassId } = input;
  // the class opened first, then the others in their order
  const ordered = [...input.classes].sort((a, b) => Number(b.id === focusClassId) - Number(a.id === focusClassId));
  const classes: ScopeClass[] = ordered.map((c, i) => ({
    ref: `c${i + 1}`,
    id: c.id,
    name: c.name,
    size: c.members.length,
    teachers: c.teachers.map(t => firstName(t.name)).join(', '),
    slots: c.schedule,
  }));

  const byUid = new Map<string, ScopePerson>();
  const add = (uid: string, name: string, photo: string | undefined, classId: string | null, iTeach: boolean) => {
    if (!uid || uid === me) return;
    let p = byUid.get(uid);
    if (!p) {
      const data = records[uid];
      p = {
        ref: '', uid, name: name || 'უსახელო', short: '', photo: photo || undefined, classIds: [], via: null,
        beginner: isBeginner(data), lastActive: data ? daysSince(data.lastActiveAt, now) : null,
        week: data ? memberWeek({ uid, name, data }, today) : null,
        parts: data ? partsOf(data) : 0, habitsWeek: data ? habitsOf(data, today) : 0, known: !!data,
      };
      byUid.set(uid, p);
    }
    if (classId && !p.classIds.includes(classId)) p.classIds.push(classId);
    if (classId && iTeach && !p.via) p.via = classId;
  };
  for (const c of ordered) {
    const iTeach = c.teacherIds.includes(me);
    for (const m of c.members) add(m.uid, m.name, m.photoURL, c.id, iTeach);
  }
  if (admin) for (const o of input.others ?? []) add(o.uid, o.name, o.photoURL, null, false);

  const people = [...byUid.values()].slice(0, MAX_CONTEXT_PEOPLE);
  // two with one first name: the AI gets the last name's first letter too
  const seen = new Map<string, number>();
  for (const p of people) seen.set(firstName(p.name), (seen.get(firstName(p.name)) ?? 0) + 1);
  people.forEach((p, i) => {
    p.ref = `p${i + 1}`;
    const first = firstName(p.name);
    const second = p.name.trim().split(/\s+/)[1];
    p.short = (seen.get(first) ?? 0) > 1 && second ? `${first} ${Array.from(second)[0]}.` : first;
  });
  return { me, admin, people, classes, focus: focusClassId, today };
};

export const slotText = (s: LessonSlot) => `${WEEKDAYS_GE[s.day] ?? ''} ${s.start}${s.end ? `–${s.end}` : ''}`.trim();
export const slotsText = (slots: LessonSlot[]) => slots.map(slotText).join(', ');

const agoText = (d: number | null) => (d === null ? 'არ ჩანს' : d === 0 ? 'დღეს' : d === 1 ? 'გუშინ' : `${d} დღის წინ`);

const personLine = (p: ScopePerson, scope: AssistantScope) => {
  const refs = p.classIds.map(id => scope.classes.find(c => c.id === id)?.ref).filter(Boolean);
  const bits = [`${p.ref} ${p.short}`, refs.length ? `კლასი: ${refs.join(', ')}` : 'კლასის გარეშე'];
  if (p.beginner) bits.push('დამწყები');
  if (!p.known) return [...bits, 'მონაცემი არ ჩანს'].join(' · ');
  bits.push(`ბოლოს შემოვიდა: ${agoText(p.lastActive)}`);
  if (p.week) {
    bits.push(p.week.lessons
      ? `7 დღეში: ${p.week.lessons} AI გაკვეთილი, ${Math.round(p.week.minutes)} წთ, ${p.week.newPhrases} ახალი ფრაზა — ${statusWord(p.week.status)}`
      : '7 დღეში AI გაკვეთილი არ ჰქონია');
  }
  bits.push(`ნასწავლი ნაწილები: ${p.parts}`, `ჩვევის მონიშვნა 7 დღეში: ${p.habitsWeek}`);
  return bits.join(' · ');
};

/** What the AI is told about the school: classes and people as lines, refs first. */
export const contextText = (scope: AssistantScope) => [
  scope.admin ? 'ვისაც ეხმარები, ადმინია: ხედავს მთელ სკოლას.' : 'ვისაც ეხმარები, მასწავლებელია: ხედავს მხოლოდ თავის კლასებს.',
  'კლასები:',
  ...(scope.classes.length ? scope.classes.map(c => [
    `${c.ref} „${c.name}“ · ${c.size} წევრი`,
    c.teachers ? `მასწავლებელი: ${c.teachers}` : 'მასწავლებელი არ ჰყავს',
    c.slots.length ? `გაკვეთილები: ${slotsText(c.slots)}` : '',
    scope.focus === c.id ? 'ახლა ეს კლასია გახსნილი' : '',
  ].filter(Boolean).join(' · ')) : ['(კლასი არ არის)']),
  'ადამიანები:',
  ...(scope.people.length ? scope.people.map(p => personLine(p, scope)) : ['(არავინ)']),
].join('\n');

export interface Turn { who: 'me' | 'ai'; text: string }

/** The whole request to the AI. */
export const assistantPrompt = (scope: AssistantScope, history: Turn[], ask: string) => [
  'შენ ხარ „საგანძურის სკოლის“ (ქართული გალობისა და ხალხური სიმღერის სკოლა) AI დამხმარე მასწავლებლებისა და ადმინებისთვის.',
  `დღეს არის ${scope.today}.`,
  ...(scope.page ? [`ადამიანს ახლა აპში ეს გვერდი აქვს გახსნილი: ${scope.page}. თუ ამბობს „აქ“ ან „ეს“, ამ გვერდს გულისხმობს.`] : []),
  'ქვემოთ მხოლოდ ისაა, რისი ნახვაც ამ ადამიანს შეუძლია. სხვა არაფერი იცი — არაფერი გამოიგონო; რაც არ ჩანს, თქვი, რომ არ ჩანს.',
  contextText(scope),
  ...(history.length ? ['წინა საუბარი:', ...history.slice(-HISTORY_TURNS).map(t => `${t.who === 'me' ? 'ადამიანი' : 'შენ'}: ${t.text}`)] : []),
  `ახალი თხოვნა: ${ask}`,
  'უპასუხე ქართულად, მოკლედ (2–6 წინადადება), მარტივი სიტყვებით, „შენ“-ით. მოსწავლეები მოიხსენიე სახელით — არასდროს p…/c… ნიშნით.',
  'უპასუხე მხოლოდ JSON-ით. ჩვეულებრივ: {"say": "პასუხი"}.',
  'წერილს ან კლასს თვითონ ვერ გააკეთებ — მხოლოდ გეგმას სთავაზობ, ადამიანი თვითონ დაადასტურებს. გეგმა დაწერე მხოლოდ მაშინ, როცა ამას გთხოვენ:',
  'პირადი წერილი რამდენიმე ადამიანს (თითოეულს ცალკე): {"say": "...", "plan": {"kind": "message", "to": ["p1", "p2"], "label": "ერთი სიტყვა, ვინ არიან (მაგ. დამწყები)", "text": "წერილი, „შენ“-ით"}}.',
  'წერილი კლასის ჩატში: {"say": "...", "plan": {"kind": "classMessage", "classId": "c1", "text": "წერილი, „თქვენ“-ით"}}.',
  scope.admin
    ? 'ახალი კლასი: {"say": "...", "plan": {"kind": "createClass", "name": "სახელი", "slots": [{"day": 1, "start": "18:00", "end": "20:00"}], "to": ["p1"]}} — day: 0 კვირა, 1 ორშაბათი … 6 შაბათი; to = წევრები, შეიძლება ცარიელი იყოს.'
    : 'კლასს მხოლოდ ადმინი ქმნის: თუ ამას გთხოვენ, უთხარი, რომ ადმინს მიმართოს — გეგმა არ დაწერო.',
  `ერთ გეგმაში მაქსიმუმ ${MAX_PEOPLE} ადამიანი; წერილი ${MAX_TEXT} ასომდე. to-ში და classId-ში მხოლოდ ზემოთ ჩამოთვლილი ნიშნები.`,
  'გეგმის say-ში ერთი წინადადებით თქვი, რას გააკეთებ.',
].join('\n');

// ——— the AI's answer ———

export type PlanKind = 'message' | 'classMessage' | 'createClass';

/** A plan as the AI wrote it, its refs turned into ids (anything unknown is kept as written — the check refuses it). */
export interface PlanDraft {
  kind: PlanKind;
  to?: string[];
  classId?: string;
  text?: string;
  name?: string;
  slots?: LessonSlot[];
  label?: string;
  /** a new class: the admin who makes it teaches it (the board's „შენ“) */
  teachMe?: boolean;
}

export interface Answer { say: string; plan?: unknown }

const clean = (s: string) => s.replace(/\*+/g, '').trim();

/** The AI's JSON → its words and maybe a plan; null when it is not that. */
export const parseAnswer = (raw: string): Answer | null => {
  const body = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let v: unknown;
  try { v = JSON.parse(body); } catch {
    const m = /\{[\s\S]*\}/.exec(body);
    if (!m) return null;
    try { v = JSON.parse(m[0]); } catch { return null; }
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const say = typeof o.say === 'string' ? clean(o.say) : '';
  const plan = o.plan && typeof o.plan === 'object' ? o.plan : undefined;
  if (!say && !plan) return null;
  return plan ? { say, plan } : { say };
};

const KINDS: PlanKind[] = ['message', 'classMessage', 'createClass'];

const hhmm = (v: unknown): string => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? '').trim());
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(v ?? '');
};

/** The AI's plan → a draft with ids. */
export const planFromAi = (raw: unknown, scope: AssistantScope): PlanDraft | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = o.kind as PlanKind;
  if (!KINDS.includes(kind)) return null;
  const person = new Map(scope.people.flatMap(p => [[p.ref, p.uid], [p.uid, p.uid]] as [string, string][]));
  const cls = new Map(scope.classes.flatMap(c => [[c.ref, c.id], [c.id, c.id]] as [string, string][]));
  const draft: PlanDraft = { kind };
  if (Array.isArray(o.to)) draft.to = o.to.map(x => String(x)).map(x => person.get(x) ?? x);
  if (typeof o.classId === 'string') draft.classId = cls.get(o.classId) ?? o.classId;
  if (typeof o.text === 'string') draft.text = clean(o.text);
  if (typeof o.name === 'string') draft.name = clean(o.name).replace(/^[„“"]+|[“”"]+$/g, '');
  if (typeof o.label === 'string') draft.label = clean(o.label).slice(0, 30);
  if (Array.isArray(o.slots)) {
    draft.slots = o.slots.filter(s => s && typeof s === 'object').map(s => {
      const r = s as Record<string, unknown>;
      return { day: Number(r.day), start: hhmm(r.start), ...(r.end ? { end: hhmm(r.end) } : {}) };
    });
  }
  if (kind === 'createClass') draft.teachMe = o.teachMe !== false;
  return draft;
};

// ——— the check before anything is shown or done ———

export interface PlanPerson { uid: string; name: string; photo?: string; via: string | null }

export type CheckedPlan =
  | { kind: 'message'; to: PlanPerson[]; text: string; label?: string }
  | { kind: 'classMessage'; classId: string; className: string; text: string }
  | { kind: 'createClass'; name: string; slots: LessonSlot[]; members: PlanPerson[]; teachMe: boolean };

export type PlanCheck = { ok: true; plan: CheckedPlan } | { ok: false; why: string };

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const checkText = (t: string | undefined): string | null => {
  const s = (t ?? '').trim();
  if (!s) return 'წერილის ტექსტი ცარიელია.';
  if (s.length > MAX_TEXT) return `წერილი ${MAX_TEXT} ასოზე გრძელია.`;
  return null;
};

const checkPeople = (ids: string[] | undefined, scope: AssistantScope, need: boolean): PlanPerson[] | string => {
  const uids = [...new Set((ids ?? []).filter(u => u !== scope.me))];
  if (need && !uids.length) return 'ვის მივწერო, ვერ გავიგე.';
  const people: PlanPerson[] = [];
  for (const uid of uids) {
    const p = scope.people.find(x => x.uid === uid);
    if (!p) return 'ერთ-ერთი ადამიანი შენს სიაში არ არის.';
    people.push({ uid: p.uid, name: p.name, photo: p.photo, via: p.via });
  }
  if (people.length > MAX_PEOPLE) return `ერთად ${MAX_PEOPLE}-ზე მეტს ვერ მივწერ.`;
  return people;
};

/** Only people and classes the person may reach, a class only for admins, a text up to MAX_TEXT, at most MAX_PEOPLE. */
export const checkPlan = (draft: PlanDraft, scope: AssistantScope): PlanCheck => {
  if (draft.kind === 'message') {
    const to = checkPeople(draft.to, scope, true);
    if (typeof to === 'string') return { ok: false, why: to };
    // a teacher writes only through a class they teach
    if (!scope.admin && to.some(p => !p.via)) return { ok: false, why: 'ერთ-ერთი ადამიანი შენს კლასში არ არის.' };
    const bad = checkText(draft.text);
    if (bad) return { ok: false, why: bad };
    return { ok: true, plan: { kind: 'message', to, text: draft.text!.trim(), ...(draft.label ? { label: draft.label } : {}) } };
  }
  if (draft.kind === 'classMessage') {
    const c = scope.classes.find(x => x.id === draft.classId);
    if (!c) return { ok: false, why: 'ეს კლასი შენს სიაში არ არის.' };
    const bad = checkText(draft.text);
    if (bad) return { ok: false, why: bad };
    return { ok: true, plan: { kind: 'classMessage', classId: c.id, className: c.name, text: draft.text!.trim() } };
  }
  if (draft.kind === 'createClass') {
    if (!scope.admin) return { ok: false, why: 'კლასს მხოლოდ ადმინი ქმნის.' };
    const name = (draft.name ?? '').trim();
    if (!name) return { ok: false, why: 'კლასს სახელი სჭირდება.' };
    if (name.length > MAX_NAME) return { ok: false, why: `კლასის სახელი ${MAX_NAME} ასოზე გრძელია.` };
    const slots = draft.slots ?? [];
    if (slots.length > MAX_SLOTS) return { ok: false, why: `კვირაში ${MAX_SLOTS}-ზე მეტი გაკვეთილი ვერ ჩაიწერება.` };
    for (const s of slots) {
      if (!Number.isInteger(s.day) || s.day < 0 || s.day > 6 || !TIME.test(s.start) || (s.end !== undefined && (!TIME.test(s.end) || s.end <= s.start))) {
        return { ok: false, why: 'გაკვეთილის დღე ან საათი ვერ გავიგე.' };
      }
    }
    const members = checkPeople(draft.to, scope, false);
    if (typeof members === 'string') return { ok: false, why: members };
    return {
      ok: true,
      plan: { kind: 'createClass', name, slots: slots.map(s => ({ day: s.day, start: s.start, ...(s.end ? { end: s.end } : {}) })), members, teachMe: draft.teachMe !== false },
    };
  }
  return { ok: false, why: 'ეს ვერ გავიგე.' };
};

/** A checked plan back into a draft (to check it again after the person changed it). */
export const draftOf = (p: CheckedPlan): PlanDraft =>
  p.kind === 'message' ? { kind: 'message', to: p.to.map(x => x.uid), text: p.text, label: p.label }
  : p.kind === 'classMessage' ? { kind: 'classMessage', classId: p.classId, text: p.text }
  : { kind: 'createClass', name: p.name, slots: p.slots, to: p.members.map(x => x.uid), teachMe: p.teachMe };

/** „5 დამწყები“ / „3 ადამიანი“ — the plan's „ვის“ row. */
export const whoLine = (n: number, label?: string) => `${n} ${label?.trim() || 'ადამიანი'}`;
