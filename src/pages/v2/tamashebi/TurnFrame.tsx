import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TableScreen } from '../../../components/games/TableScreen';
import { Avatar, Bar, cx, type AvatarColor } from '../../../components/ui2';

// „შენი სვლა“ — one frame for a turn in the room games' play (board x-otakhi-svla; the canvas's note: „ერთი ჩარჩო ყველა ოთახიან
// თამაშზე: ზემოთ — ვინ თამაშობს და ვისი სვლაა; შუაში — თამაშის დაფა; ქვემოთ — ერთი მთავარი ღილაკი“): the same top line (✕, the
// game's name, the round or turn under it), the players in a row with a ring round the one on turn, the game's own board as it
// is, and at the bottom in one place whose turn it is, the step's clock and the main action. The game's own clock
// (pages/games/kari/Pads StepClock) hands its time up here through `useTurnClock` and draws nothing inside the content.

export interface TurnSeat { name: string; me?: boolean; on?: boolean; out?: boolean }
interface Clock { left: number; total: number }

const COLORS: AvatarColor[] = ['sea', 'wine', 'leaf', 'gold', 'plum', 'clay'];
const ClockCtx = createContext<((c: Clock | null) => void) | null>(null);

/** the step's clock: true when a turn frame shows it at the bottom (then draw nothing) */
export const useTurnClock = (left: number, total: number): boolean => {
  const set = useContext(ClockCtx);
  useLayoutEffect(() => { set?.({ left, total }); }, [set, left, total]);
  useLayoutEffect(() => () => set?.(null), [set]);
  return !!set;
};

const time = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

/** who plays, a round each; the one on turn ringed. More than six scroll sideways inside their strip. */
const Seats: React.FC<{ seats: TurnSeat[]; night: boolean }> = ({ seats, night }) => {
  const box = useRef<HTMLDivElement>(null);
  const many = seats.length > 6;
  const on = seats.findIndex(s => s.on);
  useEffect(() => {
    const el = box.current;
    const kid = on >= 0 ? (el?.children[on] as HTMLElement | undefined) : undefined;
    if (!many || !el || !kid) return;
    el.scrollTo({ left: kid.offsetLeft - el.clientWidth / 2 + kid.offsetWidth / 2, behavior: 'smooth' });
  }, [many, on]);
  return (
    <div
      ref={box}
      role="list"
      aria-label="მოთამაშეები"
      className={cx('relative flex shrink-0 py-1', many && '-mx-4 gap-1 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}
    >
      {seats.map((s, i) => (
        <div
          key={i}
          role="listitem"
          aria-current={s.on ? 'step' : undefined}
          className={cx('flex min-w-0 flex-col items-center gap-1', many ? 'w-16 shrink-0' : 'flex-1', s.out && 'opacity-45')}
        >
          <span className={cx('rounded-full p-[3px]', s.on && (night ? 'ring-2 ring-blush' : 'ring-2 ring-wine'))}>
            <Avatar name={s.name} color={COLORS[i % COLORS.length]} />
          </span>
          <span className={cx(
            'max-w-full truncate px-0.5 text-meta',
            s.on ? cx('font-bold', night ? 'text-night-ink' : 'text-ink') : cx('font-medium', night ? 'text-night-ink/70' : 'text-mut'),
            s.out && 'line-through',
          )}>
            {s.me ? 'შენ' : s.name}
          </span>
        </div>
      ))}
    </div>
  );
};

/** whose turn, with the step's clock under it */
const TurnCard: React.FC<{ text: React.ReactNode; mine?: boolean; clock: Clock | null; night: boolean }> = ({ text, mine, clock, night }) => {
  const urgent = !!clock && clock.left <= 5;
  return (
    <div className={cx('flex shrink-0 items-center gap-3 rounded-card px-4 py-3', night ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink')}>
      <div className="min-w-0 flex-1">
        <p className={cx('text-lead leading-snug font-bold wrap-break-word', mine && !night && 'text-wine')} aria-live="polite">{text}</p>
        {clock && <Bar className="mt-2" value={clock.total > 0 ? clock.left / clock.total : 0} tone={night ? 'white' : urgent ? 'gold' : 'wine'} />}
      </div>
      {clock && (
        <span role="timer" aria-label={`დარჩა ${Math.ceil(clock.left)} წამი`} className={cx(
          'shrink-0 text-body font-bold tabular-nums',
          urgent ? (night ? 'text-blush' : 'text-danger') : night ? 'text-night-ink' : 'text-wine',
        )}>
          {time(clock.left)}
        </span>
      )}
    </div>
  );
};

export const TurnFrame: React.FC<{
  /** the game's name */
  title: string;
  /** the round or turn under the name („რაუნდი 2 / 6“, „სვლა 7“) */
  sub?: React.ReactNode;
  right?: React.ReactNode;
  onClose: () => void;
  tone?: 'day' | 'night';
  /** the players in their order, the one on turn `on` */
  seats?: TurnSeat[];
  /** whose turn it is (none: nothing to wait on) */
  turn?: { text: React.ReactNode; mine?: boolean } | null;
  /** the main action */
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, sub, right, onClose, tone = 'day', seats, turn, footer, children }) => {
  const [clock, setClock] = useState<Clock | null>(null);
  const night = tone === 'night';
  // a clock with nobody named still shows (the game's own clock steps aside once a frame listens)
  const card = turn || clock;
  const bottom = card || footer ? (
    <div className="flex flex-col gap-2.5">
      {card && <TurnCard text={turn?.text ?? 'სვლის დრო'} mine={turn?.mine} clock={clock} night={night} />}
      {footer}
    </div>
  ) : undefined;
  return (
    <TableScreen title={title} sub={sub} right={right} onClose={onClose} tone={tone} footer={bottom}>
      <ClockCtx.Provider value={setClock}>
        {seats && seats.length > 1 && <Seats seats={seats} night={night} />}
        {children}
      </ClockCtx.Provider>
    </TableScreen>
  );
};
