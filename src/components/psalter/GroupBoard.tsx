import React from 'react';
import { BookOpen, Check, HandHelping, Hand, Undo2, LifeBuoy, Clock } from 'lucide-react';
import { useNavigation } from '../../context';
import { Btn, Pill, Sheet } from '../ui/kit';
import { Cycle, KATHISMA_PSALMS, Slot, Slots, formatRange, responsible, slotState } from '../../utils/psalter';
import { ALL_KATHISMAS, PsalterGroup, ergative, firstName, memberName } from '../../hooks/usePsalter';
import { useKathismaActions } from './useKathismaActions';

const time = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** The twenty kathismas of the cycle: who reads each one and how far it got. */
export const KathismaGrid: React.FC<{
  group: PsalterGroup;
  slots: Slots;
  owners: Record<number, string[]>;
  uid?: string;
  over?: boolean;
  onPick: (k: number) => void;
}> = ({ group, slots, owners, uid, over = false, onPick }) => (
  <div>
    <ul className="grid grid-cols-5 gap-2 sm:gap-2.5">
      {ALL_KATHISMAS.map(k => {
        const slot = slots[k];
        const who = responsible(slot, owners[k] || []);
        const state = slotState(slot, owners[k] || [], over);
        const mine = !!uid && who.includes(uid);
        const help = !!slot?.help && state !== 'read' && state !== 'taken';
        const caption =
          state === 'read' ? firstName(memberName(group, slot?.readBy))
            : state === 'taken' ? `${ergative(firstName(memberName(group, slot?.takenBy)))} აიღო`
            : state === 'free' ? 'თავისუფალი'
            : state === 'skipped' ? 'გამოტოვდა'
            : who.map(u => firstName(memberName(group, u))).join(', ');
        return (
          <li key={k}>
            <button
              type="button"
              onClick={() => onPick(k)}
              aria-label={`კანონი ${k}: ${caption}`}
              className={[
                'relative w-full aspect-[4/5] rounded-2xl flex flex-col items-center justify-center gap-0.5 px-1 cursor-pointer transition active:scale-95',
                state === 'read' && 'bg-emerald-700 text-white shadow-[0_4px_10px_-6px_rgba(4,120,87,0.8)]',
                state === 'taken' && 'bg-amber-50 text-amber-900 ring-1 ring-amber-300',
                state === 'unread' && 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40',
                state === 'free' && 'bg-white/50 text-[#8a7a6a] ring-1 ring-dashed ring-[#d9c8ac] border border-dashed border-[#d9c8ac]',
                state === 'skipped' && 'bg-red-50 text-red-800 ring-1 ring-red-200',
                mine && state !== 'read' && '!ring-2 !ring-[#7a2028]',
              ].filter(Boolean).join(' ')}
            >
              {state === 'read' && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 stroke-[3] opacity-90" />}
              {help && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" aria-hidden />}
              <span className="font-serif-ge text-[22px] sm:text-2xl font-bold leading-none tabular-nums">{k}</span>
              <span className="w-full text-center text-[10px] sm:text-[11px] leading-tight font-semibold truncate opacity-85">{caption || '—'}</span>
            </button>
          </li>
        );
      })}
    </ul>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-semibold text-[#8a7a6a]">
      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-700" /> წაკითხული</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white ring-1 ring-[#d9c8ac]" /> წასაკითხი</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 ring-1 ring-amber-300" /> აღებული</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded ring-2 ring-[#7a2028]" /> შენი</span>
      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> დახმარება სჭირდება</span>
    </div>
  </div>
);

/** One kathisma's card: who reads it, its state, and what I can do with it. */
export const SlotSheet: React.FC<{
  group: PsalterGroup;
  cycle: Cycle;
  k: number | null;
  slot?: Slot;
  owners: string[];
  uid?: string;
  isLeader: boolean;
  isMember: boolean;
  actions: ReturnType<typeof useKathismaActions>;
  onClose: () => void;
}> = ({ group, cycle, k, slot, owners, uid, isLeader, isMember, actions, onClose }) => {
  const { openPrayer } = useNavigation();
  if (k === null) return null;
  const who = responsible(slot, owners);
  const state = slotState(slot, owners, false);
  const mineNow = !!uid && who.includes(uid);
  const ownerMine = !!uid && owners.includes(uid);
  const busy = actions.busy === k;
  const name = (u?: string) => memberName(group, u);

  return (
    <Sheet open onClose={onClose} title={`კანონი ${k}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-2xl bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-2xl font-bold flex items-center justify-center tabular-nums shrink-0">{k}</span>
          <div className="min-w-0">
            <p className="font-serif-ge font-bold text-[#4a3426]">ფსალმუნნი {KATHISMA_PSALMS[k - 1]}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {state === 'read' && <Pill tone="green"><Check /> წაკითხულია</Pill>}
              {state === 'taken' && <Pill tone="amber"><Hand /> აღებულია</Pill>}
              {state === 'unread' && <Pill tone="muted"><Clock /> წასაკითხია</Pill>}
              {state === 'free' && <Pill tone="muted">თავისუფალია</Pill>}
              {slot?.help && state !== 'read' && state !== 'taken' && <Pill tone="amber"><LifeBuoy /> დახმარება სჭირდება</Pill>}
            </div>
          </div>
        </div>

        <dl className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] divide-y divide-[#efe3cf] text-sm">
          <Row label="მკითხველი">{owners.length ? owners.map(name).join(', ') : 'არავინ — ნებისმიერს შეუძლია აიღოს'}</Row>
          {slot?.takenBy && <Row label="აიღო">{name(slot.takenBy)} · {time(slot.takenAt)}</Row>}
          {slot?.readBy && <Row label="წაიკითხა">{name(slot.readBy)} · {time(slot.readAt)}</Row>}
          {slot?.help && !slot.readBy && <Row label="დახმარებას ითხოვს">{name(slot.help.by)}</Row>}
        </dl>

        <div className="grid gap-2">
          <Btn kind={mineNow && state !== 'read' ? 'primary' : 'ghost'} full icon={<BookOpen />} onClick={() => { onClose(); openPrayer(`kathisma-${k}`); }}>
            კანონის კითხვა
          </Btn>

          {state !== 'read' && (mineNow || isLeader) && (
            <Btn full kind="soft" icon={<Check />} disabled={busy} onClick={() => actions.read(k)}>წავიკითხე</Btn>
          )}
          {state === 'read' && (slot?.readBy === uid || isLeader) && (
            <Btn full kind="ghost" icon={<Undo2 />} disabled={busy} onClick={() => actions.unread(k)}>მონიშვნის გაუქმება</Btn>
          )}
          {isMember && state !== 'read' && !mineNow && (!slot?.takenBy || slot.takenBy === uid) && (
            <Btn full kind="primary" icon={<HandHelping />} disabled={busy} onClick={() => actions.take(k)}>აღება — მე წავიკითხავ</Btn>
          )}
          {state === 'taken' && slot?.takenBy === uid && (
            <Btn full kind="ghost" icon={<Undo2 />} disabled={busy} onClick={() => actions.giveBack(k)}>დაბრუნება</Btn>
          )}
          {ownerMine && state === 'unread' && !slot?.help && (
            <Btn full kind="ghost" icon={<LifeBuoy />} disabled={busy} onClick={() => actions.askHelp(k)}>ვერ ვკითხულობ — დახმარება მჭირდება</Btn>
          )}
          {ownerMine && slot?.help && state === 'unread' && (
            <Btn full kind="ghost" icon={<Undo2 />} disabled={busy} onClick={() => actions.cancelHelp(k)}>თხოვნის გაუქმება</Btn>
          )}
        </div>
        <p className="text-xs text-[#8a7a6a] text-center">ციკლი: {formatRange(cycle)}</p>
      </div>
    </Sheet>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-3 px-3.5 py-2.5">
    <dt className="w-32 shrink-0 text-[#8a7a6a]">{label}</dt>
    <dd className="min-w-0 flex-1 font-semibold text-[#2a2017]">{children}</dd>
  </div>
);
