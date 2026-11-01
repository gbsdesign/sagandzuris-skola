import React from 'react';
import { Timer } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { TSQ_FACE } from './tsqvilebi/face';
import { TsqvilebiSolo } from './tsqvilebi/Solo';
import { TsqvilebiTeams } from './tsqvilebi/Teams';

// „ხმის წყვილები“ (games hub, 2026-11-01, like Memory): cards face down, a sound and its name (or the same sound twice) make a
// pair. Three tabs: alone (as few moves as I can, my record), online in a class's room (three boards, the same on every phone,
// against the clock) and on one phone with teams in turn. The shared screens pages/games/rounds/, the game's own
// pages/games/tsqvilebi/, the rules utils/tsqvilebi.ts.

const TsqvilebiGame: React.FC = () => <RoundsPage face={TSQ_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <TsqvilebiSolo /> }} table={<TsqvilebiTeams />} />;

export default TsqvilebiGame;
