import React from 'react';
import { Coins, Crown, DoorClosed, Gift, HandCoins, KeyRound, Landmark, Shuffle, Swords, type LucideIcon } from 'lucide-react';
import { ACTS, ROLES, type Line, type Role } from '../../../utils/mepisKari';

// „მეფის კარი“'s look, shared by the online room and the one phone: a colour and a mark for each courtier (the kit's
// icons), the actions' marks and what they do, the cards (my own big ones, the court's small ones) and the chronicle's lines.

export const ROLE_LOOK: Record<Role, { color: string; soft: string; Icon: LucideIcon }> = {
  0: { color: '#9a6a2c', soft: '#f6ecdd', Icon: HandCoins },
  1: { color: '#7a2028', soft: '#f6e4e2', Icon: DoorClosed },
  2: { color: '#2b5f8a', soft: '#e3edf6', Icon: Swords },
  3: { color: '#2f7d4f', soft: '#e2f0e7', Icon: KeyRound },
  4: { color: '#6b3d7a', soft: '#efe5f3', Icon: Crown },
};

export const ACT_ICON: readonly LucideIcon[] = [Coins, Gift, Landmark, HandCoins, DoorClosed, Swords, Shuffle];
/** what an action does, in a few words */
export const ACT_DOES = ['+1 თეთრი', '+2 თეთრი', '−7 თეთრი → სამიზნეს −1 გავლენა', '+3 თეთრი', '−3 თეთრი → სამიზნეს −1 გავლენა', '+2 თეთრი სხვისგან', '2 ბარათი ↔ დასტა'] as const;

