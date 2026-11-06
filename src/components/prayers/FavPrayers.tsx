import React, { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Star } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { isPrayerId, prayerTitle } from '../../data/prayers';
import { triggerHaptic } from '../../utils/haptics';
import { offerUndo } from '../ui/kit';

// „რჩეული“ prayers (2026-11-06, the user: „დაამატე რჩეული ლოცვების ადგილი, ანუ სიის თავში გამოჩნდეს რასაც აირჩევს ლოცვებიდან“;
// answer „ლოცვის გვერდზე ☆ ღილაკით“): the prayer page's bar has a ☆ beside its 📌 (FavButton), and the chosen prayers stand
// at the top of the prayer book (FavPrayers), in the order they were chosen. Kept in students/{uid}.favPrayers (every device
// of mine), on the device for guests (`sg-fav-prayers`); any prayer id the prayer page opens (prayerTitle knows it).

const KEY = 'sg-fav-prayers';
const MAX = 40;
const deviceList = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
};

// this device's changes reach every user of the hook at once (the bar's ☆ and the book's list)
const subs = new Set<(list: string[]) => void>();

export const useFavPrayers = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [kept, setKept] = useState<string[] | null>(null);
  const [here, setHere] = useState<string[]>(deviceList);
  useEffect(() => {
    if (!uid) { setKept(null); return; }
    return onSnapshot(doc(db, 'students', uid), snap => {
      const v = snap.data()?.favPrayers;
      setKept(Array.isArray(v) ? v.filter((x: unknown): x is string => typeof x === 'string') : []);
    }, () => setKept([]));
  }, [uid]);
  useEffect(() => {
    const on = (list: string[]) => (uid ? setKept(list) : setHere(list));
    subs.add(on);
    return () => { subs.delete(on); };
  }, [uid]);
  const list = (uid ? kept ?? [] : here).filter(isPrayerId);
  const current = useRef(list);
  current.current = list;
  const save = (next: string[]) => {
    const clean = [...new Set(next)].slice(-MAX);
    current.current = clean;
    subs.forEach(f => f(clean));
    if (uid) setDoc(doc(db, 'students', uid), { favPrayers: clean }, { mergeFields: ['favPrayers'] }).catch(() => {});
    else try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* private window */ }
  };
  return {
    list,
    loaded: !uid || kept !== null,
    has: (id: string) => list.includes(id),
    add: (id: string) => save([...current.current.filter(x => x !== id), id]),
    remove: (id: string) => save(current.current.filter(x => x !== id)),
    /** puts a removed one back in its old place */
    restore: (id: string, at: number) => {
      const l = current.current.filter(x => x !== id);
      l.splice(Math.min(at, l.length), 0, id);
      save(l);
    },
  };
};

/** ☆ on the prayer page's bar: adds the prayer to „რჩეული“ (★ takes it off). */
export const FavButton: React.FC<{ id: string }> = ({ id }) => {
  const fav = useFavPrayers();
  const [note, setNote] = useState('');
  if (!fav.loaded || !isPrayerId(id)) return null;
  const on = fav.has(id);
  const toggle = () => {
    triggerHaptic(15);
    if (on) { fav.remove(id); setNote('რჩეულიდან მოიხსნა'); }
    else { fav.add(id); setNote('დაემატა რჩეულში'); }
    window.setTimeout(() => setNote(''), 2200);
  };
  const label = on ? 'რჩეულიდან მოხსნა' : 'რჩეულში დამატება';
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        title={label}
        aria-label={label}
        className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition active:scale-95 ${
          on ? 'bg-[#fff3d6] ring-1 ring-[#e0bd6a] text-[#b07d12]' : 'bg-white/85 ring-1 ring-[#e8dcc8] text-[#7a2028] hover:ring-[#7a2028]/40'
        }`}
      >
        <Star className="w-[18px] h-[18px]" fill={on ? 'currentColor' : 'none'} />
      </button>
      {note && <span role="status" className="absolute right-0 top-full mt-1.5 z-20 whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#2a2017] text-white text-xs font-semibold shadow sg-in">{note}</span>}
    </span>
  );
};

/** The top of the prayer book: the chosen prayers, a tap opens one, ★ takes it off (with „გაუქმება“). */
export const FavPrayers: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const fav = useFavPrayers();
  if (!fav.loaded) return null;
  if (!fav.list.length) {
    return (
      <p className="flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-dashed border-[#dccbb0] text-[13px] leading-snug text-[#8a7a6a]">
        <Star className="w-[18px] h-[18px] shrink-0 text-[#c9a24a]" />
        <span>რჩეული ლოცვები აქ გამოჩნდება — ლოცვის გვერდზე ზემოთ ☆-ს დააჭირე.</span>
      </p>
    );
  }
  return (
    <section aria-label="რჩეული ლოცვები" className="rounded-3xl bg-gradient-to-b from-[#fff8e6] to-[#fffdf8] ring-1 ring-[#ecd9a8] p-2.5 pt-3">
      <h2 className="px-2 pb-2 flex items-center gap-2">
        <Star className="w-[18px] h-[18px] text-[#b07d12]" fill="currentColor" />
        <span className="font-serif-ge text-[15px] font-bold text-[#4a3426]">რჩეული</span>
        <span className="text-[13px] font-bold text-[#b9a27a] tabular-nums">{fav.list.length}</span>
      </h2>
      <ul className="space-y-1.5">
        {fav.list.map((id, i) => (
          // one pill: the name opens the prayer, the ★ at its right end takes it off (2026-11-06 — a star floating beside
          // the pill looked like a separate thing)
          <li key={id} className="relative">
            <button
              type="button"
              onClick={() => { triggerHaptic(8); onOpen(id); }}
              className="w-full min-h-12 pl-3.5 pr-[52px] py-2 rounded-2xl bg-white ring-1 ring-[#eadfcd] hover:ring-[#7a2028]/30 text-left flex items-center gap-2 cursor-pointer active:scale-[0.99] transition"
            >
              <span className="flex-1 min-w-0 text-[14px] font-bold leading-snug text-[#2a2017]">{prayerTitle(id)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                fav.remove(id);
                offerUndo('რჩეულიდან მოიხსნა', () => fav.restore(id, i));
              }}
              aria-label={`${prayerTitle(id)} — რჩეულიდან მოხსნა`}
              title="რჩეულიდან მოხსნა"
              className="absolute top-1/2 -translate-y-1/2 right-1 w-11 h-10 rounded-xl grid place-items-center text-[#b07d12] hover:bg-[#b07d12]/10 cursor-pointer active:scale-95 transition"
            >
              <Star className="w-[18px] h-[18px]" fill="currentColor" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
