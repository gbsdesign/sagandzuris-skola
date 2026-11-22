import React, { useState } from 'react';
import { Camera, Check } from 'lucide-react';
import { useAuth } from '../../../context';
import { nameGender } from '../../../data/georgianNames';
import { useKabaSettings } from '../../../utils/kabaArt';
import { cx, Sheet } from '../../../components/ui2';
import { useChokha } from '../gza/SamosiChokha';
import { useKaba } from '../gza/SamosiKaba';
import { PartSheet } from '../gza/SamosiPartSheet';

// A student's „ჩემი სამოსი“, opened from the chokha on their row in the letters' list (2026-11-22 evening, the user: „მასზე დაჭერისას
// სამოსის ფანჯარა ამოხტეს“): their figure with the parts they proved by a photo, and which parts those are — only to look.

const noop = () => {};

export const StudentOutfitSheet: React.FC<{ uid: string; name: string; onClose: () => void }> = ({ uid, name, onClose }) => {
  const { isOwner } = useAuth();
  const kabaSet = useKabaSettings();
  const [partId, setPartId] = useState<string | null>(null);
  const chokha = useChokha({ uid, mode: 'real', openPart: setPartId, onCheer: noop });
  const shown = !kabaSet.published ? 'chokha' : chokha.outfit ?? (nameGender(chokha.firstName) === 'f' ? 'kaba' : 'chokha');
  const kaba = useKaba({
    uid, mode: 'real', enabled: shown === 'kaba', published: kabaSet.published, heads: kabaSet.heads, isOwner, openPart: setPartId, onCheer: noop,
  });
  const m = shown === 'kaba' ? kaba : chokha.model;
  const tiles = m.groups.flatMap(g => g.tiles);
  const part = partId ? m.part(partId) : undefined;
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
              <li key={t.id}>
                <button type="button" onClick={() => m.tap(t.id)} className={cx(
                  'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-meta font-semibold active:scale-95 transition-transform',
                  t.mark === 'real' ? 'bg-leaf/15 text-leaf' : 'bg-surf text-ink',
                )}>
                  {t.mark === 'real'
                    ? <Check aria-hidden="true" className="size-4" />
                    : <Camera aria-hidden="true" className="size-4 text-mut" />}
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-meta text-mut">ნაწილზე დააჭირე — გადაუღე ფოტო და მოინიშნება</p>
      </div>
      {part && (
        <PartSheet
          key={`${shown}-${part.id}`}
          outfit={shown}
          part={part}
          pic={part.pic}
          real={m.stateOf(part.id) === 'real'}
          forUid={uid}
          onClose={() => setPartId(null)}
          onProved={id => { m.proved(id); setPartId(null); }}
          onRemoved={m.unproved}
        />
      )}
    </Sheet>
  );
};
