import React from 'react';
import { Timer } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { MPRINAVI_FACE } from './mprinavi/face';
import { MprinaviCircle, MprinaviSolo } from './mprinavi/Flight';

// „მფრინავი ნოტები“ (games hub, 2026-11-01, like Staff Wars): the notes of the app's chants and songs on the staff, named
// დო რე მი or C D E. Three tabs: alone (the notes fly, three lives, my record), online in a class's room (four notes a round
// on every phone) and on one phone round the circle (a note each, the class's record). The shared screens
// pages/games/rounds/, the game's own pages/games/mprinavi/, the rules utils/mprinavi.ts.

const MprinaviGame: React.FC = () => <RoundsPage face={MPRINAVI_FACE} solo={{ label: 'მარტო', Icon: Timer, node: <MprinaviSolo /> }} table={<MprinaviCircle />} />;

export default MprinaviGame;
