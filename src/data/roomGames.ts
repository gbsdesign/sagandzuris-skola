import { isRoomGame, type RoomGame } from '../utils/gameRoom';

// The games played in a class's room (utils/gameRoom.ts) as the invitations name them — the strip on top of the app, the
// class chat's card, the phone notice (worker/reminders/reminders.js keeps its own copy of the titles) — and the games
// page's item that opens each one (data/games.ts `item`).

export interface RoomGameInfo {
  title: string;
  /** the games page's item (mapItem) */
  item: string;
  /** the one who opens the room and leads it, not playing */
  host: string;
}

export const ROOM_GAME_INFO: Record<RoomGame, RoomGameInfo> = {
  samshvilde: { title: 'სამშვილდის ღამე', item: 'samshvilde', host: 'მემატიანე' },
  kutkhe: { title: 'საიდანაა სიმღერა?', item: 'kutkhe', host: 'წამყვანი' },
  otkhi: { title: 'ოთხიდან ერთი', item: 'otkhi', host: 'წამყვანი' },
  khmebi: { title: 'ხმა-ხმად', item: 'khmebi', host: 'წამყვანი' },
  notebi: { title: 'სამ ნოტში!', item: 'notebi', host: 'წამყვანი' },
  turniri: { title: 'ხმების ტურნირი', item: 'turniri', host: 'წამყვანი' },
};

/** the chat card's `room`: „სამშვილდის ღამე“ names its room alone (its cards came first), every other game `game:roomId` */
export const chatRoomRef = (game: RoomGame, roomId: string) => (game === 'samshvilde' ? roomId : `${game}:${roomId}`);
export const parseChatRoomRef = (ref: string): { game: RoomGame; roomId: string } | null => {
  const i = ref.indexOf(':');
  if (i < 0) return ref ? { game: 'samshvilde', roomId: ref } : null;
  const game = ref.slice(0, i), roomId = ref.slice(i + 1);
  return isRoomGame(game) && roomId ? { game, roomId } : null;
};
