import { useMemo } from 'react';
import { useAuth, useChants } from '../../../context';
import { usePathStats } from '../../../components/views/PathSummary';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { useConfirmations } from '../../../hooks/useConfirmations';
import { ownVoices } from '../../../hooks/useClassMarks';
import { useAllLearning } from '../../../hooks/useLearning';

// What „საგანძურის გზა“ counts (the old path page's numbers, components/views/PathOrbs.tsx).

/** „საგანძური“'s count as the old round button had it (2026-11-09, the user: „ნასწავლი/სასწავლი … და პროგრამაში შემავალი რაც
 *  იქნება ჯამში“): the path's items and the programs of the classes I learn in, each once; learned = a voice of it known (mine
 *  or a teacher's „ჩათვლა“). */
export const useLearnCount = () => {
  const { user } = useAuth();
  const stats = usePathStats();
  const myClasses = useAllMyClasses();
  const { selectedChantVariants = {} } = useChants();
  const confirmed = useConfirmations(user?.uid);
  const count = useMemo(() => {
    const teaching = myClasses.filter(c => !!user && c.teacherIds.includes(user.uid));
    const ids = new Set(stats.categories.flatMap(c => [...c.done, ...c.todo].map(it => it.variantId)));
    const extra = new Set<string>();
    for (const c of myClasses) {
      if (teaching.includes(c)) continue;
      for (const p of c.program) if (p.id && !ids.has(p.id)) extra.add(p.id);
    }
    const extraLearned = [...extra].filter(id => ownVoices(selectedChantVariants, confirmed, id).known.length > 0).length;
    return { learned: stats.learned + extraLearned, total: stats.total + extra.size };
  }, [stats, myClasses, user, selectedChantVariants, confirmed]);
  return { stats, count, confirmed };
};

/** A new member (x-carieli-gza): nothing marked on the path, nothing a teacher counted, no phrase learned yet. */
export const useIsNewMember = (stats: ReturnType<typeof usePathStats>, confirmed: Record<string, unknown>) => {
  const { user } = useAuth();
  const learning = useAllLearning(user?.uid);
  const anyPhrase = !!learning && Object.values(learning.learning).some(rec =>
    Object.values(rec || {}).some(p => (p?.level ?? 0) >= 1));
  const anyConfirmed = Object.values(confirmed).some(v => Array.isArray(v) && v.length > 0);
  // (until the record answers, the usual page: most members are not new)
  if (user && !learning) return false;
  return stats.learned === 0 && !anyConfirmed && !anyPhrase;
};
