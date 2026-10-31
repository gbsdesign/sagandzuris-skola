import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { TURNIRI_FACE } from './turniri/face';

// „ხმების ტურნირი“ (games hub, 2026-10-31, the tender's five, like SingStar): everyone sings the same phrase in their own
// voice, the phone counts the notes sung right; three rounds, one table — online, each on their own phone in a class's room,
// or on one phone passed hand to hand. The shared screens pages/games/rounds/, the game's own face pages/games/turniri/,
// rules utils/turniri.ts.

const TurniriGame: React.FC = () => <RoundsPage face={TURNIRI_FACE} />;

export default TurniriGame;
