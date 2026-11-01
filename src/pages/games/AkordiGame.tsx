import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { AKORDI_FACE } from './akordi/face';

// „ქართული აკორდი“ (games hub, 2026-11-01, like Perfect Ear): a real chord of the app's chants and songs on the synthesizer —
// at once, then voice by voice — named out of four; online, each on their own phone in a class's room, or on one phone with the
// class in teams. The shared screens pages/games/rounds/, the game's own face pages/games/akordi/, rules utils/akordi.ts.

const AkordiGame: React.FC = () => <RoundsPage face={AKORDI_FACE} />;

export default AkordiGame;
