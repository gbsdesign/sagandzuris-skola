import React from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../../context';
import { nameGender } from '../../../data/georgianNames';
import { useKabaSettings } from '../../../utils/kabaArt';
import { cx, Sheet } from '../../../components/ui2';
import { useChokha } from '../gza/SamosiChokha';
import { useKaba } from '../gza/SamosiKaba';

// A student's „ჩემი სამოსი“, opened from the chokha on their row in the letters' list (2026-11-22 evening, the user: „მასზე დაჭერისას
// სამოსის ფანჯარა ამოხტეს“): their figure with the parts they proved by a photo, and which parts those are — only to look.

const noop = () => {};

export const StudentOutfitSheet: React.FC<{ uid: string; name: string; onClose: () => void }> = ({ uid, name, onClose }) => {
  const { isOwner } = useAuth();
  const kabaSet = useKabaSettings();
  const chokha = useChokha({ uid, mode: 'real', openPart: noop, onCheer: noop });
  const shown = !kabaSet.published ? 'chokha' : chokha.outfit ?? (nameGender(chokha.firstName) === 'f' ? 'kaba' : 'chokha');
  const kaba = useKaba({
    uid, mode: 'real', enabled: shown === 'kaba', published: kabaSet.published, heads: kabaSet.heads, isOwner, openPart: noop, onCheer: noop,
  });
  const m = shown === 'kaba' ? kaba : chokha.model;
  const tiles = m.groups.flatMap(g => g.tiles);
  return (
    <Sheet open onClose={onClose} title={`${name} · სამოსი`}>
      <div className="flex flex-col items-center gap-3 pb-1">
        <div className="flex w-full justify-center overflow-hidden rounded-card bg-surf py-3">{m.figure}</div>
        <p className="text-body font-bold text-ink tabular-nums">
          {m.realDone} / {m.total} <span className="font-semibold text-mut">ნამდვილი ნაწილი</span>
        </p>
        {tiles.length > 0 && (
          <ul className="flex w-full flex-wrap justify-center gap-1.5">
            {tiles.map(t => (
              <li key={t.id} className={cx(
                'inline-flex h-8 items-center gap-1 rounded-full px-3 text-meta font-semibold',
                t.mark === 'real' ? 'bg-leaf/15 text-leaf' : 'bg-surf text-mut',
              )}>
                {t.mark === 'real' && <Check aria-hidden="true" className="size-3.5" />}{t.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
};
