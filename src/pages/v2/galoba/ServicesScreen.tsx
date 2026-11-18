import React, { useCallback, useMemo } from 'react';
import { ChevronRight, ListOrdered } from 'lucide-react';
import { useNavigation, useAuth, ServiceType } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useAccess } from '../../../hooks/useAccess';
import { LITURGY_TITLE } from '../../../hooks/useLiturgy';
import { Row, Rows, RoundButton, SectionLabel, TopBar } from '../../../components/ui2';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { WorshipSwitch } from '../../galoba/WorshipSwitch';
import { SECTIONS } from '../../galoba/ServiceTabs';
import { SERVICE_CHANTS, ChantHit } from '../../galoba/chantSearch';
import { SearchField, SearchResults } from '../../galoba/SearchResults';
import { useMyClasses } from '../../../hooks/useClasses';
import { ChantItem } from '../../../data';
import { triggerHaptic } from '../../../utils/haptics';
import { prepareSearch } from '../../../utils/searchUtils';

/** The „current service“ button of the bar (same logic as the old ProgramButton). */
const ProgramRound: React.FC = () => {
  const { liturgy, program, openProgram } = useNotes();
  if (liturgy.role === 'guest' || (liturgy.role === 'member' && !program)) return null;
  return (
    <RoundButton label={LITURGY_TITLE} onClick={() => { triggerHaptic(10); openProgram(); }}>
      <ListOrdered aria-hidden="true" strokeWidth={1.75} />
    </RoundButton>
  );
};

type Section = (typeof SECTIONS)[number];

/** x-msakhurebebi — the services as one card of rows, the four rarer ones under „სხვა მსახურებები“. */
export const ServicesScreen: React.FC = () => {
  const { setSelectedService, setExpandedChantId, chantSearch, setChantSearch } = useNavigation();
  const { can } = useAccess();
  const { user, isTeacher } = useAuth();
  const myClasses = useMyClasses(user?.uid);
  const ownSearch = !can('search');
  const { handleGoBack } = useNavigation();

  // class mode keeps the search in everything to the program's chants
  const modeClass = isTeacher ? undefined : myClasses.find(c => c.classMode && c.program.some(p => p.id));
  const showAll = (() => { try { return sessionStorage.getItem('sg-class-mode-all') === '1'; } catch { return false; } })();
  const keepChant = useMemo(() => {
    if (!modeClass || showAll) return undefined;
    const ids = new Set(modeClass.program.map(p => p.id).filter(Boolean) as string[]);
    return (c: ChantItem) => (c.variants || []).some(v => ids.has(v.id));
  }, [modeClass, showAll]);

  const query = useMemo(() => prepareSearch(chantSearch || ''), [chantSearch]);
  const allQuery = ownSearch ? query : null;

  const openHit = useCallback((hit: ChantHit) => {
    setSelectedService(hit.service);
    setExpandedChantId(hit.chant.id);
    window.scrollTo({ top: 0 });
  }, [setSelectedService, setExpandedChantId]);

  const main = SECTIONS.filter(s => s.service && !s.other);
  const other = SECTIONS.filter(s => s.service && s.other);
  const soon = SECTIONS.filter(s => !s.service).map(s => s.title);

  const row = (s: Section) => (
    <Row
      key={s.title}
      title={s.title}
      sub={s.note}
      onClick={() => { triggerHaptic(15); setSelectedService(s.service as ServiceType); }}
      right={
        <>
          <span className="shrink-0 text-lead font-bold text-wine tabular-nums">{SERVICE_CHANTS[s.service!].length}</span>
          <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
        </>
      }
    />
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5 pb-4">
      <TopBar title="ღვთისმსახურება" onBack={handleGoBack} right={<><ProgramRound /><OfflineButton kind="galoba" /></>} />
      <WorshipSwitch value="galoba" />
      {ownSearch && <SearchField value={chantSearch || ''} onChange={setChantSearch} placeholder="ძიება ყველა მსახურებაში" />}
      {allQuery ? (
        <div className="min-h-[60vh]">
          <SearchResults query={allQuery} keepChant={keepChant} onOpenChant={openHit} />
        </div>
      ) : (
        <>
          <Rows>{main.map(row)}</Rows>
          {other.length > 0 && (
            <>
              <SectionLabel label="სხვა მსახურებები" />
              <Rows>{other.map(row)}</Rows>
            </>
          )}
          {soon.length > 0 && (
            <p className="px-1.5 text-meta leading-snug text-mut"><span className="font-semibold">მალე:</span> {soon.join(' · ')}</p>
          )}
        </>
      )}
    </div>
  );
};

export default ServicesScreen;
