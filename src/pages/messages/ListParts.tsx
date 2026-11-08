import React, { useState } from 'react';
import { Check, CheckCheck, ChevronDown, Eye, EyeOff, Pin, PinOff, Users, X } from 'lucide-react';
import { Btn, Sheet } from '../../components/ui/kit';
import { ClassLogo } from '../../components/classes/ClassLogo';
import type { SchoolClass } from '../../hooks/useClasses';
import { triggerHaptic } from '../../utils/haptics';

// ---- one pill for the class filter (it was a chip a class — three rows on a phone) ------------------------------

export const ClassPicker: React.FC<{
  classes: SchoolClass[]; chip: string; onPick: (id: string) => void;
  /** unread chats a class (for the list's rows) */
  unreadIn?: (classId: string) => number;
}> = ({ classes, chip, onPick, unreadIn }) => {
  const [open, setOpen] = useState(false);
  const picked = classes.find(c => c.id === chip);
  const pick = (id: string) => { triggerHaptic(8); onPick(id); setOpen(false); };
  const row = (id: string, face: React.ReactNode, name: string, n = 0) => (
    <li key={id}>
      <button
        type="button"
        onClick={() => pick(id)}
        aria-pressed={chip === id}
        className={`w-full min-h-[52px] flex items-center gap-3 px-3 py-2 rounded-2xl text-left cursor-pointer transition active:scale-[0.99] ${
          chip === id ? 'bg-[#7a2028]/[0.08]' : 'hover:bg-[#7a2028]/[0.04]'
        }`}
      >
        {face}
        <span className={`flex-1 min-w-0 truncate text-[15px] text-[#2a2017] ${chip === id ? 'font-bold' : 'font-semibold'}`}>{name}</span>
        {n > 0 && <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#c62828] text-white text-xs font-bold grid place-items-center tabular-nums">{n}</span>}
        {chip === id && <Check className="w-5 h-5 shrink-0 text-[#7a2028] stroke-[3]" />}
      </button>
    </li>
  );
  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { triggerHaptic(8); setOpen(true); }}
          aria-haspopup="dialog"
          className={`h-10 min-w-0 max-w-full pl-1.5 pr-3 rounded-full inline-flex items-center gap-2 text-sm font-semibold cursor-pointer active:scale-95 transition ${
            picked ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/35'
          }`}
        >
          {picked
            ? <ClassLogo name={picked.name} logo={picked.logo} className="w-7 h-7 text-xs shrink-0" />
            : <span className="w-7 h-7 rounded-full bg-[#7a2028]/[0.07] grid place-items-center shrink-0"><Users className="w-4 h-4 text-[#7a2028]" /></span>}
          <span className="truncate">{picked ? picked.name : 'ყველა კლასი'}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-70" />
        </button>
        {picked && (
          <button type="button" onClick={() => pick('all')} aria-label="ყველა კლასი" title="ყველა კლასი"
            className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-[#8a7a6a] hover:bg-[#7a2028]/[0.06] cursor-pointer active:scale-95">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="რომელი კლასის ჩათები?">
        <ul className="space-y-0.5 -mx-2">
          {row('all', <span className="w-10 h-10 rounded-full bg-[#7a2028]/[0.07] grid place-items-center shrink-0"><Users className="w-5 h-5 text-[#7a2028]" /></span>, 'ყველა კლასი')}
          {classes.map(c => row(c.id, <ClassLogo name={c.name} logo={c.logo} className="w-10 h-10 text-sm shrink-0" />, c.name, unreadIn?.(c.id)))}
        </ul>
      </Sheet>
    </>
  );
};

// ---- a long press (or a right click) on a chat --------------------------------------------------------------

export interface MenuChat { id: string; name: string; pinned: boolean; unread: boolean; hidden: boolean }

export const ChatMenu: React.FC<{
  chat: MenuChat | null; onClose: () => void;
  onPin: () => void; onRead: () => void; onHide: () => void;
}> = ({ chat, onClose, onPin, onRead, onHide }) => (
  <Sheet open={!!chat} onClose={onClose} title={chat?.name || ''}>
    {chat && (
      <div className="space-y-2.5 pb-1">
        <Btn full size="lg" kind="soft" icon={chat.pinned ? <PinOff /> : <Pin />} onClick={onPin}>
          {chat.pinned ? 'მიმაგრების მოხსნა' : 'თავში მიმაგრება'}
        </Btn>
        {chat.unread && (
          <Btn full size="lg" kind="soft" icon={<CheckCheck />} onClick={onRead}>წაკითხულად მონიშვნა</Btn>
        )}
        <Btn full size="lg" kind="soft" icon={chat.hidden ? <Eye /> : <EyeOff />} onClick={onHide}>
          {chat.hidden ? 'სიაში დაბრუნება' : 'სიიდან დამალვა'}
        </Btn>
        {!chat.hidden && <p className="px-1 pt-1 text-[13px] text-[#8a7a6a]">დამალული ჩათი ახალ წერილზე თავისით დაბრუნდება.</p>}
      </div>
    )}
  </Sheet>
);

// ---- once, over the chats: what a long press and a swipe do ----------------------------------------------------

const TIP_KEY = 'sg-chats-tip';
export const ListTip: React.FC = () => {
  const [gone, setGone] = useState(() => { try { return !!localStorage.getItem(TIP_KEY); } catch { return true; } });
  if (gone) return null;
  return (
    <div className="mx-1.5 mt-2 flex items-start gap-2 rounded-2xl bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/10 pl-3 pr-1 py-2">
      <p className="flex-1 text-[13px] leading-snug text-[#4a3426] pt-1">
        <b>დიდხანს დააჭირე</b> ჩათს — მიმაგრება, დამალვა. <b>გვერდზე გასვი</b> — მარცხნივ იმალება, მარჯვნივ წაკითხულად ინიშნება.
      </p>
      <button type="button" aria-label="გასაგებია" title="გასაგებია"
        onClick={() => { try { localStorage.setItem(TIP_KEY, '1'); } catch { /* private window */ } setGone(true); }}
        className="w-9 h-9 shrink-0 rounded-full grid place-items-center text-[#8a7a6a] hover:bg-[#7a2028]/[0.06] cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ---- my last message: sent ✓ or seen ✓✓ ----------------------------------------------------------------------

export const Tick: React.FC<{ seen: boolean }> = ({ seen }) => seen
  ? <CheckCheck className="w-4 h-4 shrink-0 text-[#2e7d5b]" aria-label="ნანახია" />
  : <Check className="w-4 h-4 shrink-0 text-[#a89886]" aria-label="გაგზავნილია" />;

/** how many new messages wait (a dot while not counted yet) */
export const NewCount: React.FC<{ n?: number }> = ({ n }) => n
  ? <span className="shrink-0 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#c62828] text-white text-xs font-bold grid place-items-center tabular-nums" aria-label={`${n} ახალი`}>{n > 99 ? '99+' : n}</span>
  : <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#c62828]" aria-label="წაუკითხავი" />;
