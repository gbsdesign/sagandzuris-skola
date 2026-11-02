import React from 'react';
import { TicketCheck } from 'lucide-react';
import { RoundsPage } from './rounds/RoundsPage';
import { LOTO_FACE } from './loto/face';
import { LotoSoloGame } from './loto/Solo';
import { LotoTableGame } from './loto/Table';

// „საგალობო ლოტო“ (games hub, 2026-11-01, like Bingo): a card of nine names, the pieces sound and are marked, three in a row
// is „საგანძური!“. Alone on my phone; online in a class's room, every player's own card; on one phone with paper cards (the
// printed kit's or the children's own), the teacher's phone playing and checking a call. The shared screens
// pages/games/rounds/, the game's own pages/games/loto/, the rules utils/loto.ts, the kit's chants data/lotoKit.ts.

const LotoGame: React.FC = () => (
  <RoundsPage face={LOTO_FACE} solo={{ label: 'მარტო', Icon: TicketCheck, node: <LotoSoloGame /> }} table={<LotoTableGame />} />
);

export default LotoGame;
