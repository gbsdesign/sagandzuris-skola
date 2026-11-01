import React from 'react';
import { Timer } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { RUKA_FACE } from './ruka/face';
import { RukaSolo } from './ruka/Solo';

// „რუკის ვიქტორინა“ (games hub, 2026-11-01, like Seterra): a town, a lake, a dish, a fortress, a poet or a folk song to put on
// Georgia's map, quick. Three tabs: alone (ten in a row and my best), online in a class's room, or on one phone with the class
// in teams. The shared screens pages/games/rounds/, the game's own pages/games/ruka/, rules utils/ruka.ts.

const RukaGame: React.FC = () => <RoundsPage face={RUKA_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <RukaSolo /> }} />;

export default RukaGame;
