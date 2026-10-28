import React from 'react';
import { ChevronDown } from 'lucide-react';
import { MONTHS_GE } from '../../utils/dateNames';
import { BirthDate, daysInMonth } from '../../utils/profileFields';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i);

/** A native list (the phone opens its own wheel), styled like the form's text fields. */
const Pick: React.FC<{ id: string; value: number; onChange: (v: number) => void; fieldClass: string; children: React.ReactNode }> = ({
  id, value, onChange, fieldClass, children,
}) => (
  <div className="relative">
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(Number(e.target.value))}
      className={`${fieldClass} appearance-none pl-3.5 pr-9 cursor-pointer ${value ? '' : 'text-[#b3a594]'}`}
    >
      <option value="" disabled>—</option>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8a7a6a]" aria-hidden />
  </div>
);

/** The birth date as three lists — day · month · year — the same in „პირველი გაცნობა“ and the profile.
 *  0 is "not chosen"; a day the month does not have (31 April) is chosen again. */
export const BirthPick: React.FC<{
  value: BirthDate;
  onChange: (b: BirthDate) => void;
  idPrefix: string;
  fieldClass: string;
  /** each list's label, in the form's own style */
  label: (htmlFor: string, text: string) => React.ReactNode;
}> = ({ value, onChange, idPrefix, fieldClass, label }) => {
  const set = (patch: Partial<BirthDate>) => {
    const next = { ...value, ...patch };
    if (next.day && next.month && next.day > daysInMonth(next.year, next.month)) next.day = 0;
    onChange(next);
  };
  return (
    <div className="grid grid-cols-[0.9fr_1.75fr_1.2fr] gap-2">
      <div>
        {label(`${idPrefix}-day`, 'რიცხვი')}
        <Pick id={`${idPrefix}-day`} value={value.day} onChange={day => set({ day })} fieldClass={fieldClass}>
          {Array.from({ length: value.month ? daysInMonth(value.year, value.month) : 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </Pick>
      </div>
      <div>
        {label(`${idPrefix}-month`, 'თვე')}
        <Pick id={`${idPrefix}-month`} value={value.month} onChange={month => set({ month })} fieldClass={fieldClass}>
          {MONTHS_GE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </Pick>
      </div>
      <div>
        {label(`${idPrefix}-year`, 'წელი')}
        <Pick id={`${idPrefix}-year`} value={value.year} onChange={year => set({ year })} fieldClass={fieldClass}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </Pick>
      </div>
    </div>
  );
};
