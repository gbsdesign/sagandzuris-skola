import React, { useState } from 'react';
import { Bookmark, BookmarkCheck, CalendarDays, GraduationCap, ListPlus } from 'lucide-react';
import { useAuth, useChants } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { Dot, Row, Rows, Sheet } from '../../../components/ui2';
import { AttachFlow } from '../../../components/attach/AttachFlow';
import { useCanAttach, type AttachEntry } from '../../../components/attach/AttachButton';
import type { ChantItem, ChantVariant } from '../../../data';
import { versionTitle } from '../../../data/tsirvaChants';
import { addDayChant, removeDayChant, tbilisiToday, useDayChants } from '../../../utils/dayChants';
import { triggerHaptic } from '../../../utils/haptics';
import { errorText } from '../../../utils/errorText';

// A version card's long press (2026-11-22, the user: „დიდხანს დაჭერისას ამოვიდეს ფანჯარა … კლასის პროგრამაში და ინდივიდუალურ
// პროგრამაშიც მიმაგრება … დღის მსახურებაში მონიშვნა“): my treasury (the old 🔖), today's liturgy (the old ≡+, the regent), today's
// day service, and for teachers and admins one way „კლასს ან მოსწავლეს“ (the same evening, the user: „მოსწავლეზე მიმაგრება არ
// მუშაობს … კლასის გარეშე წევრები არ ჩანს … გაორებული ფუნქციები“): the class list once, a class = its whole program on top and
// each member's path under it, each line saying whether it is there; an admin also gets the members of no class.
// That flow is shared with every section since 2026-11-23: components/attach/AttachFlow.

type Step = 'main' | 'attach';

export const VersionMenu: React.FC<{ chant: ChantItem; variant: ChantVariant; hasNotes: boolean; onClose: () => void }> = ({ chant, variant, hasNotes, onClose }) => {
  const { user } = useAuth();
  const { selectedChantVariants = {}, toggleVariantSelection } = useChants();
  const { liturgy } = useNotes();
  const canAttach = useCanAttach();
  const day = useDayChants(user?.uid);
  const [step, setStep] = useState<Step>('main');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const id = variant.id;
  const title = versionTitle(chant, variant);
  const mine = !!selectedChantVariants[id];
  const progAt = liturgy.role === 'teacher' && hasNotes ? (liturgy.program?.items.indexOf(id) ?? -1) : null;
  const today = tbilisiToday();
  const inDay = (day[today] ?? []).includes(id);
  const said = (t: string) => { triggerHaptic(10); setErr(''); setNote(t); };
  const failed = (e: unknown) => { setNote(''); setErr('ვერ შეინახა: ' + errorText(e)); };
  const entry: AttachEntry = {
    id, title, code: variant.code,
    item: () => ({ variantId: id, chantId: chant.id, chantName: chant.title, code: variant.code, label: variant.label, fullTitle: title, isLearned: false, voices: [] }),
  };

  return (
    <Sheet open title={title} onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {step === 'main' && note && <p className="px-1 text-meta font-semibold text-leaf" role="status">{note}</p>}
        {step === 'main' && err && <p className="px-1 text-meta font-semibold text-danger" role="alert">{err}</p>}

        {step === 'main' && (
          <Rows>
            <Row lead={<Dot icon={mine ? <BookmarkCheck /> : <Bookmark />} color={mine ? 'leaf' : undefined} />}
              title={mine ? 'ჩემი საგანძურიდან ამოღება' : 'ჩემს საგანძურში დამატება'} right={null}
              onClick={() => { toggleVariantSelection?.(chant, variant); if (user) said(mine ? 'საგანძურიდან ამოვიდა' : 'საგანძურში ჩაჯდა'); else onClose(); }} />
            {progAt !== null && (
              <Row lead={<Dot icon={<ListPlus />} color={progAt >= 0 ? 'wine' : undefined} />}
                title={progAt >= 0 ? 'დღევანდელი წირვიდან ამოღება' : 'დღევანდელ წირვაში დამატება'}
                sub={progAt >= 0 ? `წირვაშია, №${progAt + 1}` : undefined} right={null}
                onClick={() => { liturgy.toggle(id); said(progAt >= 0 ? 'წირვიდან ამოვიდა' : 'წირვაში ჩაჯდა'); }} />
            )}
            {user && (
              <Row lead={<Dot icon={<CalendarDays />} color={inDay ? 'wine' : undefined} />}
                title={inDay ? 'დღის მსახურებიდან ამოღება' : 'დღის მსახურებაში დამატება'} sub="დღეს, ჩემთვის" right={null}
                onClick={() => (inDay ? removeDayChant(user.uid, today, id) : addDayChant(user.uid, today, id))
                  .then(() => said(inDay ? 'დღის მსახურებიდან ამოვიდა' : 'დღის მსახურებაში ჩაჯდა'), failed)} />
            )}
            {canAttach && (
              <Row lead={<Dot icon={<GraduationCap />} />} title="კლასს ან მოსწავლეს მიმაგრება" sub="პროგრამაში ან მოსწავლის გზაზე"
                onClick={() => { setNote(''); setErr(''); setStep('attach'); }} />
            )}
          </Rows>
        )}

        {step === 'attach' && <AttachFlow entry={entry} onExit={() => setStep('main')} />}
      </div>
    </Sheet>
  );
};
