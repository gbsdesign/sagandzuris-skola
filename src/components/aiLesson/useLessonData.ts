import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { findVersion } from '../../data/chantLookup';
import { CHESTS } from '../../data/pearls';
import { useAllLearning } from '../../hooks/useLearning';
import { useMyClasses } from '../../hooks/useClasses';
import { usePearls } from '../../hooks/usePearls';
import { useClassWork } from '../classes/ClassWork';
import { loadBookScore, type BookScore } from '../../utils/chantSynth';
import { melodyIn, partsOfScore, type LearnPart, type LearnRecord } from '../../utils/learn';
import { chantName } from '../../utils/pearls';
import { georgiaToday } from '../../utils/psalter';
import { freshCandidates, pickReviews, type Candidate } from '../../utils/aiLesson';
import { activeFocus } from '../../utils/sundayReady';

// What the AI lesson works with: the member's learning record, their assignments and class programs, their voice, and
// the lesson days kept in students/{uid}.aiLesson { last: day, days: { [day]: { min, learned, reviews } } } (the member
// writes it; no rules change). `loadPhrase` fetches a piece's notes and cuts it into phrases.

export interface Phrase {
  piece: string;
  part: number;
  title: string;
  score: BookScore;
  parts: LearnPart[];
  /** my voice in the score, from 0 */
  vi: number;
}

export interface LessonDay { min: number; learned: number; reviews: number }
/** „კვირის წირვა“'s wish: until that day the lesson prefers these chants (utils/sundayReady.ts) */
export interface LessonFocus { until: string; pieces: string[] }
export interface LessonRecord { last?: string; days?: Record<string, LessonDay>; focus?: LessonFocus }

export const saveFocus = (uid: string, focus: LessonFocus) =>
  setDoc(doc(db, 'students', uid), { aiLesson: { focus } }, { merge: true })
    .catch(e => console.warn('ai lesson focus:', e?.code || e));

export const isChantPiece = (piece: string) => !!findVersion(piece)?.variant.bookNums?.length;
export const pieceTitle = (piece: string) => { const v = findVersion(piece); return v ? chantName(v.chant.title) : ''; };

/** A piece's notes and phrases; null when it has none. */
export const loadPiece = async (piece: string): Promise<{ score: BookScore; parts: LearnPart[] } | null> => {
  const v = findVersion(piece)?.variant;
  if (!v?.bookNums?.length) return null;
  const score = await loadBookScore(v.bookNums[0], v.book || 'book');
  return { score, parts: partsOfScore(score) };
};

// a beginner's first chants: „წმიდაო ღმერთო“ and „შენ გიგალობთ“ (short, tuneful phrases), then the Liturgy's others
const STARTER = [...new Set(['v-12-x62', 'v-30-x68', ...(CHESTS[0]?.pearls ?? [])])];

/** The first phrase still to learn that has a tune to sing back (three pitches or more — a phrase on one reciting tone
 *  teaches nothing new); -1 when none is left. */
export const openPhrase = (score: BookScore, vi: number, parts: LearnPart[], rec: LearnRecord | undefined, also: number[] = []) => {
  for (let i = 0; i < parts.length; i++) {
    const r = rec?.[i];
    if ((r && r.level >= 1) || also.includes(i)) continue;
    if (melodyIn(score, vi, parts[i].b0, parts[i].b1).length >= 3) return i;
  }
  return -1;
};

export const saveLessonDay = (uid: string, day: string, d: LessonDay) =>
  setDoc(doc(db, 'students', uid), { aiLesson: { last: day, days: { [day]: d } } }, { merge: true })
    .catch(e => console.warn('ai lesson:', e?.code || e));

export const useLessonData = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const all = useAllLearning(uid);
  const classes = useMyClasses(uid).filter(c => !c.archived);
  const work = useClassWork(classes);
  const pearls = usePearls(uid);
  const [record, setRecord] = useState<LessonRecord | null>(null);
  const today = georgiaToday();

  useEffect(() => {
    if (!uid) { setRecord({}); return; }
    return onSnapshot(doc(db, 'students', uid), s => setRecord((s.data()?.aiLesson || {}) as LessonRecord), () => setRecord({}));
  }, [uid]);

  const learning: Record<string, LearnRecord> = all?.learning ?? {};
  const partsKnown: Record<string, number> = all?.parts ?? {};

  const plan = useMemo(() => {
    const assigned = work.groups.flatMap(g => (g.canEdit ? [] : g.all))
      .filter(a => a.variantId && isChantPiece(a.variantId))
      .map(a => ({ piece: a.variantId!, voice: a.voices[0] }));
    const program = classes.flatMap(c => c.program.map(p => p.id || '')).filter(Boolean);
    const focus = activeFocus(record?.focus, today);
    const candidates: Candidate[] = freshCandidates({
      work: assigned, learning, parts: partsKnown, program, starter: STARTER, isChant: isChantPiece, focus,
    });
    return {
      candidates,
      reviews10: pickReviews(learning, today, 2, isChantPiece, focus),
      reviews5: pickReviews(learning, today, 1, isChantPiece, focus),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, record, work.groups, classes.map(c => c.id).join(','), today]);

  const ready = !!uid && all !== null && record !== null && pearls.loaded;
  return { uid, ready, learning, partsKnown, plan, voice: pearls.voice, record: record ?? {}, today };
};

/** The first candidate whose notes load and that still has a phrase to learn. */
export const findFresh = async (cands: Candidate[], learning: Record<string, LearnRecord>, voice: string) => {
  for (const c of cands.slice(0, 6)) {
    try {
      const got = await loadPiece(c.piece);
      if (!got || !got.parts.length) continue;
      const vi = Math.max(0, Math.min(got.score.voices.length - 1, Number(c.voice || voice) - 1));
      const part = openPhrase(got.score, vi, got.parts, learning[c.piece]);
      if (part < 0) continue;
      return { piece: c.piece, part, title: pieceTitle(c.piece), vi, ...got } as Phrase;
    } catch { /* notes not reachable now (offline): the next one */ }
  }
  return null;
};

/** A review phrase's notes; null when they cannot be loaded. */
export const loadReview = async (piece: string, part: number, voice: string): Promise<Phrase | null> => {
  try {
    const got = await loadPiece(piece);
    if (!got || part >= got.parts.length) return null;
    const vi = Math.max(0, Math.min(got.score.voices.length - 1, Number(voice) - 1));
    return { piece, part, title: pieceTitle(piece), vi, ...got };
  } catch { return null; }
};
