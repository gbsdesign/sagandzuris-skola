import React from 'react';
import { Moon } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { SchoolClass } from '../../../../hooks/useClasses';
import type { SamSnap } from '../../../../utils/samshvildeRoom';
import { rooms } from '../../../../utils/gameRoomFirestore';
import { RoomSetup, meOf } from '../../../../components/games/RoomSetup';

// The online game's part of the page: my room, the rooms open in my classes, a new room — its opener is the host
// (მემატიანე), who does not play (the shared screen: components/games/RoomSetup.tsx).

export { meOf };

export const OnlineSetup: React.FC<{
  user: User | null; isAdmin: boolean; classes: SchoolClass[]; session: SamSnap | null;
  onEnter: (classId: string, roomId: string) => void; onResume: () => void;
}> = props => (
  <RoomSetup
    {...props}
    game="samshvilde"
    Icon={Moon}
    closeMine={rooms.host.close}
    hostLine="შენ იქნები მემატიანე: არ თამაშობ, თამაშს უძღვები. კლასის წევრებს მოწვევა მიუვათ ჩატში და ტელეფონზე; ვინც შემოვა, ის თამაშობს (6–16)."
    other="ჰიბრიდული, ერთი ტელეფონით"
  />
);
