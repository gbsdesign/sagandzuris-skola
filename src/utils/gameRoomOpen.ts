import { useNavigation } from '../context';
import { ROOM_GAME_INFO } from '../data/roomGames';
import type { RoomGame } from './gameRoom';
import { requestOpen } from './searchOpen';

// Into an online game room from anywhere — the invitation strip, a class chat's card, a phone notice: the games page opens
// the room's game and the game takes the room (useOpenRequest <game>, id `classId/roomId`) and joins its lobby.

export const useOpenGameRoom = () => {
  const { navigateTo, openMapItem, currentPage, mapItem } = useNavigation();
  return (classId: string, roomId: string, game: RoomGame = 'samshvilde') => {
    const { item } = ROOM_GAME_INFO[game];
    requestOpen(game, `${classId}/${roomId}`);
    if (currentPage === 'games' && mapItem === item) return;
    navigateTo('games');
    openMapItem(item);
  };
};
