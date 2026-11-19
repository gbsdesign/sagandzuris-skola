import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cx } from '../../../components/ui2';
import { MONTHS_GE } from '../../../utils/dateNames';
import { BirthDate, daysInMonth } from '../../../utils/profileFields';

// Small shared parts of the profile's and the first meeting's new-look screens (pages/v2/propili, pages/v2/gatsnoba).

const labelLook = 'pl-1.5 text-meta font-semibold text-mut';

/** A native list (the phone opens its own wheel) drawn like the kit's field: white, fully round, a ▾ at its end. */
export const SelectField: React.FC<{
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
  /** a grey line under it */
  hint?: React.ReactNode;
  className?: string;
}> = ({ label, value, onChange, placeholder, children, hint, className }) => {
  const id = useId();
  return (
    <div className={cx('flex min-w-0 shrink-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={labelLook}>{label}</label>
      <span className="relative block">
        <select
          id={id}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className={cx(
            'h-[52px] w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-surf pr-10 pl-[18px] text-lead',
            'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
            value ? 'text-ink' : 'text-mut',
          )}
        >
          <option value="" disabled>{placeholder}</option>
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3.5 size-[18px] -translate-y-1/2 text-mut" />
      </span>
      {hint && <p className="px-1.5 text-meta leading-normal text-mut">{hint}</p>}
    </div>
  );
};

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i);

/** The birth date as three lists — რიცხვი · თვე · წელი (the old `ui/BirthPick`'s rules: a day the month lacks is chosen again). */
export const BirthFields: React.FC<{ value: BirthDate; onChange: (b: BirthDate) => void }> = ({ value, onChange }) => {
  const set = (patch: Partial<BirthDate>) => {
    const next = { ...value, ...patch };
    if (next.day && next.month && next.day > daysInMonth(next.year, next.month)) next.day = 0;
    onChange(next);
  };
  return (
    <div className="flex shrink-0 gap-2">
      <SelectField label="რიცხვი" placeholder="—" value={value.day} onChange={v => set({ day: Number(v) })} className="w-[88px] shrink-0">
        {Array.from({ length: value.month ? daysInMonth(value.year, value.month) : 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </SelectField>
      <SelectField label="თვე" placeholder="—" value={value.month} onChange={v => set({ month: Number(v) })} className="flex-1">
        {MONTHS_GE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </SelectField>
      <SelectField label="წელი" placeholder="—" value={value.year} onChange={v => set({ year: Number(v) })} className="w-[104px] shrink-0">
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </SelectField>
    </div>
  );
};

/** A short red line under a form. */
export const ErrorLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p role="alert" className="shrink-0 px-1.5 text-meta leading-normal font-semibold text-danger">{children}</p>
);
