import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { pearlCounts } from '../../../utils/pathPearls';
import { SAMOSI_DEFAULT_COLOR, SAMOSI_PARTS, SAMOSI_TOTAL, samosiDone } from '../../../data/samosiData';
import { KABA_PARTS, KABA_TOTAL } from '../../../data/kabaData';

// Every student's pearls (the items of their path with a voice marked) and their outfit („ჩემი სამოსი“: the parts proved by a
// photo, of the outfit they chose), for the letters' list on a teacher's / the administration's side. One live listener a
// student, shared by every list that asks (the user, 2026-11-22: „განახლებას აგვიანებს … სანამ არ დარეფრეშდება“), counted
// again on every change. A record that can't be read gives nothing (no wrong 0).

export interface OutfitBadge { have: number; total: number; color: string }
type Kept = { n: number; outfit?: OutfitBadge };

const CHOKHA_IDS = new Set(SAMOSI_PARTS.map(p => p.id));
const KABA_IDS = new Set(KABA_PARTS.map(p => p.id));
const ids = (v: unknown, known: Set<string>) =>
  Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && known.has(id)) : [];

const kept = new Map<string, Kept>();
const live = new Map<string, { users: number; stop: () => void }>();
const redraws = new Set<() => void>();

const listen = (uid: string) => {
  const now = live.get(uid);
  if (now) { now.users++; return; }
  const stop = onSnapshot(doc(db, 'students', uid),
    s => {
      const d = s.data() || {};
      const kaba = d.samosiOutfit === 'kaba';
      const outfit: OutfitBadge = kaba
        ? { have: ids(d.kabaReal, KABA_IDS).length, total: KABA_TOTAL, color: SAMOSI_DEFAULT_COLOR }
        : {
          have: samosiDone(ids(d.samosiReal, CHOKHA_IDS)),
          total: SAMOSI_TOTAL,
          color: typeof d.samosiColor === 'string' ? d.samosiColor : SAMOSI_DEFAULT_COLOR,
        };
      kept.set(uid, { n: pearlCounts((d.selectedChantVariants || {}) as Parameters<typeof pearlCounts>[0], null).polished, outfit });
      redraws.forEach(r => r());
    },
    () => { kept.set(uid, { n: -1 }); redraws.forEach(r => r()); });
  live.set(uid, { users: 1, stop });
};
const leave = (uid: string) => {
  const now = live.get(uid);
  if (!now) return;
  if (--now.users > 0) return;
  now.stop();
  live.delete(uid);
};

export const usePearlTotals = (uids: string[]) => {
  const [, redraw] = useState(0);
  const key = [...new Set(uids.filter(Boolean))].sort().join(',');
  useEffect(() => {
    const again = () => redraw(x => x + 1);
    redraws.add(again);
    const list = key ? key.split(',') : [];
    list.forEach(listen);
    return () => { redraws.delete(again); list.forEach(leave); };
  }, [key]);
  const pearls: Record<string, number> = {};
  const outfits: Record<string, OutfitBadge> = {};
  for (const uid of uids) {
    const k = kept.get(uid);
    if (!k || k.n < 0) continue;
    pearls[uid] = k.n;
    if (k.outfit) outfits[uid] = k.outfit;
  }
  return { pearls, outfits };
};
