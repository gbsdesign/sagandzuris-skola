import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { categoryOf, usesVoices, type PathCategory, type Voice } from '../../../utils/pathItems';
import { withAiPasses, type AiPass } from '../../../utils/aiPass';
import { learnedMap, pickFresh, readSeen, writeSeen, type VoiceId } from '../../../utils/learnedCard';

// The member's learned items (all marked voices confirmed by a teacher), live — students/{uid}.selectedChantVariants and
// confirmations/{uid} — and which of them this device has not shown yet (`sg-learned-seen:<uid>`).

export interface LearnedItem {
  id: string;
  name: string;
  /** the version as the path names it */
  label: string;
  voices: VoiceId[];
  voiced: boolean;
}

const KIND_WORD: Record<PathCategory, string> = { galoba: '', simghera: 'სიმღერა', mtkmeli: 'მთქმელი', sakravebi: 'საკრავი' };

/** An item's card data from its stored path record. */
export const learnedItemOf = (id: string, rec: { chantName?: string; label?: string }, voices: VoiceId[]): LearnedItem => {
  const cat = categoryOf(id);
  return { id, name: rec.chantName || '', label: cat === 'galoba' ? rec.label || '' : KIND_WORD[cat], voices, voiced: usesVoices(id) };
};

type Rec = { chantName?: string; label?: string; voices?: unknown; isLearned?: boolean };

export const useLearned = (uid: string | null) => {
  const [path, setPath] = useState<Record<string, Rec> | null>(null);
  const [conf, setConf] = useState<Record<string, unknown> | null>(null);
  const [pass, setPass] = useState<AiPass | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);

  useEffect(() => {
    setPath(null); setConf(null); setPass(null); setFresh([]);
    if (!uid) return;
    const a = onSnapshot(doc(db, 'students', uid), s => {
      setPath((s.data()?.selectedChantVariants as Record<string, Rec>) || {});
      setPass((s.data()?.aiPass as AiPass | undefined) ?? null); // the AI teacher's passed exams count like a teacher's „ჩათვლა“
    }, () => {});
    const b = onSnapshot(doc(db, 'confirmations', uid), s => setConf((s.exists() && s.data().voices) || {}), () => setConf({}));
    return () => { a(); b(); };
  }, [uid]);

  const learned = useMemo(() => (path && conf ? learnedMap(path, withAiPasses(conf as Record<string, Voice[]>, pass), usesVoices) : null), [path, conf, pass]);

  // new on this device: the first run counts what is already learned as seen
  useEffect(() => {
    if (!uid || !learned) return;
    const r = pickFresh(Object.keys(learned), readSeen(uid));
    if (r.fresh.length || readSeen(uid) === null) writeSeen(uid, r.seen);
    if (r.fresh.length) setFresh(f => [...f, ...r.fresh.filter(id => !f.includes(id))]);
  }, [uid, learned]);

  const items = useMemo(() => {
    const out: Record<string, LearnedItem> = {};
    if (path && learned) for (const id of Object.keys(learned)) out[id] = learnedItemOf(id, path[id] || {}, learned[id]);
    return out;
  }, [path, learned]);

  return { items, fresh: fresh.filter(id => items[id]), dismiss: () => setFresh([]) };
};
