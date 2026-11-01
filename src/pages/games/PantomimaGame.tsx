import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { PANTO_FACE } from './pantomima/face';
import { PantomimaTable } from './pantomima/Table';

// „პანტომიმა“ (games hub, 2026-11-01, like Charades and Heads Up!): a word shown with the body. Online in a class's room the
// host shows it in the game's call and every player picks it out of four; on one phone the class plays in teams — the actor
// holds the phone, or it stands on the guesser's forehead. The shared screens pages/games/rounds/, the game's own
// pages/games/pantomima/, the rules utils/pantomima.ts, the words data/pantomimaCards.ts.

const PantomimaGame: React.FC = () => <RoundsPage face={PANTO_FACE} table={<PantomimaTable />} />;

export default PantomimaGame;
