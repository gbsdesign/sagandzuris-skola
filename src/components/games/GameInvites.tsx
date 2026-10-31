import React, { useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { useAccess } from '../../hooks/useAccess';
import { useClassRooms, useMyRooms, useRoomVisible, type ClassRoom } from '../../utils/gameRoomFirestore';
import { ROOM_GAME_INFO } from '../../data/roomGames';
import { ROOM_GAME_ICON } from './roomGameIcons';
import { useOpenGameRoom } from '../../utils/gameRoomOpen';
import { useCall } from '../../utils/callSession';
import { triggerHaptic } from '../../utils/haptics';

// The invitation strip (2026-10-30, „სამშვილდის ღამე“ online; every room game since 2026-10-31): a game room opened in one
// of my classes — „ნინო გიწვევს · შესვლა“; a game I play in or host that goes on while I look at another page —
// „დაბრუნება“. Hidden while the game's own screen is on, during a service (the notes, the program, church mode) and for a
// room put away with ✕ (this device).

const KEY = 'sg-game-dismissed';
const readGone = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } };
let gone = readGone();
const subs = new Set<() => void>();
/** a room put away on this phone: ✕ on the strip, or its player left it */
export const dismissRoom = (id: string) => {
  gone = [...gone.filter(x => x !== id), id].slice(-30);
  try { localStorage.setItem(KEY, JSON.stringify(gone)); } catch { /* private mode */ }
  subs.forEach(f => f());
};
const useGone = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => gone);

const firstName = (full: string) => full.trim().split(/\s+/)[0] || '';

export const GameInvites: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const uid = user?.uid || '';
  const access = useAccess();
  const { notes, programOpen, church } = useNotes();
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? uid : null);
  const open = access.section('tamashebi') === 'open';
  const list = useClassRooms(open ? [...member, ...teaching].map(c => c.id) : []);
  const sessions = useMyRooms();
  const visible = useRoomVisible();
  const openRoom = useOpenGameRoom();
  const gone = useGone();
  const call = useCall();
  // the game's call shrunk to its bar holds the top: the strip goes under it
  const bar = call.small && call.info && call.status !== 'idle' && call.status !== 'ended';

  if (!uid || !open || notes || programOpen || church) return null;
  const className = (r: ClassRoom) => [...member, ...teaching].find(c => c.id === r.classId)?.name || '';
  const here = (r: ClassRoom) => sessions.some(x => x?.roomId === r.id);
  // my own game first (it waits for me), then an invitation I have not put away
  const mine = list.find(r => (r.host === uid || r.uids.includes(uid) || here(r)) && !(visible && here(r)) && !gone.includes(r.id));
  const invite = list.find(r => r.status === 'lobby' && r.host !== uid && !here(r) && !gone.includes(r.id));
  const r = mine ?? invite;
  if (!r) return null;

  const own = r === mine;
  const info = ROOM_GAME_INFO[r.game];
  const Ic = ROOM_GAME_ICON[r.game];
  const title = own
    ? r.status === 'lobby' ? (r.host === uid ? 'შენი ოთახი მოთამაშეებს ელოდება' : 'ოთახში ხარ — თამაში მალე დაიწყება')
      : r.status === 'over' ? (r.game === 'samshvilde' ? 'თამაში დასრულდა — მატიანე' : 'თამაში დასრულდა — შედეგები') : `${info.title} გრძელდება`
    : `${firstName(r.hostName) || info.host} გიწვევს: ${info.title}`;
  const dismiss = () => { triggerHaptic(8); dismissRoom(r.id); };
  const go = () => { triggerHaptic(12); openRoom(r.classId, r.id, r.game); };

  return (
    <div
      className={`fixed z-[85] left-1/2 -translate-x-1/2 ${bar ? 'top-[calc(env(safe-area-inset-top)+74px)]' : 'top-[calc(env(safe-area-inset-top)+12px)]'} w-[min(440px,calc(100%-24px))] rounded-[28px] bg-[#1b1830] text-[#ece3d2] shadow-[0_14px_40px_rgba(0,0,0,0.35)] p-2.5 pl-3 flex items-center gap-3`}
      role="status"
    >
      <span className="w-11 h-11 shrink-0 rounded-full bg-[#e2c27a]/15 text-[#e2c27a] flex items-center justify-center"><Ic className="w-5 h-5" /></span>
      <button type="button" onClick={go} className="min-w-0 flex-1 text-left cursor-pointer">
        <span className="block text-[14px] font-bold leading-snug [overflow-wrap:anywhere]">{title}</span>
        <span className="block text-[12px] leading-snug text-[#c9bfae] truncate">{className(r) ? `${className(r)} · ` : ''}ონლაინ, თითო ტელეფონით</span>
      </button>
      <button type="button" onClick={go} className="h-11 px-4 shrink-0 rounded-full bg-[#e2c27a] text-[#241f36] text-[14px] font-bold cursor-pointer active:scale-95 transition">
        {own ? 'დაბრუნება' : 'შესვლა'}
      </button>
      <button type="button" onClick={dismiss} aria-label="დამალვა" title="დამალვა" className="w-9 h-9 -ml-1 shrink-0 rounded-full flex items-center justify-center text-[#c9bfae] hover:bg-white/10 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default GameInvites;
