import { useCallback, useEffect, useState } from 'react';
import { georgiaToday } from './psalter';

// The manera exercises a student has done, kept on this device only (the student's own note, nobody else reads it):
// tip num → the Georgian days it was done, the last 60 days.
const KEY = 'sg-manera-done';
const EVENT = 'sg-manera-done';
type Done = Record<string, string[]>;

const read = (): Done => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
};

const daysAgo = (n: number) => georgiaToday(new Date(Date.now() - n * 86400000));

export const markManeraDone = (num: string) => {
  const done = read();
  const today = georgiaToday();
  const oldest = daysAgo(60);
  done[num] = [...new Set([...(done[num] || []), today])].filter(d => d >= oldest);
  try { localStorage.setItem(KEY, JSON.stringify(done)); } catch { /* storage off: the tick lasts this visit */ }
  window.dispatchEvent(new Event(EVENT));
};

/** Which tips are done today, and on how many of the last 7 days anything was practised. */
export const useManeraPractice = () => {
  const [done, setDone] = useState<Done>(read);
  useEffect(() => {
    const on = () => setDone(read());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  const today = georgiaToday();
  const weekStart = daysAgo(6);
  const doneToday = useCallback((num: string) => !!done[num]?.includes(today), [done, today]);
  const weekDays = new Set(Object.values(done).flat().filter(d => d >= weekStart)).size;
  return { doneToday, weekDays };
};
