import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../../../context';
import { useNotes } from '../../../context/NotesContext';
import { useAccess } from '../../../hooks/useAccess';
import { useMyClasses } from '../../../hooks/useClasses';
import { PsalterGroup, TakenError, firstName, memberName, pickKanonIf, useMyPsalterGroups } from '../../../hooks/usePsalter';
import { useCall } from '../../../utils/callSession';
import { errorText } from '../../../utils/errorText';
import { triggerHaptic } from '../../../utils/haptics';
import { cycleOf, georgiaToday, kathismasOf, ownersIn, pickableKanons, shiftDaysText, wrap } from '../../../utils/psalter';
import { Button, Helper, Note } from '../../../components/ui2';
import { KanonGrid, kanonDat, kanonName, psalmsOf } from './parts';

// x-kanonis-archeva — „აირჩიე შენი კანონი“ in the new look: the same locked window as the old `components/psalter/KanonGate.tsx`
// (same conditions, same save `pickKanonIf`), restyled: a 4×5 grid, the big button says the pick, then „შენია!“ + „გაგრძელება“.
// The app renders `KanonGateV2` in place of the old one when the new look is on (no props, as the old).

const useOnline = () => {
  const [on, setOn] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
};

const ownersNow = (g: PsalterGroup) => ownersIn(g.assignment, g.baseHalf, cycleOf(georgiaToday(), g.cycleDays, g.shiftDays).half);

export const KanonGateV2: React.FC = () => {
  const { user } = useAuth();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const open = useAccess().section('medavitneoba') === 'open';
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const online = useOnline();
  const classes = useMyClasses(open ? uid : null);
  const { groups } = useMyPsalterGroups(open ? uid : null);
  // the window stays on the group it opened for until „გაგრძელება“, even once the pick has made it unneeded
  const [held, setHeld] = useState<string | null>(null);

  const waiting = useMemo(() => {
    if (!uid) return [];
    return classes
      .filter(c => c.psalterGroupId && !c.teacherIds.includes(uid))
      .map(c => ({ cls: c, group: groups.find(g => g.id === c.psalterGroupId && g.memberIds.includes(uid)) }))
      .filter((x): x is { cls: typeof x.cls; group: PsalterGroup } => {
        if (!x.group) return false;
        const owners = ownersNow(x.group);
        return !kathismasOf(owners, uid).length && pickableKanons(owners).length > 0;
      });
  }, [classes, groups, uid]);

  const heldOne = held ? classes.map(c => ({ cls: c, group: groups.find(g => g.id === held && c.psalterGroupId === held) })).find(x => x.group) : undefined;
  const shown = heldOne?.group ? { cls: heldOne.cls, group: heldOne.group } : waiting[0];

  if (!uid || !open || !shown) return null;
  if (!held && (!online || notes || programOpen || church || call.status !== 'idle')) return null;
  return <KanonPickerV2 key={shown.group.id} uid={uid} clsName={shown.cls.name} group={shown.group} onHold={setHeld} />;
};

/** A window that cannot be closed: dimmed page, a sheet from the bottom with no ✕ (the Sheet of the kit always has one). */
const Locked: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => createPortal(
  <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
    <div aria-hidden="true" className="sg-in absolute inset-0 bg-ink/40" />
    <section role="dialog" aria-modal="true" aria-label={title}
      className="sg-up relative flex max-h-[92dvh] w-full max-w-[560px] flex-col gap-3 rounded-t-card bg-page px-4 pt-2.5 pb-[max(20px,env(safe-area-inset-bottom))] text-ink shadow-sheet outline-none sm:rounded-card sm:pt-4">
      <span aria-hidden="true" className="h-1 w-10 shrink-0 self-center rounded-full bg-dim sm:hidden" />
      <h2 className="shrink-0 pl-1 text-title font-bold">{title}</h2>
      <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-0.5">{children}</div>
    </section>
  </div>,
  document.body,
);

type Stage = { at: 'choose' } | { at: 'saving' } | { at: 'done'; k: number };

