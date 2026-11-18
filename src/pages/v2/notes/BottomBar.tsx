// The floating bar at the notes page's bottom in the new look (board x-notebi): ბგერა · სწავლა · the big ▶ · ტაძარი ·
// მეტი. On screen stay only the notes and play, voices and „სწავლა“ — tone, size, my list and the rest are in „მეტი“.
import React from 'react';
import { Church, Ellipsis, GraduationCap, LoaderCircle, Pause, Play } from 'lucide-react';
import { cx, FOCUS, Press } from '../../../components/ui2';

/** the tuning fork of „საწყისი ბგერა“ */
export const Fork: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2.5v7.5a4 4 0 0 0 8 0V2.5" /><path d="M12 14v7.5" />
  </svg>
);

/** the starting notes' little dots: one a voice, lit while its note sounds */
export const StartDots: React.FC<{ lit: boolean[]; count: number; dark?: boolean; className?: string }> = ({ lit, count, dark, className }) => (
  <span aria-hidden="true" className={cx('flex gap-[3px]', className)}>
    {Array.from({ length: Math.min(count, 10) }, (_, i) => (
      <i key={i} className={cx(
        'block size-[5px] rounded-full transition-transform duration-200',
        lit[i] ? cx('scale-150', dark ? 'bg-blush' : 'bg-wine') : dark ? 'bg-white/30' : 'bg-dim',
      )} />
    ))}
  </span>
);

const Item: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; dark: boolean; title?: string; extra?: React.ReactNode; expanded?: boolean }> = ({
  label, icon, onClick, dark, title, extra, expanded,
}) => (
  <Press
    onClick={onClick}
    title={title ?? label}
    aria-expanded={expanded}
    className={cx(
      'relative flex h-15 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-full transition active:scale-95',
      '[&_svg]:size-[22px]',
      dark ? 'text-night-ink active:bg-white/10' : 'text-ink active:bg-ink/5',
      FOCUS,
    )}
  >
    <span className="relative flex">{icon}{extra}</span>
    <span className="max-w-full truncate px-0.5 text-cap font-semibold">{label}</span>
  </Press>
);

export type PlayLook = 'play' | 'pause' | 'loading' | 'off';

export const BottomBar: React.FC<{
  /** the starting notes (only when the chant has notes to play) */
  onStart?: () => void;
  dots: boolean[];
  voices: number;
  onLearn?: () => void;
  play: PlayLook;
  playLabel: string;
  onPlay: () => void;
  onChurch: () => void;
  onMore: () => void;
  moreOpen: boolean;
  dark: boolean;
}> = ({ onStart, dots, voices, onLearn, play, playLabel, onPlay, onChurch, onMore, moreOpen, dark }) => (
  <nav
    aria-label="ნოტების ხელსაწყოები"
    className={cx(
      'flex items-center gap-0.5 rounded-full px-2.5 py-2 shadow-float backdrop-blur-md',
      dark ? 'bg-night-surf/95' : 'bg-surf/95',
    )}
  >
    {onStart && (
      <Item
        label="ბგერა" title="საწყისი ბგერა: ხმების პირველი ბგერა რიგრიგობით" icon={<Fork />} onClick={onStart} dark={dark}
        extra={<StartDots lit={dots} count={voices} dark={dark} className="absolute -right-3 -bottom-0.5" />}
      />
    )}
    {onLearn && <Item label="სწავლა" title="სასწავლო რეჟიმი: ნაწილ-ნაწილ სწავლა" icon={<GraduationCap strokeWidth={1.9} />} onClick={onLearn} dark={dark} />}
    <Press
      onClick={onPlay}
      disabled={play === 'off' || play === 'loading'}
      aria-label={playLabel}
      title={playLabel}
      className={cx(
        'flex size-15 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white shadow-wine transition',
        'active:scale-95 active:bg-wine-deep disabled:cursor-default disabled:opacity-50 disabled:active:scale-100 [&_svg]:size-6',
        FOCUS,
      )}
    >
      {play === 'loading' ? <LoaderCircle aria-hidden="true" className="animate-spin" />
        : play === 'pause' ? <Pause aria-hidden="true" fill="currentColor" />
          : <Play aria-hidden="true" fill="currentColor" className="translate-x-px" />}
    </Press>
    <Item label="ტაძარი" title="ტაძრის რეჟიმი: ხმა ითიშება, ეკრანი არ ქრება" icon={<Church strokeWidth={1.9} />} onClick={onChurch} dark={dark} />
    <Item label="მეტი" icon={<Ellipsis />} onClick={onMore} dark={dark} expanded={moreOpen} />
  </nav>
);
