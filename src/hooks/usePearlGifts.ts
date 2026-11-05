import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { useKabaSettings } from '../utils/kabaArt';
import { SAMOSI_DEFAULT_COLOR, SAMOSI_PARTS, SamosiKinds } from '../data/samosiData';
import { KABA_PARTS } from '../data/kabaData';
import { giftDue, outfitOf, partsLeft, readGifts } from '../utils/pearlGifts';
import { chestsOf, pearlCounts } from '../utils/pathPearls';
import { filterValidVariants } from '../utils/variantValidation';
import { useConfirmations } from './useConfirmations';

// The chests' gifts to „ჩემი სამოსი“ (utils/pearlGifts.ts) for the signed-in member. With `give` the hook also adds
// the parts owed (the path page, PathOrbs, does; the chests in „ნასწავლი“ only show them).

const SAMOSI_IDS = new Set(SAMOSI_PARTS.map(p => p.id));
const KABA_IDS = new Set(KABA_PARTS.map(p => p.id));
const idsOf = (v: unknown, known: Set<string>) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && known.has(x)) : []);
const HATS = new Set(SAMOSI_PARTS.filter(p => p.head).map(p => p.id));

/** How the member's outfit looks (for the gift's picture): its colour, the parts' own colours, the hats' kinds. */
export interface OutfitLook { color: string; colors: Record<string, string>; kinds: SamosiKinds }

// one write for each reward, however many places watch it
const giving = new Set<string>();

export const usePearlGifts = (give = false) => {
  const { user, isOwner } = useAuth();
  const kaba = useKabaSettings();
  const uid = user?.uid;
  const [d, setD] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    setD(null);
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), s => setD(s.data() || {}), () => setD(null));
  }, [uid]);

  const outfit = outfitOf(d?.samosiOutfit, typeof d?.profile?.firstName === 'string' ? d.profile.firstName : '', kaba.published || isOwner);
  const owned = outfit === 'kaba' ? idsOf(d?.kaba, KABA_IDS) : idsOf(d?.samosi, SAMOSI_IDS);
  const gifts = readGifts(d?.pearlGifts);
  const confirmed = useConfirmations(uid);
  // the chests of „ნასწავლი“ the polished pearls have opened (utils/pathPearls)
  const polished = pearlCounts(filterValidVariants(d?.selectedChantVariants || {}), confirmed).polished;
  const opened = chestsOf(polished).filter(c => c.open).length;
  // the outfit is known only once both answers have come
  const ready = !!uid && !!d && kaba.loaded;
  const ownedKey = owned.join(',');

  useEffect(() => {
    if (!give || !ready || !uid) return;
    const due = giftDue(opened, gifts, outfit, owned);
    if (!due) return;
    const key = `${uid}:${due.chestParts.length}`;
    if (giving.has(key)) return;
    giving.add(key);
    const field = outfit === 'kaba' ? 'kaba' : 'samosi';
    const data: Record<string, unknown> = {
      [field]: [...owned, ...due.parts],
      pearlGifts: { chestParts: due.chestParts, parts: [...gifts.parts, ...due.parts] },
    };
    const fields = [field, 'pearlGifts.chestParts', 'pearlGifts.parts'];
    // a hat given goes on the head, as when the member adds one (ChemiSamosi)
    const hat = outfit === 'chokha' ? [...due.parts].reverse().find(id => HATS.has(id)) : undefined;
    if (hat) { data.samosiHead = hat; fields.push('samosiHead'); }
    setDoc(doc(db, 'students', uid), data, { mergeFields: fields }).catch(err => {
      giving.delete(key);
      console.warn('pearl gift:', err?.code || err);
    });
    // the record's own numbers decide; `gifts` and `owned` are read fresh from it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [give, ready, uid, opened, gifts.chestParts.length, outfit, ownedKey]);

  /** The member has seen the parts given (the path page's card goes). */
  const markSeen = () => {
    if (!uid || gifts.seen >= gifts.parts.length) return;
    setDoc(doc(db, 'students', uid), { pearlGifts: { seen: gifts.parts.length } }, { mergeFields: ['pearlGifts.seen'] })
      .catch(err => console.warn('pearl gift seen:', err?.code || err));
  };

  const look: OutfitLook = {
    color: typeof d?.samosiColor === 'string' ? d.samosiColor : SAMOSI_DEFAULT_COLOR,
    colors: d?.samosiColors && typeof d.samosiColors === 'object' ? d.samosiColors : {},
    kinds: d?.samosiKinds && typeof d.samosiKinds === 'object' ? d.samosiKinds : {},
  };

  return {
    ready,
    outfit,
    /** the part each rewarded chest gave ('' = none) */
    chestParts: gifts.chestParts,
    /** the outfit's parts still to collect, in order */
    left: partsLeft(outfit, owned),
    /** parts given that the member has not seen yet */
    unseen: gifts.parts.slice(gifts.seen),
    look,
    markSeen,
  };
};
