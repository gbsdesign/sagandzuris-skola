import React from 'react';
import { Brush } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { NAKHATI_FACE } from './nakhati/face';
import { NakhatiRiddle } from './nakhati/Riddle';
import { NakhatiTeams } from './nakhati/Table';

// „ნახატობანა“ (games hub, 2026-11-01, like Pictionary): one draws, the others guess. Alone a drawing goes to the class's
// chat as a riddle; online in a class's room the host draws and every phone sees it grow, each player picks the word out of
// four; on one phone the class plays in teams, drawing on the board or on the screen. The shared screens pages/games/rounds/,
// the game's own pages/games/nakhati/, the rules utils/nakhati.ts, the lines utils/ink.ts + components/games/Ink.tsx, the
// words data/nakhatiWords.ts.

const NakhatiGame: React.FC = () => (
  <RoundsPage face={NAKHATI_FACE} solo={{ label: 'მარტო', Icon: Brush, node: <NakhatiRiddle /> }} table={<NakhatiTeams />} />
);

export default NakhatiGame;
