import React from 'react';
import { Timer } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { EQO_FACE } from './eqo/face';
import { EqoSolo } from './eqo/Solo';
import { EqoCircle } from './eqo/Circle';

// „ექო“ (games hub, 2026-11-01, like Simon): a chant's or a song's opening, three notes, then four, five… — tapped back on a
// keyboard of its own pitches. Three tabs: alone (as long as I can, my record), online in a class's room (one melody a game,
// a note longer each round) and on one phone with the class in a circle (who misses is out). The shared screens
// pages/games/rounds/, the game's own pages/games/eqo/, the rules utils/eqo.ts.

const EqoGame: React.FC = () => <RoundsPage face={EQO_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <EqoSolo /> }} table={<EqoCircle />} />;

export default EqoGame;
