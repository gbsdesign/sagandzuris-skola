import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { KATHISMAS } from '../data/prayers';
import { kathismaOfPsalm } from './searchMatch';

// Psalms one adds after „მოწყალებისა კარი“, each of the seven hours its own list (in the order added):
// students/{uid}.hourPsalms = { 'hour-9': [50, 90] }. Without an account they stay on this device.

const LOCAL_KEY = 'sg-hour-psalms';

const clean = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 150) : [];

const readLocal = (): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

export const useHourPsalms = (uid: string | null | undefined, hourId: string) => {
  const [list, setList] = useState<number[]>([]);
  useEffect(() => {
    if (!uid) {
      setList(clean(readLocal()[hourId]));
      return;
    }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => setList(clean(snap.data()?.hourPsalms?.[hourId])),
      () => {}
    );
  }, [uid, hourId]);

  const save = useCallback(
    (next: number[]) => {
      setList(next);
      if (uid) {
        setDoc(doc(db, 'students', uid), { hourPsalms: { [hourId]: next } }, { merge: true }).catch(() => {});
        return;
      }
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...readLocal(), [hourId]: next }));
      } catch {
        /* private window: kept till the page closes */
      }
    },
    [uid, hourId]
  );

  const toggle = (n: number) => save(list.includes(n) ? list.filter(x => x !== n) : [...list, n]);
  return { list, toggle };
};

/** The first words of each psalm (index 0 = psalm 1), for the picker and the folded titles. */
let firstWords: Promise<string[]> | null = null;
export const loadPsalmFirstWords = () =>
  (firstWords ??= fetch('/prayers/psalms-index.json')
    .then(r => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<string[]>;
    })
    .catch(e => {
      firstWords = null;
      throw e;
    }));

/** One psalm, cut out of its kathisma: "<h2>first words</h2>", then its heading and text (without „დიდებაი“). */
export const loadPsalmHtml = async (n: number): Promise<string> => {
  const k = kathismaOfPsalm(n, KATHISMAS.map(x => x.psalms));
  if (!k) throw new Error(`psalm ${n}`);
  const start = Number(KATHISMAS[k - 1].psalms.split('–')[0]);
  const [kathisma, first] = await Promise.all([
    fetch(`/prayers/kathisma-${k}.json`).then(r => r.json() as Promise<{ html: string }>),
    loadPsalmFirstWords(),
  ]);
  // every psalm starts with its <h3>; the last one of a kathisma ends where a new <h2> (psalm 151) begins
  const part = kathisma.html.split(/(?=<h3)/)[n - start + 1] || '';
  const body = part
    .split(/(?=<h2)/)[0]
    .replace(/<em>\s*<strong>\s*დიდებაი\.?\s*<\/strong>\s*<\/em>/g, '')
    .replace(/(<br\s*\/?>\s*)+$/, '');
  return `<h2>${first[n - 1] || `ფსალმუნი ${n}`}</h2>${body}`;
};
