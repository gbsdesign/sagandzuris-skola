import { pearlState, type PearlRecord, type PearlShine } from './pearls';

// The admin's short picture of one member (the person's window, 2026-10-28): what they did in the app, from their own
// record (students/{uid}) — nothing new is stored. Attendance comes from the classes' lists, apart from this.

export interface PersonActivity {
  /** pearls sung right (polished) or approved by a teacher (shining) */
  pearls: number;
  /** parts of chants and songs learned in the learning mode (level ≥ 1) */
  parts: number;
  /** habit ticks in the last 7 days, today included */
  habitsWeek: number;
  /** ოსტატობა exercises done at least once */
  drills: number;
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** `today` is the local day; the week is it and the six days before. */
export const personActivity = (data: Record<string, any> | null | undefined, today: Date = new Date()): PersonActivity => {
  const d = data || {};
  const pearls: Record<string, PearlRecord> = d.pearls && typeof d.pearls === 'object' ? d.pearls : {};
  const shine: Record<string, PearlShine> = d.pearlShine && typeof d.pearlShine === 'object' ? d.pearlShine : {};
  const ids = new Set([...Object.keys(pearls), ...Object.keys(shine)]);
  const pearlCount = [...ids].filter(id => ['polished', 'shining'].includes(pearlState(pearls[id], shine[id]))).length;

  const learning: Record<string, Record<string, { level?: number }>> = d.learning && typeof d.learning === 'object' ? d.learning : {};
  const parts = Object.values(learning).reduce(
    (n, rec) => n + (rec && typeof rec === 'object' ? Object.values(rec).filter(r => (r?.level ?? 0) >= 1).length : 0), 0);

  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const first = isoDay(from), last = isoDay(today);
  const log: Record<string, unknown> = d.habitLog && typeof d.habitLog === 'object' ? d.habitLog : {};
  const habitsWeek = Object.entries(log)
    .filter(([day, list]) => day >= first && day <= last && Array.isArray(list))
    .reduce((n, [, list]) => n + (list as unknown[]).length, 0);

  const drills = d.drillDone && typeof d.drillDone === 'object' ? Object.keys(d.drillDone).length : 0;
  return { pearls: pearlCount, parts, habitsWeek, drills };
};
