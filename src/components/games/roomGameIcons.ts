import { AudioLines, ListChecks, MapPinned, MicVocal, Moon, Music2, type LucideIcon } from 'lucide-react';
import type { RoomGame } from '../../utils/gameRoom';

/** a room game's mark on its invitations (the strip, the chat's card) */
export const ROOM_GAME_ICON: Record<RoomGame, LucideIcon> = {
  samshvilde: Moon, kutkhe: MapPinned, otkhi: ListChecks, khmebi: AudioLines, notebi: Music2, turniri: MicVocal,
};
