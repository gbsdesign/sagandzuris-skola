import { AudioLines, Bird, Compass, Grid2x2Check, Headphones, Layers3, ListChecks, ListMusic, ListOrdered, MapPinned, MicVocal, Moon, Music2, Piano, Puzzle, Repeat, VenetianMask, Waves, type LucideIcon } from 'lucide-react';
import type { RoomGame } from '../../utils/gameRoom';

/** a room game's mark on its invitations (the strip, the chat's card) */
export const ROOM_GAME_ICON: Record<RoomGame, LucideIcon> = {
  samshvilde: Moon, kutkhe: MapPinned, otkhi: ListChecks, khmebi: AudioLines, notebi: Music2, turniri: MicVocal, hangi: Headphones, akordi: Piano, rvakhma: Waves, ruka: Compass, gagrdzele: ListMusic, hangebi: Puzzle, eqo: Repeat, mprinavi: Bird, tsqvilebi: Grid2x2Check,
  mesame: Layers3, chamotvale: ListOrdered, pantomima: VenetianMask,
};
