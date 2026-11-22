import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

// settings/chantListEdits { services: { [service]: { order?, archived?, deleted?, deletedAt? } } } — an admin's arrangement of a
// service's chant list (2026-11-22, the user: „დიდხანს დაჭერისას … არქივში გადატანა ან წაშლა ან რიგის შეცვლა“; answers „ყველასთვის,
// მხოლოდ ადმინი ცვლის · არქივი სიის ბოლოს ჩამოსაშლელში, წაშლა სულ ქრება — აღდგენა ადმინის პანელიდან · ▲ ▼“). Chant ids only; the
// books and their notes stay as they are. Everyone reads (settings), admins write.

export type ListEdit = { order?: string[]; archived?: string[]; deleted?: string[]; deletedAt?: Record<string, string> };
export type ListEdits = Record<string, ListEdit>;

const ids = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);

let now: ListEdits = {};
const subs = new Set<() => void>();
let off: (() => void) | null = null;

export const useChantListEdits = (): ListEdits => {
  const [, redraw] = useState(0);
  useEffect(() => {
    const r = () => redraw(x => x + 1);
    subs.add(r);
    if (!off) {
      off = onSnapshot(doc(db, 'settings', 'chantListEdits'), s => {
        const raw = (s.data()?.services ?? {}) as Record<string, Record<string, unknown>>;
        const next: ListEdits = {};
        for (const [k, v] of Object.entries(raw)) {
          if (!v || typeof v !== 'object') continue;
          const at = v.deletedAt && typeof v.deletedAt === 'object' ? (v.deletedAt as Record<string, string>) : {};
          next[k] = { order: ids(v.order), archived: ids(v.archived), deleted: ids(v.deleted), deletedAt: at };
        }
        now = next;
        subs.forEach(f => f());
      }, () => {});
    }
    return () => { subs.delete(r); if (!subs.size && off) { off(); off = null; } };
  }, []);
  return now;
};

/** The list as the admin arranged it: `main` in order, `archived` for the fold at the end; deleted ones are gone. */
export const arrange = <T extends { id: string }>(all: T[], edit: ListEdit | undefined) => {
  const del = new Set(edit?.deleted ?? []);
  const arc = new Set(edit?.archived ?? []);
  const rank = new Map((edit?.order ?? []).map((id, i) => [id, i]));
  const base = all.map((c, i) => ({ c, i })).filter(x => !del.has(x.c.id));
  // an ordered chant keeps its place; one not in the order yet keeps its book place after the one before it
  base.sort((a, b) => (rank.get(a.c.id) ?? Infinity) - (rank.get(b.c.id) ?? Infinity) || a.i - b.i);
  return { main: base.filter(x => !arc.has(x.c.id)).map(x => x.c), archived: base.filter(x => arc.has(x.c.id)).map(x => x.c) };
};

const change = (service: string, f: (e: Required<ListEdit>) => void) =>
  runTransaction(db, async t => {
    const ref = doc(db, 'settings', 'chantListEdits');
    const snap = await t.get(ref);
    const all = { ...((snap.data()?.services ?? {}) as Record<string, ListEdit>) };
    const cur = all[service] ?? {};
    const e: Required<ListEdit> = {
      order: ids(cur.order), archived: ids(cur.archived), deleted: ids(cur.deleted),
      deletedAt: cur.deletedAt && typeof cur.deletedAt === 'object' ? { ...cur.deletedAt } : {},
    };
    f(e);
    all[service] = e;
    t.set(ref, { services: all }); // whole, so a restored chant's date really goes
  });

/** Moves a chant one place up (−1) or down (+1) among the visible list `shown` (ids in their current order). */
export const moveChant = (service: string, shown: string[], id: string, by: -1 | 1) =>
  change(service, e => {
    const i = shown.indexOf(id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= shown.length) return;
    const next = [...shown];
    [next[i], next[j]] = [next[j], next[i]];
    e.order = next;
  });

export const setArchived = (service: string, id: string, on: boolean) =>
  change(service, e => {
    e.archived = on ? [...new Set([...e.archived, id])] : e.archived.filter(x => x !== id);
  });

export const setDeleted = (service: string, id: string, on: boolean) =>
  change(service, e => {
    e.deleted = on ? [...new Set([...e.deleted, id])] : e.deleted.filter(x => x !== id);
    if (on) e.deletedAt[id] = new Date().toISOString(); else delete e.deletedAt[id];
    if (on) e.archived = e.archived.filter(x => x !== id);
  });
