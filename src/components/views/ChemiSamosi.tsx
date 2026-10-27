import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { DyeWay, useSamosiSrc } from '../../utils/samosiDye';
import {
  SAMOSI_ASPECT,
  SAMOSI_COLORS,
  SAMOSI_DEFAULT_COLOR,
  SAMOSI_FIGURE,
  SAMOSI_PARTS,
  SAMOSI_TOTAL,
  SAMOSI_DYED,
  SamosiKinds,
  SamosiPart,
  SamosiPhoto,
  samosiDone,
  samosiHex,
  samosiKindOf,
  samosiLayer,
  samosiPhotoOf,
  samosiThumb,
} from '../../data/samosiData';
import { SamosiArt } from './SamosiArt';
import { SamosiTryOn } from './SamosiTryOn';
import { fireworks } from '../../utils/samosiFireworks';
import { useKabaSettings } from '../../utils/kabaArt';
import { nameGender } from '../../data/georgianNames';
import { KabaSamosi } from './KabaSamosi';

const KNOWN = new Set(SAMOSI_PARTS.map(p => p.id));
const COLOR_BY_ID = new Map(SAMOSI_COLORS.map(c => [c.id, c]));
// the colour picker's tabs: everything at once (first), or one part; the parts that may have a colour of their own
const PICK_TABS = [
  { id: 'all', label: 'ყველა' },
  { id: 'chokha', label: 'ჩოხა' },
  { id: 'akhalukhi', label: 'ახალუხი' },
  { id: 'papanaki', label: 'ფაფანაკი' },
  { id: 'kudi', label: 'ქუდი' },
] as const;
type PickTab = (typeof PICK_TABS)[number]['id'];
const OWN_COLORS = ['akhalukhi', 'papanaki', 'kudi'] as const;
type OwnColor = (typeof OWN_COLORS)[number];
// the kinds of the hats that have them (the papakha's)
const KIND_IDS = new Map(SAMOSI_PARTS.filter(p => p.kinds).map(p => [p.id, new Set(p.kinds!.map(k => k.id))]));
// the colour picker's rim: all the colours round the circle
const RAINBOW = `conic-gradient(${SAMOSI_COLORS.map(c => c.hex).join(', ')}, ${SAMOSI_COLORS[0].hex})`;
// the layers of the chokha photo, and the parts with photos of their own on the shoulder
const PHOTO_PARTS = SAMOSI_PARTS.filter(p => !p.art && !p.photo);
const SHOULDER_PARTS = SAMOSI_PARTS.filter(p => p.shoulder && p.photo);
const TOTAL = SAMOSI_TOTAL;
const HEAD_PARTS = SAMOSI_PARTS.filter(p => p.head);
const EXTRA_HATS = SAMOSI_PARTS.filter(p => p.extraHat);
// the room above the collar for the hat, in % of the figure's width: a head's height, so the hat sits where it
// would on a head (the hats' places in samosiData are measured in the same units)
const HEAD_ROOM = 72;
// the slot beside the figure for the boots, down by the hem (the hats go on the head)
const SLOT_PLACE: Record<string, string> = { aziurebi: '-left-[72px] bottom-[12%]' };

