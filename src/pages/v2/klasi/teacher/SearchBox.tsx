import React from 'react';
import { Search, X } from 'lucide-react';
import { RoundButton, cx } from '../../../../components/ui2';

/** The round search field of the teacher's sheets (x-tsevris-damateba, x-klasi-programashi-damateba). */
export const SearchBox: React.FC<{ value: string; onChange: (q: string) => void; placeholder: string; autoFocus?: boolean }> = ({
  value, onChange, placeholder, autoFocus,
}) => (
  <label className="flex h-tap-lg shrink-0 items-center gap-2.5 rounded-full bg-surf pr-2 pl-4 text-mut focus-within:ring-2 focus-within:ring-wine">
    <Search aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.75} />
    <input
      type="search"
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      autoComplete="off"
      className={cx(
        'h-full min-w-0 flex-1 bg-transparent p-0 text-lead text-ink outline-none',
        'placeholder:text-body placeholder:text-mut',
        '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
      )}
    />
    {value && (
      <RoundButton label="გასუფთავება" size={36} tone="page" onClick={() => onChange('')}>
        <X aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
    )}
  </label>
);
