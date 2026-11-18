// The teacher's instructions to the AI teacher (AI teacher's tools, part 1). Two places, no rules change:
//   classes/{classId}.aiNotes          — for the whole class (a class's teachers may update their class)
//   students/{uid}.aiTeacherNotes      — for one student (a teacher of the student may update it)
// Both are whole arrays: read, add or remove, write back, so a removal really goes. Pure helpers here; Firestore only inside
// `aiNotesFor` (loaded on demand so the helpers stay testable without Firebase).

export const NOTE_MAX = 300;

export interface AiClassNote { id: string; text: string; at: string; by: string; byName: string }
export interface AiStudentNote extends AiClassNote { classId: string }
export type NoteKind = 'class' | 'student';
export interface ActiveNote { note: AiClassNote | AiStudentNote; kind: NoteKind }

const MONTHS_FROM = ['იანვრიდან', 'თებერვლიდან', 'მარტიდან', 'აპრილიდან', 'მაისიდან', 'ივნისიდან', 'ივლისიდან', 'აგვისტოდან', 'სექტემბრიდან', 'ოქტომბრიდან', 'ნოემბრიდან', 'დეკემბრიდან'];

/** „3 ნოემბრიდან“ from an ISO date or time */
export const fromDay = (at: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(at || '');
  return m ? `${Number(m[3])} ${MONTHS_FROM[Number(m[2]) - 1] ?? ''}`.trim() : '';
};

/** the grey line under a note: „მთელ კლასს · 3 ნოემბრიდან“ */
export const noteLine = (note: Pick<AiClassNote, 'at'>, kind: NoteKind) => {
  const who = kind === 'class' ? 'მთელ კლასს' : 'ერთ მოსწავლეს';
  const day = fromDay(note.at);
  return day ? `${who} · ${day}` : who;
};

export const newNoteId = (now = Date.now(), rnd = Math.random()) => `n${now.toString(36)}${Math.floor(rnd * 1296).toString(36).padStart(2, '0')}`;

const valid = (n: unknown): n is AiClassNote =>
  !!n && typeof n === 'object' && typeof (n as AiClassNote).id === 'string' && typeof (n as AiClassNote).text === 'string' && !!(n as AiClassNote).text.trim();

/** every note that works now for one student, newest first: the class's, then the student's own (a student's note of another class is left out when `classId` is given) */
export const activeFor = (classNotes: unknown, studentNotes: unknown, classId?: string): ActiveNote[] => {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(valid) : []);
  const all: ActiveNote[] = [
    ...list(classNotes).map(note => ({ note, kind: 'class' as const })),
    ...list(studentNotes)
      .filter(n => !classId || !(n as AiStudentNote).classId || (n as AiStudentNote).classId === classId)
      .map(note => ({ note, kind: 'student' as const })),
  ];
  return all.sort((a, b) => (b.note.at || '').localeCompare(a.note.at || ''));
};

/** a note made now (the text trimmed and cut at NOTE_MAX); null when empty */
export const makeNote = (text: string, by: string, byName: string, now = new Date()): AiClassNote | null => {
  const t = text.trim().slice(0, NOTE_MAX);
  return t ? { id: newNoteId(now.getTime()), text: t, at: now.toISOString(), by, byName } : null;
};

export const withNote = <T extends AiClassNote>(list: unknown, note: T): T[] => [...(Array.isArray(list) ? (list as T[]).filter(valid) : []), note];
export const withoutNote = <T extends AiClassNote>(list: unknown, id: string): T[] => (Array.isArray(list) ? (list as T[]).filter(n => valid(n) && n.id !== id) : []);

/** the lines the AI should be told about a student: the class's and the student's own notes, as plain sentences.
 *  The prompts in utils/aiTeacher.ts should call this and add the lines to the system text. */
export const aiNotesFor = async (uid: string): Promise<string[]> => {
  if (!uid) return [];
  try {
    const [{ db }, fs] = await Promise.all([import('../firebase'), import('firebase/firestore')]);
    const [me, classes] = await Promise.all([
      fs.getDoc(fs.doc(db, 'students', uid)),
      fs.getDocs(fs.query(fs.collection(db, 'classes'), fs.where('memberIds', 'array-contains', uid))),
    ]);
    const classNotes = classes.docs.filter(d => !d.data().archived).flatMap(d => d.data().aiNotes ?? []);
    return activeFor(classNotes, me.data()?.aiTeacherNotes).map(a => a.note.text.trim());
  } catch {
    return [];
  }
};
