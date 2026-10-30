import React from 'react';
import { Check, Eye, Loader2, Moon } from 'lucide-react';
import type { Out } from '../../../../utils/samshvilde';
import { triggerHaptic } from '../../../../utils/haptics';
import { TableScreen } from '../../../../components/games/TableScreen';
import { Btn } from '../../../../components/ui/kit';
import { Hint } from '../parts';

// Small pieces the online screens share: a face, who has seen their card, the back of a card, a player's own button
// for their role, the observer's line and the waits.

export const firstName = (full: string) => full.trim().split(/\s+/)[0] || 'მემატიანე';

export const Avatar: React.FC<{ name: string; photoURL?: string; size?: 'sm' | 'md' }> = ({ name, photoURL, size = 'md' }) => {
  const box = size === 'sm' ? 'w-8 h-8 text-[13px]' : 'w-10 h-10 text-[15px]';
  return photoURL
    ? <img src={photoURL} alt="" referrerPolicy="no-referrer" className={`${box} shrink-0 rounded-full object-cover bg-[#f1e8d9]`} />
    : <span className={`${box} shrink-0 rounded-full bg-[#7a2028]/[0.1] text-[#7a2028] font-bold flex items-center justify-center`} aria-hidden="true">{name.trim().charAt(0) || '?'}</span>;
};

/** who has looked at their card: ✓ green, the rest waiting */
export const SeenList: React.FC<{ names: string[]; seen: number[] }> = ({ names, seen }) => (
  <section>
    <p className={`text-[13.5px] font-bold tabular-nums ${seen.length === names.length ? 'text-[#2f7d4f]' : 'text-[#4a3426]'}`}>როლი ნახა: {seen.length} / {names.length}</p>
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {names.map((n, i) => {
        const ok = seen.includes(i);
        return (
          <li key={i} className={`inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-full text-[13px] font-bold ${ok ? 'bg-[#2f7d4f]/10 text-[#24603d]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}>
            {ok && <Check className="w-3.5 h-3.5" aria-label="ნახა" />}{n}
          </li>
        );
      })}
    </ul>
  </section>
);

/** the back of the card before a player turns it */
export const CardBack: React.FC = () => (
  <div className="relative mx-auto w-full max-w-[250px] aspect-[63/88] rounded-[28px] bg-[#1b1830] shadow-[0_18px_40px_-20px_rgba(27,24,48,0.8)] flex flex-col items-center justify-center text-center px-6">
    <div className="pointer-events-none absolute inset-2.5 rounded-[22px] ring-1 ring-[#e2c27a]/40" aria-hidden="true" />
    <div className="w-20 h-20 rounded-full bg-[#e2c27a]/10 flex items-center justify-center shadow-[0_0_50px_rgba(226,194,122,0.25)]"><Moon className="w-10 h-10 text-[#e2c27a]" /></div>
    <p className="mt-4 font-serif-ge text-[21px] font-bold leading-tight text-[#f5ecdc]">სამშვილდის ღამე</p>
    <p className="mt-1.5 text-[13px] leading-snug text-[#c9bfae]">შენი როლი ამ ბარათზეა</p>
  </div>
);

/** a player's own button for their card (the role, whom they know, the checks) */
export const RoleBtn: React.FC<{ dark?: boolean; onClick: () => void }> = ({ dark, onClick }) => (
  <button
    type="button"
    onClick={() => { triggerHaptic(8); onClick(); }}
    aria-label="ჩემი როლი"
    title="ჩემი როლი"
    className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer ${dark ? 'text-[#e2c27a] hover:bg-white/10' : 'text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
  >
    <Eye className="w-5 h-5" />
  </button>
);

/** the line of one who is out (or only watching): they look on, they do not speak or vote */
export const ObserverLine: React.FC<{ me: number; out: Out | null | undefined; dark?: boolean }> = ({ me, out, dark }) => {
  if (me >= 0 && !out) return null;
  const text = me < 0 ? 'ამ თამაშში არ ხარ — უყურებ.'
    : out?.by === 'taken' ? 'ტყვედ ხარ: დამკვირვებელი — უყურებ, არ ლაპარაკობ და ხმას არ აძლევ.'
    : 'ციხეში ხარ: დამკვირვებელი — უყურებ, არ ლაპარაკობ და ხმას არ აძლევ.';
  return (
    <p className={`flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold leading-snug ${dark ? 'bg-white/[0.06] text-[#c9bfae]' : 'bg-[#4a3426]/[0.06] text-[#75685a]'}`}>
      <Eye className="w-4 h-4 shrink-0 mt-px" />{text}
    </p>
  );
};

export const WaitHost: React.FC<{ dark?: boolean; children?: React.ReactNode }> = ({ dark, children = 'მემატიანე გააგრძელებს.' }) => (
  <p className={`pt-1 text-center text-[13px] leading-snug ${dark ? 'text-[#c9bfae]' : 'text-[#9a8b7b]'}`}>{children}</p>
);

/** a room on its way (or gone): a quiet screen with one way out */
export const Waiting: React.FC<{ title: string; text: string; onClose: () => void; action?: { label: string; onClick: () => void }; spin?: boolean }> = ({ title, text, onClose, action, spin }) => (
  <TableScreen title="სამშვილდის ღამე" onClose={onClose} footer={action && <Btn kind="ghost" size="lg" full onClick={action.onClick}>{action.label}</Btn>}>
    <div className="my-auto flex flex-col items-center text-center gap-2 py-10">
      {spin ? <Loader2 className="w-9 h-9 text-[#7a2028] animate-spin" /> : <Moon className="w-9 h-9 text-[#7a2028]" />}
      <p className="mt-2 font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{title}</p>
      <Hint className="max-w-xs">{text}</Hint>
    </div>
  </TableScreen>
);
