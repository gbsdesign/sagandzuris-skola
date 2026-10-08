// One look for the whole "საგანძურის გზა" page: white cards with no boxes inside them (thin dividers only),
// a small label over each part, round 36px chips, and three colours — wine, green for done, amber for a near deadline.

/** a card of the page */
export const PATH_CARD =
  'rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_12px_30px_-20px_rgba(42,32,23,0.35)] p-3.5 sm:p-4';

/** the small label over a part of a card: "დავალებები", "გაკვეთილები", "შენი გზა" */
export const PATH_LABEL = 'flex items-center gap-1.5 text-[13px] font-bold leading-tight text-[#75685a]';
/** the label's icon */
export const PATH_LABEL_ICON = 'w-4 h-4 shrink-0 text-[#7a2028]';

/** a round 36px chip or button; add one of the tones below (and cursor-pointer for a button) */
export const PATH_CHIP =
  'h-9 px-3 rounded-full text-[13px] font-bold tabular-nums whitespace-nowrap inline-flex items-center gap-1 transition-colors';
/** a button at rest */
export const CHIP_SOFT = 'bg-[#7a2028]/[0.06] text-[#7a2028] hover:bg-[#7a2028]/[0.12]';
/** the chosen, switched-on or next one */
export const CHIP_STRONG = 'bg-[#7a2028] text-[#fbf6ec]';
/** done */
export const CHIP_DONE = 'bg-emerald-600 text-white';
/** a chip that only shows something (not a button) */
export const CHIP_STATIC = 'bg-[#7a2028]/[0.06] text-[#4a3426]';
