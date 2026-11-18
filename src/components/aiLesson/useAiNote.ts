import { useEffect, useState } from 'react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { georgiaToday } from '../../utils/psalter';
import { readDrillDone } from '../../utils/drillTakes';
import { keepTake, markOf, noteMisses, type AiNote, type FactSource } from '../../utils/aiPlan';

// What the AI teacher remembers about the member (AI step 2, „მეხსიერება“): students/{uid}.aiNote — the introduction's
// answers, the short voice check, the first week's days, the leaps sung wrong and the last tries (utils/aiPlan.ts). The member
// writes their own record (no rules change). Each part is written whole (`mergeFields`), so a deleted line really goes.
// Nothing is kept for a guest: the lesson is for signed-in members.

let latest: { uid: string; note: AiNote } | null = null;

const ref = (uid: string) => doc(db, 'students', uid);

/** writes the named parts of the note whole (a part set to undefined is deleted) */
export const saveAiNote = (uid: string, patch: Partial<AiNote>) => {
  const keys = Object.keys(patch) as (keyof AiNote)[];
  if (!keys.length) return Promise.resolve();
  const aiNote: Record<string, unknown> = {};
  for (const k of keys) aiNote[k] = patch[k] === undefined ? deleteField() : patch[k];
  if (latest?.uid === uid) latest = { uid, note: { ...latest.note, ...patch } };
  return setDoc(ref(uid), { aiNote }, { mergeFields: keys.map(k => `aiNote.${k}`) })
    .catch(e => console.warn('ai note:', e?.code || e));
};

/** „წაშლა“ of a notebook line: its source goes with it */
export const forgetAiNote = (uid: string, what: FactSource | 'all') => {
  if (what === 'all') {
    latest = latest?.uid === uid ? { uid, note: {} } : latest;
    return setDoc(ref(uid), { aiNote: deleteField() }, { merge: true }).catch(e => console.warn('ai note:', e?.code || e));
  }
  return saveAiNote(uid, what === 'voice' ? { voice: undefined } : what === 'misses' ? { misses: undefined } : { takes: undefined });
};

/**
 * After one sung try in the lesson: the leaps missed are counted, and a whole phrase's try is kept for the diary.
 * `target` = the notes asked (MIDI), `notes` = each note's reading (right or not, and how far off when heard).
 */
export const recordTry = (uid: string | null, piece: string, part: number, target: number[], notes: { hit: boolean; dev: number | null }[], whole: boolean) => {
  const hits = notes.map(x => x.hit);
  if (!uid || !target.length) return;
  const note = latest?.uid === uid ? latest.note : {};
  const day = georgiaToday();
  const key = `${piece}~${part}`;
  const patch: Partial<AiNote> = {};
  const misses = noteMisses(note.misses, target, hits, day, key);
  if (JSON.stringify(misses) !== JSON.stringify(note.misses ?? {})) patch.misses = misses;
  if (whole) {
    const x = target.map((_, i) => markOf(!!notes[i]?.hit, notes[i]?.dev ?? null)).join('');
    patch.takes = keepTake(note.takes, { d: day, p: key, h: hits.filter(Boolean).length, n: target.length, t: new Date().getHours(), x });
  }
  void saveAiNote(uid, patch);
};

export interface AiNoteState {
  uid: string | null;
  /** null while loading */
  note: AiNote | null;
  /** students/{uid}.drillDone: exercise → the last day done (the first week's steps) */
  drillDone: Record<string, string>;
  today: string;
}

/** the member's note, live */
export const useAiNote = (): AiNoteState => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<{ note: AiNote | null; drillDone: Record<string, string> }>({ note: null, drillDone: {} });
  useEffect(() => {
    if (!uid) { setState({ note: {}, drillDone: {} }); return; }
    return onSnapshot(ref(uid), s => {
      const d = s.data() || {};
      const note = (d.aiNote && typeof d.aiNote === 'object' ? d.aiNote : {}) as AiNote;
      latest = { uid, note };
      setState({ note, drillDone: readDrillDone(d.drillDone) });
    }, () => setState({ note: {}, drillDone: {} }));
  }, [uid]);
  return { uid, note: state.note, drillDone: state.drillDone, today: georgiaToday() };
};
