import React from 'react';
import { Timer } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { CHAMO_FACE } from './chamotvale/face';
import { ChamotvaleSolo } from './chamotvale/Solo';
import { ChamotvaleTeams } from './chamotvale/Teams';

// „ჩამოთვალე!“ (games hub, 2026-11-01, like Sporcle): a closed list — the 12 apostles, the map's 13 regions, the planets — named
// from memory against the clock. Three tabs: alone (my best per list), online in a class's room (the same list on every phone)
// and on one phone with teams in turn (the teacher types). The shared screens pages/games/rounds/, the game's own
// pages/games/chamotvale/, the rules utils/chamotvale.ts, the lists data/chamotvaleLists.ts.

const ChamotvaleGame: React.FC = () => <RoundsPage face={CHAMO_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <ChamotvaleSolo /> }} table={<ChamotvaleTeams />} />;

export default ChamotvaleGame;
