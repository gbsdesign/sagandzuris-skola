import { useNavigation } from '../context';
import { requestOpen } from './searchOpen';

// Into an online game room from anywhere — the invitation strip, a class chat's card, a phone notice: the games page opens
// „სამშვილდის ღამე“ and the page takes the room (useOpenRequest 'samshvilde', id `classId/roomId`) and joins its lobby.

export const useOpenGameRoom = () => {
  const { navigateTo, openMapItem, currentPage, mapItem } = useNavigation();
  return (classId: string, roomId: string) => {
    requestOpen('samshvilde', `${classId}/${roomId}`);
    if (currentPage === 'games' && mapItem === 'samshvilde') return;
    navigateTo('games');
    openMapItem('samshvilde');
  };
};
