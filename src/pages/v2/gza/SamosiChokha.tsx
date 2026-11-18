import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { triggerHaptic } from '../../../utils/haptics';
import { fireworks } from '../../../utils/samosiFireworks';
import { setTried, useTried } from '../../../utils/samosiTry';
import type { TryOnLook } from '../../../utils/samosiTryOn';
import { SamosiArt } from '../../../components/views/SamosiArt';
import {
  SAMOSI_COLORS, SAMOSI_DEFAULT_COLOR, SAMOSI_DYED, SAMOSI_PARTS, SAMOSI_TOTAL, SamosiKinds, SamosiPart, SamosiPhoto,
  samosiDone, samosiHex, samosiKindOf, samosiPhotoOf, samosiThumb,
} from '../../../data/samosiData';
import { ChokhaFigure, SamosiLook, SamosiPic } from './SamosiFigure';
import type { ColourPick, SamosiMode } from './SamosiSheets';
import type { TileGroup, TileMark } from './SamosiView';

// The chokha's part of „ჩემი სამოსი“ — the old ChemiSamosi's state and rules, kept as they were: the parts photographed
// (students.samosiReal) and tried on now (utils/samosiTry.ts, memory only), the colour of the outfit and of each part that
// has its own (.samosiColor, .samosiColors), the hat on the head (.samosiHead) and the papakha's kind (.samosiKinds);
// the member's chosen outfit (.samosiOutfit) and first name (a girl's name opens the kaba first) are read here too.
// New (board x-samosi): what the figure shows follows the ⋯'s „ნამდვილი / მოჩვენებითი“ — the real parts only, or the
// tried ones too —, and a tile's tap follows it: in „ნამდვილი“ it opens the part's card (the camera), in „მოჩვენებითი“
// it tries the part on or takes it off as the old tiles did; a real part always opens its card.

const KNOWN = new Set(SAMOSI_PARTS.map(p => p.id));
const COLOR_BY_ID = new Map(SAMOSI_COLORS.map(c => [c.id, c]));
// the colour picker's tabs: everything at once (first), or one part
const PICK_TABS = [
  { id: 'all', label: 'ყველა' },
  { id: 'chokha', label: 'ჩოხა' },
  { id: 'akhalukhi', label: 'ახალუხი' },
  { id: 'papanaki', label: 'ფაფანაკი' },
  { id: 'kudi', label: 'ქუდი' },
];
type PickTab = 'all' | 'chokha' | OwnColor;
const OWN_COLORS = ['akhalukhi', 'papanaki', 'kudi'] as const;
type OwnColor = (typeof OWN_COLORS)[number];
const KIND_IDS = new Map(SAMOSI_PARTS.filter(p => p.kinds).map(p => [p.id, new Set(p.kinds!.map(k => k.id))]));
const HEAD_PARTS = SAMOSI_PARTS.filter(p => p.head);
const KIND_PART = SAMOSI_PARTS.find(p => p.kinds);

export type PartState = 'none' | 'tried' | 'real';

export interface OutfitModel {
  realDone: number;
  total: number;
  figure: React.ReactNode;
  groups: TileGroup[];
  tap: (id: string) => void;
  /** a part's card: its words and its picture */
  part: (id: string) => { id: string; label: string; story: string; pic: React.ReactNode } | undefined;
  stateOf: (id: string) => PartState;
  proved: (id: string) => void;
  unproved: (id: string) => void;
  /** the next part not yet real (the bottom button), none when all are */
  nextId: string | null;
  /** the owner's studio and such, under everything */
  footer?: React.ReactNode;
}

