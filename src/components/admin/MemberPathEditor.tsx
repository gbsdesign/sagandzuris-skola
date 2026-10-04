import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, X, Check, CheckCheck } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { filterValidVariants } from '../../utils/variantValidation';
import { PathItem, Voice, sortPathItems, categoryOf, CATEGORY_LABEL, PathCategory, usesVoices, voicesOf } from '../../utils/pathItems';
import { useConfirmations, saveConfirmation } from '../../hooks/useConfirmations';
import { CatalogPicker } from './CatalogPicker';

type PathMap = Record<string, PathItem>;

/** Gives every item an order following the current display order, so moves and additions stick. */
const normalized = (list: PathItem[]): PathMap =>
  Object.fromEntries(list.map((it, i) => [it.variantId, { ...it, order: i }]));

export const writePath = (uid: string, map: PathMap) =>
  setDoc(doc(db, 'students', uid), { selectedChantVariants: map }, { mergeFields: ['selectedChantVariants'] });

// Teacher's view of one student's "საგანძურის გზა": add, remove, reorder, and confirm ("ჩათვლა") each voice.
export const MemberPathEditor: React.FC<{ uid: string; name: string; onError: (t: string) => void }> = ({ uid, name, onError }) => {
  const { user } = useAuth();
  const [map, setMap] = useState<PathMap>({});
  const [loaded, setLoaded] = useState(false);
  const conf = useConfirmations(uid);

  useEffect(() => {
    setLoaded(false);
    return onSnapshot(
      doc(db, 'students', uid),
      snap => { setMap(filterValidVariants((snap.exists() && snap.data().selectedChantVariants) || {})); setLoaded(true); },
      err => { onError('მოსწავლის გზა ვერ ჩაიტვირთა: ' + (err?.code || '')); setLoaded(true); }
    );
  }, [uid]);

  const sorted = useMemo(() => sortPathItems(Object.values(map)), [map]);
  const groups = (['galoba', 'simghera', 'mtkmeli', 'sakravebi'] as PathCategory[])
    .map(c => ({ c, items: sorted.filter(it => categoryOf(it.variantId) === c) }))
    .filter(g => g.items.length > 0);

  const save = (list: PathItem[]) => {
    const next = normalized(list);
    setMap(next);
    writePath(uid, next).catch(e => onError('ვერ შეინახა: ' + (e?.message || '')));
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
    saveConfirmation(uid, id, next, user?.email || '').catch(e => onError('ჩათვლა ვერ შეინახა: ' + (e?.code === 'permission-denied' ? 'ბაზის წესებში confirmations ჯერ არ არის დამატებული.' : e?.message || '')));
  };

  if (!loaded) return <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება...</p>;

  return (
    <div className="space-y-4">
      <CatalogPicker
        placeholder={`დაამატე ${name}-ის გზაზე`}
        isTaken={id => !!map[id]}
        onPick={e => save([...sorted, e.make()])}
      />

      {groups.length === 0 && <p className="py-4 text-center text-sm text-[#8a7a6a]">საგანძურის გზა ცარიელია.</p>}

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
                    <button type="button" onClick={() => move(it.variantId, -1)} disabled={i === 0} title="ზემოთ" className="w-8 h-8 rounded-full text-[#8a7a6a] hover:bg-[#fbf6ec] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => move(it.variantId, 1)} disabled={i === items.length - 1} title="ქვემოთ" className="w-8 h-8 rounded-full text-[#8a7a6a] hover:bg-[#fbf6ec] disabled:opacity-30 flex items-center justify-center cursor-pointer"><ArrowDown className="w-4 h-4" /></button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`მოვხსნა „${it.chantName}“ ${name}-ის გზიდან?`) && save(sorted.filter(x => x.variantId !== it.variantId))}
                      title="მოხსნა"
                      className="w-8 h-8 rounded-full text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {voiceList.map(v => {
                      const isMarked = marked.includes(v);
                      const isConf = confirmed.includes(v);
                      const label = usesVoices(it.variantId) ? `${v} ხმა` : 'ნასწავლი';
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => toggleConfirm(it.variantId, v)}
                          title={isConf ? 'ჩათვლილია — დააჭირე გასაუქმებლად' : isMarked ? 'მოსწავლემ მონიშნა — დააჭირე ჩასათვლელად' : 'დააჭირე ჩასათვლელად'}
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <p className="text-xs text-[#8a7a6a] leading-relaxed">
        <span className="text-[#7a2028] font-semibold">ღვინისფერი ✓</span> — მოსწავლემ თავად მონიშნა ·{' '}
        <span className="text-emerald-700 font-semibold">მწვანე ✓✓</span> — მასწავლებელმა ჩათვალა. ხმაზე დაჭერა ჩათვლას რთავს ან აუქმებს.
      </p>
    </div>
  );
};
