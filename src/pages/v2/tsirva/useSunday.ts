import { useEffect, useMemo, useState } from 'react';
import { useAuth, useChants } from '../../../context';
import { useAllLearning } from '../../../hooks/useLearning';
import { useConfirmations } from '../../../hooks/useConfirmations';
import { useLiturgy } from '../../../hooks/useLiturgy';
import { chantLookupNow, loadChantLookup, useChantLookupReady } from '../../../data/chantLookupLazy';
import { CHESTS } from '../../../data/pearls';
import { useCalendarDay } from '../../../data/churchCalendar';
import { toneOf } from '../../../utils/dayReadings';
import { chantName } from '../../../utils/pearls';
import { georgiaToday } from '../../../utils/psalter';
import { comingSunday, groupChants, readyOf, type SundayChant } from '../../../utils/sundayReady';

// „კვირის წირვა“'s data: which chants (never invented) and what the member knows of them.
// 1) the class's own program for that Sunday, if the teacher sent one (hooks/useLiturgy — „დღევანდელი წირვა“, items = version ids);
// 2) else the Liturgy's main chants: the Sunday's tone chants (წარდგომა, ალილუია — utils/toneChants, the calendar's tone)
//    and the first ten of the school's Liturgy list (data/pearls CHESTS[0], vol. IX №58–77, in the service's order).

/** the fallback list is kept short: what a member would sing, not the whole book */
export const MAIN_CHANTS = 10;

export const useSunday = () => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const today = georgiaToday();
  const sunday = comingSunday(today);
  const ready = useChantLookupReady(true);
  const learn = useAllLearning(uid);
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(uid, { withAi: true });
  const { program } = useLiturgy();
  const day = useCalendarDay(sunday);
  const tone = day ? toneOf(day) : null;
  const dayKnown = day !== undefined;

  // the tone's Sunday chants of the Liturgy (a lazy part: the books are big)
  const [toneVids, setToneVids] = useState<string[] | null>(null);
  useEffect(() => {
    if (!dayKnown) return;
    if (!tone) { setToneVids([]); return; }
    let alive = true;
    loadChantLookup().then(() => import('../../../utils/toneChants')).then(m => {
      if (!alive) return;
      const g = m.toneChants(tone).find(x => x.service === 'ლიტურგიაზე');
      setToneVids((g?.rows ?? []).map(r => r.versions[0]?.vid).filter((v): v is string => !!v));
    }).catch(() => alive && setToneVids([]));
    return () => { alive = false; };
  }, [tone, dayKnown]);

  const fromProgram = !!program && program.date === sunday && program.items.length > 0;
  const chants: SundayChant[] | null = useMemo(() => {
    const books = ready ? chantLookupNow() : null;
    if (!books) return null;
    if (!fromProgram && toneVids === null) return null;
    const resolve = (vid: string) => {
      const v = books.findVersion(vid);
      if (!v) return null;
      const withNotes = (v.chant.variants ?? []).filter(x => x.bookNums?.length).map(x => x.id);
      return { key: v.chant.id, title: chantName(v.chant.title), vids: withNotes.length ? withNotes : [vid] };
    };
    const vids = fromProgram ? program!.items : [...(toneVids ?? []), ...CHESTS[0].pearls.slice(0, MAIN_CHANTS)];
    return groupChants(vids, resolve);
  }, [ready, fromProgram, program, toneVids]);

  const result = useMemo(() => {
    if (!chants || !learn) return null;
    return readyOf(chants, { learning: learn.learning, parts: learn.parts, path: selectedChantVariants as never, confirmed, today });
  }, [chants, learn, selectedChantVariants, confirmed, today]);

  return { uid, sunday, today, source: fromProgram ? 'program' as const : 'main' as const, className: fromProgram ? program!.className : undefined, result };
};
