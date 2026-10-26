import { useEffect, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// „ოსტატობა“ (redesign stage 6, 2026-10-25): step-by-step lessons a class's teachers build, and each member's way
// through them.
//   classes/{classId}/lessons/{lessonId}         {title, steps[], order, updatedAt} — the class reads, its teachers write
//   classes/{classId}/lessonProgress/{memberId}  {done: {lessonId: [stepId…]}} — the member writes their own; the
//                                                class's teachers read everyone's

export type StepKind = 'text' | 'exercise' | 'chant' | 'link';
export interface LessonStep { id: string; kind: StepKind; title: string; text?: string; ref?: string; url?: string }
export interface Lesson { id: string; title: string; steps: LessonStep[]; order: number }
export type Done = Record<string, string[]>;

export const STEP_KINDS: { id: StepKind; label: string }[] = [
  { id: 'text', label: 'რჩევა' },
  { id: 'exercise', label: 'სავარჯიშო' },
  { id: 'chant', label: 'საგალობელი' },
  { id: 'link', label: 'ბმული' },
];

const KINDS = new Set<StepKind>(['text', 'exercise', 'chant', 'link']);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toLesson = (id: string, d: any): Lesson => ({
  id,
  title: typeof d.title === 'string' ? d.title : '',
  order: typeof d.order === 'number' ? d.order : 0,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: (Array.isArray(d.steps) ? d.steps : []).flatMap((s: any) => (s && typeof s.id === 'string' && KINDS.has(s.kind) ? [{
    id: s.id, kind: s.kind, title: typeof s.title === 'string' ? s.title : '',
    ...(typeof s.text === 'string' && s.text ? { text: s.text } : {}),
    ...(typeof s.ref === 'string' && s.ref ? { ref: s.ref } : {}),
    ...(typeof s.url === 'string' && s.url ? { url: s.url } : {}),
  }] : [])),
});

/** A class's lessons in their order; null while loading. */
export const useClassLessons = (classId?: string | null) => {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  useEffect(() => {
    if (!classId) { setLessons([]); return; }
    setLessons(null);
    return onSnapshot(
      collection(db, 'classes', classId, 'lessons'),
      s => setLessons(s.docs.map(d => toLesson(d.id, d.data())).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ka'))),
      () => setLessons([]),
    );
  }, [classId]);
  return lessons;
};

/** My steps done in one class's lessons. */
export const useMyLessonProgress = (classId?: string | null, uid?: string | null) => {
  const [done, setDone] = useState<Done>({});
  useEffect(() => {
    if (!classId || !uid) { setDone({}); return; }
    return onSnapshot(doc(db, 'classes', classId, 'lessonProgress', uid), s => setDone((s.data()?.done as Done) || {}), () => setDone({}));
  }, [classId, uid]);
  return done;
};

/** Everyone's steps done (the class's teachers): memberId → Done. */
export const useClassLessonProgress = (classId: string | null | undefined, enabled: boolean) => {
  const [all, setAll] = useState<Record<string, Done>>({});
  useEffect(() => {
    if (!classId || !enabled) { setAll({}); return; }
    return onSnapshot(
      collection(db, 'classes', classId, 'lessonProgress'),
      s => setAll(Object.fromEntries(s.docs.map(d => [d.id, (d.data().done as Done) || {}]))),
      () => setAll({}),
    );
  }, [classId, enabled]);
  return all;
};

export const markStep = (classId: string, uid: string, lessonId: string, stepId: string, on: boolean) =>
  setDoc(doc(db, 'classes', classId, 'lessonProgress', uid), {
    done: { [lessonId]: on ? arrayUnion(stepId) : arrayRemove(stepId) },
    updatedAt: new Date().toISOString(),
  }, { merge: true });

export const newStepId = () => Math.random().toString(36).slice(2, 10);

/** Saves a lesson (a new one when it has no id); returns its id. */
export const saveLesson = async (classId: string, lesson: Omit<Lesson, 'id'> & { id?: string }) => {
  const clean = {
    title: lesson.title.trim(),
    order: lesson.order,
    steps: lesson.steps.map(s => ({
      id: s.id, kind: s.kind, title: s.title.trim(),
      ...(s.text?.trim() ? { text: s.text.trim() } : {}),
      ...(s.kind === 'chant' && s.ref ? { ref: s.ref } : {}),
      ...(s.kind === 'link' && s.url?.trim() ? { url: s.url.trim() } : {}),
    })),
    updatedAt: new Date().toISOString(),
  };
  if (lesson.id) { await setDoc(doc(db, 'classes', classId, 'lessons', lesson.id), clean); return lesson.id; }
  return (await addDoc(collection(db, 'classes', classId, 'lessons'), clean)).id;
};

export const deleteLesson = (classId: string, id: string) => deleteDoc(doc(db, 'classes', classId, 'lessons', id));

/** How many of a lesson's steps are done. */
export const doneCount = (lesson: Lesson, done: Done) => {
  const mine = new Set(done[lesson.id] || []);
  return lesson.steps.filter(s => mine.has(s.id)).length;
};
