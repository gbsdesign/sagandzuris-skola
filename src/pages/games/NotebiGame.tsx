import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { NOTEBI_FACE } from './chants/face';

// „სამ ნოტში!“ (games hub, 2026-10-31, the tender's five, like Name That Tune): a well-known chant's first three notes, then
// six, then its first phrase — online, each on their own phone in a class's room, or on one phone with the class in teams.
// The shared screens pages/games/rounds/, the game's own face pages/games/chants/, rules utils/chantRounds.ts.

const NotebiGame: React.FC = () => <RoundsPage face={NOTEBI_FACE} />;

export default NotebiGame;
