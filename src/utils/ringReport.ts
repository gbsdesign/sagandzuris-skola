import { useSyncExternalStore } from 'react';
import type { RingPerson } from './groupPush';

// Whom a call's ring reached (2026-11-24, the user: „რატომ არ ირეკება მოსწავლეებთან“). The reminders Worker answers the
// caller's /ring with each person's phones (worker/reminders `ringReport`); the call screen shows it in plain words, so
// the one who rings sees at once whose phone rang, whose has calls turned off, whose quiet hours held it, and whose phone
// the push service refused (with its own short word, for whoever looks into it).

export type RingState = 'rang' | 'quiet' | 'noPhone' | 'failed';

export interface RingRow extends RingPerson {
  name: string;
  state: RingState;
}

export interface RingReport {
  base: string;
  at: number;
  people: RingRow[];
}

/** a person's state: rang on a phone · no phone of theirs rings for calls · held by their quiet hours · refused */
export const stateOf = (p: RingPerson): RingState =>
  p.ok > 0 ? 'rang' : p.phones === 0 ? 'noPhone' : p.quiet ? 'quiet' : 'failed';

export const STATE_WORDS: Record<RingState, string> = {
  rang: 'ტელეფონზე დაირეკა',
  quiet: 'ჩუმი საათები აქვს ჩართული',
  noPhone: 'ტელეფონზე ზარები არ აქვს ჩართული',
  failed: 'ტელეფონამდე ვერ მივიდა',
};

const KIND_WORDS: Record<string, string> = { android: 'აპში', ios: 'iPhone-ის აპში', web: 'ბრაუზერში' };

/** where it rang: „აპში“, „ბრაუზერში“, „აპში და ბრაუზერში“ */
export const kindsLine = (kinds: string[]) => kinds.map(k => KIND_WORDS[k] || k).join(' და ');

const ORDER: Record<RingState, number> = { failed: 0, noPhone: 1, quiet: 2, rang: 3 };

/** the report's rows: those it did not reach first (what needs doing), then by name */
export const rowsOf = (people: RingPerson[], names: Record<string, string>): RingRow[] =>
  people
    .map(p => ({ ...p, name: names[p.uid] || 'წევრი', state: stateOf(p) }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.name.localeCompare(b.name, 'ka'));

/** how many phones rang, of how many people */
export const reachedOf = (rows: RingRow[]) => ({ rang: rows.filter(r => r.state === 'rang').length, all: rows.length });

// ---- the last report, for the call screen -----------------------------------------------------------------------

let last: RingReport | null = null;
const subs = new Set<() => void>();

export const setRingReport = (base: string, people: RingPerson[], names: Record<string, string>) => {
  last = { base, at: Date.now(), people: rowsOf(people, names) };
  subs.forEach(f => f());
};

/** the report of the call of `base` started in the last ten minutes, or null */
export const useRingReport = (base: string | null | undefined): RingReport | null => {
  const r = useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => last);
  return r && base && r.base === base && Date.now() - r.at < 10 * 60_000 ? r : null;
};
