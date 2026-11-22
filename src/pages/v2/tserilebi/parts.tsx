import React from 'react';
import { CalendarClock, Check, CheckCheck, Eye, EyeOff, GraduationCap, ListChecks, Mic, Pin, PinOff, ShieldCheck, Users } from 'lucide-react';
import { Badge, Button, cx, Dot, Press, Sheet, Small } from '../../../components/ui2';
import { useLongPress } from '../../../hooks/useLongPress';
import { PearlIcon } from '../../../components/pearls/PearlIcon';
import { SwipeRow, type SwipeSide } from '../../../components/ui/SwipeRow';
import { ClassLogo } from '../../../components/classes/ClassLogo';
import type { LessonSlot, SchoolClass } from '../../../hooks/useClasses';
import { nextLesson, sortSlots } from '../../../components/teacher/Schedule';
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
  /** a class's chat: an ordinary row in a thin dark-blue frame (2026-11-22, the user: „როგორც ჩვეულებრივი ჩათი … განსხვავებული
   *  კარკასი … თხლად … მუქ ლურჯში“) */
  group?: boolean;
  /** how many wait (0 / none while not counted = a dot) */
  count?: number;
  tick?: React.ReactNode;
  /** a third line under the last message (a class's lesson times) */
  extra?: React.ReactNode;
  /** a student's pearls (their path's items with a voice known), on the row's right under the date */
  pearls?: number;
  onClick: () => void; onMenu?: () => void;
  left?: SwipeSide; right?: SwipeSide;
}> = ({ face, name, last, time, unread, active, busy, pinned, group, count, tick, extra, pearls, onClick, onMenu, left, right }) => {
  const press = useLongPress(() => onMenu?.());
  const button = (
    <Press
      {...(onMenu ? press : {})}
      onClick={onClick}
      disabled={busy}
      aria-current={active || undefined}
      className={cx(
        // a class's framed row is tighter (2026-11-22, the user: „უფრო კომპაქტური გახადო“)
        group ? 'flex w-full cursor-pointer items-center gap-2.5 py-1.5 pr-3 pl-2.5 text-left text-ink transition-colors select-none'
          : 'flex min-h-row w-full cursor-pointer items-center gap-3 py-2.5 pr-4 pl-3.5 text-left text-ink transition-colors select-none',
        'disabled:cursor-default disabled:opacity-60 [-webkit-touch-callout:none]',
        active ? 'bg-tint' : 'active:bg-soft',
        group && 'rounded-tile border-[1.5px] border-[color-mix(in_oklab,var(--color-sea)_70%,var(--color-ink))]',
      )}
    >
      {face}
      <span className={cx('flex min-w-0 flex-1 flex-col', !group && 'gap-0.5')}>
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
            {/* the student's pearls: one softly shining pearl and the number (2026-11-22, „კოხტად … მკრთალად ბრწყინავდეს“); every
                member's row shows it, none yet = a matte pearl and 0 (the same evening: „ვის რამდენი მარგალიტი აქვთ ჯამში“) */}
            {pearls !== undefined && (
              <span aria-label={`მარგალიტი · ${pearls}`} title={`${pearls} მარგალიტი`}
                className="inline-flex items-center gap-0.5 text-cap font-bold text-mut tabular-nums">
                <PearlIcon state={pearls ? 'shining' : 'new'} size={18} seed={String(pearls)} />{pearls}
              </span>
            )}
            {unread && (count ? <Badge n={count} /> : <span aria-label="წაუკითხავი" className="size-2.5 rounded-full bg-danger" />)}
            {pinned && <Pin aria-label="მიმაგრებული" className="size-4 rotate-45 text-mut" />}
          </span>
        </span>
        {extra}
      </span>
    </Press>
  );
  const row = left || right
    ? <SwipeRow left={left} right={right} faceBg="bg-surf" className={group ? 'rounded-tile' : 'rounded-none'}>{button}</SwipeRow>
    : button;
  // the frame stands a little inside the card, its corners inside the card's
  return group ? <div className="px-1.5 py-1">{row}</div> : row;
};

// ---- a class's lesson times on its chat row (2026-11-22, the user: „შიგნით რომაა ეგენი გარეთ გამოიტანე ლამაზად და კომპაქტურად …
// მარტო დაწყების საათი … დიდხანს დაჭერისას რედაქტირება … ფანქარი არ უნდა“): small pills „სამ 18:00“, the next lesson filled in,
// no „N დღეში“; a long press on them opens the timetable's window for the class's teachers and admins (no ✎) -------------------

const DAY_SHORT = ['კვ', 'ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ'];

