import React from 'react';

/** „ავტომატური პროგრამა“'s own sign (plan 2.0): a cog with a spark in its middle — not the plain ⚙ of the settings.
 *  Drawn in the text's colour; sized by its parent like the kit's icons (`[&_svg]:size-…`). */
export const GearSpark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className}
    fill="currentColor" stroke="currentColor" strokeWidth={0.9} strokeLinejoin="round">
    <path fillRule="evenodd" d="M10.06 3.93L10.34 0.92A11.2 11.2 0 0 1 13.66 0.92L13.94 3.93A8.3 8.3 0 0 1 16.34 4.92L18.66 3.00A11.2 11.2 0 0 1 21.00 5.34L19.08 7.66A8.3 8.3 0 0 1 20.07 10.06L23.08 10.34A11.2 11.2 0 0 1 23.08 13.66L20.07 13.94A8.3 8.3 0 0 1 19.08 16.34L21.00 18.66A11.2 11.2 0 0 1 18.66 21.00L16.34 19.08A8.3 8.3 0 0 1 13.94 20.07L13.66 23.08A11.2 11.2 0 0 1 10.34 23.08L10.06 20.07A8.3 8.3 0 0 1 7.66 19.08L5.34 21.00A11.2 11.2 0 0 1 3.00 18.66L4.92 16.34A8.3 8.3 0 0 1 3.93 13.94L0.92 13.66A11.2 11.2 0 0 1 0.92 10.34L3.93 10.06A8.3 8.3 0 0 1 4.92 7.66L3.00 5.34A11.2 11.2 0 0 1 5.34 3.00L7.66 4.92A8.3 8.3 0 0 1 10.06 3.93ZM12.00 6.60Q12.75 11.25 17.40 12.00Q12.75 12.75 12.00 17.40Q11.25 12.75 6.60 12.00Q11.25 11.25 12.00 6.60Z" />
  </svg>
);
