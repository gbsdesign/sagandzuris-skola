import type { CalendarDay } from '../../../data/churchCalendar';
import { ANSWER_BANK } from '../../../data/sitqvaAnswers';
import { candidatesOfDay, wordOfDay, type SitqvaCandidate } from '../../../utils/sitqva';
import { dayBefore } from '../../../utils/hangi';

/** the day's word of „დღის სიტყვა“ — the daily game asks it, the teams' game keeps away from it (yesterday's and the day
 *  before's words are skipped as the daily game skips them) */
export const dayPick = (cal: Record<string, CalendarDay>, today: string): SitqvaCandidate | undefined => {
  const wordOn = (iso: string, skip?: string) => wordOfDay(iso, candidatesOfDay(cal[iso]), ANSWER_BANK, skip)?.word;
  const yesterday = dayBefore(today);
  return wordOfDay(today, candidatesOfDay(cal[today]), ANSWER_BANK, wordOn(yesterday, wordOn(dayBefore(yesterday))));
};
