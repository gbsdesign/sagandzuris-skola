import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { fireworks } from '../../utils/samosiFireworks';
import { KABA_PARTS, KABA_TOTAL, KabaPart } from '../../data/kabaData';
import { KabaHead, useKabaArt } from '../../utils/kabaArt';
import { KabaFigure } from './KabaFigure';
import { KabaStudio } from './KabaStudio';

const KNOWN = new Set(KABA_PARTS.map(p => p.id));

// „ქართული კაბა“ in „ჩემი სამოსი“ (redesign stage 5): the member ticks off the dress's parts as with the chokha and
// watches it come together (students/{uid}.kaba). The owner also sees the studio that makes the pictures.
export const KabaSamosi: React.FC<{ published: boolean; head: KabaHead }> = ({ published, head }) => {
  const { user, isOwner } = useAuth();
  const pieces = useKabaArt(true);
  const [owned, setOwned] = useState<string[]>([]);
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [cheer, setCheer] = useState<{ n: number; finale: boolean } | null>(null);
  const [shine, setShine] = useState(0);
  const [story, setStory] = useState<KabaPart | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), s => {
      const v = s.data()?.kaba;
      if (Array.isArray(v)) setOwned(v.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)));
    });
  }, [user]);
  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  const has = (id: string) => owned.includes(id);
  const done = owned.length;
  const complete = done === KABA_TOTAL;
  const ready = !!pieces?.full && KABA_PARTS.every(p => pieces[p.id]);

  const toggle = (p: KabaPart) => {
    const adding = !has(p.id);
    const next = adding ? [...owned, p.id] : owned.filter(id => id !== p.id);
    setOwned(next);
    triggerHaptic(adding ? 25 : 10);
    setStory(adding ? p : s => (s?.id === p.id ? null : s));
    if (adding) {
      const finale = next.length === KABA_TOTAL;
      setDrops(d => ({ ...d, [p.id]: (d[p.id] || 0) + 1 }));
      setCheer({ n: Date.now(), finale });
      fireworks(finale);
      if (finale) setShine(s => s + 1);
    }
    if (user) setDoc(doc(db, 'students', user.uid), { kaba: next }, { mergeFields: ['kaba'] }).catch(err => console.warn('Firestore kaba note:', err));
  };

  if (!pieces) return <p className="py-10 text-center text-sm text-[#8a7a6a]">იტვირთება…</p>;

  return (
    <div className="space-y-5">
      {ready && (published || isOwner) && (
        <>
          <div className="relative pt-3 pb-1 rounded-2xl bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_42%,#f6efe3_100%)]">
            <KabaFigure pieces={pieces} on={has} drops={drops} shine={complete ? shine : null} place={head} />
            {cheer && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-10" role="status" aria-live="polite">
                <div key={cheer.n} className="samosi-cheer px-6 py-3.5 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-[#eadfcb] shadow-[0_14px_36px_-14px_rgba(74,52,38,0.5)] text-center">
                  {cheer.finale && <p className="text-[12px] font-black tracking-wide text-emerald-700">კაბა სრულადაა!</p>}
                  <p className="font-serif-ge text-2xl font-bold text-[#7a2028] leading-tight">გილოცავ!</p>
                  <p className="text-sm font-bold text-[#4a3426]">ღმერთს ებარებოდე!</p>
                </div>
              </div>
            )}
          </div>

          {story && (
            <div key={story.id} className="flex items-start gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#eadfcb] pl-2.5 pr-1.5 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300" aria-live="polite">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center overflow-hidden">
                {pieces[story.id]?.thumb && <img src={pieces[story.id].thumb} alt="" className="w-9 h-9 object-contain" />}
              </span>
              <p className="flex-1 min-w-0 pt-0.5 text-[13px] leading-relaxed text-[#4a3426]">
                <span className="font-bold text-[#7a2028]">{story.label}. </span>
                {story.story}
              </p>
              <button type="button" onClick={() => setStory(null)} aria-label="დახურვა"
                className="w-9 h-9 shrink-0 -my-1 rounded-full flex items-center justify-center text-[#a99a88] hover:text-[#7a2028] hover:bg-white cursor-pointer transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={KABA_TOTAL} aria-valuenow={done} aria-label="შეგროვებული ნაწილები">
            <div className="relative flex-1 h-1.5 rounded-full bg-[#f1e8da] overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${complete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-[#b04450] to-[#7a2028]'}`}
                style={{ width: `${(done / KABA_TOTAL) * 100}%` }}
              />
              {Array.from({ length: KABA_TOTAL - 1 }, (_, i) => (
                <span key={i} className="absolute inset-y-0 w-0.5 -ml-px bg-white" style={{ left: `${((i + 1) / KABA_TOTAL) * 100}%` }} />
              ))}
            </div>
            {complete ? (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                <Check className="w-3 h-3 stroke-[3.5]" />
                სრულია
              </span>
            ) : (
              <span className="text-xs font-black text-[#7a2028] tabular-nums">{done}<span className="text-[#b3a593]">/{KABA_TOTAL}</span></span>
            )}
          </div>

          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-2 items-start">
            {KABA_PARTS.map(p => {
              const on = has(p.id);
              return (
                <button key={p.id} type="button" onClick={() => toggle(p)} aria-pressed={on}
                  className={`group flex items-center gap-2.5 min-h-12 py-1 pl-1.5 pr-2 rounded-xl text-left ring-1 ring-inset transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                    on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/35' : 'bg-[#f8f5ef] ring-transparent hover:bg-[#f2ece2]'}`}>
                  <span className="relative w-9 h-9 shrink-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center">
                    {pieces[p.id]?.thumb && (
                      <img src={pieces[p.id].thumb} alt="" className={`w-8 h-8 object-contain transition-[filter,opacity] duration-300 ${on ? '' : 'grayscale opacity-50 group-hover:opacity-75'}`} />
                    )}
                    <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white transition-all duration-200 ${
                      on ? 'bg-[#7a2028] text-white scale-100' : 'bg-white text-transparent scale-0'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </span>
                  </span>
                  <span className={`flex-1 min-w-0 text-[13px] font-bold leading-tight ${on ? 'text-[#2a2017]' : 'text-[#7d6e5f]'}`}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {isOwner && <KabaStudio pieces={pieces} published={published} head={head} />}
    </div>
  );
};