export const useChokha = ({ uid, mode, openPart, onCheer }: {
  uid: string | undefined;
  mode: SamosiMode;
  openPart: (id: string) => void;
  onCheer: (finale: boolean) => void;
}) => {
  const [real, setReal] = useState<string[]>([]);
  const tried = useTried(uid, 'chokha');
  const owned = useMemo(() => [...real, ...tried.filter(id => !real.includes(id))], [real, tried]);
  // how many times each part has dropped in this visit: a new value replays its drop
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [shine, setShine] = useState(0);
  const [color, setColor] = useState(SAMOSI_DEFAULT_COLOR);
  const [colors, setColors] = useState<Partial<Record<OwnColor, string>>>({});
  const [tab, setTab] = useState<PickTab>('all');
  const [head, setHead] = useState<string | null>(null);
  const [kinds, setKinds] = useState<SamosiKinds>({});
  const [outfit, setOutfit] = useState<'chokha' | 'kaba' | null>(null);
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), snap => {
      const d = snap.data();
      const v = d?.samosiReal;
      setReal(Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)) : []);
      const c = d?.samosiColor;
      if (typeof c === 'string' && COLOR_BY_ID.has(c)) setColor(c);
      const cs = d?.samosiColors;
      setColors(
        cs && typeof cs === 'object'
          ? Object.fromEntries(Object.entries(cs).filter(([k, val]) => OWN_COLORS.includes(k as OwnColor) && typeof val === 'string' && COLOR_BY_ID.has(val)))
          : {},
      );
      if (typeof d?.samosiHead === 'string') setHead(d.samosiHead);
      if (d?.samosiOutfit === 'chokha' || d?.samosiOutfit === 'kaba') setOutfit(d.samosiOutfit);
      setFirstName(typeof d?.profile?.firstName === 'string' ? d.profile.firstName : '');
      const ks = d?.samosiKinds;
      if (ks && typeof ks === 'object') {
        setKinds(Object.fromEntries(Object.entries(ks).filter(([id, k]) => typeof k === 'string' && KIND_IDS.get(id)?.has(k))) as SamosiKinds);
      }
    });
  }, [uid]);

  const save = (data: Record<string, unknown>, fields: string[]) => {
    if (!uid) return;
    setDoc(doc(db, 'students', uid), data, { mergeFields: fields }).catch(err => console.warn('Firestore samosi note:', err));
  };

  // what the figure shows: the real parts, or the tried ones too
  const shown = mode === 'real' ? real : owned;
  const has = (id: string) => shown.includes(id);
  const isReal = (id: string) => real.includes(id);
  const stateOf = (id: string): PartState => (isReal(id) ? 'real' : owned.includes(id) ? 'tried' : 'none');
  const realDone = samosiDone(real);
  const complete = samosiDone(shown) === SAMOSI_TOTAL;
  const current = COLOR_BY_ID.get(color) || SAMOSI_COLORS[0];
  const colorOf = (part: OwnColor | 'chokha') => (part === 'chokha' ? color : colors[part] || color);
  const colorObj = (part: OwnColor | 'chokha') => COLOR_BY_ID.get(colorOf(part)) || current;
  const photoOf = (p: SamosiPart) => samosiPhotoOf(p, kinds);
  // a photo in its part's colour (the papanaki's, else the hat's): dyed from the photo's own colour, or as it is
  const lookOf = (photo?: SamosiPhoto, part: OwnColor = 'kudi'): SamosiLook => {
    const id = colorOf(part);
    if (!photo || id === photo.native) return { dye: null };
    return { dye: samosiHex(id), way: { range: photo.range, base: photo.native ? samosiHex(photo.native) : undefined } };
  };
  const photoLook = (p: SamosiPart) => lookOf(photoOf(p), p.shoulder ? 'papanaki' : 'kudi');
  // the colour a layer of the chokha photo is dyed into (the akhalukhi its own): null keeps the photo's own blue
  const dyeFor = (id: string) => {
    if (!SAMOSI_DYED.has(id)) return null;
    const c = colorOf(id === 'akhalukhi' ? 'akhalukhi' : 'chokha');
    return c === SAMOSI_DEFAULT_COLOR ? null : samosiHex(c);
  };
  const uniform = OWN_COLORS.every(k => !colors[k] || colors[k] === color);
  const tabColor = tab === 'all' ? (uniform ? color : '') : colorOf(tab);
  // the hat on the head: the one put on last while it is shown, else any shown hat
  const worn = (head && HEAD_PARTS.some(p => p.id === head) && has(head) ? head : HEAD_PARTS.find(p => has(p.id))?.id) || null;
  const wornPart = worn ? SAMOSI_PARTS.find(p => p.id === worn) : undefined;

  const drop = (id: string) => setDrops(d => ({ ...d, [id]: (d[id] || 0) + 1 }));
  const wear = (id: string) => {
    setHead(id);
    save({ samosiHead: id }, ['samosiHead']);
  };

  // „ყველა“: the whole outfit in one colour (the parts' own colours go); „ჩოხა“: the chokha only (the parts that
  // followed it keep the colour they had); the other tabs: that part only
  const pickColor = (id: string) => {
    if (id === tabColor) return;
    triggerHaptic(15);
    if (tab === 'all') {
      setColor(id);
      setColors({});
      save({ samosiColor: id, samosiColors: {} }, ['samosiColor', 'samosiColors']);
    } else if (tab === 'chokha') {
      const kept = Object.fromEntries(OWN_COLORS.map(k => [k, colors[k] || color]));
      setColor(id);
      setColors(kept);
      save({ samosiColor: id, samosiColors: kept }, ['samosiColor', 'samosiColors']);
    } else {
      const own = tab;
      setColors(cs => ({ ...cs, [own]: id }));
      save({ samosiColors: { [own]: id } }, [`samosiColors.${own}`]);
    }
  };

  // „მოჩვენებითი“: a tap tries a part on or takes it off again
  const toggle = (part: SamosiPart) => {
    if (!uid) return;
    const adding = !owned.includes(part.id);
    setTried(uid, 'chokha', adding ? [...tried, part.id] : tried.filter(id => id !== part.id));
    triggerHaptic(adding ? 25 : 10);
    if (adding) {
      drop(part.id);
      if (samosiDone([...owned, part.id]) === SAMOSI_TOTAL) setShine(s => s + 1);
      if (part.head) wear(part.id);
    }
  };

  // a tile's tap: a shown hat that is not on the head goes on it; then a real part (or any, in „ნამდვილი“) opens its
  // card, and in „მოჩვენებითი“ the rest are tried on or taken off
  const tap = (id: string) => {
    const part = SAMOSI_PARTS.find(p => p.id === id);
    if (!uid || !part) return;
    const hatOn = !!part.head && has(part.id) && worn !== part.id;
    if (hatOn) {
      drop(part.id);
      wear(part.id);
    }
    if (mode === 'real' || isReal(part.id)) return openPart(part.id);
    if (!hatOn) toggle(part);
  };

  // the AI saw the real part: it is the member's for good — the cheer and the fireworks are for this
  const proved = (id: string) => {
    if (!uid) return;
    const part = SAMOSI_PARTS.find(p => p.id === id);
    setTried(uid, 'chokha', tried.filter(t => t !== id));
    const finale = samosiDone([...real, id]) === SAMOSI_TOTAL && realDone < SAMOSI_TOTAL;
    triggerHaptic(40);
    drop(id);
    onCheer(finale);
    fireworks(finale);
    if (finale) setShine(s => s + 1);
    if (part?.head) wear(id);
  };
  // a real part taken back stays on, tried
  const unproved = (id: string) => {
    if (uid && !tried.includes(id)) setTried(uid, 'chokha', [...tried, id]);
  };

  // the papakha's kind: it goes on the head, so the change shows; not shown yet, it is tried on in that kind (in
  // „მოჩვენებითი“), else only kept for when it is
  const pickKind = (kindId: string) => {
    const part = KIND_PART;
    if (!part) return;
    const same = samosiKindOf(part, kinds)?.id === kindId;
    if (has(part.id) && same && worn === part.id) return;
    if (!same) {
      setKinds(ks => ({ ...ks, [part.id]: kindId }));
      save({ samosiKinds: { [part.id]: kindId } }, [`samosiKinds.${part.id}`]);
    }
    if (!has(part.id)) {
      if (mode === 'tried' && !isReal(part.id)) toggle(part);
      return;
    }
    triggerHaptic(15);
    drop(part.id);
    if (worn !== part.id) wear(part.id);
  };

  const markOf = (id: string): TileMark => (isReal(id) ? 'real' : mode === 'tried' && owned.includes(id) ? 'tried' : 'none');
  const tile = (p: SamosiPart) => ({ id: p.id, label: p.label, mark: markOf(p.id) });
  const groups: TileGroup[] = [
    { tiles: SAMOSI_PARTS.filter(p => !p.extraHat).map(tile) },
    { label: 'ქუდები — ერთიც საკმარისია', tiles: SAMOSI_PARTS.filter(p => p.extraHat).map(tile) },
  ];

  // the next part to photograph: the parts in order; of the hats only one, the one on the head first
  const anyHatReal = SAMOSI_PARTS.some(p => p.extraHat && isReal(p.id));
  const hatNext = wornPart?.extraHat ? wornPart.id : SAMOSI_PARTS.find(p => p.extraHat)?.id;
  const nextId = SAMOSI_PARTS.find(p => (p.extraHat ? !anyHatReal && p.id === hatNext : !isReal(p.id)))?.id ?? null;

  const picOf = (p: SamosiPart): React.ReactNode =>
    p.art ? <SamosiArt kind={p.art} className="size-9" />
      : p.photo ? <SamosiPic src={photoOf(p)!.src} {...photoLook(p)} className="size-10 object-contain" />
      : <SamosiPic src={samosiThumb(p.id)} dye={dyeFor(p.id)} className="size-10" />;

  const model: OutfitModel = {
    realDone,
    total: SAMOSI_TOTAL,
    figure: (
      <ChokhaFigure
        on={has}
        drops={drops}
        dyeOf={dyeFor}
        lookOf={photoLook}
        photoOf={photoOf}
        worn={wornPart}
        complete={complete}
        shine={shine}
        height={330}
      />
    ),
    groups,
    tap,
    part: id => {
      const p = SAMOSI_PARTS.find(x => x.id === id);
      return p && { id: p.id, label: p.label, story: p.story, pic: picOf(p) };
    },
    stateOf,
    proved,
    unproved,
    nextId,
  };

  const colour: ColourPick = {
    tabs: PICK_TABS,
    tab,
    onTab: id => setTab(id as PickTab),
    colours: SAMOSI_COLORS,
    value: tabColor,
    onPick: pickColor,
  };
  const kind = KIND_PART?.kinds && {
    label: KIND_PART.label,
    items: KIND_PART.kinds.map(k => ({ id: k.id, label: k.label })),
    value: samosiKindOf(KIND_PART, kinds)?.id ?? KIND_PART.kinds[0].id,
    onChange: pickKind,
  };
  // what the photo try-on dresses the member in
  const tryOnLook: TryOnLook = {
    chokha: current,
    akhalukhi: colorObj('akhalukhi'),
    papanaki: has('papanaki') ? colorObj('papanaki') : undefined,
    hat: wornPart ? { id: wornPart.id, label: wornPart.label, kind: samosiKindOf(wornPart, kinds)?.id, color: colorObj('kudi') } : undefined,
  };

  const chooseOutfit = (o: 'chokha' | 'kaba') => {
    setOutfit(o);
    save({ samosiOutfit: o }, ['samosiOutfit']);
  };

  return { model, colour, kind, tryOnLook, outfit, firstName, chooseOutfit };
};
