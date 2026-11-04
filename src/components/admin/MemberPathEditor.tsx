import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Check, CheckCheck, ArrowUpDown } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { PathItem, Voice, sortPathItems, categoryOf, CATEGORY_LABEL, PathCategory, usesVoices, voicesOf } from '../../utils/pathItems';
import { useConfirmations, saveConfirmation } from '../../hooks/useConfirmations';
import { useMarksLock, saveMarksLock } from '../../hooks/usePathMarks';
import { Btn, askConfirm, Toggle } from '../ui/kit';
import { CatalogPicker } from './CatalogPicker';
import { errorText } from '../../utils/errorText';

type PathMap = Record<string, PathItem>;

/** Gives every item an order following the current display order, so moves and additions stick. */
const normalized = (list: PathItem[]): PathMap =>
  Object.fromEntries(list.map((it, i) => [it.variantId, { ...it, order: i }]));

export const writePath = (uid: string, map: PathMap) =>
  setDoc(doc(db, 'students', uid), { selectedChantVariants: map }, { mergeFields: ['selectedChantVariants'] });

// Teacher's view of one student's "საგანძურის გზა": add, remove, reorder; each voice goes round with a tap — not known →
// marked → confirmed ("ჩათვლა") → not known — so a wrong mark of the student's can be taken back; and the student's own
// marking can be locked (marksLock), after which only teachers mark.
// 2026-11-05 (the user: „დამაბნეველია“): the switch says what it does, one legend tells the voices' three looks, and the
// ↑ ↓ arrows wait behind „რიგის შეცვლა“ (while ordering, the voices and ✕ step aside).
export const MemberPathEditor: React.FC<{ uid: string; name: string; onError: (t: string) => void }> = ({ uid, name, onError }) => {
  const { user } = useAuth();
  const [map, setMap] = useState<PathMap>({});
  const [loaded, setLoaded] = useState(false);
  const conf = useConfirmations(uid);
  const lock = useMarksLock(uid);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      snap => { setMap(filterValidVariants((snap.exists() && snap.data().selectedChantVariants) || {})); setLoaded(true); },
      err => { onError('მოსწავლის გზა ვერ ჩაიტვირთა: ' + errorText(err)); setLoaded(true); }
    );
  }, [uid]);

  const sorted = useMemo(() => sortPathItems(Object.values(map)), [map]);
  const groups = (['galoba', 'simghera', 'mtkmeli', 'sakravebi'] as PathCategory[])
    .map(c => ({ c, items: sorted.filter(it => categoryOf(it.variantId) === c) }))
    .filter(g => g.items.length > 0);

  const save = (list: PathItem[]) => {
    const next = normalized(list);
    setMap(next);
    writePath(uid, next).catch(e => onError('ვერ შეინახა: ' + errorText(e)));
  };

  const move = (id: string, dir: -1 | 1) => {
    const cat = categoryOf(id);
    const inCat = sorted.filter(it => categoryOf(it.variantId) === cat);
    const i = inCat.findIndex(it => it.variantId === id);
    const j = i + dir;
    if (j < 0 || j >= inCat.length) return;
    // swap the two items' slots in the full list
    const list = [...sorted];
    const a = list.findIndex(it => it.variantId === inCat[i].variantId);
    const b = list.findIndex(it => it.variantId === inCat[j].variantId);
    [list[a], list[b]] = [list[b], list[a]];
    save(list);
  };

  const toggleConfirm = (id: string, v: Voice) => {
    const cur = conf[id] || [];
    const next = cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v].sort() as Voice[];
    saveConfirmation(uid, id, next, user?.email || '').catch(e => onError('ჩათვლა ვერ შეინახა: ' + errorText(e)));
  };
  // the student's own mark on a voice (or on a whole poem or instrument), set or taken back by the teacher
  const setMark = (it: PathItem, v: Voice, on: boolean) => {
    const have = voicesOf(it, it.variantId);
    const voices: Voice[] = usesVoices(it.variantId)
      ? (on ? [...new Set([...have, v])].sort() as Voice[] : have.filter(x => x !== v))
      : (on ? ['1'] : []);
    save(sorted.map(x => (x.variantId === it.variantId ? { ...x, voices, isLearned: voices.length > 0 } : x)));
  };
  // not known → marked → confirmed → not known
  const cycleVoice = (it: PathItem, v: Voice) => {
    const isConf = (conf[it.variantId] || []).includes(v);
    if (isConf) { toggleConfirm(it.variantId, v); setMark(it, v, false); }
    else if (voicesOf(it, it.variantId).includes(v)) toggleConfirm(it.variantId, v);
    else setMark(it, v, true);
  };
  const setLocked = (on: boolean) =>
    saveMarksLock(uid, on, user?.displayName || '').catch(e => onError('ვერ შეინახა: ' + errorText(e)));

  if (!loaded) return <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება...</p>;

  return (
    <div className="space-y-4">
      <div className="px-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
        <Toggle
          on={!lock?.on}
          onChange={on => setLocked(!on)}
          label="მოსწავლე თავად ნიშნავს"
          hint={lock?.on ? 'გამორთულია: ნასწავლ ხმებს მხოლოდ მასწავლებელი ნიშნავს.' : 'ჩართულია: მოსწავლე თვითონ ნიშნავს ნასწავლ ხმებს, შენ კი ჩათვლი.'}
        />
      </div>

      <CatalogPicker
        placeholder="საგალობლის ან სიმღერის დამატება"
        isTaken={id => !!map[id]}
        onPick={e => save([...sorted, e.make()])}
      />

      {groups.length === 0 && <p className="py-4 text-center text-sm text-[#8a7a6a]">საგანძურის გზა ცარიელია.</p>}

      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* the voices' three looks, said once; a tap moves a voice on: not known → marked → confirmed → not known */}
          {!ordering && (
            <p className="flex-1 min-w-[14rem] flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] font-semibold text-[#75685a]">
              <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-white ring-1 ring-[#d9ccb8]" /> არ იცის</span>
              <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-[#7a2028]/10 ring-1 ring-[#7a2028]/30 text-[#7a2028] flex items-center justify-center"><Check className="w-3 h-3" /></span> მოსწავლემ მონიშნა</span>
              <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center"><CheckCheck className="w-3 h-3" /></span> ჩათვლილია</span>
            </p>
          )}
          {ordering && <p className="flex-1 min-w-[12rem] text-[13px] font-semibold text-[#75685a]">ისრებით გადაალაგე, მერე „მზადაა“.</p>}
          {sorted.length > 1 && (
            <Btn kind={ordering ? 'primary' : 'ghost'} size="sm" icon={ordering ? <Check /> : <ArrowUpDown />} onClick={() => setOrdering(o => !o)}>
              {ordering ? 'მზადაა' : 'რიგის შეცვლა'}
            </Btn>
          )}
        </div>
      )}
      {!ordering && groups.length > 0 && <p className="-mt-2 text-[12px] text-[#8a7a6a]">ხმაზე შეხება: მონიშვნა → ჩათვლა → მოხსნა.</p>}

      {groups.map(({ c, items }) => (
        <div key={c} className="space-y-2">
          <h4 className="flex items-center justify-between text-sm font-bold text-[#4a3426]">
            {CATEGORY_LABEL[c]}
            <span className="text-xs font-semibold text-[#8a7a6a]">{items.length}</span>
          </h4>
          <ul className="space-y-2">
            {items.map((it, i) => {
              const marked = voicesOf(it, it.variantId);
              const confirmed = conf[it.variantId] || [];
              const voiceList: Voice[] = usesVoices(it.variantId) ? ['1', '2', '3'] : ['1'];
              return (
                <li key={it.variantId} className="p-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-6 text-right text-sm font-bold text-[#b3a594] tabular-nums pt-0.5">{i + 1}.</span>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-[#2a2017]">
                      {it.chantName}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-[#efe5d4] text-[#75685a] text-[11px] font-bold align-middle">{it.code}</span>
                    </span>
                    {ordering ? (
                      <>
                        <button type="button" onClick={() => move(it.variantId, -1)} disabled={i === 0} title="ზემოთ" aria-label="ზემოთ" className="w-10 h-10 shrink-0 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#7a2028] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => move(it.variantId, 1)} disabled={i === items.length - 1} title="ქვემოთ" aria-label="ქვემოთ" className="w-10 h-10 shrink-0 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[#7a2028] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                      </>
                    ) : (
                    <button
                      type="button"
                      onClick={async () => { if (await askConfirm({ title: `მოვხსნა „${it.chantName}“ ${name}-ის გზიდან?`, ok: 'მოხსნა', danger: true })) save(sorted.filter(x => x.variantId !== it.variantId)); }}
                      title="გზიდან მოხსნა"
                      aria-label="გზიდან მოხსნა"
                      className="w-9 h-9 shrink-0 rounded-full text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    )}
                  </div>
                  {!ordering && <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {voiceList.map(v => {
                      const isMarked = marked.includes(v);
                      const isConf = confirmed.includes(v);
                      const label = usesVoices(it.variantId) ? `${v} ხმა` : 'ნასწავლი';
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => cycleVoice(it, v)}
                          title={isConf ? 'ჩათვლილია — დააჭირე მოსახსნელად' : isMarked ? 'მონიშნულია — დააჭირე ჩასათვლელად' : 'დააჭირე მოსანიშნად'}
                          className={`h-9 px-3 rounded-full text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                            isConf
                              ? 'bg-emerald-700 text-white'
                              : isMarked
                                ? 'bg-[#7a2028]/10 text-[#7a2028] ring-1 ring-[#7a2028]/30 hover:ring-emerald-600'
                                : 'bg-white text-[#8a7a6a] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
                          }`}
                        >
                          {isConf ? <CheckCheck className="w-3.5 h-3.5" /> : isMarked ? <Check className="w-3.5 h-3.5" /> : null}
                          {label}
                        </button>
                      );
                    })}
                  </div>}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
