import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, Check, CirclePause, CirclePlay, Trash2, UserMinus } from 'lucide-react';
import { useAuth } from '../../../context';
import type { SchoolClass } from '../../../hooks/useClasses';
import { askConfirm } from '../../../components/ui/kit';
import { Button, cx, Press } from '../../../components/ui2';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import { deleteMember, moveMember, readMemberState, resumeMember, suspendMember, type MemberState } from '../../../utils/memberRemoval';

// The superadmin's part of a member's long-press menu in the „სწავლა“ list (2026-11-22, the user: „წევრზე დაჭერისას … წაშლა
// სკოლიდან … შეჩერება დროებით … კლასიდან კლასში გადაყვანა ან კლასის გარეშე დატოვება“; superadmins only).

export const MemberActions: React.FC<{
  member: { uid: string; name: string; photoURL?: string }; classes: SchoolClass[]; onDone: (msg: string) => void;
}> = ({ member, classes, onDone }) => {
  const { user } = useAuth();
  const by = user?.email || user?.uid || '';
  const [state, setState] = useState<MemberState | null>(null);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { readMemberState(member.uid).then(setState, () => setState(null)); }, [member.uid]);
  const inNow = classes.filter(c => c.memberIds.includes(member.uid));

  const run = async (f: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await f(); onDone(msg); } catch { onDone('ვერ მოხერხდა — სცადე თავიდან.'); } finally { setBusy(false); }
  };
  const suspended = state?.status === 'suspended';

  return (
    <div className="flex flex-col gap-2.5 border-t border-line pt-3">
      <p className="px-1.5 text-meta font-semibold text-mut">სუპერადმინი</p>
      <Button kind="ghost" full icon={<ArrowRightLeft />} aria-expanded={moving} onClick={() => setMoving(v => !v)}>კლასის შეცვლა</Button>
      {moving && (
        <div className="flex flex-col divide-y divide-line overflow-hidden rounded-tile bg-surf">
          {inNow.length > 0 && <p className="px-4 py-2 text-meta text-mut">ახლა: {inNow.map(c => c.name).join(', ')}</p>}
          {classes.map(c => {
            const here = inNow.length === 1 && inNow[0].id === c.id;
            return (
              <Press key={c.id} disabled={busy || here}
                onClick={() => void run(() => moveMember(member, classes, c), `${member.name} — „${c.name}“`)}
                className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-soft disabled:cursor-default">
                <ClassLogo name={c.name} logo={c.logo} className="size-8 text-body" />
                <span className="min-w-0 flex-1 truncate text-body font-semibold">{c.name}</span>
                {here && <Check aria-hidden="true" className="size-4 text-wine" />}
              </Press>
            );
          })}
          <Press disabled={busy || inNow.length === 0}
            onClick={() => void run(() => moveMember(member, classes, null), `${member.name} — კლასის გარეშე`)}
            className={cx('flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-soft disabled:cursor-default', inNow.length === 0 && 'opacity-60')}>
            <UserMinus aria-hidden="true" className="size-5 text-mut" />
            <span className="flex-1 text-body font-semibold">კლასის გარეშე (მხოლოდ ჩათები)</span>
          </Press>
        </div>
      )}
      <Button kind="ghost" full disabled={busy || !state} icon={suspended ? <CirclePlay /> : <CirclePause />}
        onClick={() => void (suspended
          ? run(() => resumeMember(member.uid, by), `${member.name} — შეჩერება მოიხსნა`)
          : askConfirm({ title: `${member.name} — დროებით შეჩერება?`, text: 'შესვლისას „404 · ხარვეზი“ დაეწერება, სანამ შეჩერებას არ მოხსნი.', ok: 'შეჩერება' })
            .then(ok => { if (ok) void run(() => suspendMember(member.uid, by), `${member.name} — შეჩერებულია`); }))}>
        {suspended ? 'შეჩერების მოხსნა' : 'დროებით შეჩერება'}
      </Button>
      <Button kind="ghost" full disabled={busy || !state} icon={<Trash2 />} className="text-danger"
        onClick={() => void askConfirm({ title: `${member.name} — სკოლიდან წაშლა?`, text: 'კლასებიდან ამოვა და „წაშლილებში“ გადავა (ადმინის პანელი). იქიდან აღდგენა ან სამუდამოდ წაშლა შეიძლება.', ok: 'წაშლა', danger: true })
          .then(ok => { if (ok) void run(() => deleteMember(member.uid, by, classes), `${member.name} — წაიშალა`); })}>
        სკოლიდან წაშლა
      </Button>
    </div>
  );
};
