import React from 'react';
import { Users } from 'lucide-react';
import { cx } from '../../../components/ui2';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** One tile a voice: its number, and „ჟღერს“ or „შენ მღერი“ (mine, wine). `mine` is 1-based. */
export const MinusVoices: React.FC<{ count: number; mine: number; on: boolean[] }> = ({ count, mine, on }) => {
  const n = Math.max(1, count);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="ხმები">
      {Array.from({ length: n }, (_, i) => {
        const me = i + 1 === mine;
        const sounds = on[i] !== false;
        const word = me ? 'შენ მღერი' : sounds ? 'ჟღერს' : 'გამორთულია';
        return (
          <div
            key={i}
            className={cx(
              'flex min-h-14 min-w-0 flex-1 basis-14 flex-col items-center justify-center rounded-tile px-2 py-2 text-center',
              me ? 'bg-wine text-white' : 'text-ink',
              !me && (sounds ? 'bg-transparent' : 'bg-transparent opacity-50'),
            )}
          >
            <span className="text-lead font-bold">{n > 3 ? ROMAN[i] ?? i + 1 : `${ROMAN[i]} ხმა`}</span>
            <span className={cx('text-meta', me ? 'text-white/85' : 'text-mut')}>{word}</span>
          </div>
        );
      })}
    </div>
  );
};

/** The wide tinted pill that turns my voice off / back on. */
export const MinusButton: React.FC<{ on: boolean; onClick: () => void }> = ({ on, onClick }) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onClick}
    className={cx(
      'flex h-tap-lg w-full min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-tint px-5 text-body font-bold text-wine',
      'transition active:scale-[0.98] [&_svg]:size-[18px] [&_svg]:shrink-0',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
    )}
  >
    <Users aria-hidden="true" />
    <span className="min-w-0 truncate">{on ? 'ჩემი ხმაც ჟღერს' : 'ჩემი ხმის გარეშე'}</span>
  </button>
);