/** `inline`: standing in the row's second line (a class nobody wrote in yet), so no space above */
export const ClassTimes: React.FC<{ slots: LessonSlot[]; onEdit?: () => void; inline?: boolean }> = ({ slots, onEdit, inline }) => {
  const lp = useLongPress(() => onEdit?.());
  if (!slots.length && !onEdit) return null;
  const next = nextLesson(slots)?.slot;
  // the row's own long press (its menu) and swipe stay off while the finger is on the times
  const own = onEdit ? {
    onPointerDown: (e: React.PointerEvent) => { e.stopPropagation(); lp.onPointerDown(e); },
    onPointerMove: (e: React.PointerEvent) => { e.stopPropagation(); lp.onPointerMove(e); },
    onPointerUp: (e: React.PointerEvent) => { e.stopPropagation(); lp.onPointerUp(); },
    onPointerCancel: (e: React.PointerEvent) => { e.stopPropagation(); lp.onPointerCancel(); },
    onPointerLeave: lp.onPointerLeave,
    onContextMenu: (e: React.MouseEvent) => { e.stopPropagation(); lp.onContextMenu(e); },
    onClickCapture: lp.onClickCapture,
    title: 'შესაცვლელად დიდხანს დააჭირე',
  } : {};
  // the calendar sign is a button of its own on every class the person leads (2026-11-22, the user: „ეს კალენდრის ნიშანი ყველა
  // ჩათს ქონდეს რომ ზედ დაჭერით შემეძლოს გაკვეთილის დანიშვნა შეცვლა“): a tap opens the timetable — a class with none yet says
  // „გაკვეთილის დანიშვნა“ beside it. It sits inside the row's button, so it is a span that keeps the tap to itself.
  const edit = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); triggerHaptic(8); onEdit?.(); };
  const sign = onEdit ? (
    <span role="button" tabIndex={0} aria-label={slots.length ? 'გაკვეთილის საათების შეცვლა' : 'გაკვეთილის დანიშვნა'}
      onPointerDown={e => e.stopPropagation()} onClick={edit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') edit(e); }}
      className="-my-2 -ml-1 flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full px-1 text-wine transition active:scale-95 active:bg-soft focus-visible:outline-2 focus-visible:outline-wine/60">
      <CalendarClock aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
      {!slots.length && <span className="text-cap font-bold">გაკვეთილის დანიშვნა</span>}
    </span>
  ) : <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-wine" strokeWidth={2} />;
  return (
    <span {...own} aria-label="გაკვეთილები" className={cx(inline ? '' : 'mt-0.5', 'flex flex-wrap items-center gap-1 select-none [-webkit-touch-callout:none]')}>
      {sign}
      {sortSlots(slots).map((s, i) => (
        <span key={i} className={cx(
          'inline-flex h-5 items-center rounded-full px-1.5 text-cap leading-none font-bold whitespace-nowrap tabular-nums',
          s === next ? 'bg-wine text-white' : 'bg-surf text-ink ring-1 ring-wine/15',
        )}>{DAY_SHORT[s.day]} {s.start}</span>
      ))}
    </span>
  );
};

// ---- the open class chat's buttons under its name (2026-11-22, the user: „ავტო პროგრამის, პროგრამის და წევრები ღილაკები
// გადმოიტანე ჩათის სახელის ქვეშ“): small pills in one row; „წევრები“ and the program's cog only for its teachers and admins ----

const ToolPill: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; open?: boolean }> = ({ icon, label, onClick, open }) => (
  <Press onClick={() => { triggerHaptic(8); onClick(); }} aria-expanded={open}
    className="group flex h-tap min-w-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
    <span className={cx(
      'flex h-9 min-w-0 items-center gap-1.5 rounded-full py-1 pr-3.5 pl-2.5 text-meta font-bold text-ink transition',
      open ? 'bg-tint text-wine' : 'bg-surf',
      'group-active:scale-[0.97] group-active:bg-soft group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
      '[&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-wine',
    )}>
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </span>
  </Press>
);

// `end`: the program's round cog, alone at the row's right — under the phone (the user: „წარწერა მოაცილე … ყურმილის დაბლა ჩასვი“)
// `programOpen`: „პროგრამა“ unfolds the class's program right under the head (the user: „შიგნით კი არ შედიოდეს … იქვე ჩამოიშალოს“)
export const ClassChatTools: React.FC<{
  program: () => void; programOpen?: boolean; members?: () => void; end?: React.ReactNode;
}> = ({ program, programOpen, members, end }) => (
  <div role="group" aria-label="კლასის ღილაკები" className="flex flex-wrap items-center gap-x-1.5">
    <ToolPill icon={<ListChecks strokeWidth={2} />} label="პროგრამა" onClick={program} open={programOpen} />
    {members && <ToolPill icon={<Users strokeWidth={2} />} label="წევრები" onClick={members} />}
    {end && <span className="ml-auto flex shrink-0">{end}</span>}
  </div>
);

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

export interface MenuChat { id: string; name: string; pinned: boolean; unread: boolean; hidden: boolean; /** a class's chat: never hidden */ keep?: boolean }

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
        {/* a class's chat stays in the list (`keep`) — no hiding */}
        {!chat.keep && (
          <>
            <Button kind="ghost" full icon={chat.hidden ? <Eye /> : <EyeOff />} onClick={onHide}>
              {chat.hidden ? 'სიაში დაბრუნება' : 'სიიდან დამალვა'}
            </Button>
            {!chat.hidden && <p className="px-1.5 text-meta text-mut">დამალული ჩათი ახალ წერილზე თავისით დაბრუნდება.</p>}
          </>
        )}
      </div>
    )}
  </Sheet>
);
