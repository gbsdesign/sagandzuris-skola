import React, { useId } from 'react';
import { cx } from './cx';

const labelLook = 'pl-1.5 text-meta font-semibold text-mut';
const focusLook = 'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60';

/** A named one-line field, fully round on white — `field`. */
export const Field: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'className'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'search' | 'url' | 'password' | 'number';
  /** a grey line under the field */
  hint?: React.ReactNode;
  className?: string;
}> = ({ label, value, onChange, type = 'text', hint, className, id, ...rest }) => {
  const own = useId();
  const fieldId = id ?? own;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className={cx('flex shrink-0 flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className={labelLook}>{label}</label>
      <input
        {...rest}
        id={fieldId}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-describedby={hintId}
        className={cx(
          'h-[52px] w-full min-w-0 rounded-full bg-surf px-[18px] text-lead text-ink placeholder:text-faint',
          'disabled:opacity-50',
          focusLook,
        )}
      />
      {hint && <p id={hintId} className="px-1.5 text-meta leading-normal text-mut">{hint}</p>}
    </div>
  );
};

/** A box for a few lines of words that grows with them — `area`. */
export const Area: React.FC<Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'className'> & {
  label: string;
  /** keep the name for screen readers only (a box whose card already says what it is) */
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ label, hideLabel, value, onChange, className, id, rows = 3, ...rest }) => {
  const own = useId();
  const areaId = id ?? own;
  return (
    <div className={cx('flex shrink-0 flex-col gap-1.5', className)}>
      <label htmlFor={areaId} className={hideLabel ? 'sr-only' : labelLook}>{label}</label>
      <textarea
        {...rest}
        id={areaId}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cx(
          'field-sizing-content max-h-[45dvh] min-h-[110px] w-full resize-none rounded-tile bg-surf px-[18px] py-3.5',
          'text-lead leading-normal text-ink placeholder:text-faint disabled:opacity-50',
          focusLook,
        )}
      />
    </div>
  );
};
