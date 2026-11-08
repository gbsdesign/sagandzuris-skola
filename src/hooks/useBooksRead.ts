import { useEffect, useState } from 'react';
import { deleteField, doc, FieldPath, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context';
import { georgiaToday } from '../utils/psalter';
import { LIBRARY_BOOK_IDS } from '../data/libraryBooks';
import { loadLivesIndex } from '../data/saintLives';

// „წავიკითხე“ in the library (2026-11-09, the user: „ბიბლიოთეკის ღილაკი აქ ჩამოიტანე … 5 / 112 წიგნიდან წაკითხული … ქონდეს
// ღილაკი წავიკითხე“, answers „წიგნები + ცხოვრებები · ზედა ზოლში“): a whole book (`book:<place>`, BookTab's place) or a saint's
// life (`life:<id>`) marked read. A member's in students/{uid}.booksRead {id: the Georgian day}, a guest's on this device.
// „საგანძურის გზა“'s library ring counts them against every book + every listed life.
const KEY = 'sg-books-read';
const EVENT = 'sg-books-read';

export const bookReadId = (place: string) => `book:${place}`;
export const lifeReadId = (id: string) => `life:${id}`;

const clean = (raw: unknown): Record<string, string> =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'))
    : {};

const readLocal = (): Record<string, string> => {
  try { return clean(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return {}; }
};

export const useBooksRead = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const [read, setRead] = useState<Record<string, string>>(() => (uid ? {} : readLocal()));
  useEffect(() => {
    if (!uid) {
      setRead(readLocal());
      const on = () => setRead(readLocal());
      window.addEventListener(EVENT, on);
      return () => window.removeEventListener(EVENT, on);
    }
    return onSnapshot(doc(db, 'students', uid), snap => setRead(clean(snap.data()?.booksRead)), () => {});
  }, [uid]);

  const toggle = (id: string) => {
    const on = !read[id];
    const next = { ...read };
    if (on) next[id] = georgiaToday();
    else delete next[id];
    setRead(next);
    if (uid) {
      const ref = doc(db, 'students', uid);
      // a life's id holds „/“, so the field goes by FieldPath, never a dotted string
      (on
        ? setDoc(ref, { booksRead: { [id]: next[id] } }, { merge: true })
        : updateDoc(ref, new FieldPath('booksRead', id), deleteField())
      ).catch(() => {});
    } else {
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage off: it lasts this visit */ }
      window.dispatchEvent(new Event(EVENT));
    }
    return on;
  };

  return { read, isRead: (id: string) => !!read[id], toggle };
};

let lifeIds: Promise<Set<string>> | null = null;
const loadLifeIds = () =>
  (lifeIds ??= loadLivesIndex().then(l => new Set(l.filter(e => !e.x).map(e => lifeReadId(e.id)))));

/** the library ring: how many of the library's books and lives are read, of how many (total null while the list loads) */
export const useLibraryProgress = () => {
  const { read } = useBooksRead();
  const [lives, setLives] = useState<Set<string> | null>(null);
  useEffect(() => {
    let alive = true;
    loadLifeIds().then(s => alive && setLives(s)).catch(() => {});
    return () => { alive = false; };
  }, []);
  const books = LIBRARY_BOOK_IDS.map(bookReadId);
  const done = Object.keys(read).filter(id => books.includes(id) || !!lives?.has(id)).length;
  return { done, total: lives ? books.length + lives.size : null };
};