// "ჩემი სამოსი": the student ticks off the parts of their chokha and watches it come together —
// a pale mannequin at first, each ticked part dropping into place in colour. Saved in students/{uid}.samosi.
// Folded at first into a round button with only "სამოსი" under it; shown on the profile and at the top of the
// path page, where `side` (the path's progress) sits on the right of the button.
// `bare`: only the open chokha, without its round button and card (under the path page's round buttons, PathOrbs).
export const ChemiSamosi: React.FC<{ side?: React.ReactNode; bare?: boolean }> = ({ side, bare }) => {
  const { user, isOwner } = useAuth();
  const [open, setOpen] = useState(!!bare);
  // the chokha or „ქართული კაბა“ (redesign stage 5; once the owner has published the kaba's pictures): the member's
  // choice (students/{uid}.samosiOutfit), else the kaba first for a girl's name
  const kaba = useKabaSettings();
  const kabaOn = kaba.published || isOwner;
  const [outfit, setOutfit] = useState<'chokha' | 'kaba' | null>(null);
  const [firstName, setFirstName] = useState('');
  const [owned, setOwned] = useState<string[]>([]);
  // how many times each part has been ticked in this visit: a new value replays its drop animation
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [cheer, setCheer] = useState<{ n: number; finale: boolean } | null>(null);
  const [shine, setShine] = useState(0);
  // the part just added: its one-sentence story shows under the figure until the next one
  const [story, setStory] = useState<SamosiPart | null>(null);
  // the outfit's colour (students/{uid}.samosiColor) — the chokha's, and everything's that has none of its own —
  // and the parts coloured on their own (.samosiColors: akhalukhi, papanaki, kudi = the hat); picker in the corner
  const [color, setColor] = useState(SAMOSI_DEFAULT_COLOR);
  const [colors, setColors] = useState<Partial<Record<OwnColor, string>>>({});
  const [tab, setTab] = useState<PickTab>('all');
  // the hat put on last (.samosiHead) and the kind of each hat that has kinds (.samosiKinds)
  const [head, setHead] = useState<string | null>(null);
  const [kinds, setKinds] = useState<SamosiKinds>({});
  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), snap => {
      const d = snap.data();
      const v = d?.samosi;
      if (Array.isArray(v)) setOwned(v.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)));
      const c = d?.samosiColor;
      if (typeof c === 'string' && COLOR_BY_ID.has(c)) setColor(c);
      const cs = d?.samosiColors;
      setColors(
        cs && typeof cs === 'object'
          ? Object.fromEntries(Object.entries(cs).filter(([k, v]) => OWN_COLORS.includes(k as OwnColor) && typeof v === 'string' && COLOR_BY_ID.has(v)))
          : {}
      );
      if (typeof d?.samosiHead === 'string') setHead(d.samosiHead);
      if (d?.samosiOutfit === 'chokha' || d?.samosiOutfit === 'kaba') setOutfit(d.samosiOutfit);
      setFirstName(typeof d?.profile?.firstName === 'string' ? d.profile.firstName : '');
      const ks = d?.samosiKinds;
      if (ks && typeof ks === 'object') {
        setKinds(Object.fromEntries(Object.entries(ks).filter(([id, k]) => typeof k === 'string' && KIND_IDS.get(id)?.has(k))) as SamosiKinds);
      }
    });
  }, [user]);

  // the picker folds on a tap anywhere else or on Escape
  useEffect(() => {
    if (!picking) return;
    const away = (e: PointerEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPicking(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPicking(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [picking]);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  const has = (id: string) => owned.includes(id);
  const done = samosiDone(owned);
  const complete = done === TOTAL;
  const current = COLOR_BY_ID.get(color) || SAMOSI_COLORS[0];
  // a part's colour: its own if it has one, else the outfit's
  const colorOf = (part: OwnColor | 'chokha') => (part === 'chokha' ? color : colors[part] || color);
  const colorObj = (part: OwnColor | 'chokha') => COLOR_BY_ID.get(colorOf(part)) || current;
  // a part's own photo (papanaki, hats), in the member's kind of it
  const photoOf = (p: SamosiPart) => samosiPhotoOf(p, kinds);
  // a photo in its part's colour (the papanaki's, else the hat's): dyed from the photo's own colour, or as it is
  const lookOf = (photo?: SamosiPhoto, part: OwnColor = 'kudi'): { dye: string | null; way?: DyeWay } => {
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
  // the picker: the colour of what the open tab colours ('' = the parts differ, under "ყველა")
  const uniform = OWN_COLORS.every(k => !colors[k] || colors[k] === color);
  const tabColor = tab === 'all' ? (uniform ? color : '') : colorOf(tab);
  // the hat on the head: the one put on last while it is collected, else any collected hat
  const worn = (head && HEAD_PARTS.some(p => p.id === head) && has(head) ? head : HEAD_PARTS.find(p => has(p.id))?.id) || null;
  const wornPart = worn ? SAMOSI_PARTS.find(p => p.id === worn) : undefined;
  const wornPhoto = wornPart && photoOf(wornPart);

  const shown = !kabaOn ? 'chokha' : outfit ?? (nameGender(firstName) === 'f' ? 'kaba' : 'chokha');

  const save =(data: Record<string, unknown>, fields: string[]) => {
    if (!user) return;
    setDoc(doc(db, 'students', user.uid), data, { mergeFields: fields }).catch(err => console.warn('Firestore samosi note:', err));
  };

  const toggleOpen = () => {
    triggerHaptic(10);
    if (!open && complete) setShine(s => s + 1);
    setPicking(false);
    setOpen(o => !o);
  };

  // "ყველა": the whole outfit in one colour (the parts' own colours go); "ჩოხა": the chokha only (the parts that
  // followed it keep the colour they had); the other tabs: that part only. The picker stays open for more.
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
      setColors(cs => ({ ...cs, [tab]: id }));
      save({ samosiColors: { [tab]: id } }, [`samosiColors.${tab}`]);
    }
  };

  const wear = (id: string) => {
    setHead(id);
    save({ samosiHead: id }, ['samosiHead']);
  };

  const toggle = (part: SamosiPart) => {
    const adding = !has(part.id);
    const next = adding ? [...owned, part.id] : owned.filter(id => id !== part.id);
    setOwned(next);
    triggerHaptic(adding ? 25 : 10);
    setStory(adding ? part : s => (s?.id === part.id ? null : s));
    if (adding) {
      const finale = samosiDone(next) === TOTAL && done < TOTAL;
      setDrops(d => ({ ...d, [part.id]: (d[part.id] || 0) + 1 }));
      setCheer({ n: Date.now(), finale });
      fireworks(finale);
      if (finale) setShine(s => s + 1);
      if (part.head) wear(part.id);
    }
    save({ samosi: next }, ['samosi']);
  };

  // a hat's kind (the papakha's picture on its tile): it goes on the head, so the change shows — and a hat not yet
  // collected is collected in that kind
  const pickKind = (part: SamosiPart, id: string) => {
    const same = samosiKindOf(part, kinds)?.id === id;
    if (has(part.id) && same && worn === part.id) return;
    if (!same) {
      setKinds(ks => ({ ...ks, [part.id]: id }));
      save({ samosiKinds: { [part.id]: id } }, [`samosiKinds.${part.id}`]);
    }
    if (!has(part.id)) return toggle(part);
    triggerHaptic(15);
    setDrops(d => ({ ...d, [part.id]: (d[part.id] || 0) + 1 }));
    if (worn !== part.id) wear(part.id);
  };

  // a tile's tap: a collected hat that is not on the head goes on it; anything else is ticked or unticked
  const tap = (part: SamosiPart) => {
    if (part.head && has(part.id) && worn !== part.id) {
      triggerHaptic(15);
      setDrops(d => ({ ...d, [part.id]: (d[part.id] || 0) + 1 }));
      wear(part.id);
      return;
    }
    toggle(part);
  };

  return (
    <div className="w-full space-y-3">
      {!bare && (
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        {/* the round button: a tap opens and folds the chokha; a wine rim while it is open */}
        <button
          type="button"
          onClick={toggleOpen}
          className="group shrink-0 flex flex-col items-center gap-1 cursor-pointer select-none"
          aria-expanded={open}
        >
          <span
            className={`w-14 h-14 rounded-full bg-white flex items-center justify-center ring-2 shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_24px_-14px_rgba(42,32,23,0.45)] transition-all duration-200 group-active:scale-95 ${
              open ? 'ring-[#7a2028]' : 'ring-[#2a2017]/[0.07] group-hover:ring-[#7a2028]/30'
            }`}
          >
            <SamosiImg src={samosiThumb('chokha')} dye={dyeFor('chokha')} className="w-10 h-10" />
          </span>
          <span className={`text-xs font-bold leading-tight transition-colors ${open ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>სამოსი</span>
        </button>
        {side && <div className="min-w-0 h-14 flex items-center empty:hidden">{side}</div>}
      </div>
      )}

      {open && (
        // same card look as the other tiles of "საგანძურის გზა" (PATH_TILE), without the hover lift
        <section className={bare ? 'space-y-5' : 'w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] overflow-hidden p-4 space-y-5 animate-in fade-in duration-300'}>
          {kabaOn && (
            <div role="tablist" aria-label="სამოსი" className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#f6efe3]">
              {(['chokha', 'kaba'] as const).map(o => (
                <button key={o} type="button" role="tab" aria-selected={shown === o}
                  onClick={() => { triggerHaptic(8); setOutfit(o); save({ samosiOutfit: o }, ['samosiOutfit']); }}
                  className={`h-10 rounded-full text-sm font-bold cursor-pointer transition-colors ${shown === o ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426] hover:bg-white/70'}`}>
                  {o === 'chokha' ? 'ჩოხა' : 'ქართული კაბა'}
                </button>
              ))}
            </div>
          )}
          {shown === 'kaba' ? <KabaSamosi published={kaba.published} head={kaba.head} /> : (<>
          {/* the chokha coming together */}
          <div className="relative pt-3 pb-1 rounded-2xl bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_42%,#f6efe3_100%)]">
            {/* the colour picker: a small round button, the eight colours fold out of it; one colour for it all */}
            <div ref={pickerRef} className="absolute top-2.5 left-2.5 z-20">
              <button
                type="button"
                onClick={() => setPicking(p => !p)}
                aria-label={`სამოსის ფერი: ${current.label}`}
                aria-expanded={picking}
                title="სამოსის ფერი"
                className="block w-9 h-9 rounded-full p-[3px] cursor-pointer shadow-[0_4px_12px_-4px_rgba(42,32,23,0.45)] transition-transform active:scale-90"
                style={{ background: RAINBOW }}
              >
                <span className="block w-full h-full rounded-full bg-white p-[3px]">
                  <span className="block w-full h-full rounded-full ring-1 ring-inset ring-black/10" style={{ background: current.hex }} />
                </span>
              </button>
              {picking && (
                <div className="absolute top-11 left-0 w-[204px] p-2.5 rounded-2xl bg-white ring-1 ring-[#eadfcb] shadow-[0_14px_36px_-14px_rgba(74,52,38,0.5)] origin-top-left animate-in fade-in zoom-in-95 duration-150">
                  {/* what is being coloured: everything at once (first), or one part */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2.5" role="tablist">
                    {PICK_TABS.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => setTab(t.id)}
                        className={`h-9 rounded-full text-xs font-bold cursor-pointer transition-colors ${t.id === 'all' ? 'col-span-2' : ''} ${
                          tab === t.id ? 'bg-[#7a2028] text-white' : 'bg-[#f6efe3] text-[#4a3426] hover:bg-[#efe5d4]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SAMOSI_COLORS.map(c => {
                      const on = c.id === tabColor;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickColor(c.id)}
                          aria-label={c.label}
                          aria-pressed={on}
                          title={c.label}
                          className={`relative w-9 h-9 rounded-full cursor-pointer ring-1 ring-inset ring-black/10 transition-transform active:scale-90 ${
                            on ? 'outline-2 outline-offset-2 outline-[#7a2028]' : ''
                          }`}
                          style={{ background: c.hex }}
                        >
                          {on && <Check className={`absolute inset-0 m-auto w-4 h-4 stroke-[3] ${c.id === 'white' ? 'text-[#2a2017]' : 'text-white'}`} />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-xs font-bold text-[#4a3426]">{COLOR_BY_ID.get(tabColor)?.label ?? 'სხვადასხვა ფერი'}</p>
                </div>
              )}
            </div>

            <div className="relative mx-auto" style={{ width: 'clamp(150px, calc(100% - 150px), 240px)' }}>
              {/* the room over the collar, with the hat being worn where it would sit on a head */}
              <div aria-hidden className="relative" style={{ paddingTop: `${HEAD_ROOM}%` }}>
                {wornPart && wornPhoto && (
                  <SamosiImg
                    key={`${wornPart.id}-${drops[wornPart.id] || 0}`}
                    src={wornPhoto.src}
                    {...photoLook(wornPart)}
                    className={`absolute h-auto pointer-events-none ${drops[wornPart.id] ? 'samosi-drop' : ''}`}
                    style={{
                      left: `${wornPhoto.place.left}%`,
                      top: `${(wornPhoto.place.top / HEAD_ROOM) * 100}%`,
                      width: `${wornPhoto.place.width}%`,
                    }}
                  />
                )}
              </div>
              <div
                className="relative"
                style={{
                  aspectRatio: `${SAMOSI_ASPECT}`,
                  WebkitMaskImage: 'linear-gradient(#000 84%, transparent)',
                  maskImage: 'linear-gradient(#000 84%, transparent)',
                }}
              >
                <img src={SAMOSI_FIGURE} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full grayscale contrast-90 opacity-20" />
                {PHOTO_PARTS.map(p => {
                  const on = has(p.id);
                  return (
                    <SamosiImg
                      key={`${p.id}-${drops[p.id] || 0}`}
                      src={samosiLayer(p.id)}
                      dye={dyeFor(p.id)}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${on && drops[p.id] ? 'samosi-drop' : ''}`}
                      style={{ opacity: on ? 1 : 0 }}
                    />
                  );
                })}
                {/* the papanaki on the right shoulder */}
                {SHOULDER_PARTS.map(p => {
                  const on = has(p.id);
                  const place = p.photo!.place;
                  return (
                    <SamosiImg
                      key={`${p.id}-${drops[p.id] || 0}`}
                      src={p.photo!.src}
                      {...photoLook(p)}
                      className={`absolute h-auto transition-opacity duration-300 ${on && drops[p.id] ? 'samosi-drop' : ''}`}
                      style={{ left: `${place.left}%`, top: `${place.top}%`, width: `${place.width}%`, opacity: on ? 1 : 0 }}
                    />
                  );
                })}
                {complete && (
                  <div
                    key={shine}
                    aria-hidden
                    className="absolute inset-0 pointer-events-none samosi-shine"
                    style={{ WebkitMaskImage: `url(${SAMOSI_FIGURE})`, WebkitMaskSize: '100% 100%', maskImage: `url(${SAMOSI_FIGURE})`, maskSize: '100% 100%' }}
                  />
                )}
              </div>

              {SAMOSI_PARTS.filter(p => p.art && !p.head).map(p => (
                <Slot key={p.id} part={p} on={has(p.id)} pop={drops[p.id] || 0} className={SLOT_PLACE[p.id]} />
              ))}
            </div>

            {/* the greeting sits over the fading hem, so the part dropping into place stays visible */}
            {cheer && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-10" role="status" aria-live="polite">
                <div key={cheer.n} className="samosi-cheer px-6 py-3.5 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-[#eadfcb] shadow-[0_14px_36px_-14px_rgba(74,52,38,0.5)] text-center">
                  {cheer.finale && <p className="text-[11px] font-black tracking-wide text-emerald-700">ჩოხა სრულადაა!</p>}
                  <p className="font-serif-ge text-2xl font-bold text-[#7a2028] leading-tight">გილოცავ!</p>
                  <p className="text-sm font-bold text-[#4a3426]">ღმერთს ებარებოდე!</p>
                </div>
              </div>
            )}
          </div>

          {/* the member's own photo dressed in this chokha (AI), for those given it */}
          <SamosiTryOn
            look={{
              chokha: current,
              akhalukhi: colorObj('akhalukhi'),
              papanaki: has('papanaki') ? colorObj('papanaki') : undefined,
              hat: wornPart ? { id: wornPart.id, label: wornPart.label, kind: samosiKindOf(wornPart, kinds)?.id, color: colorObj('kudi') } : undefined,
            }}
          />

          {/* the story of the part just added */}
          {story && (
            <div key={story.id} className="flex items-start gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#eadfcb] pl-2.5 pr-1.5 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300" aria-live="polite">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center">
                {story.art ? (
                  <SamosiArt kind={story.art} className="w-8 h-8" />
                ) : story.photo ? (
                  <SamosiImg src={photoOf(story)!.src} {...photoLook(story)} className="w-9 h-9 object-contain" />
                ) : (
                  <SamosiImg src={samosiThumb(story.id)} dye={dyeFor(story.id)} className="w-9 h-9" />
                )}
              </span>
              <p className="flex-1 min-w-0 pt-0.5 text-[13px] leading-relaxed text-[#4a3426]">
                <span className="font-bold text-[#7a2028]">{story.label}. </span>
                {story.story}
              </p>
              <button
                type="button"
                onClick={() => setStory(null)}
                aria-label="დახურვა"
                className="w-9 h-9 shrink-0 -my-1 rounded-full flex items-center justify-center text-[#a99a88] hover:text-[#7a2028] hover:bg-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* progress: one slim bar with hairline marks between the parts, the count beside it (inside the path card
              its head already says „2 / 8“) */}
          {!bare && (
            <div className="flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={done} aria-label="შეგროვებული ნაწილები">
              <div className="relative flex-1 h-1.5 rounded-full bg-[#f1e8da] overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${
                    complete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-[#b04450] to-[#7a2028]'
                  }`}
                  style={{ width: `${(done / TOTAL) * 100}%` }}
                />
                {Array.from({ length: TOTAL - 1 }, (_, i) => (
                  <span key={i} className="absolute inset-y-0 w-0.5 -ml-px bg-white" style={{ left: `${((i + 1) / TOTAL) * 100}%` }} />
                ))}
              </div>
              {complete ? (
                <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                  <Check className="w-3 h-3 stroke-[3.5]" />
                  სრულია
                </span>
              ) : (
                <span className="text-xs font-black text-[#7a2028] tabular-nums">
                  {done}<span className="text-[#b3a593]">/{TOTAL}</span>
                </span>
              )}
            </div>
          )}

          {/* the parts: compact tiles, picture first; a ticked tile turns wine-tinted with a check on its picture.
              The extra hats follow under their own line: any one of them counts. A collected hat says whether it is
              on the head; a tap puts it on. A hat with kinds (the papakha) shows a picture of each to pick from. */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-2 items-start">
            {SAMOSI_PARTS.map(p => {
              const on = has(p.id);
              const pic = `transition-[filter,opacity] duration-300 ${on ? '' : 'grayscale opacity-50 group-hover:opacity-75'}`;
              const name = (
                <>
                  <span className={`block text-[13px] font-bold leading-tight ${on ? 'text-[#2a2017]' : 'text-[#7d6e5f]'}`}>{p.label}</span>
                  {p.head && on && worn === p.id && (
                    <span className="block mt-0.5 text-xs font-bold leading-tight text-[#7a2028]">თავზე</span>
                  )}
                </>
              );
              return (
                <React.Fragment key={p.id}>
                {p.id === EXTRA_HATS[0]?.id && (
                  <p className="col-span-full pt-1.5 text-xs font-bold text-[#8a7a6a]">ქუდები — ერთიც საკმარისია</p>
                )}
                {p.kinds ? (
                  // the papakha: its kinds' pictures side by side, a tap on one puts that kind on; its name taps as a tile
                  <div
                    className={`group flex flex-wrap items-center gap-x-2.5 gap-y-1 min-h-12 py-1 pl-1.5 pr-2 rounded-xl ring-1 ring-inset transition-all duration-200 ${
                      on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/35' : 'bg-[#f8f5ef] ring-transparent hover:bg-[#f2ece2]'
                    }`}
                  >
                    <span className="flex gap-1" role="group" aria-label={`${p.label}: სახე`}>
                      {p.kinds.map(k => {
                        const chosen = on && samosiKindOf(p, kinds)?.id === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => pickKind(p, k.id)}
                            aria-label={k.label}
                            title={k.label}
                            aria-pressed={chosen}
                            className={`relative w-9 h-9 shrink-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                              chosen ? 'ring-2 ring-[#7a2028]' : ''
                            }`}
                          >
                            <SamosiImg
                              src={k.photo.src}
                              {...lookOf(k.photo)}
                              className={`w-8 h-8 object-contain ${on ? `transition-opacity duration-300 ${chosen ? '' : 'opacity-60 hover:opacity-90'}` : pic}`}
                            />
                            {chosen && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white bg-[#7a2028] text-white">
                                <Check className="w-2.5 h-2.5 stroke-[4]" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </span>
                    <button type="button" onClick={() => tap(p)} aria-pressed={on} className="flex-auto self-stretch flex flex-col justify-center text-left cursor-pointer">
                      {name}
                    </button>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => tap(p)}
                  aria-pressed={on}
                  className={`group flex items-center gap-2.5 min-h-12 py-1 pl-1.5 pr-2 rounded-xl text-left ring-1 ring-inset transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                    on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/35' : 'bg-[#f8f5ef] ring-transparent hover:bg-[#f2ece2]'
                  }`}
                >
                  <span className="relative w-9 h-9 shrink-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center">
                    {p.art ? (
                      <SamosiArt kind={p.art} className={`w-7 h-7 ${pic}`} />
                    ) : p.photo ? (
                      <SamosiImg src={photoOf(p)!.src} {...photoLook(p)} className={`w-8 h-8 object-contain ${pic}`} />
                    ) : (
                      <SamosiImg src={samosiThumb(p.id)} dye={dyeFor(p.id)} className={`w-8 h-8 ${pic}`} />
                    )}
                    <span
                      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white transition-all duration-200 ${
                        on ? 'bg-[#7a2028] text-white scale-100' : 'bg-white text-transparent scale-0'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </span>
                  </span>
                  <span className="flex-1 min-w-0">{name}</span>
                </button>
                )}
                </React.Fragment>
              );
            })}
          </div>
          </>)}
        </section>
      )}
    </div>
  );
};

// A decorative picture of the chokha, dyed into the chosen colour; an empty box of the same size while it dyes
const SamosiImg: React.FC<{ src: string; dye: string | null; way?: DyeWay; className?: string; style?: React.CSSProperties }> = ({
  src,
  dye,
  way,
  className,
  style,
}) => {
  const url = useSamosiSrc(src, dye, way);
  if (!url) return <span aria-hidden className={`block ${className || ''}`} />;
  return <img src={url} alt="" aria-hidden draggable={false} className={className} style={style} />;
};

// Round slot beside the figure for a drawn part (cap, boots): dashed and pale until collected
const Slot: React.FC<{ part: SamosiPart; on: boolean; pop: number; className?: string }> = ({ part, on, pop, className }) => (
  <div className={`absolute flex flex-col items-center gap-1 ${className || ''}`}>
    <span
      key={on ? pop : 'off'}
      className={`relative w-14 h-14 rounded-full bg-white flex items-center justify-center transition-[border-color,box-shadow] duration-300 ${
        on ? 'border-2 border-[#7a2028] shadow-[0_6px_16px_-6px_rgba(122,32,40,0.5)] samosi-pop' : 'border-2 border-dashed border-[#d8c9b0]'
      }`}
    >
      {part.art && <SamosiArt kind={part.art} className={`w-10 h-10 transition-[filter,opacity] duration-300 ${on ? '' : 'grayscale opacity-35'}`} />}
      {on && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#7a2028] text-white flex items-center justify-center ring-2 ring-white">
          <Check className="w-3 h-3 stroke-[3.5]" />
        </span>
      )}
    </span>
    <span className={`text-[11px] font-bold ${on ? 'text-[#7a2028]' : 'text-[#a99a88]'}`}>{part.label}</span>
  </div>
);