/** a courtier's card in my hand: wide, its name, what it does and what it blocks; `lost` — turned face up */
export const RoleCard: React.FC<{ role: Role; lost?: boolean; hidden?: boolean; picked?: boolean; onClick?: () => void; label?: string }> = ({
  role, lost, hidden, picked, onClick, label,
}) => {
  const r = ROLES[role], look = ROLE_LOOK[role], Ic = look.Icon;
  const tag = (lost || label) && (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${lost ? 'bg-[#4a3426] text-[#fbf6ec]' : 'text-white'}`} style={lost ? undefined : { background: look.color }}>
      {lost ? 'გადაბრუნდა' : label}
    </span>
  );
  const body = hidden ? (
    <span className="flex h-full min-h-[118px] flex-col items-center justify-center gap-1.5 text-center">
      <span className="w-10 h-10 rounded-full bg-[#e2c27a]/15 flex items-center justify-center"><Landmark className="w-5 h-5 text-[#e2c27a]" /></span>
      <span className="text-[12px] font-bold text-[#c9bfae]">შეეხე სანახავად</span>
    </span>
  ) : (
    <span className="flex h-full flex-col">
      <span className="flex items-start justify-between gap-2">
        <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white" style={{ background: look.color }}><Ic className="w-4 h-4" /></span>
        {tag}
      </span>
      <span className="mt-1.5 block font-serif-ge text-[16px] font-bold leading-tight [overflow-wrap:anywhere]" style={{ color: look.color }}>{r.name}</span>
      <span className="block text-[12px] leading-tight text-[#75685a]">{r.full}</span>
      <span className="mt-2 block text-[12px] font-bold leading-snug text-[#4a3426]">{r.does}</span>
      {r.blocks && <span className="mt-1 block text-[12px] leading-snug text-[#75685a]">{r.blocks}</span>}
    </span>
  );
  const cls = `relative block w-full min-h-[132px] overflow-hidden rounded-2xl p-3 pt-3.5 text-left transition ${hidden ? 'bg-[#1b1830] ring-1 ring-[#e2c27a]/40'
    : `bg-white ${picked ? 'ring-[3px] -translate-y-0.5 shadow-[0_10px_20px_-12px_rgba(74,52,38,0.6)]' : 'ring-1 ring-[#e8dcc8]'}`} ${lost ? 'opacity-45 grayscale' : ''}`;
  const style = picked && !hidden ? { ['--tw-ring-color' as string]: look.color } : undefined;
  const bar = !hidden && <span className="absolute inset-x-0 top-0 h-1" style={{ background: look.color }} aria-hidden="true" />;
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={picked} className={`${cls} cursor-pointer active:scale-[0.98]`} style={style}>{bar}{body}</button>
  ) : <div className={cls} style={style}>{bar}{body}</div>;
};

/** a card on the court: face down (null) or turned (its courtier, crossed) */
export const MiniCard: React.FC<{ role: Role | null }> = ({ role }) => {
  if (role === null) {
    return (
      <span className="relative w-[22px] h-[30px] shrink-0 rounded-[5px] bg-[#1b1830] shadow-[0_1px_2px_rgba(0,0,0,0.25)]" aria-hidden="true">
        <span className="absolute inset-[3px] rounded-[3px] ring-1 ring-[#e2c27a]/50" />
      </span>
    );
  }
  const look = ROLE_LOOK[role], Ic = look.Icon;
  return (
    <span className="relative w-[22px] h-[30px] shrink-0 rounded-[5px] flex items-center justify-center text-white opacity-80" style={{ background: look.color }} title={ROLES[role].name}>
      <Ic className="w-3.5 h-3.5" />
      <span className="absolute left-0.5 right-0.5 top-1/2 h-[2px] -rotate-[52deg] bg-white/85 rounded-full" aria-hidden="true" />
    </span>
  );
};

/** coins with their mark */
export const CoinCount: React.FC<{ n: number; big?: boolean }> = ({ n, big }) => (
  <span className={`inline-flex items-center gap-1 rounded-full bg-[#e2c27a]/25 text-[#6b4a1f] font-bold tabular-nums ${big ? 'h-9 px-3 text-[15px]' : 'h-7 px-2 text-[13px]'}`}>
    <Coins className={big ? 'w-4 h-4' : 'w-3.5 h-3.5'} aria-hidden="true" />{n}<span className="sr-only"> თეთრი</span>
  </span>
);

const B: React.FC<{ children: React.ReactNode }> = ({ children }) => <b className="font-bold text-[#4a3426]">{children}</b>;

/** a line of the chronicle (present tense, so any name stands as it is) */
export const lineText = (l: Line, names: string[]): React.ReactNode => {
  const nm = (i: number) => <B>{names[i] ?? '—'}</B>;
  switch (l.t) {
    case 'act': {
      const a = ACTS[l.act];
      return <>{nm(l.by)} აცხადებს: {a.name}{a.claim >= 0 && <> · {ROLES[a.claim as Role].name}</>}{l.target >= 0 && <> → {nm(l.target)}</>}</>;
    }
    case 'doubt': return <>{nm(l.by)}: „არ მჯერა!“ — {l.truth ? <>{nm(l.on)} აჩვენებს {ROLES[l.role].dat}</> : <>{nm(l.on)} ბლეფობდა</>}</>;
    case 'block': return <>{nm(l.by)} ბლოკავს: {ROLES[l.role].name}</>;
    case 'blocked': return <>მოქმედება დაიბლოკა</>;
    case 'lose': return <>{nm(l.who)} კარგავს გავლენას: {ROLES[l.role].name}</>;
    case 'out': return <>{nm(l.who)} კარს ტოვებს</>;
    case 'coins': return l.from >= 0 ? <>{nm(l.who)} +{l.n2} თეთრი · {nm(l.from)} −{l.n2}</> : <>{nm(l.who)} +{l.n2} თეთრი</>;
    case 'refund': return <>{nm(l.who)}: {l.n2} თეთრი უკან ბრუნდება</>;
    case 'swap': return <>{nm(l.who)} ცვლის ბარათებს</>;
    case 'late': return <>{nm(l.who)}: დრო გავიდა — ტელეფონმა აირჩია</>;
    case 'win': return <>{nm(l.who)} იმარჯვებს — მეფის მარჯვენა ხელი!</>;
  }
};
/** a line's colour: a truth shown green, a bluff or a lost card wine, the win gold */
export const lineTone = (l: Line) => (l.t === 'doubt' ? (l.truth ? 'text-[#24603d]' : 'text-[#7a2028]')
  : l.t === 'lose' || l.t === 'out' ? 'text-[#7a2028]' : l.t === 'win' ? 'text-[#8a5a1c]' : 'text-[#4a3426]');

/** the chronicle: this turn's lines first, the earlier ones folded */
export const Chronicle: React.FC<{ log: Line[]; names: string[]; n: number; all: boolean; onAll: () => void }> = ({ log, names, n, all, onAll }) => {
  const now = log.filter(l => l.n === n);
  const before = log.filter(l => l.n !== n);
  const shown = all ? before.slice().reverse() : before.slice(-3).reverse();
  if (!log.length) return null;
  return (
    <section className="rounded-2xl bg-white/70 ring-1 ring-[#e8dcc8] px-3.5 py-3">
      <p className="text-[12.5px] font-bold text-[#75685a]">მატიანე</p>
      <ul className="mt-1.5 space-y-1">
        {now.slice().reverse().map((l, i) => <li key={`n${i}`} className={`text-[13.5px] leading-snug ${lineTone(l)}`}>{lineText(l, names)}</li>)}
        {shown.map((l, i) => <li key={`b${i}`} className="text-[12.5px] leading-snug text-[#75685a] opacity-90">{lineText(l, names)}</li>)}
      </ul>
      {before.length > 3 && (
        <button type="button" onClick={onAll} className="mt-1.5 h-9 text-[12.5px] font-bold text-[#7a2028] cursor-pointer">{all ? 'ნაკლები' : `მთელი მატიანე · ${log.length}`}</button>
      )}
    </section>
  );
};
