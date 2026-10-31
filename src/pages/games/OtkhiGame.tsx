import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { OTKHI_FACE } from './otkhi/face';

// „ოთხიდან ერთი“ (games hub, 2026-10-31, the tender's five, like Kahoot): a question and four answers — online, each on their
// own phone in a class's room (the quicker the right one, the more), or on one phone with the class in teams. The shared
// screens pages/games/rounds/, the game's own face pages/games/otkhi/, rules utils/otkhi.ts.

const OtkhiGame: React.FC = () => <RoundsPage face={OTKHI_FACE} />;

export default OtkhiGame;
