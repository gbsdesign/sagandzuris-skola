import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

// The messages list's own order, the same on every device of mine (students/{uid}):
// chatPins — the chats pinned on top (ids: a private chat's id, or „class:<id>“), at most PIN_MAX, the newest pin first;
// chatHidden — chats taken off the list: id → the time (ms) of its newest message when hidden; a newer message brings it back.
export const PIN_MAX = 5;
const HIDDEN_MAX = 200;

export interface ChatListPrefs {
  pins: string[];
  hidden: Record<string, number>;
}

const clean = (d: Record<string, unknown> | undefined): ChatListPrefs => {
  const pins = Array.isArray(d?.chatPins) ? (d!.chatPins as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, PIN_MAX) : [];
  const raw = d?.chatHidden && typeof d.chatHidden === 'object' ? (d.chatHidden as Record<string, unknown>) : {};
  const hidden: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'number') hidden[k] = v;
  return { pins, hidden };
};

/** a chat stays hidden while nothing newer than when it was hidden came in */
export const isHidden = (prefs: ChatListPrefs, id: string, lastMs: number) => id in prefs.hidden && lastMs <= prefs.hidden[id];

export const useChatListPrefs = (uid: string) => {
  const [prefs, setPrefs] = useState<ChatListPrefs>({ pins: [], hidden: {} });
  // the newest choice, for a „გაუქმება“ that runs after this render has gone
  const cur = useRef(prefs);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'students', uid), s => { cur.current = clean(s.data()); setPrefs(cur.current); }, () => {});
  }, [uid]);

  // shown at once, written in the background (a staff member with no record gets one with only these fields)
  const save = (next: ChatListPrefs, field: 'chatPins' | 'chatHidden') => {
    cur.current = next;
    setPrefs(next);
    const value = field === 'chatPins' ? next.pins : next.hidden;
    setDoc(doc(db, 'students', uid), { [field]: value }, { mergeFields: [field] }).catch(e => console.warn('chat list: ', e?.code || e));
  };

  /** false when PIN_MAX are pinned already */
  const pin = (id: string) => {
    const p = cur.current;
    if (p.pins.includes(id)) return true;
    if (p.pins.length >= PIN_MAX) return false;
    save({ ...p, pins: [id, ...p.pins] }, 'chatPins');
    return true;
  };
  const unpin = (id: string) => save({ ...cur.current, pins: cur.current.pins.filter(x => x !== id) }, 'chatPins');
  const hide = (id: string, lastMs: number) => {
    const p = cur.current;
    const entries = Object.entries({ ...p.hidden, [id]: lastMs }).sort((a, b) => b[1] - a[1]).slice(0, HIDDEN_MAX);
    save({ ...p, hidden: Object.fromEntries(entries) }, 'chatHidden');
  };
  const unhide = (id: string) => {
    const p = cur.current;
    if (!(id in p.hidden)) return;
    const hidden = { ...p.hidden };
    delete hidden[id];
    save({ ...p, hidden }, 'chatHidden');
  };
  return { prefs, pin, unpin, hide, unhide };
};
