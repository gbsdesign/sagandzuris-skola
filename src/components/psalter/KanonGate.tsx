import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useAccess } from '../../hooks/useAccess';
import { useMyClasses } from '../../hooks/useClasses';
import { PsalterGroup, TakenError, firstName, memberName, pickKanonIf, useMyPsalterGroups } from '../../hooks/usePsalter';
import { useCall } from '../../utils/callSession';
import { errorText } from '../../utils/errorText';
import { triggerHaptic } from '../../utils/haptics';
import { KATHISMA_PSALMS, cycleOf, georgiaToday, kathismasOf, ownersIn, pickableKanons, shiftDaysText, wrap } from '../../utils/psalter';
import { Btn, Sheet } from '../ui/kit';

// „აირჩიე შენი კანონი“ (the user, 2026-11-06: „კლასის წევრებს ვისაც კანონი არ აქვთ არჩეული ამოუგდოს შეტყობინება და აირჩიონ
// საკუთარი კანონი სანამ არ აირჩევენ ვერ გააგრძელონ მუშაობა“): a member of a class whose psalter group gives them no kanon gets
// a locked window over the app until they pick one — the free ones while any is free, then beside a lone reader
// (`pickableKanons`). Nothing when every kanon has two readers, when the psalter section is closed to members, offline (a pick
// needs the server), and it waits while the notes, the program, church mode or a call is open (the user's pick). The pick is
// the member's own `pickingKanon` write, made sure the kanon is still as shown (`pickKanonIf`).

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

export const KanonGate: React.FC = () => {
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
  return <KanonPicker key={shown.group.id} uid={uid} clsName={shown.cls.name} group={shown.group} onHold={setHeld} />;
};

type Stage = { at: 'choose' } | { at: 'saving' } | { at: 'done'; k: number };

export const KanonPicker: React.FC<{ uid: string; clsName: string; group: PsalterGroup; onHold: (id: string | null) => void }> = ({ uid, clsName, group, onHold }) => {
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
      <Sheet open locked onClose={() => {}} title="შენი კანონი"
        footer={<Btn size="lg" full icon={<Check />} onClick={() => onHold(null)}>გაგრძელება</Btn>}>
        <div className="py-4 flex flex-col items-center text-center">
          <span className="relative w-20 h-20 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center font-serif-ge text-[34px] font-bold tabular-nums shadow-[0_10px_24px_-12px_rgba(122,32,40,0.9)] sg-in">
            {k}
            <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 text-white ring-4 ring-white flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[3.5]" />
            </span>
          </span>
          <p className="mt-4 font-serif-ge text-xl font-bold text-[#2a2017]">კანონი {k} შენია!</p>
          <p className="mt-1 text-[15px] text-[#75685a]">ფს. {KATHISMA_PSALMS[k - 1]} · ღმერთმა შეგეწიოს!</p>
          <p className="mt-3 text-[14px] leading-snug text-[#8a7a6a]">
            ყოველი თვის {shift} რიცხვში შემდეგ კანონზე გადახვალ ({k} → {wrap(k + 1)}).
          </p>
        </div>
      </Sheet>
    );
  }

  const saving = stage.at === 'saving';
  const chosen = sel !== null ? owners[sel] || [] : [];
  const footer = (
    <div className="space-y-2.5">
      {error && <p role="alert" className="text-[14px] font-semibold leading-snug text-red-700">{error}</p>}
      {sel !== null && (
        <p className="text-[14px] leading-snug text-[#4a3426]">
          <b>კანონი {sel}</b> · ფს. {KATHISMA_PSALMS[sel - 1]}
          {chosen.length > 0 && <> · {names(chosen).join(', ')}-სთან ერთად</>}
        </p>
      )}
      <Btn size="lg" full icon={<Check />} disabled={sel === null || saving} onClick={() => void pick()}>
        {saving ? 'ინახება…' : sel === null ? 'შეეხე კანონს' : `კანონი ${sel} — ჩემია`}
      </Btn>
    </div>
  );

  return (
    <Sheet open locked onClose={() => {}} title="აირჩიე შენი კანონი" footer={footer}>
      <div className="py-1">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#8a7a6a]">
          <BookOpen className="w-4 h-4 shrink-0 text-[#7a2028]" />
          <span className="min-w-0 truncate">{clsName} · ფსალმუნი</span>
        </p>
        <p className="mt-2 text-[15px] leading-snug text-[#2a2017]">
          კლასი ერთად კითხულობს ფსალმუნს — ყველას თავისი კანონი აქვს. შენ ჯერ არ გაქვს: აირჩიე, მერე გააგრძელებ.
        </p>
        <p className="mt-2 text-[14px] leading-snug text-[#7a2028] font-semibold">
          {freeOnes ? 'თეთრები თავისუფალია — შეეხე ერთ-ერთს.' : 'თავისუფალი აღარ დარჩა — აირჩიე, ვის გვერდით წაიკითხავ.'}
        </p>

        <ul className="mt-3 grid grid-cols-4 sm:grid-cols-5 gap-1.5" aria-label="ოცი კანონი">
          {Array.from({ length: 20 }, (_, i) => i + 1).map(k => {
            const own = owners[k] || [];
            const can = pickable.includes(k);
            const on = sel === k;
            // a free one shows its psalms („ფს.“ only where it fits: 105–108 is the widest), a taken one its reader
            const sub = !own.length
              ? <><span className="max-[379px]:hidden">ფს. </span>{KATHISMA_PSALMS[k - 1]}</>
              : `${names(own)[0]}${own.length > 1 ? ` +${own.length - 1}` : ''}`;
            return (
              <li key={k}>
                <button
                  type="button"
                  disabled={!can || saving}
                  aria-pressed={on}
                  aria-label={`კანონი ${k}${can ? '' : ', დაკავებულია'}`}
                  onClick={() => { triggerHaptic(8); setError(''); setSel(on ? null : k); }}
                  className={[
                    'relative w-full h-16 rounded-xl px-1 flex flex-col items-center justify-center transition',
                    on ? 'bg-[#7a2028] text-[#fbf6ec] ring-2 ring-[#7a2028] shadow-[0_8px_18px_-10px_rgba(122,32,40,0.9)] cursor-pointer'
                      : can ? 'bg-white text-[#4a3426] ring-1 ring-[#7a2028]/30 hover:ring-[#7a2028]/60 cursor-pointer active:scale-95'
                      : 'bg-[#efe6d6]/60 text-[#4a3426]/40 cursor-default',
                  ].join(' ')}
                >
                  <span className={`font-serif-ge text-[19px] font-bold leading-none tabular-nums ${!on && can ? 'text-[#7a2028]' : ''}`}>{k}</span>
                  <span className="mt-1 w-full text-center text-xs leading-none truncate">{sub}</span>
                  {on && (
                    <span className="absolute -top-1.5 -right-1.5 w-[22px] h-[22px] rounded-full bg-emerald-600 text-white ring-2 ring-white flex items-center justify-center" aria-hidden>
                      <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] leading-snug text-[#8a7a6a]">
          ყოველი თვის {shift} რიცხვში შემდეგ კანონზე გადახვალ. შეცვლა მერე მასწავლებელს შეუძლია.
        </p>
      </div>
    </Sheet>
  );
};
