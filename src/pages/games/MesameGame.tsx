import React from 'react';
import { Headphones } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { TRIO_FACE } from './mesame/face';
import { TrioSolo } from './mesame/Solo';
import { TrioTable } from './mesame/Table';

// „მესამე ხმა“ (games hub, 2026-11-01, the plan's №6, like Smule): the phone sings two voices of a chant from its book notes,
// I sing the third. Three tabs: alone in earphones (the whole chant or its opening, the mirror, the score, the trio heard
// together and sent to the class chat), online in a class's room (three openings, each on their own phone) and on one phone
// whose speaker sings one or two voices while the class sings the rest. The shared screens pages/games/rounds/, the game's
// own pages/games/mesame/, the rules utils/trio.ts.

const MesameGame: React.FC = () => <RoundsPage face={TRIO_FACE} solo={{ label: 'მარტო', Icon: Headphones, node: <TrioSolo /> }} table={<TrioTable />} />;

export default MesameGame;
