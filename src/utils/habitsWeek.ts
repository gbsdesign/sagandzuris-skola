// The habits checklist starts over every Sunday at 09:00 (local time).
const RESET_DAY = 0; // Sunday
const RESET_HOUR = 9;

const MONTH_NAMES_GE = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/** Start of the current habits week: the most recent Sunday 09:00 that is not in the future. */
export const getHabitsWeekStart = (now: Date = new Date()): Date => {
  const start = new Date(now);
  start.setHours(RESET_HOUR, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() - RESET_DAY + 7) % 7));
  if (start > now) start.setDate(start.getDate() - 7);
  return start;
};

/** Stable id of the current habits week, stored next to habitsStats in Firestore. */
export const getHabitsWeekKey = (now: Date = new Date()): string => getHabitsWeekStart(now).toISOString();

/** e.g. "კვირა, 5 ოქტომბერი, 09:00" */
export const formatNextHabitsReset = (now: Date = new Date()): string => {
  const next = getHabitsWeekStart(now);
  next.setDate(next.getDate() + 7);
  return `კვირა, ${next.getDate()} ${MONTH_NAMES_GE[next.getMonth()]}, ${String(RESET_HOUR).padStart(2, '0')}:00`;
};
