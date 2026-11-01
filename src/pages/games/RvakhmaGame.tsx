import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { RVAKHMA_FACE } from './rvakhma/face';

// „რვა ხმა“ (games hub, 2026-11-01, like Functional Ear Trainer): a heirmos of vol. VIII on the synthesizer, its tone named out
// of the eight; online, each on their own phone in a class's room, or on one phone with the class in teams. The shared screens
// pages/games/rounds/, the game's own face pages/games/rvakhma/, rules utils/rvakhma.ts.

const RvakhmaGame: React.FC = () => <RoundsPage face={RVAKHMA_FACE} />;

export default RvakhmaGame;
