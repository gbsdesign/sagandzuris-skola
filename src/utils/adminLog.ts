import { useEffect, useState } from 'react';
import { addDoc, collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../firebase';

// The admins' change log (⚙ „სკოლა“ → „ცვლილებების ჟურნალი“, superadmins only): who changed what and when — a role,
// letting someone in, a class, the archive, a section, a right, the kids' mode, an undo. adminLog/{auto id}
// { at, by: the admin's e-mail, byName, kind, text: one ready Georgian line, target: whose (uid or class id) }.
// firestore.rules: admins add their own lines, superadmins read, nobody changes or deletes one.

export type LogKind = 'role' | 'access' | 'class' | 'archive' | 'section' | 'right' | 'kids' | 'member' | 'undo';
export interface LogEntry { id: string; at: string; by: string; byName: string; kind: LogKind; text: string; target: string }

const MAX_TEXT = 300;

/** Adds a line (best effort: a change that worked is never undone because its line could not be written). */
export const logChange = (kind: LogKind, text: string, target = '') => {
  const u = auth.currentUser;
  if (!u?.email) return;
  void addDoc(collection(db, 'adminLog'), {
    at: new Date().toISOString(),
    by: u.email.toLowerCase(),
    byName: u.displayName || '',
    kind,
    text: text.slice(0, MAX_TEXT),
    target,
  }).catch(e => console.warn('adminLog:', e?.code || e));
};

/** The newest lines first. */
export const useAdminLog = (enabled: boolean, count = 40) => {
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(enabled);
  useEffect(() => {
    if (!enabled) { setLines([]); setLoading(false); return; }
    return onSnapshot(
      query(collection(db, 'adminLog'), orderBy('at', 'desc'), limit(count)),
      s => { setLines(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<LogEntry, 'id'>) }))); setLoading(false); },
      () => { setLines([]); setLoading(false); }
    );
  }, [enabled, count]);
  return { lines, loading };
};
