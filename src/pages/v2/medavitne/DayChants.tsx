import React from 'react';
import { Music, X } from 'lucide-react';
import { useAuth } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { Dot, Row, Rows, SectionLabel } from '../../../components/ui2';
import { chantLookupNow, useChantLookupReady } from '../../../data/chantLookupLazy';
import { versionTitle } from '../../../data/tsirvaChants';
import { removeDayChant, tbilisiToday, useDayChants } from '../../../utils/dayChants';

/** The chants this member put into the day's service from a version's long-press window (utils/dayChants.ts). */
/** `now`: the page shows what is served now (in the evening that is tomorrow's vespers) — today's additions count too */
export const DayChants: React.FC<{ iso: string; now?: boolean }> = ({ iso, now }) => {
  const { user } = useAuth();
  const { openNotes } = useNotes();
  const all = useDayChants(user?.uid);
  const today = tbilisiToday();
  const days = now && today !== iso ? [today, iso] : [iso];
  const rows = days.flatMap(d => (all[d] ?? []).map(id => ({ d, id })));
  const ids = rows.map(r => r.id);
  useChantLookupReady(ids.length > 0);
  if (!user || !ids.length) return null;
  const look = chantLookupNow();
  return (
    <div className="flex flex-col gap-1.5">
      <SectionLabel label={`ჩემი დამატებული საგალობლები · ${ids.length}`} />
      <Rows>
        {rows.map(({ d, id }) => {
          const v = look?.findVersion(id);
          return (
            <Row key={d + id} lead={<Dot icon={<Music />} />} title={v ? versionTitle(v.chant, v.variant) : '…'} wrap
              onClick={() => openNotes(id, 'list')}
              right={(
                <button type="button" aria-label="ამოღება" onClick={e => { e.stopPropagation(); void removeDayChant(user.uid, d, id); }}
                  className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-mut active:bg-soft">
                  <X className="size-[18px]" strokeWidth={2} aria-hidden="true" />
                </button>
              )} />
          );
        })}
      </Rows>
    </div>
  );
};
