import React from 'react';
import { ArrowLeft, ArrowUp, Focus, Minus, Moon, Plus, Sun, X } from 'lucide-react';
import { Press } from '../../../components/ui2';
import { cx, FOCUS } from '../../../components/ui2/cx';

/** x-tsamqvani — the prompter's top in the new look: only ✕ and „Aa“; the background, the letters' size, the reading line
 *  (and an admin's way of moving) live in the „Aa“ sheet, drawn in the prompter's own dark or light (Prompter.tsx keeps all
 *  the rules; the bottom bar stays as it was). */

type Theme = 'dark' | 'light';

const round = (theme: Theme) => cx(
  'flex h-tap-lg shrink-0 cursor-pointer items-center justify-center rounded-full font-sans text-lead font-bold transition active:scale-95',
  theme === 'dark' ? 'bg-white/10 text-night-ink active:bg-white/20' : 'bg-ink/5 text-ink active:bg-ink/10',
  FOCUS,
);

export const PrompterTop: React.FC<{ theme: Theme; onClose: () => void; onAa: () => void }> = ({ theme, onClose, onAa }) => (
  <div className="flex w-full items-center gap-2.5">
    <Press onClick={onClose} aria-label="დახურვა" title="დახურვა" className={cx(round(theme), 'w-tap-lg [&_svg]:size-5')}>
      <X aria-hidden="true" />
    </Press>
    <span className="flex-1" />
    <Press onClick={onAa} aria-haspopup="dialog" aria-label="იერი: ფონი, ზომა, კითხვის ხაზი" title="იერი" className={cx(round(theme), 'w-[60px]')}>
      Aa
    </Press>
  </div>
);

type Mode = 'up' | 'side' | 'word';
const MODE_LOOK: Record<Mode, { label: string; Icon: typeof ArrowUp }> = {
  up: { label: 'ზემოთ', Icon: ArrowUp },
  side: { label: 'გვერდზე', Icon: ArrowLeft },
  word: { label: 'სიტყვით', Icon: Focus },
};

/** The „Aa“ sheet over the prompter (it is inside the prompter's own layer, so it stands over the text). */
export const PrompterAaSheet: React.FC<{
  theme: Theme;
  onTheme: (t: Theme) => void;
  canSmaller: boolean;
  canBigger: boolean;
  onSize: (d: 1 | -1) => void;
  /** the reading line's switch; none while the text does not go up */
  guide?: { on: boolean; onToggle: () => void };
  /** the three ways of moving (admins only) */
  modes?: { value: Mode; onPick: (m: Mode) => void };
  onClose: () => void;
}> = ({ theme, onTheme, canSmaller, canBigger, onSize, guide, modes, onClose }) => {
  const dark = theme === 'dark';
  const card = dark ? 'bg-ink' : 'bg-surf';
  const mut = dark ? 'text-night-ink/70' : 'text-mut';
  const track = dark ? 'bg-white/10' : 'bg-track';
  const seg = (on: boolean, small = false) => cx(
    'flex h-tap min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 whitespace-nowrap transition [&_svg]:size-4 [&_svg]:shrink-0',
    small ? 'text-meta tracking-tight' : 'text-body',
    on ? (dark ? 'bg-night-ink font-bold text-ink' : 'bg-surf font-bold text-wine shadow-knob') : cx('font-semibold', mut),
    FOCUS,
  );
  const step = cx(
    'flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 disabled:cursor-default disabled:opacity-35 [&_svg]:size-4',
    track,
    FOCUS,
  );
  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center font-sans" onPointerDown={e => e.stopPropagation()}>
      <div aria-hidden="true" className="sg-in absolute inset-0 bg-ink/40" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="იერი"
        className={cx(
          'sg-up relative flex max-h-[92dvh] w-full max-w-[560px] flex-col gap-3 overflow-y-auto rounded-t-card px-4 pt-2.5 shadow-sheet',
          'pb-[max(20px,env(safe-area-inset-bottom))]',
          dark ? 'bg-night-surf text-night-ink' : 'bg-page text-ink',
        )}
      >
        <span aria-hidden="true" className={cx('h-1 w-10 shrink-0 self-center rounded-full', dark ? 'bg-white/20' : 'bg-dim')} />
        <div className="flex shrink-0 items-center gap-2.5">
          <h2 className="min-w-0 flex-1 pl-1 text-title leading-tight font-bold">იერი</h2>
          <Press
            onClick={onClose}
            aria-label="დახურვა"
            className={cx('flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-5', dark ? 'bg-white/10' : 'bg-surf', FOCUS)}
          >
            <X aria-hidden="true" />
          </Press>
        </div>

        <div className={cx('flex flex-col gap-2 rounded-card p-3', card)}>
          <span className={cx('px-1 text-meta font-semibold', mut)}>ფონი</span>
          <div role="radiogroup" aria-label="ფონის ფერი" className={cx('flex gap-1 rounded-full p-1', track)}>
            {(['dark', 'light'] as const).map(t => (
              <Press key={t} role="radio" aria-checked={theme === t} onClick={() => onTheme(t)} className={seg(theme === t)}>
                {t === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                {t === 'dark' ? 'მუქი' : 'ღია'}
              </Press>
            ))}
          </div>
        </div>

        <div className={cx('flex items-center gap-3 rounded-card py-2 pr-2 pl-4', card)}>
          <span className="min-w-0 flex-1 text-lead font-bold">ასოების ზომა</span>
          <Press aria-label="ასოების დაპატარავება" disabled={!canSmaller} onClick={() => onSize(-1)} className={step}><Minus aria-hidden="true" /></Press>
          <span aria-hidden="true" className="w-6 text-center text-lead font-bold">A</span>
          <Press aria-label="ასოების გადიდება" disabled={!canBigger} onClick={() => onSize(1)} className={step}><Plus aria-hidden="true" /></Press>
        </div>

        {guide && (
          <Press
            role="switch"
            aria-checked={guide.on}
            onClick={guide.onToggle}
            className={cx('flex min-h-row w-full cursor-pointer items-center gap-3 rounded-card py-2 pr-3 pl-4 text-left', card, FOCUS)}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-lead font-bold">კითხვის ხაზი</span>
              <span className={cx('text-meta', mut)}>ზოლი, რომელსაც ისრებით აწევ-დაწევ</span>
            </span>
            <span aria-hidden="true" className={cx('relative h-7 w-[46px] shrink-0 rounded-full transition-colors', guide.on ? 'bg-wine' : dark ? 'bg-white/20' : 'bg-dim')}>
              <span className={cx('absolute top-[3px] left-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform', guide.on && 'translate-x-[18px]')} />
            </span>
          </Press>
        )}

        {modes && (
          <div className={cx('flex flex-col gap-2 rounded-card p-3', card)}>
            <span className={cx('px-1 text-meta font-semibold', mut)}>როგორ მოძრაობდეს ტექსტი</span>
            <div role="radiogroup" aria-label="როგორ მოძრაობდეს ტექსტი" className={cx('flex gap-1 rounded-full p-1', track)}>
              {(Object.keys(MODE_LOOK) as Mode[]).map(m => {
                const { label, Icon } = MODE_LOOK[m];
                return (
                  <Press key={m} role="radio" aria-checked={modes.value === m} onClick={() => modes.onPick(m)} className={seg(modes.value === m, true)}>
                    <Icon aria-hidden="true" />{label}
                  </Press>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
