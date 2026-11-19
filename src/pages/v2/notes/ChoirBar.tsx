import React from 'react';
import { RefreshCw, User, Wifi } from 'lucide-react';
import { cx, FOCUS, Press } from '../../../components/ui2';

// „გუნდი მომყვება“ on the notes (boards x-ultra-gundi 1–4): one bar over the notes that always says who turns the pages,
// with one button. The regent leads (wine: „გუნდი მოგყვება“ · „შეწყვეტა“); a singer follows (wine: „რეგენტს მიჰყვები“ ·
// „ჩემით“) or turns the pages themself (white: „ჩემით ფურცლავ“ · „მივყვები“); the connection is gone (grey: the page stays
// in the singer's hand until it is back). The logic is NotesContext's; this only draws.

export type ChoirState =
  | { kind: 'lead'; sub: string; onStop: () => void }
  | { kind: 'follow'; sub: string; onOwn: () => void }
  | { kind: 'own'; sub: string; onFollow: () => void }
  | { kind: 'lost'; sub: string };

const LOOK = {
  lead: { title: 'გუნდი მოგყვება', tone: 'bg-wine text-white', icon: <Wifi /> },
  follow: { title: 'რეგენტს მიჰყვები', tone: 'bg-wine text-white', icon: <Wifi /> },
  own: { title: 'ჩემით ფურცლავ', tone: 'bg-surf text-ink', icon: <User /> },
  lost: { title: 'კავშირი გაწყდა', tone: 'bg-soft text-ink', icon: <RefreshCw /> },
} as const;

/** the bar's one button: 36px tall, a 44px finger around it */
const BarButton: React.FC<{ label: string; onClick: () => void; light: boolean }> = ({ label, onClick, light }) => (
  <Press
    onClick={onClick}
    className={cx(
      'relative flex h-icon shrink-0 cursor-pointer items-center rounded-full px-3.5 text-meta font-bold whitespace-nowrap transition active:scale-95',
      'before:absolute before:-inset-1 before:rounded-full',
      light ? 'bg-surf text-wine' : 'bg-wine text-white active:bg-wine-deep',
      FOCUS,
    )}
  >
    {label}
  </Press>
);

export const ChoirBar: React.FC<{ state: ChoirState; className?: string }> = ({ state, className }) => {
  const look = LOOK[state.kind];
  const button = state.kind === 'lead' ? { label: 'შეწყვეტა', run: state.onStop }
    : state.kind === 'follow' ? { label: 'ჩემით', run: state.onOwn }
      : state.kind === 'own' ? { label: 'მივყვები', run: state.onFollow }
        : null;
  const wine = state.kind === 'lead' || state.kind === 'follow';
  return (
    <div role="status" aria-live="polite" className={cx('flex min-h-9 items-center gap-2.5 rounded-tile py-2.5 pr-2.5 pl-3.5', look.tone, className)}>
      <span aria-hidden="true" className={cx('flex shrink-0 [&_svg]:size-5', wine ? 'text-white' : 'text-ink')}>{look.icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body leading-snug font-bold wrap-break-word">{look.title}</span>
        <span className={cx('text-cap leading-snug wrap-break-word', wine ? 'text-white/85' : 'text-mut')}>{state.sub}</span>
      </span>
      {button && <BarButton label={button.label} onClick={button.run} light={wine} />}
    </div>
  );
};

/** „თამარ ჯავახიშვილი“ → „თამარ ჯ.“ */
export const shortName = (full?: string) => {
  const [first, second] = (full || '').trim().split(/\s+/);
  if (!first) return '';
  return second ? `${first} ${Array.from(second)[0]}.` : first;
};