export const KanonPickerV2: React.FC<{ uid: string; clsName: string; group: PsalterGroup; onHold: (id: string | null) => void }> = ({ uid, clsName, group, onHold }) => {
  const owners = ownersNow(group);
  const pickable = pickableKanons(owners);
  const freeOnes = pickable.every(k => !(owners[k] || []).length);
  const [sel, setSel] = useState<number | null>(null);
  const [stage, setStage] = useState<Stage>({ at: 'choose' });
  const [error, setError] = useState('');
  const mine = kathismasOf(owners, uid);
  // someone took the chosen one meanwhile: the choice goes
  useEffect(() => { if (sel !== null && stage.at === 'choose' && !pickable.includes(sel)) setSel(null); }, [pickable.join(','), sel, stage.at]); // eslint-disable-line react-hooks/exhaustive-deps

  const names = (list: string[]) => list.map(u => firstName(memberName(group, u)));
  const shift = shiftDaysText(group.shiftDays);

  const pick = async () => {
    if (sel === null) return;
    const k = sel;
    setError('');
    setStage({ at: 'saving' });
    onHold(group.id);
    try {
      await pickKanonIf(group.id, k, uid, (owners[k] || []).length);
      triggerHaptic(25);
      setStage({ at: 'done', k });
    } catch (e) {
      onHold(null);
      setStage({ at: 'choose' });
      setSel(null);
      setError(e instanceof TakenError || String((e as { code?: string })?.code || '').includes('permission-denied')
        ? `კანონი ${k} ახლახან სხვამ აირჩია — აირჩიე სხვა.`
        : `ვერ შეინახა. ${errorText(e)}`);
    }
  };

  if (stage.at === 'done' || (stage.at === 'saving' && mine.length)) {
    const k = stage.at === 'done' ? stage.k : mine[0];
    return (
      <Locked title="შენი კანონი">
        <div className="flex flex-col items-center py-4 text-center">
          <span className="relative flex size-20 items-center justify-center rounded-tile bg-wine text-hero font-bold text-white tabular-nums sg-in">
            {k}
            <span className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-leaf text-white">
              <Check className="size-4" strokeWidth={3.5} />
            </span>
          </span>
          <p className="mt-4 text-title font-bold">{kanonName(k)} შენია!</p>
          <p className="mt-1 text-body text-mut">{psalmsOf(k)} · ღმერთმა შეგეწიოს!</p>
          <p className="mt-3 text-meta leading-snug text-mut">ყოველი თვის {shift} რიცხვში შემდეგ კანონზე გადახვალ ({k} → {wrap(k + 1)}).</p>
        </div>
        <Button full icon={<Check />} onClick={() => onHold(null)}>გაგრძელება</Button>
      </Locked>
    );
  }

  const saving = stage.at === 'saving';
  const chosen = sel !== null ? owners[sel] || [] : [];
  return (
    <Locked title="აირჩიე შენი კანონი">
      <p className="text-body leading-snug text-mut">
        {clsName} ფსალმუნს ერთად კითხულობს. ყველას თავისი კანონი აქვს — შენ ჯერ არა.
      </p>
      <KanonGrid pickable={pickable} sel={sel} onSel={k => { setError(''); setSel(k); }} disabled={saving}
        sub={k => (freeOnes || !(owners[k] || []).length ? psalmsOf(k) : `${names(owners[k])[0]}${owners[k].length > 1 ? ` +${owners[k].length - 1}` : ''}`)} />
      {!freeOnes && <Helper>თავისუფალი აღარ დარჩა — აირჩიე, ვის გვერდით წაიკითხავ.</Helper>}
      {chosen.length > 0 && <Helper>{names(chosen).join(', ')}-სთან ერთად წაიკითხავ.</Helper>}
      <Note>ყოველი თვის {shift} რიცხვში შემდეგ კანონზე გადახვალ. შეცვლა მერე მასწავლებელს შეუძლია.</Note>
      {error && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
      <Button full icon={<Check />} disabled={sel === null || saving} onClick={() => void pick()}>
        {saving ? 'ინახება…' : sel === null ? 'აირჩიე კანონი' : `ვირჩევ ${kanonDat(sel)}`}
      </Button>
    </Locked>
  );
};

export default KanonGateV2;
