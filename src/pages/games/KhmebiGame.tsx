import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { KHMEBI_FACE } from './chants/face';

// „ხმა-ხმად“ (games hub, 2026-10-31, the tender's five, like Bandle): a well-known chant on the synthesizer, the bass alone,
// then two voices, then all three — online, each on their own phone in a class's room, or on one phone with the class in
// teams. The shared screens pages/games/rounds/, the game's own face pages/games/chants/, rules utils/chantRounds.ts.

const KhmebiGame: React.FC = () => <RoundsPage face={KHMEBI_FACE} />;

export default KhmebiGame;
