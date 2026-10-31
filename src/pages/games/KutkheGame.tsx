import React from 'react';
import { RoundsPage } from './rounds/RoundsPage';
import { KUTKHE_FACE } from './kutkhe/face';

// „საიდანაა სიმღერა?“ (games hub, 2026-10-31, the tender's №17, like GeoGuessr): a piece of a folk song plays and the class
// puts it on Georgia's map — online, each on their own phone in a class's room, or on one phone with the class in teams.
// The shared screens pages/games/rounds/, the game's own face pages/games/kutkhe/, rules utils/kutkhe.ts.

const KutkheGame: React.FC = () => <RoundsPage face={KUTKHE_FACE} />;

export default KutkheGame;
