import React from 'react';
import { Check, CheckCheck, Eye, EyeOff, GraduationCap, Mic, Pin, PinOff, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, cx, Dot, Press, Sheet, Small } from '../../../components/ui2';
import { useLongPress } from '../../../hooks/useLongPress';
import { SwipeRow, type SwipeSide } from '../../../components/ui/SwipeRow';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import type { SchoolClass } from '../../../hooks/useClasses';
import { triggerHaptic } from '../../../utils/haptics';

// ---- small marks -------------------------------------------------------------------------------------------------

/** my last message: sent ✓ or seen ✓✓ */
export const Tick: React.FC<{ seen: boolean }> = ({ seen }) => seen
  ? <CheckCheck aria-label="ნანახია" className="size-4 shrink-0 text-leaf-ink" />
  : <Check aria-label="გაგზავნილია" className="size-4 shrink-0 text-mut" />;

/** a name with its small mark: 🛡 the administration, 🎓 a teacher */
export const NameMark: React.FC<{ name: string; mark?: 'admin' | 'teacher' }> = ({ name, mark }) => (
  <span className="flex min-w-0 items-center gap-1.5">
    {mark === 'admin' && <ShieldCheck aria-label="ადმინისტრაცია" className="size-4 shrink-0 text-wine" />}
    {mark === 'teacher' && <GraduationCap aria-label="მასწავლებელი" className="size-4 shrink-0 text-wine" />}
    <span className="min-w-0 truncate">{name}</span>
  </span>
);

const VOICE = '🎤 ხმოვანი შეტყობინება';
/** the last line: „შენ:“, a 🎤 for a voice message */
export const LastLine: React.FC<{ who?: string; text: string }> = ({ who, text }) => (
  <span className="flex min-w-0 items-center gap-1">
    {who && <span className="shrink-0">{who}</span>}
    {text === VOICE
      ? <><Mic aria-hidden="true" className="size-3.5 shrink-0" /><span className="min-w-0 truncate">ხმოვანი შეტყობინება</span></>
      : <span className="min-w-0 truncate">{text}</span>}
  </span>
);

// ---- one chat of the list -----------------------------------------------------------------------------------------

export const ChatRow: React.FC<{
  face: React.ReactNode; name: React.ReactNode; last: React.ReactNode; time?: string;
  unread?: boolean; active?: boolean; busy?: boolean; pinned?: boolean;
  /** how many wait (0 / none while not counted = a dot) */
  count?: number;
  tick?: React.ReactNode;
  onClick: () => void; onMenu?: () => void;
  left?: SwipeSide; right?: SwipeSide;
}> = ({ face, name, last, time, unread, active, busy, pinned, count, tick, onClick, onMenu, left, right }) => {
  const press = useLongPress(() => onMenu?.());
  const button = (
    <Press
      {...(onMenu ? press : {})}
      onClick={onClick}
      disabled={busy}
      aria-current={active || undefined}
      className={cx(
        'flex min-h-row w-full cursor-pointer items-center gap-3 py-2.5 pr-4 pl-3.5 text-left text-ink transition-colors select-none',
        'disabled:cursor-default disabled:opacity-60 [-webkit-touch-callout:none]',
        active ? 'bg-tint' : 'active:bg-soft',
      )}
    >
      {face}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cx('min-w-0 flex-1 truncate text-lead', unread ? 'font-extrabold' : 'font-bold')}>{name}</span>
          {time && <Small tone={unread ? 'wine' : 'mut'} bold={!!unread} className="tabular-nums">{time}</Small>}
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className={cx('flex min-w-0 items-center gap-1 text-meta', unread ? 'font-semibold text-ink' : 'text-mut')}>
            {tick}
            {last}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {unread && (count ? <Badge n={count} /> : <span aria-label="წაუკითხავი" className="size-2.5 rounded-full bg-danger" />)}
            {pinned && <Pin aria-label="მიმაგრებული" className="size-4 rotate-45 text-mut" />}
          </span>
        </span>
      </span>
    </Press>
  );
  return left || right ? <SwipeRow left={left} right={right} faceBg="bg-surf" className="rounded-none">{button}</SwipeRow> : button;
};

// swipe sides
export const hideSide = (run: () => void): SwipeSide => ({
  label: 'დამალვა', icon: <EyeOff className="size-5" />, tone: 'bg-mut text-white', leave: true, run,
});
export const readSide = (run: () => void): SwipeSide => ({
  label: 'წაკითხულად', icon: <CheckCheck className="size-5" />, tone: 'bg-leaf text-white', run,
});

// ---- the class filter: class pills two a row, „ყველა“ first (2026-11-22, the user: „შემოკლებული ჩანდეს ნახევრად … ლამაზად“) ---------------------------------------------------------

export const ClassPick: React.FC<{
  classes: SchoolClass[]; chip: string; onPick: (id: string) => void; unreadIn?: (classId: string) => number;
}> = ({ classes, chip, onPick, unreadIn }) => {
  const pick = (id: string) => { triggerHaptic(8); onPick(id); };
  const pill = (id: string, lead: React.ReactNode, name: string, n = 0) => {
    const on = chip === id;
    return (
      <Press key={id} aria-pressed={on} onClick={() => pick(id)} title={name}
        className="group flex h-tap w-full min-w-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
        <span className={cx(
          'flex h-10 w-full min-w-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-body transition group-active:scale-[0.97]',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
          on ? 'bg-wine font-bold text-white' : 'bg-surf font-semibold text-ink',
        )}>
          {lead}
          <span className="min-w-0 truncate">{name}</span>
          {n > 0 && !on && <Badge n={n} />}
        </span>
      </Press>
    );
  };
  return (
    <div role="group" aria-label="რომელი კლასის ჩათები" className="grid grid-cols-2 gap-x-2 gap-y-1">
      {pill('all', <Dot icon={<Users />} color="sea" size={30} />, 'ყველა')}
      {classes.map(c => pill(c.id, <ClassLogo name={c.name} logo={c.logo} className="size-8 shrink-0 text-meta" />, c.name, unreadIn?.(c.id)))}
    </div>
  );
};

// ---- a long press (or a right click) on a chat ------------------------------------------------------------------

export interface MenuChat { id: string; name: string; pinned: boolean; unread: boolean; hidden: boolean }

export const ChatMenu: React.FC<{
  chat: MenuChat | null; onClose: () => void; onPin: () => void; onRead: () => void; onHide: () => void;
}> = ({ chat, onClose, onPin, onRead, onHide }) => (
  <Sheet open={!!chat} onClose={onClose} title={chat?.name || ''}>
    {chat && (
      <div className="flex flex-col gap-2.5">
        <Button kind="ghost" full icon={chat.pinned ? <PinOff /> : <Pin />} onClick={onPin}>
          {chat.pinned ? 'მიმაგრების მოხსნა' : 'თავში მიმაგრება'}
        </Button>
        {chat.unread && <Button kind="ghost" full icon={<CheckCheck />} onClick={onRead}>წაკითხულად მონიშვნა</Button>}
        <Button kind="ghost" full icon={chat.hidden ? <Eye /> : <EyeOff />} onClick={onHide}>
          {chat.hidden ? 'სიაში დაბრუნება' : 'სიიდან დამალვა'}
        </Button>
        {!chat.hidden && <p className="px-1.5 text-meta text-mut">დამალული ჩათი ახალ წერილზე თავისით დაბრუნდება.</p>}
      </div>
    )}
  </Sheet>
);
