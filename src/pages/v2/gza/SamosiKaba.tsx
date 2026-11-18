import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { triggerHaptic } from '../../../utils/haptics';
import { fireworks } from '../../../utils/samosiFireworks';
import { setTried, useTried } from '../../../utils/samosiTry';
import { KabaHeads, kabaReady, useKabaArt } from '../../../utils/kabaArt';
import { KABA_PARTS, KABA_TOTAL } from '../../../data/kabaData';
import { KabaStudio } from '../../../components/views/KabaStudio';
import { KabaFigureBox } from './SamosiFigure';
import type { OutfitModel, PartState } from './SamosiChokha';
import type { SamosiMode } from './SamosiSheets';
import type { TileMark } from './SamosiView';

// „ქართული კაბა“'s part of „ჩემი სამოსი“ — the old KabaSamosi's state and rules: the parts photographed (students.kabaReal)
// and tried on now (utils/samosiTry.ts); members see the dress once the owner has published its pictures, the owner
// always, with the studio that makes them under the parts. The figure and the taps follow „ნამდვილი / მოჩვენებითი“ as
// the chokha's do (SamosiChokha.tsx).

const KNOWN = new Set(KABA_PARTS.map(p => p.id));

export const useKaba = ({ uid, mode, enabled, published, heads, isOwner, openPart, onCheer }: {
  uid: string | undefined;
  mode: SamosiMode;
  /** the kaba is the outfit shown: only then its pictures are read */
  enabled: boolean;
  published: boolean;
  heads: KabaHeads;
  isOwner: boolean;
  openPart: (id: string) => void;
  onCheer: (finale: boolean) => void;
}): OutfitModel => {
  const pieces = useKabaArt(enabled);
  const [real, setReal] = useState<string[]>([]);
  const tried = useTried(uid, 'kaba');
  const owned = useMemo(() => [...real, ...tried.filter(id => !real.includes(id))], [real, tried]);
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [shine, setShine] = useState(0);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), s => {
      const v = s.data()?.kabaReal;
      setReal(Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)) : []);
    });
  }, [uid]);

  const shown = mode === 'real' ? real : owned;
  const has = (id: string) => shown.includes(id);
  const isReal = (id: string) => real.includes(id);
  const stateOf = (id: string): PartState => (isReal(id) ? 'real' : owned.includes(id) ? 'tried' : 'none');
  const realDone = real.length;
  const visible = kabaReady(pieces) && (published || isOwner);
  const drop = (id: string) => setDrops(d => ({ ...d, [id]: (d[id] || 0) + 1 }));

  // „მოჩვენებითი“: a tap tries a part on or takes it off; a real part (or any, in „ნამდვილი“) opens its card
  const tap = (id: string) => {
    if (!uid || !KNOWN.has(id)) return;
    if (mode === 'real' || isReal(id)) return openPart(id);
    const adding = !owned.includes(id);
    setTried(uid, 'kaba', adding ? [...tried, id] : tried.filter(t => t !== id));
    triggerHaptic(adding ? 25 : 10);
    if (adding) {
      drop(id);
      if (owned.length + 1 === KABA_TOTAL) setShine(s => s + 1);
    }
  };

  // the AI saw the real part: the dress's for good — the cheer and the fireworks are for this
  const proved = (id: string) => {
    if (!uid) return;
    setTried(uid, 'kaba', tried.filter(t => t !== id));
    const finale = realDone + 1 === KABA_TOTAL && !real.includes(id);
    triggerHaptic(40);
    drop(id);
    onCheer(finale);
    fireworks(finale);
    if (finale) setShine(s => s + 1);
  };
  const unproved = (id: string) => {
    if (uid && !tried.includes(id)) setTried(uid, 'kaba', [...tried, id]);
  };

  const markOf = (id: string): TileMark => (isReal(id) ? 'real' : mode === 'tried' && owned.includes(id) ? 'tried' : 'none');

  return {
    realDone,
    total: KABA_TOTAL,
    figure: !pieces
      ? <p className="text-body text-mut">იტვირთება…</p>
      : visible
        ? <KabaFigureBox pieces={pieces} on={has} drops={drops} shine={shown.length === KABA_TOTAL ? shine : null} heads={heads} />
        : <p className="px-4 text-center text-body text-mut">კაბის სურათები ჯერ მზადდება.</p>,
    groups: visible ? [{ tiles: KABA_PARTS.map(p => ({ id: p.id, label: p.label, mark: markOf(p.id) })) }] : [],
    tap,
    part: id => {
      const p = KABA_PARTS.find(x => x.id === id);
      const thumb = p && pieces?.[p.id]?.thumb;
      return p && { id: p.id, label: p.label, story: p.story, pic: thumb ? <img src={thumb} alt="" className="size-10 object-contain" /> : null };
    },
    stateOf,
    proved,
    unproved,
    nextId: visible ? KABA_PARTS.find(p => !isReal(p.id))?.id ?? null : null,
    footer: isOwner && pieces ? <KabaStudio pieces={pieces} published={published} heads={heads} /> : undefined,
  };
};
