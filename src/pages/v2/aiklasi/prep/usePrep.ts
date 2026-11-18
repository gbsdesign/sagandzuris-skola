import { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { useAuth } from '../../../../context';
import { useAccess } from '../../../../hooks/useAccess';
import { useMyClasses } from '../../../../hooks/useClasses';
import { loadChantLookup, chantLookupNow } from '../../../../data/chantLookupLazy';
import { loadPiece } from '../../../../components/aiLesson/useLessonData';
import { AiTeacherError, AI_PROBLEM_TEXT, askWordQuestions } from '../../../../utils/aiTeacher';
import { chantName } from '../../../../utils/pearls';
import {
  analyse, drillsFor, levelOf, leapsText, rangeText, readRecord, wordsText,
  type PrepAnalysis, type PrepLevel, type PrepQuestion, type PrepRecord,
} from '../../../../utils/lessonPrep';

// „გაკვეთილის მომზადება“'s data: the chant's notes measured on the phone, the AI's questions about its words, and the
// lesson kept in classes/{classId}.aiLessons[variantId] (a field-path update, so the class's other chants stay; the class's
// teachers may write the class, its members read it — no rules change).

export interface PrepDraft {
  phrases: number;
  level: PrepLevel;
  leaps: string;
  range: string;
  drills: string[];
  questions: PrepQuestion[];
}

export type PrepState =
  | { kind: 'loading' }
  | { kind: 'no-notes' }
  | { kind: 'ready'; title: string; analysis: PrepAnalysis; words: string };

/** the chant's title, its notes' measure and its words */
const useChantFacts = (variantId: string) => {
  const [state, setState] = useState<PrepState>({ kind: 'loading' });
  useEffect(() => {
    let gone = false;
    (async () => {
      await loadChantLookup();
      const info = chantLookupNow()?.findVersion(variantId);
      const piece = info ? await loadPiece(variantId).catch(() => null) : null;
      if (gone) return;
      if (!info || !piece || !piece.parts.length) { setState({ kind: 'no-notes' }); return; }
      const { getChantMedia } = await import('../../../../data/chantMediaRegistry');
      const words = wordsText(getChantMedia(info.chant.id, info.variant.code)?.lyrics);
      if (gone) return;
      setState({
        kind: 'ready', title: chantName(info.chant.title), words,
        analysis: analyse(piece.score.voices as [number, number, number][][], piece.parts),
      });
    })().catch(() => { if (!gone) setState({ kind: 'no-notes' }); });
    return () => { gone = true; };
  }, [variantId]);
  return state;
};

const draftOf = (a: PrepAnalysis, questions: PrepQuestion[]): PrepDraft => ({
  phrases: a.phrases, level: levelOf(a), leaps: leapsText(a.leaps), range: rangeText(a.range), drills: drillsFor(a), questions,
});

export const usePrep = (cls: { id: string }, variantId: string) => {
  const { user } = useAuth();
  const facts = useChantFacts(variantId);
  const [saved, setSaved] = useState<PrepRecord | null | undefined>(undefined);
  const [draft, setDraft] = useState<PrepDraft | null>(null);
  const [asking, setAsking] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => onSnapshot(doc(db, 'classes', cls.id),
    s => setSaved(readRecord(s.data()?.aiLessons?.[variantId])),
    () => setSaved(null)), [cls.id, variantId]);

  const ask = useCallback(async (a: PrepAnalysis, words: string, title: string) => {
    if (!user) return [] as PrepQuestion[];
    if (!words) { setAiNote('საგალობელს ტექსტი ჯერ არ აქვს — კითხვები არ მომზადდა.'); return []; }
    setAsking(true); setAiNote('');
    try { return await askWordQuestions(user.uid, words, title); }
    catch (e) { setAiNote(`კითხვები ვერ მოვამზადე. ${AI_PROBLEM_TEXT[e instanceof AiTeacherError ? e.kind : 'failed']}`); return []; }
    finally { setAsking(false); void a; }
  }, [user]);

  // the first time: the saved lesson, else a fresh draft from the notes + the AI's questions
  useEffect(() => {
    if (draft || facts.kind !== 'ready' || saved === undefined) return;
    if (saved) {
      setDraft({ phrases: saved.phrases, level: saved.level, leaps: saved.leaps, range: saved.range, drills: saved.drills, questions: saved.questions });
      return;
    }
    const base = draftOf(facts.analysis, []);
    setDraft(base);
    void ask(facts.analysis, facts.words, facts.title).then(questions => setDraft(d => (d ? { ...d, questions } : d)));
  }, [facts, saved, draft, ask]);

  const askAgain = async () => {
    if (facts.kind !== 'ready') return;
    const questions = await ask(facts.analysis, facts.words, facts.title);
    if (questions.length) setDraft(d => (d ? { ...d, questions } : d));
  };

  const save = async (approved: boolean): Promise<boolean> => {
    if (!user || !draft) return false;
    setBusy(true); setProblem('');
    try {
      const rec: PrepRecord = { ...draft, at: new Date().toISOString(), by: user.uid, approved };
      await updateDoc(doc(db, 'classes', cls.id), { [`aiLessons.${variantId}`]: rec });
      return true;
    } catch (e) {
      console.warn('lesson prep save:', e);
      setProblem('ვერ შეინახა — ინტერნეტი შეამოწმე და თავიდან სცადე.');
      return false;
    } finally { setBusy(false); }
  };

  return { facts, draft, setDraft, saved, asking, aiNote, problem, busy, askAgain, save };
};

/** For a student's lesson: the approved lesson of this chant from any of my classes (null = none). */
export const useApprovedPrep = (variantId: string | null | undefined): PrepRecord | null => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid);
  const on = useAccess().on('aiTeacher');
  const ids = useMemo(() => classes.map(c => c.id).join(','), [classes]);
  const [rec, setRec] = useState<PrepRecord | null>(null);
  useEffect(() => {
    setRec(null);
    if (!variantId || !on || !ids) return;
    let gone = false;
    Promise.all(ids.split(',').map(id => getDoc(doc(db, 'classes', id)).then(s => readRecord(s.data()?.aiLessons?.[variantId]), () => null)))
      .then(all => { if (!gone) setRec(all.find(r => r?.approved) ?? null); });
    return () => { gone = true; };
  }, [variantId, on, ids]);
  return rec;
};
