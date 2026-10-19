// Each habit's own colour and icon: soft tones taken from the page's grapes and leaves, so the habits tell
// apart in the week grid, the calendars and the year map. A member may change them (✏️, utils/myHabits).
// Icons are named here and drawn by components/habits/HabitIcon.

export const HABIT_TONES = {
  wine: { name: 'ღვინისფერი', c: '#8a2a33' },
  terracotta: { name: 'აგურისფერი', c: '#b5553a' },
  amber: { name: 'ქარვისფერი', c: '#b7791f' },
  olive: { name: 'ზეთისხილისფერი', c: '#6e7a32' },
  sage: { name: 'მწვანე', c: '#4f8a68' },
  teal: { name: 'ფირუზისფერი', c: '#2c7a82' },
  blue: { name: 'ლურჯი', c: '#4a63a8' },
  plum: { name: 'იისფერი', c: '#7a4c94' },
  rose: { name: 'ვარდისფერი', c: '#ad4a6b' },
} as const;

export type HabitToneId = keyof typeof HABIT_TONES;
export const TONE_IDS = Object.keys(HABIT_TONES) as HabitToneId[];

export const HABIT_ICON_IDS = [
  'sunrise', 'moon', 'clock', 'book-open', 'scroll-text', 'library', 'heart', 'music', 'notebook-pen', 'church',
  'bell', 'star', 'hand-heart', 'message-circle-heart', 'grape', 'cross', 'feather', 'flower', 'sprout', 'bird',
  'mic-vocal', 'users', 'hourglass', 'sparkle',
] as const;
export type HabitIconId = (typeof HABIT_ICON_IDS)[number];

export interface HabitLook {
  tone: HabitToneId;
  icon: HabitIconId;
}

// the school's habits (ids from data/habitsAndManera); a member's own habit gets a tone by its id and ✦
export const SCHOOL_LOOKS: Record<string, HabitLook> = {
  habit_1: { tone: 'amber', icon: 'sunrise' },
  habit_15: { tone: 'blue', icon: 'moon' },
  habit_13: { tone: 'plum', icon: 'clock' },
  habit_2: { tone: 'wine', icon: 'book-open' },
  habit_3: { tone: 'terracotta', icon: 'scroll-text' },
  habit_4: { tone: 'olive', icon: 'library' },
  habit_5: { tone: 'rose', icon: 'heart' },
  habit_6: { tone: 'teal', icon: 'music' },
  habit_14: { tone: 'sage', icon: 'notebook-pen' },
  habit_11: { tone: 'wine', icon: 'church' },
  habit_12: { tone: 'amber', icon: 'bell' },
  habit_7: { tone: 'blue', icon: 'star' },
  habit_8: { tone: 'olive', icon: 'hand-heart' },
  habit_9: { tone: 'teal', icon: 'message-circle-heart' },
  habit_10: { tone: 'plum', icon: 'grape' },
};

/** A habit counted in numbers ("100-ჯერ", "5 გვერდი"): the day's habit ticks itself once the count reaches `goal`. */
export interface HabitCounter {
  goal: number;
  unit: string;
}

export const COUNTER_UNITS = ['ჯერ', 'გვერდი', 'წუთი', 'თავი', 'კანონი'];
export const MAX_COUNTER_GOAL = 9999;

// on from the start; a member may change the goal or switch the counter off
export const SCHOOL_COUNTERS: Record<string, HabitCounter> = {
  habit_5: { goal: 100, unit: 'ჯერ' },
  habit_4: { goal: 5, unit: 'გვერდი' },
  habit_2: { goal: 3, unit: 'თავი' },
  habit_3: { goal: 3, unit: 'თავი' },
  habit_6: { goal: 5, unit: 'კანონი' },
};

// what one tap on the day list's "+" adds (the Jesus prayer goes by tens); 1 for the rest
export const COUNTER_TAP_STEP: Record<string, number> = { habit_5: 10 };
