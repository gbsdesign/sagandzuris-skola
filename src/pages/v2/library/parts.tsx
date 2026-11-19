import React, { useState } from 'react';
import { ALargeSmall, Search, X } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { Note, RoundButton, Rows, Row, Sheet, Stepper, cx } from '../../../components/ui2';
import { AutoScrollButton } from '../../../components/views/ReadingTools';
import { MONTHS_SHORT_GE } from '../../../utils/dateNames';
import { fromIso } from '../../../data/churchCalendar';

// Small parts shared by the library's screens in the new look (boards x-biblioteka … x-mp3).

/** A round search field on white — the boards' `search` pill (x-tsinaprebi, the lives' 🔍). */
export const SearchPill: React.FC<{ value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; onEscape?: () => void }> = ({
  value, onChange, placeholder, autoFocus, onEscape,
}) => (
  <label className="flex h-tap-lg shrink-0 items-center gap-2.5 rounded-full bg-surf pr-1 pl-4 text-mut focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
    <Search aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={1.75} />
    <input
      type="search"
      value={value}
      autoFocus={autoFocus}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => { if (e.key === 'Escape') onEscape?.(); }}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-mut [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <RoundButton label="გასუფთავება" size={36} tone="plain" onClick={() => onChange('')}>
        <X aria-hidden="true" />
      </RoundButton>
    )}
  </label>
);

/** A day and its month's short name in a pale square — the feasts' and the lives' date tile. */
export const DateTile: React.FC<{ iso?: string; day?: number; month?: number; tone?: 'tint' | 'wine' | 'soft' }> = ({ iso, day, month, tone = 'tint' }) => {
  const d = iso ? fromIso(iso) : null;
  const dd = d ? d.getDate() : day;
  const mm = d ? d.getMonth() : (month ?? 1) - 1;
  return (
    <span aria-hidden="true" className={cx(
      'flex size-[46px] shrink-0 flex-col items-center justify-center rounded-field leading-none',
      tone === 'wine' ? 'bg-wine text-white' : tone === 'soft' ? 'bg-soft text-mut' : 'bg-tint text-wine',
    )}>
      <span className="text-lead font-bold tabular-nums">{dd}</span>
      <span className="mt-0.5 text-cap font-semibold">{MONTHS_SHORT_GE[mm]}</span>
    </span>
  );
};

/** „იტვირთება…“ / „ვერ ჩაიტვირთა“ in the middle of a screen. */
export const Loading: React.FC<{ failed?: boolean; what?: string }> = ({ failed, what = 'წიგნი' }) => (
  failed
    ? <Note className="py-12 text-center">{what} ვერ ჩაიტვირთა. სცადეთ თავიდან.</Note>
    : (
      <Waiting kind="text" field={false} />
    )
);

// the reader's text size, remembered on the device (the ancestors' reader had its own steps; the books share them)
export const FONT_STEPS = [90, 100, 112, 125, 140];
const readFont = (key: string) => {
  try {
    const v = Number(localStorage.getItem(key));
    return FONT_STEPS.includes(v) ? v : 100;
  } catch { return 100; }
};
export const useReaderFont = (key: string) => {
  const [font, setFont] = useState(() => readFont(key));
  const set = (v: number) => {
    setFont(v);
    try { localStorage.setItem(key, String(v)); } catch { /* the size just isn't remembered */ }
  };
  return [font, set] as const;
};

/** „Aa“ on a reader's bar: a sheet with − size +. */
export const TextSizeButton: React.FC<{ font: number; onFont: (v: number) => void }> = ({ font, onFont }) => {
  const [open, setOpen] = useState(false);
  const i = Math.max(0, FONT_STEPS.indexOf(font));
  return (
    <>
      <RoundButton label="ტექსტის ზომა" onClick={() => setOpen(true)}>
        <ALargeSmall aria-hidden="true" strokeWidth={1.75} />
      </RoundButton>
      <Sheet open={open} title="ტექსტის ზომა" onClose={() => setOpen(false)}>
        <Rows>
          <Row
            title="ასოების ზომა"
            sub={font === 100 ? 'ჩვეულებრივი' : `${font}%`}
            right={
              <Stepper
                label="ასოების ზომა"
                value={i}
                min={0}
                max={FONT_STEPS.length - 1}
                onChange={v => onFont(FONT_STEPS[v])}
                format={v => <span aria-hidden="true">{v + 1}</span>}
              />
            }
          />
        </Rows>
        <p className="px-1.5 font-serif-ge leading-[1.75] text-ink" style={{ fontSize: `${(17 * font) / 100}px` }}>
          ასე გამოჩნდება ტექსტი.
        </p>
      </Sheet>
    </>
  );
};

/** The reading pages' ⏬ (ReadingTools' own menu and prompter) dressed as the bar's white round (index.css `.sg-lib-auto`). */
export const AutoRound: React.FC<React.ComponentProps<typeof AutoScrollButton>> = props => (
  <span className="sg-lib-auto inline-flex shrink-0">
    <AutoScrollButton {...props} />
  </span>
);

/** The page's column, as the other new-look pages have it. */
export const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('mx-auto flex w-full max-w-2xl flex-col gap-3 pb-4', className)}>{children}</div>
);
