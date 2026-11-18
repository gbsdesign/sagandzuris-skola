import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context';
import { useAllClasses, useMyClasses, useTeachingClasses } from '../../../hooks/useClasses';
import { useMyPsalterGroups } from '../../../hooks/usePsalter';
import { useSelectedGroupId } from '../../../components/psalter/selectedGroup';
import { Card, FOCUS, cx } from '../../../components/ui2';
import { KATHISMA_PSALMS } from '../../../utils/psalter';

/** „მე-11 კანონი“ (the first: „პირველი კანონი“) */
export const kanonName = (k: number) => (k === 1 ? 'პირველი კანონი' : `მე-${k} კანონი`);
/** „მე-11 კანონს“ — for „ვირჩევ …“ */
export const kanonDat = (k: number) => (k === 1 ? 'პირველ კანონს' : `მე-${k} კანონს`);

/** The group this page shows and its class — chosen as the old router did (my groups, the remembered one, else the first). */
export const useGroupTarget = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { groups, loading } = useMyPsalterGroups(user?.uid);
  const selectedId = useSelectedGroupId();
  const mine = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const { classes: all } = useAllClasses(isAdmin);
  const group = groups.find(g => g.id === selectedId) || groups[0] || null;
  const cls = group ? [...mine, ...teaching, ...all].find(c => c.psalterGroupId === group.id) : undefined;
  const canLead = !!user && !!group && (isAdmin || group.teacherIds.includes(user.uid));
  return { user, groups, group, cls, loading, canLead };
};

export type Message = { text: string; ok: boolean } | null;

/** One short line of what just happened (saved / failed) — shown by `Msg`. */
export const useMsg = () => {
  const [msg, setMsg] = useState<Message>(null);
  useEffect(() => {
    if (!msg?.ok) return;
    const t = window.setTimeout(() => setMsg(null), 4000);
    return () => window.clearTimeout(t);
  }, [msg]);
  return { msg, ok: (text: string) => setMsg({ text, ok: true }), fail: (text: string) => setMsg({ text, ok: false }), clear: () => setMsg(null) };
};

export const Msg: React.FC<{ msg: Message; onClose: () => void }> = ({ msg, onClose }) => msg && (
  <Card pad="sm" role="status" onClick={onClose} className={cx('cursor-pointer text-meta font-semibold', msg.ok ? 'bg-leaf-tint text-leaf-ink' : 'bg-gold-tint text-gold-ink')}>
    {msg.text}
  </Card>
);

/** The twenty kanons as a 4×5 grid of buttons: the number and a second line; the ones that cannot be picked are grey. */
export const KanonGrid: React.FC<{
  pickable: number[];
  sel: number | null;
  onSel: (k: number | null) => void;
  /** the second line of a kanon that can be picked */
  sub: (k: number) => React.ReactNode;
  disabled?: boolean;
}> = ({ pickable, sel, onSel, sub, disabled }) => (
  <ul className="grid shrink-0 grid-cols-4 gap-2" aria-label="ოცი კანონი">
    {Array.from({ length: 20 }, (_, i) => i + 1).map(k => {
      const can = pickable.includes(k);
      const on = sel === k;
      return (
        <li key={k} className="min-w-0">
          <button
            type="button"
            disabled={!can || disabled}
            aria-pressed={on}
            aria-label={`კანონი ${k}${can ? '' : ', დაკავებულია'}`}
            onClick={() => onSel(on ? null : k)}
            className={cx(
              'flex min-h-14 w-full flex-col items-center justify-center rounded-field px-0.5 py-1.5 transition',
              on ? 'bg-wine text-white' : can ? 'bg-surf text-ink active:bg-soft' : 'bg-soft text-mut',
              can && !disabled ? 'cursor-pointer active:scale-95' : 'cursor-default',
              FOCUS,
            )}
          >
            <span className="text-lead leading-tight font-bold tabular-nums">{k}</span>
            <span className={cx('w-full text-center text-cap leading-tight tracking-tight', on ? 'text-white/85' : 'text-mut')}>
              {can ? sub(k) : 'დაკავებულია'}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

export const psalmsOf = (k: number) => `ფს. ${KATHISMA_PSALMS[k - 1]}`;
